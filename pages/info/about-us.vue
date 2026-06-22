<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部（登录页面风格） -->
		<view class="header-section">
			<view class="nav-bar">
				<view class="nav-back" @click="goBack">
					<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
				</view>
				<text class="nav-title">关于我们</text>
				<view class="nav-placeholder"></view>
			</view>
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">Simple Server</text>
					<text class="header-title">关于我们</text>
					<text class="header-subtitle">了解应用更多信息</text>
				</view>
				<view class="header-right">
					<view class="character-area">
						<view class="char-circle char-circle-1"></view>
						<view class="char-circle char-circle-2"></view>
						<view class="char-body"></view>
						<view class="char-head"></view>
					</view>
				</view>
			</view>
			<!-- 装饰圆点 -->
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
			<view class="deco-dot dot-3"></view>
		</view>

		<!-- 表单风格卡片区域 -->
		<view class="form-section">
			<view class="form-card fade-down">
				<view class="app-logo-wrap">
					<image class="app-logo" src="/static/logo.png" mode="aspectFit"></image>
				</view>
				<text class="app-name">Simple Server</text>
				<text class="app-desc">一个禅意构造的APP</text>
			</view>

			<view class="form-card fade-up">
				<text class="form-subtitle">版本信息</text>
				<view class="version-row">
					<text class="row-label">当前版本</text>
					<text class="row-value">{{ currentVersion }}</text>
				</view>
				<view class="version-row" v-if="latestVersion !== currentVersion">
					<text class="row-label">最新版本</text>
					<text class="row-value new-version">{{ latestVersion }}</text>
				</view>
			</view>

			<view class="form-card fade-up">
				<text class="form-subtitle">联系我们</text>
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
		</view>
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
/* ========== 基础布局 ========== */
.content { width: 100%; min-height: 100vh; background-color: #ffffff; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #1b44a6; }

/* ========== 深蓝色头部 ========== */
.header-section { position: relative; background: linear-gradient(135deg, #1b44a6, #2563eb); border-radius: 0 0 48upx 48upx; overflow: hidden; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 12upx 24upx 0; position: relative; z-index: 2; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 32upx; font-weight: 600; color: #ffffff; letter-spacing: 2upx; }
.nav-placeholder { width: 72upx; }

/* ========== 头部内容 ========== */
.header-content {
	position: relative;
	z-index: 2;
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	padding: 40upx 48upx 80upx;
	min-height: 320upx;
}
.header-left { flex: 1; }
.header-greeting { font-size: 40upx; font-weight: 700; color: #ffffff; display: block; margin-bottom: 6upx; }
.header-title { font-size: 28upx; color: rgba(255,255,255,0.9); display: block; margin-bottom: 4upx; }
.header-subtitle { font-size: 22upx; color: rgba(255,255,255,0.6); display: block; }

/* ========== 角色插画 ========== */
.header-right { flex-shrink: 0; margin-left: 20upx; }
.character-area { position: relative; width: 140upx; height: 160upx; }
.char-circle { position: absolute; border-radius: 50%; }
.char-circle-1 { width: 40upx; height: 40upx; background: rgba(255,255,255,0.15); top: 0; right: 10upx; }
.char-circle-2 { width: 24upx; height: 24upx; background: rgba(255,255,255,0.1); top: 36upx; right: 0; }
.char-body { position: absolute; width: 80upx; height: 90upx; background: rgba(255,255,255,0.2); border-radius: 40upx 40upx 20upx 20upx; bottom: 0; left: 50%; transform: translateX(-50%); }
.char-head { position: absolute; width: 52upx; height: 52upx; background: rgba(255,255,255,0.25); border-radius: 50%; bottom: 74upx; left: 50%; transform: translateX(-50%); }

/* ========== 装饰圆点 ========== */
.deco-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); z-index: 1; }
.dot-1 { width: 200upx; height: 200upx; top: -60upx; right: -40upx; }
.dot-2 { width: 120upx; height: 120upx; bottom: 20upx; left: -30upx; }
.dot-3 { width: 80upx; height: 80upx; top: 100upx; left: 30%; }

/* ========== 表单卡片区域 ========== */
.form-section { flex: 1; padding: 0 40upx; margin-top: -40upx; box-sizing: border-box; }

.form-card {
	background: #ffffff;
	border-radius: 20upx;
	padding: 36upx 32upx;
	margin-bottom: 20upx;
	box-shadow: 0 4upx 20upx rgba(0,0,0,0.06);
	position: relative;
	z-index: 3;
}

.form-subtitle { display: block; font-size: 28upx; font-weight: 600; color: #303132; margin-bottom: 24upx; }

/* ========== APP 图标卡片 ========== */
.app-logo-wrap { text-align: center; margin-bottom: 16upx; }
.app-logo { width: 120upx; height: 120upx; border-radius: 24upx; }
.app-name { display: block; text-align: center; font-size: 32upx; font-weight: 700; color: #303132; margin-bottom: 6upx; }
.app-desc { display: block; text-align: center; font-size: 24upx; color: #9ca3af; }

/* ========== 版本信息 ========== */
.version-row { display: flex; justify-content: space-between; align-items: center; padding: 10upx 0; }
.row-label { font-size: 26upx; color: #6b7280; }
.row-value { font-size: 26upx; color: #303132; font-weight: 500; }
.new-version { color: #3071f6; font-weight: 600; }

/* ========== 联系我们 ========== */
.contact-row { display: flex; align-items: center; gap: 12upx; margin-bottom: 12upx; }
.contact-row:last-child { margin-bottom: 0; }
.contact-icon { font-size: 28upx; }
.contact-text { font-size: 26upx; color: #6b7280; }

/* ========== 入场动画 ========== */
.fade-down { animation: fadeDown 0.6s ease-out; }
.fade-up { animation: fadeUp 0.6s ease-out; }

@keyframes fadeDown {
	from { opacity: 0; transform: translateY(-20upx); }
	to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeUp {
	from { opacity: 0; transform: translateY(20upx); }
	to { opacity: 1; transform: translateY(0); }
}

/* ========== 底部 ========== */
.footer-text { display: block; text-align: center; font-size: 22upx; color: #c0c4cc; padding: 24upx 0 40upx; }
</style>
