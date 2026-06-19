<template>
	<view class="content">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<!-- 导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">隐私政策</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="privacy-container" scroll-y="true">
			<view class="privacy-content">
				<text class="privacy-section-title">1. 引言</text>
				<text class="privacy-text">欢迎使用 Date Of Origin（简称"本应用"）。我们非常重视您的隐私保护和个人信息安全。本隐私政策旨在向您说明我们如何收集、使用、存储、共享和保护您的个人信息，以及您享有的权利和如何行使这些权利。</text>
				
				<text class="privacy-section-title">2. 信息收集</text>
				<text class="privacy-text">2.1 注册信息：当您注册本应用时，我们会收集您的用户名、密码等信息。</text>
				<text class="privacy-text">2.2 设备信息：我们会收集您的设备型号、操作系统版本、设备标识符等信息，用于优化应用性能和提供更好的服务。</text>
				<text class="privacy-text">2.3 使用信息：我们会收集您使用本应用的行为数据，包括登录时间、浏览内容、操作记录等，用于分析和改进我们的服务。</text>
				
				<text class="privacy-section-title">3. 信息使用</text>
				<text class="privacy-text">3.1 提供服务：我们使用您的个人信息为您提供注册、登录、内容浏览等核心服务。</text>
				<text class="privacy-text">3.2 优化服务：我们会分析您的使用数据，以优化应用性能、改进用户体验和开发新功能。</text>
				<text class="privacy-text">3.3 安全保障：我们使用您的信息来保障应用和您的账号安全，防止欺诈行为和未经授权的访问。</text>
				
				<text class="privacy-section-title">4. 信息存储与保护</text>
				<text class="privacy-text">4.1 存储方式：您的个人信息会存储在我们的服务器上，并采取加密等安全措施进行保护。</text>
				<text class="privacy-text">4.2 存储期限：我们会根据法律法规的要求和业务需要，合理确定个人信息的存储期限。</text>
				<text class="privacy-text">4.3 安全措施：我们采取严格的技术和管理措施，确保您的个人信息安全，防止信息泄露、滥用或篡改。</text>
				
				<text class="privacy-section-title">5. 信息共享</text>
				<text class="privacy-text">5.1 我们不会向第三方出售您的个人信息。</text>
				<text class="privacy-text">5.2 为了提供服务或遵守法律法规，我们可能会与必要的第三方共享您的个人信息，但会确保其采取相应的保密措施。</text>
				
				<text class="privacy-section-title">6. 您的权利</text>
				<text class="privacy-text">6.1 访问权：您可以访问和查看您的个人信息。</text>
				<text class="privacy-text">6.2 修改权：您可以修改或更新您的个人信息。</text>
				<text class="privacy-text">6.3 删除权：您可以请求删除您的个人信息。</text>
				<text class="privacy-text">6.4 注销权：您可以注销您的账号，注销后我们会删除相关信息。</text>
				
				<text class="privacy-section-title">7. 隐私政策更新</text>
				<text class="privacy-text">我们可能会不时更新本隐私政策。更新后的隐私政策将在应用内发布，您继续使用本应用即表示同意新的隐私政策。</text>
				
				<text class="privacy-section-title">8. 联系方式</text>
				<text class="privacy-text">如果您对本隐私政策或个人信息保护有任何疑问，请通过以下方式联系我们：</text>
				<text class="privacy-text">电子邮件：support@dateoforigin.cn</text>
				<text class="privacy-text">客服电话：400-123-4567</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0
		};
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
	},
	methods: {
		goBack() {
			uni.navigateBack();
		}
	}
};
</script>

<style lang="scss" scoped>
.content {
	width: 100%;
	height: 100vh;
	background-color: #ffffff;
	display: flex;
	flex-direction: column;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: auto;
	min-height: 44px;
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

.privacy-container {
	flex: 1;
	padding: 20px 30px 20px 20px;
	overflow-y: auto;
}

.privacy-content {
	line-height: 1.8;
}

.privacy-section-title {
	display: block;
	font-size: 14px;
	font-weight: bold;
	color: #303132;
	margin-top: 15px;
	margin-bottom: 8px;
}

.privacy-section-title:first-child {
	margin-top: 0;
}

.privacy-text {
			display: block;
			font-size: 10px;
			color: #909398;
			margin-bottom: 8px;
			text-align: justify;
		}

		/* 隐藏滚动条 */
		::-webkit-scrollbar {
			width: 0;
			height: 0;
			display: none;
		}

		/* 兼容其他浏览器 */
		scroll-view {
			-ms-overflow-style: none;
			scrollbar-width: none;
		}
	</style>