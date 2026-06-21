<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<view class="header-section">
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">重置密码</text>
					<text class="header-subtitle">验证码已发送到你的邮箱</text>
				</view>
			</view>
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
		</view>

		<view class="form-section">
			<view class="form-card">
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
		this.email = options.email || '';
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

<style>
.content { width: 100%; min-height: 100vh; background-color: #ffffff; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #1b44a6; }
.header-section { position: relative; width: 100%; background: #1b44a6; padding: 60upx 48upx 80upx; overflow: hidden; box-sizing: border-box; }
.header-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: flex-start; }
.header-greeting { font-size: 48upx; font-weight: 700; color: #ffffff; margin-bottom: 12upx; }
.header-subtitle { font-size: 24upx; color: rgba(255,255,255,0.65); }
.deco-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); z-index: 1; }
.dot-1 { width: 200upx; height: 200upx; top: -60upx; right: -40upx; }
.dot-2 { width: 120upx; height: 120upx; bottom: 20upx; left: -30upx; }
.form-section { flex: 1; background: #ffffff; padding: 0 40upx; margin-top: -40upx; box-sizing: border-box; }
.form-card { background: #ffffff; border-radius: 24upx; padding: 40upx 36upx; box-shadow: 0 4upx 32upx rgba(0,0,0,0.06); position: relative; z-index: 3; }
.form-item { margin-bottom: 28upx; }
.input-label { font-size: 26upx; color: #303132; display: block; margin-bottom: 14upx; font-weight: 500; }
.input-wrapper { background: #ffffff; border: 2upx solid #dde1e8; border-radius: 16upx; padding: 0 20upx; transition: all 0.25s ease; }
.input-wrapper.input-focused { border-color: #3071f6; box-shadow: 0 0 0 4upx rgba(48,113,246,0.08); }
.input { width: 100%; height: 88upx; font-size: 28upx; color: #1A1A2E; border: none; background: transparent; box-sizing: border-box; }
.input::placeholder { color: #b6bcc8; }
.btn-primary { width: 100%; height: 96upx; line-height: 96upx; background: #3071f6; color: #ffffff; border-radius: 16upx; font-size: 32upx; font-weight: 600; letter-spacing: 6upx; border: none; margin-bottom: 24upx; }
.btn-primary:active { background: #285ed4; transform: scale(0.98); }
.btn-primary.btn-loading { opacity: 0.7; pointer-events: none; }
.switch-mode { text-align: center; display: flex; align-items: center; justify-content: center; gap: 8upx; }
.switch-text { font-size: 26upx; color: #909398; }
.switch-link { font-size: 26upx; color: #3071f6; font-weight: 600; }
.switch-link.disabled { color: #c0c4cc; pointer-events: none; }
</style>
