<template>
	<view class="splash"></view>
</template>

<script>
export default {
	onLoad() {
		// 纯白瞬跳页：无启动图、无 logo，直接判断登录态跳转
		var isLoggedIn = !!uni.getStorageSync('isLoggedIn');
		if (isLoggedIn) {
			uni.switchTab({ url: '/pages/tabbar/tabbar-1/tabbar-1' });
		} else {
			uni.reLaunch({ url: '/pages/auth/login', animationDuration: 0 });
		}
	}
};
</script>

<style>
.splash {
	width: 100%;
	height: 100vh;
	background: #ffffff;
}
</style>
