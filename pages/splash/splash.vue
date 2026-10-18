<template>
	<view class="splash" :style="{ background: bgColor }">
		<image v-if="imageUrl" class="splash-bg" :src="imageUrl" mode="aspectFill"></image>
		<view class="splash-inner" v-if="enabled">
			<image v-if="logoUrl" class="splash-logo" :src="logoUrl" mode="aspectFit"></image>
			<text class="splash-title" :style="{ color: titleColor }">{{ title }}</text>
			<text class="splash-subtitle" :style="{ color: subtitleColor }">{{ subtitle }}</text>
		</view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			enabled: true,
			title: '',
			subtitle: '',
			logoUrl: '',
			imageUrl: '/static/img/splash-default.png',
			bgColor: '#FFFFFF',
			titleColor: '#ffffff',
			subtitleColor: 'rgba(255,255,255,0.7)',
			delayMs: 900
		};
	},
	onLoad() {
		this.loadConfig();
	},
	methods: {
		async loadConfig() {
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'splash_config.php',
					method: 'GET',
					timeout: 3000
				});
				if (res.statusCode === 200) {
					const d = res.data && res.data.data;
					if (d) {
						this.enabled = d.enabled === 1;
						this.title = d.title || '';
						this.subtitle = d.subtitle || '';
						this.bgColor = d.bg_color || '#ffffff';
						this.titleColor = d.title_color || '#ffffff';
						this.subtitleColor = d.subtitle_color || 'rgba(255,255,255,0.7)';
						this.delayMs = typeof d.delay_ms === 'number' ? d.delay_ms : this.delayMs;
						this.logoUrl = d.logo_url ? apiConfig.getServerUrl(d.logo_url) : '';
						// 内置图兜底：后台没配 image_url 时继续用包内的 static/img/splash-default.png
						if (d.image_url) {
							this.imageUrl = apiConfig.getServerUrl(d.image_url);
						}
					}
				}
			} catch (e) {}
			this.gotoNext();
		},
		gotoNext() {
			const t = this.enabled ? (this.delayMs || 300) : 0;
			setTimeout(() => {
				var isLoggedIn = !!uni.getStorageSync('isLoggedIn');
				if (isLoggedIn) {
					uni.switchTab({ url: '/pages/tabbar/tabbar-1/tabbar-1' });
				} else {
					uni.reLaunch({ url: '/pages/auth/login', animationDuration: 0 });
				}
			}, t);
		}
	}
};
</script>

<style>
.splash {
	width: 100%;
	height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
	overflow: hidden;
}
.splash-bg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}
.splash-inner {
	display: flex;
	flex-direction: column;
	align-items: center;
}
.splash-logo {
	width: 140upx;
	height: 140upx;
	border-radius: 28upx;
	margin-bottom: 24upx;
}
.splash-title {
	font-size: 40upx;
	font-weight: 700;
	color: #ffffff;
	letter-spacing: 2upx;
	margin-bottom: 8upx;
}
.splash-subtitle {
	font-size: 24upx;
	color: rgba(255, 255, 255, 0.7);
}
</style>
