<script>
/**
 * 应用入口
 *
 * 注意：App.vue 不是页面，uni-app 编译 App 端时会把这里的 render 强制置空
 * （app-service.js 里 `_component.mpType="app"; _component.render=()=>{}`），
 * 所以任何写在这个 template 里的 UI 都不会显示。
 * 需要全局显示的界面（比如更新提示抽屉）必须做成组件挂到页面上，
 * 见 components/update-sheet/update-sheet.vue。
 */
import apiConfig from './utils/api.js';
import { applyTabPermTwice } from './utils/perm.js';
import { compareVersion } from './utils/version.js';
import { currentVersion, fetchUpdateInfo } from './utils/update.js';

export default {
	globalData: { userInfo: null },
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
		// 未登录也允许打开的页面：版本更新（更新包下载不需要登录，
		// 否则登录页弹出更新提示后点「立即更新」会被拦截回登录页）
		var publicPages = [
			"pages/info/check-update"
		];
		function isPublicPage(url) {
			for (var j = 0; j < publicPages.length; j++) {
				if (url.indexOf(publicPages[j]) >= 0) return true;
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
				if (isLoginPage(url) || isPublicPage(url)) return true;
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
				if (isLoginPage(url) || isPublicPage(url)) return true;
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
		// ===== 静默热更新（wgt）：不弹窗、无感知下载安装后重启 =====
		// 更新提示抽屉在 components/update-sheet，两者共用 utils/update.js 的请求缓存
		silentCheckWgt() {
			// #ifdef APP-PLUS
			var curVer = currentVersion();
			if (this._lastCheckVer === curVer) return;
			this._lastCheckVer = curVer;

			var wgtLog = function(msg) {
				try { uni.request({ url: apiConfig.baseUrl + 'wgt_log.php', method: 'POST', data: { msg: msg } }); } catch (e) {}
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
				} catch (e) {}
			};

			fetchUpdateInfo().then(function(d) {
				if (!d || !d.hotUpdate) return;
				var hot = d.hotUpdate;
				var hotUrl = hot.downloadUrl || '';
				if (hotUrl.indexOf('.wgt') <= 0) return;

				var hotName = hotUrl.split('/').pop();
				var installedName = uni.getStorageSync('silentWgtInstalled') || '';
				wgtLog('发现热更新: ' + hotName + ', 已安装: ' + (installedName || '无'));
				if (installedName === hotName) {
					wgtLog('已安装过，跳过: ' + hotName);
					return;
				}
				try {
					plus.io.resolveLocalFileSystemURL('_doc/', function(entry) {
						entry.getDirectory('update', { create: true }, function() {}, function() {});
					}, function() {});
				} catch (e) {}
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
								try { plus.runtime.restart(); } catch (e6) {}
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
			});
			// #endif
		},
		installPendingWgt() {
			// #ifndef APP-PLUS
			// 小程序没有「下载安装包」这回事，微信自己管更新
			return;
			// #endif
			// #ifdef APP-PLUS
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
			// #endif
		}
	}
};
</script>

<style>
@import "./static/css/global.css";
page { width: 100%; height: 100%; }
</style>
