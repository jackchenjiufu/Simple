<template>
	<view class="content">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<!-- 导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">关于我们</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="content-area" scroll-y="true">
			<view class="about-content">
				<view class="logo-section">
					<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
				</view>
				<view class="info-section">
					<text class="info-title">应用介绍</text>
					<text class="info-text">Origin是一款优秀的个人APP正在处于开发测试中。</text>
				</view>
				<view class="info-section">
					<text class="info-title">版本信息</text>
					<text class="info-text">当前版本：{{ currentVersion }}</text>
					<text class="info-text" v-if="latestVersion !== currentVersion">最新版本：{{ latestVersion }}</text>
				</view>
				<view class="info-section">
					<text class="info-title">联系我们</text>
					<text class="info-text">微信：ChenSauce</text>
					<text class="info-text">INS：400-888-8888</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
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
		goBack() {
			uni.navigateBack();
		},
		
		async loadVersion() {
			
			try {
				const systemInfo = uni.getSystemInfoSync();
				const currentVersion = systemInfo.appVersion || '1.0.0';
				
				const response = await uni.request({
					url: 'http://139.196.185.197:7070/doo/server/api/check_update.php',
					method: 'POST',
					data: {
						currentVersion: currentVersion
					},
					header: {
						'Content-Type': 'application/json'
					}
				});
				
				
				if (response.statusCode === 200) {
					let result;
					if (typeof response.data === 'string') {
						result = JSON.parse(response.data);
					} else {
						result = response.data;
					}
					
					
					if (result && result.code === 200) {
						const data = result.data || {};
						this.currentVersion = data.currentVersion || currentVersion;
						this.latestVersion = data.latestVersion || currentVersion;
					} else {
					}
				} else {
				}
			} catch (error) {
			}
		}
	}
};
</script>

<style lang="scss" scoped>
.content {
	width: 100%;
	min-height: 100vh;
	background-color: #ffffff;
	display: flex;
	flex-direction: column;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 44px;
	background-color: #ffffff;
	padding: 0 15px;
	border-bottom: 1px solid #f0f0f0;
}

.nav-back {
	width: 72upx;
	height: 72upx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-icon {
	width: 48upx;
	height: 48upx;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 18px;
	font-weight: bold;
	color: #303132;
}

.nav-placeholder {
	width: 30px;
}

.content-area {
	flex: 1;
	overflow: hidden;
}

.about-content {
	padding: 20px;
}

.logo-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 40px 0;
}

.logo {
	width: 100px;
	height: 100px;
	margin-bottom: 20px;
}

.app-name {
	font-size: 32px;
	font-weight: bold;
	color: #3071f6;
}

.info-section {
	background-color: #ffffff;
	border-radius: 8px;
	padding: 20px;
	margin-bottom: 15px;
}

.info-title {
	display: block;
	font-size: 16px;
	font-weight: bold;
	color: #303132;
	margin-bottom: 10px;
}

.info-text {
	display: block;
	font-size: 14px;
	color: #909398;
	line-height: 1.8;
	margin-bottom: 8px;
}
</style>
