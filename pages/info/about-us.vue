<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="nav-bar">
				<view class="nav-back" @click="goBack">
					<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
				</view>
				<text class="nav-title">关于我们</text>
				<view class="nav-placeholder"></view>
			</view>
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
		</view>

		<scroll-view class="body" scroll-y="true">
			<view class="app-info-card">
				<view class="app-logo-wrap">
					<image class="app-logo" src="/static/logo.png" mode="aspectFit"></image>
				</view>
				<text class="app-name">Simple Server</text>
				<text class="app-desc">一个禅意构造的APP</text>
			</view>

			<view class="info-card">
				<text class="card-title">版本信息</text>
				<view class="version-row">
					<text class="row-label">当前版本</text>
					<text class="row-value">{{ currentVersion }}</text>
				</view>
				<view class="version-row" v-if="latestVersion !== currentVersion">
					<text class="row-label">最新版本</text>
					<text class="row-value new-version">{{ latestVersion }}</text>
				</view>
			</view>

			<view class="info-card">
				<text class="card-title">联系我们</text>
				<view class="contact-row">
					<text class="contact-icon">📧</text>
					<text class="contact-text">chensauce@qq.com</text>
				</view>
				<view class="contact-row">
					<text class="contact-icon">💬</text>
					<text class="contact-text">微信：ChenSauce</text>
				</view>
			</view>

			<text class="footer-text">Origin v{{ currentVersion }}</text>
		</scroll-view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			statusBarHeight: 0,
			currentVersion: '1.0.0',
			latestVersion: '1.0.0'
		};
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		this.loadVersion();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		async loadVersion() {
			try {
				const info = uni.getSystemInfoSync();
				const ver = info.appVersion || '1.0.0';
				const res = await uni.request({
					url: apiConfig.baseUrl + 'check_update.php',
					method: 'POST',
					data: { currentVersion: ver },
					header: { 'Content-Type': 'application/json' }
				});
				if (res.statusCode === 200) {
					const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
					if (result?.code === 200) {
						this.currentVersion = result.data?.currentVersion || ver;
						this.latestVersion = result.data?.latestVersion || ver;
					}
				}
			} catch (e) { console.error(e); }
		}
	}
};
</script>

<style>
.content { width: 100%; min-height: 100vh; background-color: #ffffff; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #1b44a6; }

.header-section { position: relative; background: #1b44a6; border-radius: 0 0 48upx 48upx; padding-bottom: 140upx; overflow: hidden; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 12upx 24upx 0; position: relative; z-index: 2; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 32upx; font-weight: 600; color: #ffffff; letter-spacing: 2upx; }
.nav-placeholder { width: 72upx; }
.header-content { position: relative; z-index: 2; padding: 20upx 40upx 0; text-align: left; padding-left: 48upx; }
.header-title { font-size: 34upx; font-weight: 700; color: #ffffff; display: block; }
.deco-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); z-index: 1; }
.dot-1 { width: 120upx; height: 120upx; top: -30upx; right: -20upx; }
.dot-2 { width: 80upx; height: 80upx; bottom: 10upx; left: -20upx; }

.body { flex: 1; background: #ffffff; padding: 0 40upx; margin-top: -40upx; box-sizing: border-box; }

.app-info-card {
	background: #ffffff;
	border-radius: 16upx;
	padding: 48upx 32upx;
	text-align: center;
	margin-bottom: 24upx;
	box-shadow: 0 2upx 12upx rgba(0,0,0,0.06);
}
.app-logo-wrap { margin: 0 auto 24upx; text-align: center; }
.app-logo { width: 150upx; height: 150upx; border-radius: 20upx; }
.app-name { display: block; font-size: 36upx; font-weight: 700; color: #303132; margin-bottom: 8upx; letter-spacing: 4upx; }
.app-desc { display: block; font-size: 24upx; color: #6b7280; }

.info-card { background: #ffffff; border-radius: 16upx; padding: 28upx 24upx; margin-bottom: 16upx; box-shadow: 0 2upx 12upx rgba(0,0,0,0.06); }
.card-title { display: block; font-size: 28upx; font-weight: 600; color: #303132; margin-bottom: 16upx; }
.version-row { display: flex; justify-content: space-between; align-items: center; padding: 10upx 0; }
.row-label { font-size: 26upx; color: #6b7280; }
.row-value { font-size: 26upx; color: #303132; font-weight: 500; }
.new-version { color: #3071f6; font-weight: 600; }
.contact-row { display: flex; align-items: center; gap: 12upx; margin-bottom: 12upx; }
.contact-row:last-child { margin-bottom: 0; }
.contact-icon { font-size: 28upx; }
.contact-text { font-size: 26upx; color: #6b7280; }
.footer-text { display: block; text-align: center; font-size: 22upx; color: #c0c4cc; padding: 24upx 0 40upx; }
</style>
