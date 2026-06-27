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

		<view class="feedback-tab-bar" v-if="isLoggedIn">
			<view class="feedback-tab-item" :class="{ active: tab === 'submit' }" @click="tab='submit'">提交反馈</view>
			<view class="feedback-tab-item" :class="{ active: tab === 'history' }" @click="tab='history';loadHistory()">历史反馈</view>
		</view>
		<scroll-view class="body" scroll-y="true" v-if="isLoggedIn" show-scrollbar="false">
			<view class="form-section" v-if="tab === 'submit'">
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
			<!-- 历史反馈 -->
			<view class="history-section" v-if="tab === 'history'">
				<view class="history-item" v-for="(item, i) in historyList" :key="i">
					<view class="history-row">
						<text class="history-type">{{ item.type }}</text>
						<text class="history-status" :class="'s' + (item.status || 0)">{{ item.status === 2 ? '已解决' : item.status === 1 ? '已读' : '待处理' }}</text>
					</view>
					<text class="history-content">{{ item.content }}</text>
					<text class="history-time">{{ formatTime(item.created_at) }}</text>
				</view>
				<view class="history-empty" v-if="!historyList.length">
					<text class="empty-text">暂无反馈记录</text>
				</view>
			</view>
		</scroll-view>

		<!-- 未登录 -->
		<view class="login-box" v-if="!isLoggedIn">
			<text class="login-msg">请先登录</text>
		</view>

		<!-- 类型选择弹窗 -->
		<view class="modal-overlay" v-if="showTypePicker" @click.self="showTypePicker = false" :class="{ show: showTypePicker }">
			<view class="modal-content" @click.stop>
				<view class="modal-handle"></view>
				<view class="modal-header">
					<text class="modal-icon">📋</text>
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
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			statusBarHeight: 0,
			isLoggedIn: false,
			submitting: false,
			showTypePicker: false,
			tab: 'submit',
			historyList: [],
			showDetail: false,
			historyDetail: {},
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
				url: apiConfig.baseUrl + 'feedback.php',
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
	animation: fadeIn 0.2s ease;
}

.modal-content {
	background-color: #ffffff;
	border-radius: 24upx 24upx 0 0;
	width: 100%;
	padding: 16upx 28upx 40upx;
	padding-bottom: calc(40upx + env(safe-area-inset-bottom));
	box-shadow: 0 -4upx 20upx rgba(0, 0, 0, 0.08);
	animation: slideUp 0.3s ease;
}

.modal-handle {
	width: 64upx;
	height: 6upx;
	background: #e5e7eb;
	border-radius: 3upx;
	margin: 0 auto 20upx;
}

.modal-header {
	text-align: center;
	margin-bottom: 28upx;
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
	padding: 24upx 20upx;
	margin-bottom: 4upx;
	border-radius: 12upx;
	border-bottom: 1px solid #f3f4f6;
	transition: all 0.15s ease;
}

.type-item:active {
	background: #f3f6fc;
	transform: scale(0.98);
}

.type-item.active {
	background: #f0f5ff;
	border-radius: 12upx;
	border-left: 4upx solid #3071f6;
	padding-left: 16upx;
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
	background: #ffffff;
	color: #3071f6;
	font-size: 28upx;
	font-weight: 500;
	border-radius: 16upx;
	border: 2upx solid #3071f6;
	transition: all 0.15s ease;
}

.modal-close-btn:active {
	background: #f0f5ff;
	transform: scale(0.98);
}

@keyframes slideUp {
	from { transform: translateY(100%); }
	to { transform: translateY(0); }
}
@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

/* 反馈详情弹窗 */
.detail-overlay {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
	z-index: 9999; padding: 40upx;
}
.detail-card {
	background: #fff; border-radius: 20upx; padding: 32upx;
	width: 100%; max-width: 560upx; box-shadow: 0 8upx 40upx rgba(0,0,0,0.15);
}
.detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20upx; }
.detail-label { font-size: 28upx; font-weight: 600; color: #303132; }
.detail-status { font-size: 22upx; padding: 4upx 16upx; border-radius: 999upx; }
.detail-status.s0 { background: #fef3c7; color: #d97706; }
.detail-status.s1 { background: #dbeafe; color: #2563eb; }
.detail-status.s2 { background: #d1fae5; color: #059669; }
.detail-content { font-size: 26upx; color: #4b5563; line-height: 1.6; margin-bottom: 16upx; }
.detail-reply { background: #f0f4ff; padding: 16upx; border-radius: 12upx; margin-bottom: 16upx; }
.detail-reply-label { font-size: 22upx; color: #1b44a6; font-weight: 500; display: block; margin-bottom: 6upx; }
.detail-reply-text { font-size: 26upx; color: #374151; }
.detail-time { font-size: 22upx; color: #c0c4cc; display: block; margin-bottom: 16upx; }
.detail-close { width: 100%; height: 80upx; line-height: 80upx; background: #f3f4f6; color: #6b7280; font-size: 28upx; border: none; border-radius: 12upx; }

.history-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6upx; }
.history-item { padding: 16upx 0; border-bottom: 1px solid #f5f5f5; }
.history-item:active { background: #f9fafb; }
.history-time { font-size: 20upx; color: #d1d5db; }
.empty-sub { font-size: 24upx; color: #3071f6; text-align: center; display: block; margin-top: 12upx; }

/* 顶部标签栏 */
.feedback-tab-bar { display: flex; background: #ffffff; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.feedback-tab-item { flex: 1; text-align: center; padding: 24upx 0 20upx; font-size: 28upx; color: #909398; position: relative; }
.feedback-tab-item.active { color: #1b44a6; font-weight: 600; }
.feedback-tab-item.active::after { content: ""; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 40upx; height: 4upx; background: #1b44a6; border-radius: 2upx; }

/* 隐藏滚动条 */
::-webkit-scrollbar {
	width: 0;
	height: 0;
	display: none;
}
</style>
