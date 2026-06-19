<template>
	<view class="content">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<!-- 导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">用户协议</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="agreement-container" scroll-y="true">
			<view class="agreement-content">
				<text class="agreement-section-title">1. 引言</text>
				<text class="agreement-text">欢迎使用 Date Of Origin（简称"本应用"）。本用户协议（以下简称"本协议"）是您与本应用之间关于使用本应用服务所订立的协议。</text>
				<text class="agreement-text">请您务必认真阅读并充分理解本协议的全部内容，特别是涉及免除或限制责任的条款、争议解决和法律适用条款。</text>
				
				<text class="agreement-section-title">2. 协议的接受</text>
				<text class="agreement-text">2.1 您在注册、登录、使用本应用服务前，应当认真阅读并遵守本协议。</text>
				<text class="agreement-text">2.2 您点击"同意"按钮或使用本应用服务，即表示您已充分阅读、理解并接受本协议的全部内容，并愿意遵守本协议的约束。</text>
				<text class="agreement-text">2.3 如果您不同意本协议的任何内容，您应立即停止注册或使用本应用服务。</text>
				
				<text class="agreement-section-title">3. 用户注册</text>
				<text class="agreement-text">3.1 您在使用本应用服务前，需要注册一个账号。</text>
				<text class="agreement-text">3.2 您应当提供真实、准确、完整的注册信息，并在信息变更时及时更新。</text>
				<text class="agreement-text">3.3 您应当妥善保管账号和密码，对账号下的所有行为负责。</text>
				
				<text class="agreement-section-title">4. 用户权利与义务</text>
				<text class="agreement-text">4.1 用户权利：</text>
				<text class="agreement-text">（1）使用本应用提供的各项服务；</text>
				<text class="agreement-text">（2）对本应用服务提出建议和意见；</text>
				<text class="agreement-text">（3）在遵守本协议的前提下，自由发布和传播内容；</text>
				<text class="agreement-text">（4）法律、法规规定的其他权利。</text>
				<text class="agreement-text">4.2 用户义务：</text>
				<text class="agreement-text">（1）遵守国家法律法规和本协议的规定；</text>
				<text class="agreement-text">（2）不得利用本应用进行违法犯罪活动；</text>
				<text class="agreement-text">（3）不得发布违法、有害、侵权、淫秽等内容；</text>
				<text class="agreement-text">（4）不得干扰本应用的正常运行；</text>
				<text class="agreement-text">（5）尊重其他用户的合法权益；</text>
				<text class="agreement-text">（6）法律、法规规定的其他义务。</text>
				
				<text class="agreement-section-title">5. 本应用的权利与义务</text>
				<text class="agreement-text">5.1 本应用权利：</text>
				<text class="agreement-text">（1）提供本应用服务；</text>
				<text class="agreement-text">（2）对用户的使用行为进行监督和管理；</text>
				<text class="agreement-text">（3）根据法律法规和本协议的规定，删除违法、有害、侵权、淫秽等内容；</text>
				<text class="agreement-text">（4）根据业务需要，调整本应用服务的内容和功能；</text>
				<text class="agreement-text">（5）法律、法规规定的其他权利。</text>
				<text class="agreement-text">5.2 本应用义务：</text>
				<text class="agreement-text">（1）为用户提供稳定、安全的服务；</text>
				<text class="agreement-text">（2）保护用户的个人信息安全；</text>
				<text class="agreement-text">（3）尊重用户的合法权益；</text>
				<text class="agreement-text">（4）法律、法规规定的其他义务。</text>
				
				<text class="agreement-section-title">6. 知识产权</text>
				<text class="agreement-text">6.1 本应用的所有内容，包括但不限于文字、图片、音频、视频、软件、程序、数据等，均受知识产权法律保护。</text>
				<text class="agreement-text">6.2 用户在使用本应用服务过程中产生的内容，其知识产权归用户所有，但本应用有权在本应用平台内使用、传播和推广。</text>
				<text class="agreement-text">6.3 未经本应用或相关权利人授权，用户不得复制、修改、传播、销售、出租本应用的任何内容。</text>
				
				<text class="agreement-section-title">7. 隐私保护</text>
				<text class="agreement-text">7.1 本应用重视用户的隐私保护，将按照《隐私政策》的规定保护用户的个人信息。</text>
				<text class="agreement-text">7.2 用户同意本应用按照《隐私政策》的规定收集、使用、存储和共享用户的个人信息。</text>
				
				<text class="agreement-section-title">8. 协议的变更与终止</text>
				<text class="agreement-text">8.1 本协议可能会根据法律法规的变化或业务发展需要进行修改，修改后的协议将在应用内发布。</text>
				<text class="agreement-text">8.2 用户继续使用本应用服务即表示同意修改后的协议。</text>
				<text class="agreement-text">8.3 用户违反本协议的规定，本应用有权终止其账号和服务。</text>
				<text class="agreement-text">8.4 用户可以随时申请注销账号，注销后本协议终止。</text>
				
				<text class="agreement-section-title">9. 违约责任</text>
				<text class="agreement-text">9.1 用户违反本协议的规定，应当承担相应的法律责任。</text>
				<text class="agreement-text">9.2 本应用违反本协议的规定，应当承担相应的法律责任。</text>
				
				<text class="agreement-section-title">10. 争议解决</text>
				<text class="agreement-text">10.1 本协议的解释和执行适用中华人民共和国法律。</text>
				<text class="agreement-text">10.2 因本协议产生的争议，应当通过友好协商解决；协商不成的，可以向有管辖权的人民法院提起诉讼。</text>
				
				<text class="agreement-section-title">11. 其他条款</text>
				<text class="agreement-text">11.1 本协议的标题仅供参考，不影响协议的解释和执行。</text>
				<text class="agreement-text">11.2 本协议的任何条款被认定为无效或不可执行，不影响其他条款的效力。</text>
				<text class="agreement-text">11.3 本协议自发布之日起生效。</text>
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

.agreement-container {
	flex: 1;
	padding: 20px 20px 20px 20px;
	overflow-y: auto;
}

.agreement-content {
	line-height: 1.8;
}

.agreement-section-title {
	display: block;
	font-size: 14px;
	font-weight: bold;
	color: #303132;
	margin-top: 15px;
	margin-bottom: 8px;
}

.agreement-section-title:first-child {
	margin-top: 0;
}

.agreement-text {
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