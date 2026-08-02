<template>
	<view class="app-container">
		<slot />

		<!-- 更新提示弹窗（左右按钮布局） -->
		<view class="update-overlay" v-if="showUpdateModal" @click="cancelUpdate">
			<view class="update-modal" @click.stop>
				<view class="update-icon-wrap">
					<text class="update-icon-text">↑</text>
				</view>
				<text class="update-modal-title">{{ updateModalTitle }}</text>
				<text class="update-modal-desc">{{ updateModalDesc }}</text>
				<view class="update-modal-actions">
					<button class="update-btn cancel" @click="cancelUpdate">稍后再说</button>
					<button class="update-btn confirm" @click="confirmUpdate">立即更新</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import apiConfig from './utils/api.js';

export default {
	globalData: { userInfo: null },
	data() {
		return {
			showUpdateModal: false,
			updateModalTitle: '',
			updateModalDesc: '',
			_updateInfo: null,
		};
	},
	onLaunch: function() {
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
				if (!uni.getStorageSync("isLoggedIn")) { uni.reLaunch({ url: "/pages/auth/login", animationDuration: 0 }); return false; }
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
	},
	onShow: function() {
		this.installPendingWgt();
		this.silentCheckWgt();
	},
	methods: {
		cancelUpdate() {
			this.showUpdateModal = false;
			this._updateInfo = null;
		},
		confirmUpdate() {
			this.showUpdateModal = false;
			var info = this._updateInfo;
			this._updateInfo = null;
			if (!info) return;
			this._downloadUpdate(info.targetUrl, info.isWgt, info.newVer);
		},
		_downloadUpdate(targetUrl, isWgt, newVer) {
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
						// 立即尝试安装（Android 会拉起系统安装确认）
						plus.runtime.install(dl.filename, { force: true }, function() {
							uni.setStorageSync("wgtVersion", newVer);
							uni.removeStorageSync("pendingApkPath");
							uni.removeStorageSync("pendingWgtVersion");
							uni.showToast({ title: '更新成功', icon: 'none' });
						}, function(e) {
							console.error("APK安装失败:", e);
							// 等待下次启动 installPendingWgt 重试
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
								var apkUrl = result.data.downloadUrl || '';
								var wgtUrl = result.data.apkDownloadUrl || '';
								var targetUrl = '';
								var isWgt = false;
								// 优先 APK 全量包，WGT 热更新作为备选
								if (apkUrl && apkUrl.indexOf('.apk') > 0) {
									targetUrl = apkUrl;
								} else if (wgtUrl && wgtUrl.indexOf('.wgt') > 0) {
									targetUrl = wgtUrl;
									isWgt = true;
								}
								if (targetUrl) {
									// #ifdef APP-PLUS
									// 自定义弹窗（左右按钮布局）
									var self = that;
									self.updateModalTitle = '发现新版本 v' + newVer;
									self.updateModalDesc = (result.data.description || '新版本已发布') + (isWgt ? '' : '\n\n更新包约十几 MB，请在网络良好时更新');
									self._updateInfo = { targetUrl: targetUrl, isWgt: isWgt, newVer: newVer };
									self.showUpdateModal = true;
									// #endif
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
					plus.runtime.install(apkPath, { force: true }, function() {
						uni.removeStorageSync("pendingApkPath");
						uni.removeStorageSync("pendingWgtVersion");
					}, function() {
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

function compareVersion(v1, v2) {
	var a1 = v1.split('.').map(Number);
	var a2 = v2.split('.').map(Number);
	for (var i = 0; i < Math.max(a1.length, a2.length); i++) {
		var n1 = a1[i] || 0;
		var n2 = a2[i] || 0;
		if (n1 > n2) return 1;
		if (n1 < n2) return -1;
	}
	return 0;
}
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
