<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">Hello!</text>
					<text class="header-title">欢迎回来</text>
					<text class="header-subtitle">登录账号继续使用</text>
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
				<!-- 欢迎文本 -->
				<text class="form-subtitle">登录以继续使用</text>

				<!-- 用户名输入框 -->
				<view class="form-item">
					<text class="input-label">账号</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'username' }">
						<input class="input" v-model="username" placeholder="请输入您的账号" maxlength="20"
							@focus="focusedField='username'" @blur="focusedField=''" />
					</view>
				</view>

				<!-- 密码输入框 -->
				<view class="form-item">
					<text class="input-label">密码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'password' }">
						<input class="input" v-model="password" type="password" placeholder="请输入您的密码"
							@focus="focusedField='password'" @blur="focusedField=''" />
					</view>
				</view>

				<!-- 邮箱（注册时显示） -->
				<view class="form-item" v-if="isRegister">
					<text class="input-label">邮箱</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'email' }">
						<input class="input" v-model="email" type="email" placeholder="请输入邮箱（用于找回密码）"
							@focus="focusedField='email'" @blur="focusedField=''" />
					</view>
				</view>

				<!-- 确认密码（注册时显示） -->
				<view class="form-item" v-if="isRegister">
					<text class="input-label">确认密码</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'confirm' }">
						<input class="input" v-model="confirmPassword" type="password" placeholder="请再次输入密码"
							@focus="focusedField='confirm'" @blur="focusedField=''" />
					</view>
				</view>

				<!-- 忘记密码 -->
				<view class="forgot-password" v-if="!isRegister" @click="goForgotPassword">
					<text class="forgot-link">忘记密码？</text>
				</view>

				<!-- 提交按钮 -->
				<button class="btn-primary" @click="handleSubmit" :class="{ 'btn-loading': loading }">
					<text v-if="!loading">{{ isRegister ? '注 册' : '登 录' }}</text>
					<text v-else>{{ isRegister ? '注册中...' : '登录中...' }}</text>
				</button>



				<!-- 切换登录/注册 -->
				<view class="switch-mode">
					<text class="switch-text">{{ isRegister ? '已有账号？' : '还没有账号？' }}</text>
					<text class="switch-link" @click="toggleMode">{{ isRegister ? '立即登录' : '立即注册' }}</text>
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
			username: '',
			password: '',
			confirmPassword: '',
				email: '',
			isRegister: false,
			statusBarHeight: 0,
			loading: false,
			focusedField: ''
		}
	},
	onLoad(options) {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;

		if (options && options.mode === 'register') {
			this.isRegister = true;
		}

		const userInfo = uni.getStorageSync('userInfo');
		if (userInfo) {
			uni.switchTab({
				url: '/pages/tabbar/tabbar-1/tabbar-1'
			});
		}
	},
	methods: {
		toggleMode() {
			this.isRegister = !this.isRegister;
			this.username = '';
			this.password = '';
			this.confirmPassword = '';
		},

		async handleSubmit() {
			if (!this.username || !this.password) {
				uni.showToast({ title: '请填写完整信息', icon: 'none' });
				return;
			}

			if (this.isRegister && this.password !== this.confirmPassword) {
				uni.showToast({ title: '两次密码不一致', icon: 'none' });
				return;
			}



			if (this.isRegister) {
				await this.register();
			} else {
				await this.login();
			}
		},

		goForgotPassword() {
			uni.navigateTo({ url: "/pages/auth/forgot-password" });
		},

		async register() {
			this.loading = true;
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'register.php',
					method: 'POST',
					data: { username: this.username, password: this.password },
					header: { 'Content-Type': 'application/json' }
				});
				this.loading = false;
				if (res.statusCode === 201) {
					uni.showToast({ title: '注册成功，请登录', icon: 'success' });
					this.isRegister = false;
				} else {
					uni.showToast({ title: res.data.message || '注册失败', icon: 'none' });
				}
			} catch (error) {
				this.loading = false;
				uni.showToast({ title: '网络错误，请检查后端服务', icon: 'none' });
			}
		},

		async login() {
			this.loading = true;
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'login.php',
					method: 'POST',
					data: { username: this.username, password: this.password },
					header: { 'Content-Type': 'application/json' }
				});
				this.loading = false;
				if (res.statusCode === 200) {
					const responseData = res.data.data;
					const userInfo = responseData.user;
					const token = responseData.token;
					uni.setStorageSync('userInfo', userInfo);
					uni.setStorageSync('token', token);
					uni.setStorageSync('userId', userInfo.id);
					uni.setStorageSync('isLoggedIn', true);
					uni.showToast({ title: '登录成功', icon: 'success' });
					setTimeout(() => {
						uni.switchTab({ url: '/pages/tabbar/tabbar-1/tabbar-1' });
					}, 1500);
				} else {
					uni.showToast({ title: res.data.message || '登录失败', icon: 'none' });
				}
			} catch (error) {
				this.loading = false;
				uni.showToast({ title: '网络错误，请检查后端服务', icon: 'none' });
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

.header-title {
	font-size: 32upx;
	font-weight: 600;
	color: rgba(255, 255, 255, 0.95);
	margin-bottom: 8upx;
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

/* ===================== 忘记密码 ===================== */
.forgot-password {
	text-align: right;
	margin: -12upx 0 24upx;
}

.forgot-link {
	font-size: 24upx;
	color: #909398;
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

/* ===================== 切换登录/注册 ===================== */
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

/* ===================== 动画 ===================== */
.header-section {
	animation: fadeDown 0.5s ease-out;
}

.form-card {
	animation: fadeUp 0.5s ease-out;
}

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
</style>
