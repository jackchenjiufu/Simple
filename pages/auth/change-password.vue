<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="nav-bar">
				<view class="nav-back" @click="goBack">
					<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
				</view>
				<text class="nav-title">修改密码</text>
				<view class="nav-placeholder"></view>
			</view>
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">安全设置</text>
					<text class="header-subtitle">保护您的账号安全</text>
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

		<!-- 表单区域 -->
		<view class="form-section">
			<view class="form-card">
				<text class="form-subtitle">请输入原密码并设置新密码</text>

				<!-- 原密码 -->
				<view class="form-item">
					<text class="input-label">原密码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'old' }">
						<input class="input" v-model="oldPassword" :type="showOldPassword ? 'text' : 'password'"
							placeholder="请输入原密码" @focus="focusedField='old'" @blur="focusedField=''" />
						<text class="toggle-password" @click="showOldPassword = !showOldPassword">
							{{ showOldPassword ? '隐藏' : '显示' }}
						</text>
					</view>
				</view>

				<!-- 新密码 -->
				<view class="form-item">
					<text class="input-label">新密码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'new' }">
						<input class="input" v-model="newPassword" :type="showNewPassword ? 'text' : 'password'"
							placeholder="6-20位密码" maxlength="20" @focus="focusedField='new'" @blur="focusedField=''"
							@input="checkPasswordStrength" />
						<text class="toggle-password" @click="showNewPassword = !showNewPassword">
							{{ showNewPassword ? '隐藏' : '显示' }}
						</text>
					</view>
					<view class="password-strength" v-if="newPassword">
						<text class="strength-label">强度</text>
						<view class="strength-bar">
							<view class="strength-fill" :class="passwordStrength.class"></view>
						</view>
						<text class="strength-text" :class="passwordStrength.class">{{ passwordStrength.text }}</text>
					</view>
				</view>

				<!-- 确认密码 -->
				<view class="form-item">
					<text class="input-label">确认密码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'confirm' }">
						<input class="input" v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'"
							placeholder="请再次输入新密码" @focus="focusedField='confirm'" @blur="focusedField=''"
							@input="checkPasswordMatch" />
						<text class="toggle-password" @click="showConfirmPassword = !showConfirmPassword">
							{{ showConfirmPassword ? '隐藏' : '显示' }}
						</text>
					</view>
					<text class="match-hint" v-if="confirmPassword">
						<text class="match-success" v-if="passwordMatch">✓ 密码一致</text>
						<text class="match-error" v-else>✗ 密码不一致</text>
					</text>
				</view>

				<button class="btn-submit" @click="confirmChangePassword" :disabled="!canSubmit">确认修改</button>
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
			oldPassword: '',
			newPassword: '',
			confirmPassword: '',
			showOldPassword: false,
			showNewPassword: false,
			showConfirmPassword: false,
			passwordStrength: { score: 0, text: '', class: '' },
			passwordMatch: false,
			userInfo: null,
			focusedField: '',
		};
	},
	computed: {
		canSubmit() {
			return this.oldPassword &&
				this.newPassword &&
				this.confirmPassword &&
				this.newPassword === this.confirmPassword &&
				this.newPassword.length >= 6;
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		const userInfo = uni.getStorageSync('userInfo');
		if (userInfo) {
			this.userInfo = userInfo;
		}
	},
	methods: {
		goBack() { uni.navigateBack(); },

		checkPasswordStrength() {
			if (!this.newPassword) {
				this.passwordStrength = { score: 0, text: '', class: '' };
				return;
			}
			let score = 0;
			const pwd = this.newPassword;
			if (pwd.length >= 6) score++;
			if (pwd.length >= 10) score++;
			if (/[a-z]/.test(pwd)) score++;
			if (/[A-Z]/.test(pwd)) score++;
			if (/[0-9]/.test(pwd)) score++;
			if (/[^a-zA-Z0-9]/.test(pwd)) score++;
			this.passwordStrength = score <= 2
				? { text: '弱', class: 'weak' }
				: score <= 4
					? { text: '中', class: 'medium' }
					: { text: '强', class: 'strong' };
		},

		checkPasswordMatch() {
			this.passwordMatch = !!this.confirmPassword && this.newPassword === this.confirmPassword;
		},

		async confirmChangePassword() {
			if (!this.canSubmit) return;
			if (!this.userInfo) {
				uni.showToast({ title: '请先登录', icon: 'none' });
				return;
			}
			uni.showLoading({ title: '修改中...' });
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'change_password.php',
					method: 'POST',
					data: {
						user_id: this.userInfo.id,
						old_password: this.oldPassword,
						new_password: this.newPassword
					},
					header: { 'Content-Type': 'application/json' }
				});
				uni.hideLoading();
				if (res.statusCode === 200) {
					const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
					if (result.code === 200) {
						uni.showToast({ title: '密码修改成功', icon: 'success' });
						setTimeout(() => { uni.navigateBack(); }, 1500);
					} else {
						uni.showToast({ title: result.message || '密码修改失败', icon: 'none' });
					}
				} else {
					uni.showToast({ title: '密码修改失败', icon: 'none' });
				}
			} catch (error) {
				uni.hideLoading();
				uni.showToast({ title: '网络错误', icon: 'none' });
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

.status-bar {
	width: 100%;
	background: #1b44a6;
}

/* ===================== 深蓝色头部 ===================== */
.header-section {
	position: relative;
	width: 100%;
	background: #1b44a6;
	overflow: hidden;
	box-sizing: border-box;
	animation: fadeDown 0.5s ease-out;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12upx 24upx 0;
	position: relative;
	z-index: 2;
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
	font-size: 32upx;
	font-weight: 600;
	color: #ffffff;
	letter-spacing: 2upx;
}

.nav-placeholder {
	width: 72upx;
}

.header-content {
	position: relative;
	z-index: 2;
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	padding: 60upx 48upx 80upx;
	min-height: 360upx;
}

.header-left {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.header-greeting {
	font-size: 56upx;
	font-weight: 700;
	color: #ffffff;
	line-height: 1.2;
	margin-bottom: 12upx;
}

.header-subtitle {
	font-size: 24upx;
	color: rgba(255, 255, 255, 0.65);
}

.header-right {
	width: 220upx;
	height: 260upx;
	position: relative;
	flex-shrink: 0;
}

.character-area {
	position: relative;
	width: 100%;
	height: 100%;
}

.char-circle-1 {
	position: absolute;
	width: 140upx;
	height: 140upx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.08);
	top: 10upx;
	right: -10upx;
}

.char-circle-2 {
	position: absolute;
	width: 80upx;
	height: 80upx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.12);
	bottom: 20upx;
	right: 20upx;
}

.char-body {
	position: absolute;
	width: 100upx;
	height: 120upx;
	background: rgba(255, 255, 255, 0.15);
	border-radius: 50upx 50upx 30upx 30upx;
	bottom: 20upx;
	right: 40upx;
}

.char-head {
	position: absolute;
	width: 80upx;
	height: 80upx;
	background: rgba(255, 215, 200, 0.35);
	border-radius: 50%;
	top: 50upx;
	right: 50upx;
}

.deco-dot {
	position: absolute;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.06);
	z-index: 1;
}

.dot-1 {
	width: 300upx;
	height: 300upx;
	top: -100upx;
	right: 30upx;
}

.dot-2 {
	width: 160upx;
	height: 160upx;
	bottom: 40upx;
	left: -40upx;
}

.dot-3 {
	width: 100upx;
	height: 100upx;
	top: 40upx;
	left: 160upx;
}

/* ===================== 表单区域 ===================== */
.form-section {
	flex: 1;
	background: #ffffff;
	padding: 0 40upx;
	margin-top: -40upx;
	box-sizing: border-box;
}

.form-card {
	background: #ffffff;
	border-radius: 24upx;
	padding: 40upx 36upx;
	box-shadow: 0 4upx 32upx rgba(0, 0, 0, 0.06);
	position: relative;
	z-index: 3;
	animation: fadeUp 0.5s ease-out;
}

.form-subtitle {
	display: block;
	font-size: 26upx;
	color: #9e9fa1;
	margin-bottom: 40upx;
	text-align: center;
}

/* ===================== 表单项 ===================== */
.form-item {
	margin-bottom: 28upx;
}

.input-label {
	font-size: 26upx;
	color: #303132;
	display: block;
	margin-bottom: 14upx;
	font-weight: 500;
}

.input-wrapper {
	background-color: #ffffff;
	border: 2upx solid #dde1e8;
	border-radius: 16upx;
	padding: 0 20upx;
	transition: all 0.25s ease;
	position: relative;
}

.input-wrapper.input-focused {
	border-color: #3071f6;
	box-shadow: 0 0 0 4upx rgba(48, 113, 246, 0.08);
}

.input {
	width: 100%;
	height: 88upx;
	font-size: 28upx;
	color: #1A1A2E;
	border: none;
	background: transparent;
	box-sizing: border-box;
}

.input::placeholder {
	color: #b6bcc8;
}

.toggle-password {
	position: absolute;
	right: 20upx;
	top: 50%;
	transform: translateY(-50%);
	font-size: 22upx;
	color: #909398;
	z-index: 2;
	padding: 10upx;
}

/* 密码强度 */
.password-strength {
	display: flex;
	align-items: center;
	margin-top: 16upx;
	padding: 16upx;
	background-color: #f8f9fb;
	border-radius: 12upx;
}

.strength-label {
	font-size: 22upx;
	color: #909398;
	margin-right: 16upx;
	flex-shrink: 0;
}

.strength-bar {
	flex: 1;
	height: 8upx;
	background-color: #e8e8ed;
	border-radius: 4upx;
	overflow: hidden;
}

.strength-fill {
	height: 100%;
	width: 0;
	border-radius: 4upx;
	transition: width 0.3s ease;
}

.strength-fill.weak {
	width: 33%;
	background-color: #ff6b6b;
}

.strength-fill.medium {
	width: 66%;
	background-color: #ffa94d;
}

.strength-fill.strong {
	width: 100%;
	background-color: #51cf66;
}

.strength-text {
	font-size: 22upx;
	margin-left: 12upx;
	flex-shrink: 0;
}

.strength-text.weak { color: #ff6b6b; }
.strength-text.medium { color: #ffa94d; }
.strength-text.strong { color: #51cf66; }

/* 密码匹配提示 */
.match-hint {
	display: block;
	margin-top: 12upx;
	padding: 8upx 16upx;
	border-radius: 8upx;
	font-size: 22upx;
}

.match-success { color: #51cf66; }
.match-error { color: #ff6b6b; }

/* ===================== 提交按钮 ===================== */
.btn-submit {
	width: 100%;
	height: 96upx;
	line-height: 96upx;
	background: #3071f6;
	color: #ffffff;
	border-radius: 16upx;
	font-size: 32upx;
	font-weight: 600;
	letter-spacing: 6upx;
	border: none;
	margin-top: 12upx;
	transition: all 0.25s ease;
}

.btn-submit:active {
	background: #285ed4;
	transform: scale(0.98);
}

.btn-submit:disabled {
	opacity: 0.5;
}
.btn-submit::after {
	border: none;
}

/* ===================== 动画 ===================== */
@keyframes fadeUp {
	from {
		opacity: 0;
		transform: translateY(24upx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes fadeDown {
	from {
		opacity: 0;
		transform: translateY(-20upx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* 隐藏滚动条 */
::-webkit-scrollbar {
	width: 0;
	height: 0;
	display: none;
}
</style>
