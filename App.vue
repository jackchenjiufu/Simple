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
			// 获取当前页面栈
			var pages = getCurrentPages();
			var currentPath = pages.length > 0 ? pages[pages.length - 1].route : '';
			// 已在登录页则不再跳转
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
	},
	onShow: function() {
	},
	onHide: function() {
	}
};
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
