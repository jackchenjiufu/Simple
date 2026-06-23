<template>
	<view class="splash" :style="{ background: config.bg_color }">
		<view class="logo-area">
			<image class="logo" :src="logoUrl" mode="aspectFit"></image>
			<text class="app-name">{{ config.title }}</text>
		</view>
		<text class="loading-text">{{ config.subtitle }}</text>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';

export default {
	data() {
		return {
			config: {
				title: 'Simple Server',
				subtitle: '加载中...',
				logo_url: '',
				delay_ms: 300,
				bg_color: '#ffffff',
				enabled: 1
			}
		};
	},
	computed: {
		logoUrl() {
			return this.config.logo_url || '/static/logo.png';
		}
	},
	onLoad() {
		// 从服务器获取启动页配置
		uni.request({
			url: apiConfig.baseUrl + 'splash_config.php',
			method: 'GET',
			success: (res) => {
				var result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
				if (result.code === 200 && result.data) {
					this.config = { ...this.config, ...result.data };
				}
			},
			complete: () => {
				// 无论是否获取到配置，延迟后跳转
				var delay = parseInt(this.config.delay_ms) || 300;
				setTimeout(() => {
					var isLoggedIn = !!uni.getStorageSync('isLoggedIn');
					if (isLoggedIn) {
						uni.switchTab({ url: '/pages/tabbar/tabbar-1/tabbar-1' });
					} else {
						uni.reLaunch({ url: '/pages/auth/login', animationDuration: 0 });
					}
				}, delay);
			}
		});
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
