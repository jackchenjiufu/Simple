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
				<text class="header-title">安全设置</text>
				<text class="header-subtitle">请设置您的新密码</text>
			</view>
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
		</view>

		<!-- 表单区域 -->
		<view class="form-section">
			<view class="form-card">
				<!-- 原密码 -->
				<view class="form-item">
					<text class="label">原密码</text>
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
					<text class="label">新密码</text>
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
					<text class="label">确认密码</text>
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
			apiBase: 'http://139.196.185.197:7070/doo/server/api/'
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
		goBack() {
			uni.navigateBack();
		},

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
					url: this.apiBase + 'change_password.php',
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
					uni.showToast({ title: '密码修改成功', icon: 'success' });
					setTimeout(() => { uni.navigateBack(); }, 1500);
				} else {
					uni.showToast({ title: res.data.message || '密码修改失败', icon: 'none' });
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
	background: #1b44a6;
	border-radius: 0 0 48upx 48upx;
	padding-bottom: 60upx;
	overflow: hidden;
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
	width: 60upx;
}

.header-content {
	position: relative;
	z-index: 2;
	padding: 20upx 40upx 0;
	text-align: left;
	padding-left: 48upx;
}

.header-title {
	font-size: 34upx;
	font-weight: 700;
	color: #ffffff;
	display: block;
	margin-bottom: 8upx;
}

.header-subtitle {
	font-size: 24upx;
	color: rgba(255, 255, 255, 0.65);
	display: block;
}

.deco-dot {
	position: absolute;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.08);
	z-index: 1;
}

.dot-1 {
	width: 180upx;
	height: 180upx;
	top: -50upx;
	right: -40upx;
}

.dot-2 {
	width: 100upx;
	height: 100upx;
	bottom: 10upx;
	left: -20upx;
}

/* ===================== 表单区域 ===================== */
.form-section {
	flex: 1;
	background: #ffffff;
	padding: 0 40upx;
	margin-top: -40upx;
	padding-top: 0;
	box-sizing: border-box;
}

.form-card {
	background: #ffffff;
	border-radius: 24upx;
	padding: 36upx;
	box-shadow: 0 4upx 24upx rgba(0, 0, 0, 0.06);
	position: relative;
	z-index: 3;
}

/* ===================== 表单项 ===================== */
.form-item {
	margin-bottom: 28upx;
}

.label {
	font-size: 26upx;
	color: #303132;
	display: block;
	margin-bottom: 14upx;
	font-weight: 500;
}

.input-wrapper {
	display: flex;
	align-items: center;
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
	flex: 1;
	height: 88upx;
	font-size: 28upx;
	color: #1A1A2E;
	border: none;
	background: transparent;
	padding-right: 80upx;
}

.input::placeholder {
	color: #b6bcc8;
}

.toggle-password {
	position: absolute;
	right: 20upx;
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
	letter-spacing: 4upx;
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

/* 隐藏滚动条 */
::-webkit-scrollbar {
	width: 0;
	height: 0;
	display: none;
}
</style>