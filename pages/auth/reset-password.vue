<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">重置密码</text>
					<text class="header-subtitle">验证码已发送到你的邮箱</text>
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
				<text class="form-subtitle">设置新密码以继续使用</text>

				<view class="form-item">
					<text class="input-label">验证码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'code' }">
						<input class="input" v-model="code" placeholder="请输入6位验证码" maxlength="6"
							@focus="focusedField='code'" @blur="focusedField=''" />
					</view>
				</view>

				<view class="form-item">
					<text class="input-label">新密码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'password' }">
						<input class="input" v-model="newPassword" type="password" placeholder="至少6位密码"
							@focus="focusedField='password'" @blur="focusedField=''" />
					</view>
				</view>

				<view class="form-item">
					<text class="input-label">确认密码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'confirm' }">
						<input class="input" v-model="confirmPassword" type="password" placeholder="请再次输入新密码"
							@focus="focusedField='confirm'" @blur="focusedField=''" />
					</view>
				</view>

				<button class="btn-primary" @click="handleReset" :class="{ 'btn-loading': loading }">
					<text v-if="!loading">确认重置</text>
					<text v-else>重置中...</text>
				</button>

				<view class="switch-mode">
					<text class="switch-link" :class="{ disabled: countdown > 0 }" @click="resendCode">
						<text v-if="countdown > 0">{{ countdown }}s 后重新发送</text>
						<text v-else>重新发送验证码</text>
					</text>
					<text class="switch-text"> | </text>
					<text class="switch-link" @click="goLogin">返回登录</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			code: '',
			newPassword: '',
			confirmPassword: '',
			statusBarHeight: 0,
			loading: false,
			focusedField: '',
			email: '',
			countdown: 60,
			timer: null
		}
	},
	onLoad(options) {
		const systemInfo = uni.getSystemInfoSync();
			this.statusBarHeight = systemInfo.statusBarHeight || 0;
			this.email = options.email ? decodeURIComponent(options.email) : '';
		this.startCountdown();
	},
	onUnload() {
		if (this.timer) clearInterval(this.timer);
	},
	methods: {
		startCountdown() {
			this.countdown = 60;
			if (this.timer) clearInterval(this.timer);
			this.timer = setInterval(() => {
				this.countdown--;
				if (this.countdown <= 0) {
					clearInterval(this.timer);
					this.timer = null;
				}
			}, 1000);
		},
		goBack() {
			uni.navigateBack();
		},
		goLogin() {
			uni.navigateTo({ url: '/pages/auth/login' });
		},
		async resendCode() {
			if (this.countdown > 0) return;
			if (!this.email) {
				uni.showToast({ title: '邮箱信息丢失', icon: 'none' });
				return;
			}
			uni.showLoading({ title: '发送中...' });
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'send_code.php',
					method: 'POST',
					data: { email: this.email },
					header: { 'Content-Type': 'application/json' }
				});
				uni.hideLoading();
				if (res.data.code === 200) {
					uni.showToast({ title: '验证码已重新发送', icon: 'success' });
					this.startCountdown();
				} else {
					uni.showToast({ title: res.data.message || '发送失败', icon: 'none' });
				}
			} catch (e) {
				uni.hideLoading();
				uni.showToast({ title: '网络错误', icon: 'none' });
			}
		},
		async handleReset() {
			if (!this.email) {
				uni.showToast({ title: '请重新获取验证码', icon: 'none' });
				return;
			}
			if (!this.code || this.code.length !== 6) {
				uni.showToast({ title: '请输入6位验证码', icon: 'none' });
				return;
			}
			if (!this.newPassword || this.newPassword.length < 6) {
				uni.showToast({ title: '密码至少6位', icon: 'none' });
				return;
			}
			if (this.newPassword !== this.confirmPassword) {
				uni.showToast({ title: '两次密码不一致', icon: 'none' });
				return;
			}

			this.loading = true;
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'reset_password.php',
					method: 'POST',
					data: { email: this.email, code: this.code, new_password: this.newPassword },
					header: { 'Content-Type': 'application/json' }
				});
				this.loading = false;
				if (res.data.code === 200) {
					uni.showToast({ title: '密码重置成功', icon: 'success' });
					setTimeout(() => {
						uni.navigateTo({ url: '/pages/auth/login' });
					}, 1500);
				} else {
					const msg = res.data.message || '';
					if (msg.indexOf('过期') >= 0 || msg.indexOf('expired') >= 0) {
						uni.showModal({
							title: '验证码已过期',
							content: '请重新获取验证码',
							success: (r) => { if (r.confirm) this.resendCode(); }
						});
					} else {
						uni.showToast({ title: msg || '重置失败', icon: 'none' });
					}
				}
			} catch (e) {
				this.loading = false;
				uni.showToast({ title: '网络错误', icon: 'none' });
			}
		}
	}
}
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
	font-size: 48upx;
	font-weight: 700;
	color: #ffffff;
	line-height: 1.2;
	margin-bottom: 12upx;
}

.header-subtitle {
	font-size: 24upx;
	color: rgba(255, 255, 255, 0.65);
}

/* ===================== 右侧角色插画 ===================== */
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

/* 装饰圆点 */
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
	font-size: 26upx;
	color: #9e9fa1;
	display: block;
	margin-bottom: 40upx;
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

/* ===================== 提交按钮 ===================== */
.btn-primary {
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
	margin-bottom: 24upx;
	transition: all 0.25s ease;
}

.btn-primary:active {
	background: #285ed4;
	transform: scale(0.98);
}

.btn-primary.btn-loading {
	opacity: 0.7;
	pointer-events: none;
}

/* ===================== 切换模式 ===================== */
.switch-mode {
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8upx;
}

.switch-text {
	font-size: 26upx;
	color: #909398;
}

.switch-link {
	font-size: 26upx;
	color: #3071f6;
	font-weight: 600;
}

.switch-link:active {
	opacity: 0.7;
}

.switch-link.disabled {
	color: #c0c4cc;
	pointer-events: none;
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
		transform: translateY(-24upx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
