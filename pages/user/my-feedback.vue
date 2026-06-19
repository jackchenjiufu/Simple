<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">问题反馈</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" v-if="isLoggedIn">
			<view class="form-section">
				<!-- 反馈类型 -->
				<view class="form-group">
					<text class="form-label">反馈类型</text>
					<view class="picker-wrapper" @click="showTypePicker = true">
						<text class="picker-text" :class="{ placeholder: !form.type }">{{ form.type || '请选择反馈类型' }}</text>
						<text class="picker-arrow">›</text>
					</view>
				</view>

				<!-- 反馈内容 -->
				<view class="form-group">
					<text class="form-label">反馈内容 <text class="required">*</text></text>
					<textarea
						class="form-textarea"
						v-model="form.content"
						placeholder="请详细描述您遇到的问题或建议..."
						placeholder-class="placeholder-style"
						maxlength="500"
					></textarea>
					<text class="char-count">{{ form.content.length }}/500</text>
				</view>

				<!-- 联系方式 -->
				<view class="form-group">
					<text class="form-label">联系方式</text>
					<input
						class="form-input"
						v-model="form.contact"
						placeholder="手机号 / QQ / 微信（选填）"
						placeholder-class="placeholder-style"
					/>
				</view>

				<!-- 提交按钮 -->
				<button class="submit-btn" @click="handleSubmit" :loading="submitting" :disabled="submitting">
					{{ submitting ? '提交中...' : '提交反馈' }}
				</button>
			</view>
		</scroll-view>

		<!-- 未登录 -->
		<view class="login-box" v-if="!isLoggedIn">
			<text class="login-msg">请先登录</text>
		</view>

		<!-- 类型选择弹窗 -->
		<view class="modal-overlay" v-if="showTypePicker" @click.self="showTypePicker = false">
			<view class="modal-content" @click.stop>
				<view class="modal-header">
					<text class="modal-title">选择反馈类型</text>
				</view>
				<view class="type-list">
					<view
						class="type-item"
						v-for="(item, i) in typeOptions"
						:key="i"
						:class="{ active: form.type === item }"
						@click="selectType(item)"
					>
						<text class="type-text">{{ item }}</text>
						<text class="type-check" v-if="form.type === item">✓</text>
					</view>
				</view>
				<button class="modal-close-btn" @click="showTypePicker = false">取消</button>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0,
			isLoggedIn: false,
			submitting: false,
			showTypePicker: false,
			apiBase: 'http://139.196.185.197:7070/doo/server/api/',
			form: {
				type: '',
				content: '',
				contact: ''
			},
			typeOptions: ['功能建议', '界面反馈', '性能问题', '内容错误', '账号问题', '其他']
		};
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		const ui = uni.getStorageSync('userInfo');
		const loggedIn = uni.getStorageSync('isLoggedIn');
		if (loggedIn && ui) {
			this.isLoggedIn = true;
		}
	},
	methods: {
		goBack() {
			uni.navigateBack();
		},
		selectType(type) {
			this.form.type = type;
			this.showTypePicker = false;
		},
		handleSubmit() {
			if (!this.form.content.trim()) {
				uni.showToast({ title: '请填写反馈内容', icon: 'none' });
				return;
			}
			if (!this.form.type) {
				uni.showToast({ title: '请选择反馈类型', icon: 'none' });
				return;
			}

			this.submitting = true;
			const userInfo = uni.getStorageSync('userInfo');

			uni.request({
				url: this.apiBase + 'feedback.php',
				method: 'POST',
				data: {
					user_id: userInfo.id,
					type: this.form.type,
					content: this.form.content.trim(),
					contact: this.form.contact.trim()
				},
				header: { 'Content-Type': 'application/json' },
				success: (res) => {
					this.submitting = false;
					try {
						const result = res.data;
						if (result.code === 200) {
							uni.showToast({ title: '反馈提交成功，感谢您的支持！', icon: 'success' });
							setTimeout(() => uni.navigateBack(), 1500);
						} else {
							uni.showToast({ title: result.message || '提交失败', icon: 'none' });
						}
					} catch (e) {
						uni.showToast({ title: '服务器响应异常', icon: 'none' });
					}
				},
				fail: () => {
					this.submitting = false;
					uni.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
				}
			});
		}
	}
};
</script>

<style>
.content {
	width: 100%;
	min-height: 100vh;
	background-color: #f8f9fb;
	display: flex;
	flex-direction: column;
}

.status-bar {
	background-color: #ffffff;
	width: 100%;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88upx;
	background-color: #ffffff;
	padding: 0 24upx;
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
	font-size: 30upx;
	font-weight: 600;
	color: #303132;
}

.nav-placeholder {
	width: 72upx;
}

.body {
	flex: 1;
	padding: 24upx;
}

.form-section {
	background: #ffffff;
	border-radius: 16upx;
	padding: 32upx 28upx;
	box-shadow: 0 2upx 12upx rgba(0, 0, 0, 0.04);
}

.form-group {
	margin-bottom: 32upx;
}

.form-label {
	display: block;
	font-size: 28upx;
	font-weight: 500;
	color: #303132;
	margin-bottom: 16upx;
}

.required {
	color: #ef4444;
}

/* 选择器 */
.picker-wrapper {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88upx;
	padding: 0 24upx;
	background: #f8f9fb;
	border-radius: 12upx;
	border: 1px solid #e8e8e8;
}

.picker-text {
	font-size: 28upx;
	color: #303132;
}

.picker-text.placeholder {
	color: #c0c4cc;
}

.picker-arrow {
	font-size: 36upx;
	color: #c0c4cc;
	font-weight: 300;
}

/* 输入框 */
.form-input {
	height: 88upx;
	padding: 0 24upx;
	background: #f8f9fb;
	border-radius: 12upx;
	border: 1px solid #e8e8e8;
	font-size: 28upx;
	color: #303132;
}

.form-textarea {
	width: 100%;
	min-height: 240upx;
	padding: 24upx;
	background: #f8f9fb;
	border-radius: 12upx;
	border: 1px solid #e8e8e8;
	font-size: 28upx;
	color: #303132;
	box-sizing: border-box;
}

.placeholder-style {
	color: #c0c4cc;
	font-size: 28upx;
}

.char-count {
	display: block;
	text-align: right;
	font-size: 22upx;
	color: #c0c4cc;
	margin-top: 8upx;
}

/* 提交按钮 */
.submit-btn {
	width: 100%;
	height: 88upx;
	line-height: 88upx;
	background: #3071f6;
	color: #ffffff;
	font-size: 30upx;
	font-weight: 600;
	border-radius: 16upx;
	border: none;
	margin-top: 16upx;
}

.submit-btn:active {
	background: #285ed4;
}

.submit-btn[disabled] {
	opacity: 0.7;
}

/* 未登录 */
.login-box {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.login-msg {
	font-size: 28upx;
	color: #909398;
}

/* 弹窗 */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	z-index: 9999;
}

.modal-content {
	background-color: #ffffff;
	border-radius: 24upx 24upx 0 0;
	width: 100%;
	padding: 32upx 28upx;
	padding-bottom: calc(40upx + env(safe-area-inset-bottom));
	box-shadow: 0 -4upx 20upx rgba(0, 0, 0, 0.08);
}

.modal-header {
	text-align: center;
	margin-bottom: 24upx;
}

.modal-title {
	font-size: 30upx;
	font-weight: 600;
	color: #303132;
}

.type-list {
	margin-bottom: 24upx;
}

.type-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28upx 16upx;
	border-bottom: 1px solid #f3f4f6;
}

.type-item.active {
	background: #f0f5ff;
	border-radius: 12upx;
}

.type-item:last-child {
	border-bottom: none;
}

.type-text {
	font-size: 28upx;
	color: #303132;
}

.type-check {
	font-size: 32upx;
	color: #3071f6;
	font-weight: 600;
}

.modal-close-btn {
	width: 100%;
	height: 88upx;
	line-height: 88upx;
	background: #f3f4f6;
	color: #303132;
	font-size: 28upx;
	border-radius: 16upx;
	border: none;
}

.modal-close-btn:active {
	opacity: 0.7;
}

/* 隐藏滚动条 */
::-webkit-scrollbar {
	width: 0;
	height: 0;
	display: none;
}
</style>
