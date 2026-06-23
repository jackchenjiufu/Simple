<template>
	<view class="splash">
		<view class="logo-area">
			<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
			<text class="app-name">Simple Server</text>
		</view>
		<text class="loading-text">加载中...</text>
	</view>
</template>

<script>
export default {
	onLoad() {
		// 检查登录状态，延迟一小段时间展示启动页
		setTimeout(() => {
			var isLoggedIn = !!uni.getStorageSync('isLoggedIn');
			if (isLoggedIn) {
				uni.switchTab({ url: '/pages/tabbar/tabbar-1/tabbar-1' });
			} else {
				uni.reLaunch({ url: '/pages/auth/login', animationDuration: 0 });
			}
		}, 800);
	}
};
</script>

<style>
.splash {
	width: 100%;
	height: 100vh;
	background: #ffffff;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
.logo-area {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 40upx;
}
.logo {
	width: 200upx;
	height: 200upx;
	border-radius: 40upx;
	margin-bottom: 24upx;
}
.app-name {
	font-size: 36upx;
	font-weight: 700;
	color: #1a1a2e;
	letter-spacing: 4upx;
}
.loading-text {
	font-size: 24upx;
	color: #c0c4cc;
	position: absolute;
	bottom: 120upx;
}
</style>
