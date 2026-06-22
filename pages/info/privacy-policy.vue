<template>
	<view class="content">
		<NavBar title="隐私政策" />

		<scroll-view class="doc-container" scroll-y="true" show-scrollbar="false">
			<view class="doc-content">
				<text class="doc-section-title">1. 引言</text>
				<text class="doc-text">欢迎使用 Date Of Origin（以下简称"本应用"或"我们"）。我们深知个人信息对您的重要性，并会全力保护您的个人信息安全。本隐私政策旨在向您说明我们如何收集、使用、存储、共享和保护您的个人信息，以及您享有的相关权利。请您在使用本应用前仔细阅读并充分理解本政策。</text>

				<text class="doc-section-title">2. 信息收集</text>
				<text class="doc-text">2.1 注册信息：当您注册本应用账号时，我们会收集您的用户名、密码（经加密存储）、邮箱地址（用于找回密码）及头像（可选）。</text>
				<text class="doc-text">2.2 个人资料信息：您可以在个人资料页面自愿填写或修改昵称、头像、个人简介等信息，这些信息将展示在您的个人主页上。</text>
				<text class="doc-text">2.3 设备信息：我们会收集您的设备型号、操作系统版本、设备标识符、网络状态等信息，用于优化应用兼容性和保障账号安全。</text>
				<text class="doc-text">2.4 使用记录：我们会收集您在本应用内的操作行为数据，包括但不限于登录时间、浏览内容、发布内容、点赞收藏、关注关系、消息记录等，用于为您提供服务和改进产品体验。</text>
				<text class="doc-text">2.5 AI 助手交互数据：当您使用本应用的 AI 助手功能时，您输入的对话内容将被发送至我们的服务器进行处理。我们不会将您的对话内容用于模型训练或提供给第三方。</text>
				<text class="doc-text">2.6 工资管理数据：如果您使用工资管理功能（五险一金计算、个税计算等），您输入的薪资信息仅用于本地计算和展示，相关数据仅存储在您的设备及我们的服务器中，不会用于其他用途。</text>
				<text class="doc-text">2.7 文件与多媒体信息：当您使用上传头像、发布图文等内容时，我们需要访问您的相册或相机权限。我们仅在您主动触发上传操作时获取相应文件。</text>

				<text class="doc-section-title">3. 权限申请及用途</text>
				<text class="doc-text">3.1 相机权限（CAMERA）：用于拍照上传头像、拍摄照片发布内容。仅在您主动使用拍照功能时申请。</text>
				<text class="doc-text">3.2 存储权限：用于保存应用缓存数据及您下载的内容，提升加载速度和离线体验。</text>
				<text class="doc-text">3.3 网络权限（ACCESS_NETWORK_STATE / ACCESS_WIFI_STATE）：用于连接服务器获取内容、发送消息和进行数据同步。</text>
				<text class="doc-text">3.4 设备信息权限（READ_PHONE_STATE）：用于生成设备标识符，保障账号安全和防止恶意注册。我们不会收集通话状态或任何通讯类信息。</text>
				<text class="doc-text">3.5 上述权限均仅在您使用对应功能时触发，您可以在系统设置中随时关闭已授权的权限。</text>

				<text class="doc-section-title">4. 信息使用</text>
				<text class="doc-text">4.1 提供服务：我们使用您的个人信息为您提供注册登录、内容浏览与发布、即时通讯、AI 助手对话、工资管理等核心功能。</text>
				<text class="doc-text">4.2 个性化推荐：我们会根据您的浏览和互动记录为您推荐感兴趣的内容。</text>
				<text class="doc-text">4.3 优化服务：我们会分析用户的使用数据以改进应用性能、修复问题和开发新功能。</text>
				<text class="doc-text">4.4 安全保障：我们使用您的设备信息和登录记录来检测异常行为，保障账号安全。</text>

				<text class="doc-section-title">5. 信息存储与保护</text>
				<text class="doc-text">5.1 存储位置：您的个人信息存储于我们部署在中国大陆（阿里云）的服务器上。</text>
				<text class="doc-text">5.2 存储期限：我们仅在为您提供服务所必需的期限内保留您的个人信息。账号注销后，我们将依法删除或匿名化处理您的个人信息。</text>
				<text class="doc-text">5.3 安全措施：我们采取传输加密（HTTPS）、存储加密、访问控制、日志审计等技术和管理措施保护您的个人信息安全。</text>
				<text class="doc-text">5.4 尽管我们采取了上述措施，但请理解互联网环境并非绝对安全，我们建议您妥善保管账号密码。</text>

				<text class="doc-section-title">6. 信息共享与委托处理</text>
				<text class="doc-text">6.1 我们不会向任何第三方出售您的个人信息。</text>
				<text class="doc-text">6.2 我们目前未接入任何第三方数据分析或广告 SDK。如未来因业务需要引入第三方服务，我们会另行告知并征得您的同意。</text>
				<text class="doc-text">6.3 在以下情况下，我们可能会依法共享您的信息：应法律法规要求、保护人身安全或维护公共利益所必需。</text>

				<text class="doc-section-title">7. 您的权利</text>
				<text class="doc-text">7.1 查阅权：您可以在个人资料页面查看您的基本信息。</text>
				<text class="doc-text">7.2 更正权：您可以随时修改或更新您的个人资料信息。</text>
				<text class="doc-text">7.3 删除权：您可以在设置中注销账号，注销后我们将删除或匿名化处理您的个人信息。</text>
				<text class="doc-text">7.4 撤回同意权：您可以在系统设置中关闭已授权的权限，撤回对相应信息收集的同意。</text>
				<text class="doc-text">7.5 投诉举报权：如您认为我们的处理行为侵害了您的个人信息权益，您有权向有关监管部门投诉。</text>

				<text class="doc-section-title">8. 未成年人保护</text>
				<text class="doc-text">8.1 本应用不面向 14 周岁以下的未成年人提供服务。如您是 14 至 18 周岁的未成年人，请在监护人的陪同下阅读并同意本政策。</text>
				<text class="doc-text">8.2 如果我们发现收集了未成年人的个人信息，我们将及时删除。</text>

				<text class="doc-section-title">9. 隐私政策更新</text>
				<text class="doc-text">我们可能会不时更新本隐私政策。更新后的政策将在本应用内发布并提示您查阅。如涉及重大变更，我们会在应用内以弹窗或显著方式通知您。您继续使用本应用即表示同意更新后的政策。</text>

				<text class="doc-section-title">10. 联系方式</text>
				<text class="doc-text">如您对本隐私政策有任何疑问、意见或投诉，请通过以下方式联系我们：</text>
				<text class="doc-text">电子邮件：2064553902@qq.com</text>
				<text class="doc-text">我们将尽快审核您的问题，并在 15 个工作日内予以回复。</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import NavBar from '../../components/nav-bar.vue';
export default {
	components: { NavBar }
};
</script>

<style>
.content { width: 100%; height: 100vh; background-color: #f8f9fb; display: flex; flex-direction: column; overflow: hidden; }
.doc-container { flex: 1; min-height: 0; padding: 20px; }
.doc-content { line-height: 1.8; }
.doc-section-title { display: block; font-size: 15px; font-weight: 600; color: #303132; margin-top: 20px; margin-bottom: 8px; }
.doc-section-title:first-child { margin-top: 0; }
.doc-text { display: block; font-size: 14px; color: #6b7280; margin-bottom: 8px; text-align: justify; line-height: 1.7; }
::-webkit-scrollbar { width: 0; height: 0; display: none; }
</style>
