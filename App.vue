<template>
	<view class="app-container">
		<slot />

		<!-- 更新提示弹窗（左右按钮布局） -->
		<view class="update-overlay" v-if="showUpdateModal" @click="onOverlayClick">
			<view class="update-modal" @click.stop>
				<view class="update-icon-wrap">
					<text class="update-icon-text">↑</text>
				</view>
				<text class="update-modal-title">{{ updateModalTitle }}</text>
				<text class="update-modal-desc">{{ updateModalDesc }}</text>
				<view class="update-modal-actions">
					<button class="update-btn cancel" v-if="!updateForce" @click="cancelUpdate">稍后再说</button>
					<button class="update-btn confirm" @click="confirmUpdate">立即更新</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import apiConfig from './utils/api.js';
import { compareVersion } from './utils/version.js';
import { applyTabPermTwice } from './utils/perm.js';

export default {
	globalData: { userInfo: null },
	data() {
		return {
			showUpdateModal: false,
			updateModalTitle: '',
			updateModalDesc: '',
			updateForce: false,
			_updateInfo: null,
		};
	},
	onLaunch: function() {
		// 拉取后端当前 API 版本（后台切换 v1/v2 后 App 自动跟随）
		this.fetchApiVersion();
		var loginPages = [
			"pages/auth/login",
			"pages/auth/forgot-password",
			"pages/auth/reset-password"
		];
		function isLoginPage(url) {
			for (var i = 0; i < loginPages.length; i++) {
				if (url.indexOf(loginPages[i]) >= 0) return true;
			}
			return false;
		}
		function redirectToLogin() {
			var pages = getCurrentPages();
			var currentPath = pages.length > 0 ? pages[pages.length - 1].route : '';
			if (isLoginPage(currentPath)) return;
			uni.reLaunch({ url: "/pages/auth/login", animationDuration: 0 });
		}
		var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
		if (!isLoggedIn) redirectToLogin();
		uni.addInterceptor("navigateTo", {
			invoke: function(args) {
				var url = args.url.split("?")[0];
				if (isLoginPage(url)) return true;
				if (!uni.getStorageSync("isLoggedIn")) { uni.reLaunch({ url: "/pages/auth/login", animationDuration: 0 }); return false; }
				return true;
			}
		});
		uni.addInterceptor("switchTab", {
			invoke: function(args) {
				if (!uni.getStorageSync("isLoggedIn")) {
					// 已在登录页时不再重复 reLaunch（否则与 login 页 onLoad 的跳转形成死循环）
					var pages = getCurrentPages();
					var currentPath = pages.length > 0 ? pages[pages.length - 1].route : '';
					if (!isLoginPage(currentPath)) {
						uni.reLaunch({ url: "/pages/auth/login", animationDuration: 0 });
					}
					// 状态自愈：残留的 userInfo（无 isLoggedIn）会导致 login 页 onLoad 反复尝试跳走
					if (uni.getStorageSync("userInfo")) {
						uni.removeStorageSync("userInfo");
						uni.removeStorageSync("userId");
					}
					return false;
				}
				return true;
			}
		});
		uni.addInterceptor("reLaunch", {
			invoke: function(args) {
				var url = args.url.split("?")[0];
				if (isLoginPage(url)) return true;
				if (!uni.getStorageSync("isLoggedIn")) { uni.reLaunch({ url: "/pages/auth/login", animationDuration: 0 }); return false; }
				return true;
			}
		});
		this.installPendingWgt();
		this.silentCheckWgt();
		// 「监控」页签仅超级管理员可见
		applyTabPermTwice();
	},
	onShow: function() {
		this.installPendingWgt();
		this.silentCheckWgt();
		// 登录/切换账号后角色可能变化，每次回前台重新算一次
		applyTabPermTwice();
		// 在线时长心跳（等级成长值：每10分钟 +1）
		this.startHeartbeat();
	},
	onHide: function() {
		this.stopHeartbeat();
	},
	methods: {
		// ===== API 版本跟随（后台切换 v1/v2 后 App 自动生效）=====
		fetchApiVersion() {
			var url = apiConfig.getServerUrl('/server/api/api_version.php');
			if (!url) return;
			uni.request({
				url: url,
				method: 'GET',
				timeout: 5000,
				success: (res) => {
					if (res.statusCode === 200 && res.data && res.data.code === 200) {
						var ver = res.data.data && res.data.data.version;
						if (ver === 'v2') uni.setStorageSync('apiVersion', 2);
						else if (ver === 'v1') uni.setStorageSync('apiVersion', 1);
					}
				},
				fail: () => { /* 网络异常时保持当前版本（默认 v1） */ }
			});
		},
		cancelUpdate() {
			this.showUpdateModal = false;
			this._updateInfo = null;
			this.updateForce = false;
		},
		onOverlayClick() {
			// 强制更新时不允许点遮罩关闭，必须点击“立即更新”
			if (!this.updateForce) this.cancelUpdate();
		},
		// ===== 在线时长心跳 =====
		startHeartbeat() {
			this.stopHeartbeat();
			// 立即上报一次（本次会话），之后每 5 分钟一次
			this.heartbeat();
			this._heartbeatTimer = setInterval(() => this.heartbeat(), 5 * 60 * 1000);
		},
		stopHeartbeat() {
			if (this._heartbeatTimer) {
				clearInterval(this._heartbeatTimer);
				this._heartbeatTimer = null;
			}
		},
		heartbeat() {
			if (!uni.getStorageSync('isLoggedIn')) return;
			const token = uni.getStorageSync('token') || '';
			uni.request({
				url: apiConfig.baseUrl + 'heartbeat.php',
				method: 'POST',
				header: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
				data: { seconds: 300 },
				success: () => {},
				fail: () => {}
			});
		},
		confirmUpdate() {
			this.showUpdateModal = false;
			var info = this._updateInfo;
			this._updateInfo = null;
			this.updateForce = false;
			if (!info) return;
			this._downloadUpdate(info.targetUrl, info.isWgt, info.newVer);
		},
		// 断点续传：原生 Dl 用 HTTP Range 从「已下载的字节」接着下。
		// plus.downloader 一旦中断就从头再来，46MB 的包在弱网下几乎下不完。
		_downloadUpdate(targetUrl, isWgt, newVer) {
			// #ifdef APP-PLUS
			var that = this;
			var dir = '_doc/update/';
			try {
				plus.io.resolveLocalFileSystemURL('_doc/', function(entry) {
					entry.getDirectory('update', { create: true }, function() {}, function() {});
				}, function() {});
			} catch(e) {}

			var Dl = null;
			try { Dl = plus.android.importClass('com.simple.app.Dl'); } catch(e) { Dl = null; }
			if (!Dl) { this._legacyDownload(targetUrl, isWgt, newVer); return; }

			// 文件名带版本号：不同版本互不干扰，同版本中断后能接着下
			var fileName = 'pkg_' + String(newVer).replace(/\./g, '_') + (isWgt ? '.wgt' : '.apk');
			var localPath = dir + fileName;
			var absPath = '';
			try { absPath = plus.io.convertLocalFileSystemURL(localPath); } catch(e) {}
			if (!absPath) { this._legacyDownload(targetUrl, isWgt, newVer); return; }

			var tag = 'upd' + (isWgt ? 'w' : 'a');
			uni.showLoading({ title: '正在下载更新…', mask: true });
			try {
				Dl.start(targetUrl, absPath, tag);
			} catch(e) {
				uni.hideLoading();
				this._legacyDownload(targetUrl, isWgt, newVer);
				return;
			}

			var timer = setInterval(function() {
				var st = '', sz = '';
				try { st = String(Dl.state(tag)); sz = String(Dl.size(tag)); } catch(e) {}
				if (st === 'running') {
					var p = sz.split('/');
					var got = parseInt(p[0], 10) || 0;
					var all = parseInt(p[1], 10) || 0;
					var pct = all > 0 ? Math.floor(got * 100 / all) : 0;
					var g = (got / 1048576).toFixed(1);
					var a = all > 0 ? (all / 1048576).toFixed(1) : '?';
					uni.showLoading({ title: '下载中 ' + pct + '%  ' + g + '/' + a + 'MB', mask: true });
					return;
				}
				clearInterval(timer);
				uni.hideLoading();
				if (st === 'done') {
					that._installPackage(absPath, isWgt, newVer);
					return;
				}
				// 中断：已下载的部分保留在本地，点重试会从断点继续
				uni.showModal({
					title: '下载中断',
					content: '已下载的部分已保存，点「重试」会从断点接着下，不会从头再来。',
					confirmText: '重试',
					cancelText: '稍后',
					success: function(r) {
						if (r.confirm) that._downloadUpdate(targetUrl, isWgt, newVer);
					}
				});
			}, 700);
			// #endif
		},
		// 安装下载好的包：wgt 静默安装，apk 拉起系统安装器
		_installPackage(path, isWgt, newVer) {
			// #ifdef APP-PLUS
			if (isWgt) {
				plus.runtime.install(path, { force: true }, function() {
					uni.setStorageSync("wgtVersion", newVer);
					uni.showToast({ title: '更新成功，即将重启', icon: 'none' });
					setTimeout(function() { plus.runtime.restart(); }, 800);
				}, function(e) {
					uni.setStorageSync("pendingWgtPath", path);
					uni.setStorageSync("pendingWgtVersion", newVer);
					uni.showToast({ title: '安装失败，重启后自动重试', icon: 'none' });
				});
				return;
			}
			uni.setStorageSync("pendingApkPath", path);
			uni.setStorageSync("pendingWgtVersion", newVer);
			plus.runtime.install(path, {}, function() {
				uni.setStorageSync("wgtVersion", newVer);
				uni.removeStorageSync("pendingApkPath");
				uni.removeStorageSync("pendingWgtVersion");
				uni.showToast({ title: '更新成功', icon: 'none' });
			}, function(e) {
				console.error("APK安装失败:", e);
				// 兜底：用系统 Intent 拉起安装器
				try {
					var main = plus.android.runtimeMainActivity();
					var Intent = plus.android.importClass('android.content.Intent');
					var Uri = plus.android.importClass('android.net.Uri');
					var File = plus.android.importClass('java.io.File');
					var intent = new Intent('android.intent.action.VIEW');
					intent.setDataAndType(Uri.fromFile(new File(path)), 'application/vnd.android.package-archive');
					main.startActivity(intent);
					uni.removeStorageSync("pendingApkPath");
				} catch(e2) {}
			});
			// #endif
		},
		// 老版本 APK 里没有 Dl 类，退回整体下载
		_legacyDownload(targetUrl, isWgt, newVer) {
			// #ifdef APP-PLUS
			uni.showLoading({ title: '正在下载更新...', mask: true });
			// 确保下载目录存在
			var dir = '_doc/update/';
			try {
				plus.io.resolveLocalFileSystemURL('_doc/', function(entry) {
					entry.getDirectory('update', { create: true }, function() {}, function() {});
				}, function() {});
			} catch(e) {}
			var dt = plus.downloader.createDownload(targetUrl, { filename: dir }, function(dl, status) {
				uni.hideLoading();
				if (status === 200) {
					if (isWgt) {
						plus.runtime.install(dl.filename, { force: true }, function() {
							uni.setStorageSync("wgtVersion", newVer);
							uni.showToast({ title: '更新成功，即将重启', icon: 'none' });
							setTimeout(function() { plus.runtime.restart(); }, 800);
						}, function(e) {
							console.error("WGT安装失败:", e);
							uni.setStorageSync("pendingWgtPath", dl.filename);
							uni.setStorageSync("pendingWgtVersion", newVer);
							uni.showToast({ title: '安装失败，重启后自动重试', icon: 'none' });
						});
					} else {
						uni.setStorageSync("pendingApkPath", dl.filename);
						uni.setStorageSync("pendingWgtVersion", newVer);
						uni.showToast({ title: '下载完成，请确认安装', icon: 'none' });
						// 拉起系统安装器安装本地 APK（不带 force，避免静默安装失败）
						plus.runtime.install(dl.filename, {}, function() {
							uni.setStorageSync("wgtVersion", newVer);
							uni.removeStorageSync("pendingApkPath");
							uni.removeStorageSync("pendingWgtVersion");
							uni.showToast({ title: '更新成功', icon: 'none' });
						}, function(e) {
							console.error("APK安装失败:", e);
							// 用系统 Intent 打开本地 APK 调起安装器
							try {
								var main = plus.android.runtimeMainActivity();
								var Intent = plus.android.importClass('android.content.Intent');
								var Uri = plus.android.importClass('android.net.Uri');
								var File = plus.android.importClass('java.io.File');
								var intent = new Intent('android.intent.action.VIEW');
								intent.setDataAndType(Uri.fromFile(new File(dl.filename)), 'application/vnd.android.package-archive');
								main.startActivity(intent);
								uni.removeStorageSync("pendingApkPath");
							} catch (e2) {
								// 兜底：下次启动 installPendingWgt 重试
							}
						});
					}
				} else {
					uni.showToast({ title: '下载失败，请稍后重试', icon: 'none' });
				}
			});
			dt.start();
			// #endif
		},
		silentCheckWgt() {
			// #ifdef APP-PLUS
			var that = this;
			var storedVer = uni.getStorageSync('wgtVersion') || '';
			var sysInfo = uni.getSystemInfoSync();
			var curVer = storedVer || sysInfo.appVersion || '1.0.0';
			if (this._lastCheckVer === curVer) return;
			this._lastCheckVer = curVer;
			uni.request({
				url: apiConfig.baseUrl + 'check_update.php',
				method: 'POST',
				data: { currentVersion: curVer },
				success: function(res) {
					try {
						var result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (result && result.code === 200 && result.data && result.data.hasUpdate) {
							var newVer = result.data.latestVersion;
							if (compareVersion(newVer, curVer) > 0) {
								// downloadUrl 为主下载地址（wgt 热更新优先，apk 全量降级）
								var targetUrl = result.data.downloadUrl || result.data.apkDownloadUrl || '';
								var isWgt = targetUrl.indexOf('.wgt') > 0;
								if (targetUrl) {
									// #ifdef APP-PLUS
									// 自定义弹窗（左右按钮布局）
									var self = that;
									self.updateModalTitle = '发现新版本 v' + newVer;
									self.updateModalDesc = (result.data.description || '新版本已发布') + (isWgt ? '' : '\n\n更新包约十几 MB，请在网络良好时更新');
									var isForce = parseInt(result.data.forceUpdate || 0, 10) === 1;
									if (isForce) self.updateModalDesc += '\n\n此版本为强制更新，更新后将重启应用';
									self._updateInfo = { targetUrl: targetUrl, isWgt: isWgt, newVer: newVer, force: isForce };
									self.updateForce = isForce;
									self.showUpdateModal = true;
									// #endif
								}
							}
						}
						// 静默热更新（wgt）：不弹窗、不进版本控制、不写 wgtVersion，无感知下载安装
						var wgtLog = function(msg) {
							try { uni.request({ url: apiConfig.baseUrl + 'wgt_log.php', method: 'POST', data: { msg: msg } }); } catch(e4) {}
						};
						var wgtReport = function(wgtName, st, extra) {
							try {
								var sys = uni.getSystemInfoSync();
								var devId = uni.getStorageSync('wgtDeviceId') || '';
								if (!devId) {
									devId = (typeof plus !== 'undefined' && plus.device && plus.device.uuid) ? plus.device.uuid : ('dev-' + Date.now());
									uni.setStorageSync('wgtDeviceId', devId);
								}
								uni.request({
									url: apiConfig.baseUrl + 'wgt_report.php',
									method: 'POST',
									data: { device: devId, wgt: wgtName, status: st, ver: (sys.appVersion || ''), model: (sys.model || ''), sysVersion: (sys.system || ''), msg: (extra || '') }
								});
							} catch(e5) {}
						};
						if (result && result.code === 200 && result.data && result.data.hotUpdate) {
							var hot = result.data.hotUpdate;
							var hotUrl = hot.downloadUrl || '';
							if (hotUrl.indexOf('.wgt') > 0) {
								var hotName = hotUrl.split('/').pop();
								var installedName = uni.getStorageSync('silentWgtInstalled') || '';
								wgtLog('发现热更新: ' + hotName + ', 已安装: ' + (installedName || '无'));
								if (installedName !== hotName) {
									try {
										plus.io.resolveLocalFileSystemURL('_doc/', function(entry) {
											entry.getDirectory('update', { create: true }, function() {}, function() {});
										}, function() {});
									} catch(e2) {}
									var dt2 = plus.downloader.createDownload(hotUrl, { filename: '_doc/update/' }, function(dl2, s2) {
										if (s2 === 200) {
											wgtLog('下载完成，开始安装: ' + hotName);
											plus.runtime.install(dl2.filename, { force: true }, function() {
												uni.setStorageSync('silentWgtInstalled', hotName);
												wgtLog('安装成功: ' + hotName + '（即将自动重启）');
												wgtReport(hotName, 'ok', '');
												// 必须重启：新包里的 app.css 只有重启后才会被 WebView 重新加载，
												// 否则用户会看到「只有文字、没有样式」的页面，且新页面的 class 也全部失效
												setTimeout(function() {
													try { plus.runtime.restart(); } catch(e6) {}
												}, 1200);
											}, function(e3) {
												var errMsg = JSON.stringify(e3);
												wgtLog('安装失败: ' + hotName + ' | ' + errMsg);
												wgtReport(hotName, 'fail', errMsg);
												console.error('静默热更新安装失败:', e3);
											});
										} else {
											wgtLog('下载失败: ' + hotName + ' | status=' + s2);
										}
									});
									dt2.start();
									wgtLog('开始下载: ' + hotUrl);
								} else {
									wgtLog('已安装过，跳过: ' + hotName);
								}
							}
						}
					} catch(e) {
						console.error('检查更新解析异常:', e);
					}
				},
				fail: function(err) {
					console.error('检查更新请求失败:', err);
				}
			});
			// #endif
		},
		installPendingWgt() {
			var wgtPath = uni.getStorageSync("pendingWgtPath");
			var apkPath = uni.getStorageSync("pendingApkPath");
			var pendingVer = uni.getStorageSync("pendingWgtVersion");
			if ((!wgtPath && !apkPath) || typeof plus === "undefined") return;
			var sysInfo = uni.getSystemInfoSync();
			var curVer = uni.getStorageSync("wgtVersion") || sysInfo.appVersion || "1.0.0";
			if (pendingVer && compareVersion(pendingVer, curVer) <= 0) {
				uni.removeStorageSync("pendingWgtPath");
				uni.removeStorageSync("pendingApkPath");
				uni.removeStorageSync("pendingWgtVersion");
				return;
			}
			if (wgtPath) {
				plus.io.resolveLocalFileSystemURL(wgtPath, function() {
					plus.runtime.install(wgtPath, { force: true }, function() {
						var ver = uni.getStorageSync("pendingWgtVersion") || "";
						if (ver) uni.setStorageSync("wgtVersion", ver);
						uni.removeStorageSync("pendingWgtPath");
						uni.removeStorageSync("pendingWgtVersion");
						setTimeout(function() { plus.runtime.restart(); }, 500);
					}, function() {
						uni.removeStorageSync("pendingWgtPath");
						uni.removeStorageSync("pendingWgtVersion");
					});
				}, function() {
					uni.removeStorageSync("pendingWgtPath");
				});
				return;
			}
			if (apkPath) {
				// #ifdef APP-ANDROID
				plus.io.resolveLocalFileSystemURL(apkPath, function() {
					plus.runtime.install(apkPath, {}, function() {
						uni.removeStorageSync("pendingApkPath");
						uni.removeStorageSync("pendingWgtVersion");
					}, function() {
						// 失败 → 系统 Intent 打开本地 APK 调起安装器
						try {
							var main = plus.android.runtimeMainActivity();
							var Intent = plus.android.importClass('android.content.Intent');
							var Uri = plus.android.importClass('android.net.Uri');
							var File = plus.android.importClass('java.io.File');
							var intent = new Intent('android.intent.action.VIEW');
							intent.setDataAndType(Uri.fromFile(new File(apkPath)), 'application/vnd.android.package-archive');
							main.startActivity(intent);
						} catch (e) { /* ignore */ }
						uni.removeStorageSync("pendingApkPath");
						uni.removeStorageSync("pendingWgtVersion");
					});
				}, function() {
					uni.removeStorageSync("pendingApkPath");
				});
				// #endif
			}
		}
	}
};

</script>

<style>
@import "./static/css/global.css";
.app-container { width: 100%; height: 100vh; background-color: var(--bg-light); }
page { width: 100%; height: 100%; }

/* 更新提示弹窗（左右按钮） */
.update-overlay {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center;
	z-index: 99999; padding: 40upx;
}
.update-modal {
	background: #fff; border-radius: 28upx; padding: 40upx 36upx 32upx;
	width: 86%; max-width: 560upx; box-shadow: 0 16upx 48upx rgba(0,0,0,0.15);
	text-align: center;
}
.update-icon-wrap {
	width: 80upx; height: 80upx; border-radius: 50%;
	background: linear-gradient(135deg, #eff6ff, #dbeafe);
	display: flex; align-items: center; justify-content: center;
	margin: 0 auto 20upx; box-shadow: 0 4upx 16upx rgba(48, 113, 246, 0.25);
}
.update-icon-text { font-size: 40upx; color: #3071f6; font-weight: 700; }
.update-modal-title {
	display: block; font-size: 30upx; font-weight: 700; color: #1f2937; margin-bottom: 16upx;
}
.update-modal-desc {
	display: block; font-size: 24upx; color: #6b7280; line-height: 1.6; margin-bottom: 28upx;
}
.update-modal-actions { display: flex; gap: 16upx; }
.update-btn {
	flex: 1; height: 80upx; line-height: 80upx; font-size: 28upx;
	border-radius: 14upx; border: none; padding: 0; margin: 0;
}
.update-btn.cancel {
	background: #f3f4f6; color: #374151; font-weight: 500;
}
.update-btn.confirm {
	background: linear-gradient(135deg, #3071f6, #1b44a6); color: #fff; font-weight: 600;
	box-shadow: 0 4upx 12upx rgba(48, 113, 246, 0.3);
}
</style>
