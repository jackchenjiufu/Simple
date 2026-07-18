<template>
	<view class="app-container">
		<slot />
	</view>
</template>

<script>
import apiConfig from './utils/api.js';

export default {
	globalData: { userInfo: null },
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
		silentCheckWgt() {
			// #ifdef APP-PLUS
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
									var dt = plus.downloader.createDownload(targetUrl, { filename: "_doc/update/" }, function(dl, status) {
										if (status === 200) {
											if (isWgt) {
												plus.runtime.install(dl.filename, { force: true }, function() {
													uni.setStorageSync("wgtVersion", newVer);
													setTimeout(function() { plus.runtime.restart(); }, 500);
												}, function(e) {
													console.error("WGT安装失败:", e);
													uni.setStorageSync("pendingWgtPath", dl.filename);
													uni.setStorageSync("pendingWgtVersion", newVer);
												});
											} else {
												uni.setStorageSync("pendingApkPath", dl.filename);
												uni.setStorageSync("pendingWgtVersion", newVer);
											}
										} else {
											console.error("更新包下载失败, 状态:", status);
										}
									});
									dt.start();
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
</style>
