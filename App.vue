<template>
	<view class="app-container">
		<slot />
	</view>
</template>

<script>
export default {
	globalData: {
		userInfo: null
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
			uni.reLaunch({ url: "/pages/auth/login" });
		}
		var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
		if (!isLoggedIn) {
			redirectToLogin();
		}
		uni.addInterceptor("navigateTo", {
			invoke: function(args) {
				var url = args.url.split("?")[0];
				if (isLoginPage(url)) return true;
				var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
				if (!isLoggedIn) {
					uni.reLaunch({ url: "/pages/auth/login" });
					return false;
				}
				return true;
			}
		});
		uni.addInterceptor("switchTab", {
			invoke: function(args) {
				var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
				if (!isLoggedIn) {
					uni.reLaunch({ url: "/pages/auth/login" });
					return false;
				}
				return true;
			}
		});
		uni.addInterceptor("reLaunch", {
			invoke: function(args) {
				var url = args.url.split("?")[0];
				if (isLoginPage(url)) return true;
				var isLoggedIn = !!uni.getStorageSync("isLoggedIn");
				if (!isLoggedIn) {
					uni.reLaunch({ url: "/pages/auth/login" });
					return false;
				}
				return true;
			}
		});
		// 安装待处理的WGT更新（上次下载的）
		this.installPendingWgt();
	},
	onShow: function() {
	},
	methods: {
		// 安装上次下载好的WGT
		installPendingWgt() {
			var wgtPath = uni.getStorageSync('pendingWgtPath');
			if (!wgtPath || typeof plus === 'undefined') return;
			// 检查文件是否存在
			plus.io.resolveLocalFileSystemURL(wgtPath, function() {
				// 文件存在，安装
				plus.runtime.install(wgtPath, { force: false }, function() {
					var ver = uni.getStorageSync('pendingWgtVersion') || '';
					if (ver) uni.setStorageSync('wgtVersion', ver);
					uni.removeStorageSync('pendingWgtPath');
					uni.removeStorageSync('pendingWgtVersion');
					// 延迟重启，避免toast残留
					setTimeout(function() {
						plus.runtime.restart();
					}, 500);
				}, function() {
					uni.removeStorageSync('pendingWgtPath');
					uni.removeStorageSync('pendingWgtVersion');
				});
			}, function() {
				uni.removeStorageSync('pendingWgtPath');
			});
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
.app-container {
	width: 100%;
	height: 100vh;
	background-color: var(--bg-light);
}
page {
	width: 100%;
	height: 100%;
}
</style>
