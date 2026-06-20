<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<view class="header-section">
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">忘记密码</text>
					<text class="header-subtitle">输入邮箱获取验证码</text>
				</view>
			</view>
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
		</view>

		<view class="form-section">
			<view class="form-card">
				<view class="form-item">
					<text class="input-label">邮箱</text>
					<input class="input" v-model="email" placeholder="请输入注册邮箱" />
				</view>

				<button class="btn-primary" @click="handleSubmit" :class="{ 'btn-loading': loading }">
					<text v-if="!loading">获取重置链接</text>
					<text v-else>提交中...</text>
				</button>

				<view class="switch-mode">
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
			statusBarHeight: 0,
			loading: false,
			focusedField: '',
}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
	},
	methods: {
		goLogin() {
			uni.navigateTo({ url: '/pages/auth/login' });
		},
		async handleSubmit() {
			if (!this.email) {
				uni.showToast({ title: '请输入邮箱', icon: 'none' });
				return;
			}
			this.loading = true;
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'forgot_password.php',
					method: 'POST',
					data: { email: this.email },
					header: { 'Content-Type': 'application/json' }
				});
				this.loading = false;
				if (res.data.code === 200) {
					
					uni.showToast({ title: '验证码已发送', icon: 'success' });
					setTimeout(() => {
						uni.navigateTo({ url: '/pages/auth/reset-password?email=' + encodeURIComponent(this.email) });
					}, 1000);
					
				} else {
					uni.showToast({ title: res.data.message || '操作失败', icon: 'none' });
				}
			} catch (e) {
				this.loading = false;
				uni.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
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
.switch-mode { text-align: center; }
.switch-link { font-size: 26upx; color: #3071f6; font-weight: 600; }
</style>
