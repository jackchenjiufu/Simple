<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">忘记密码</text>
					<text class="header-title">重置您的密码</text>
					<text class="header-subtitle">输入邮箱获取验证码</text>
				</view>
			</view>
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
			<view class="deco-dot dot-3"></view>
		</view>

		<!-- 表单区域 -->
		<view class="form-section">
			<view class="form-card">
				<text class="form-subtitle">验证身份</text>

				<view class="form-item">
					<text class="input-label">邮箱</text>
					<view class="input-wrapper" :class="{ 'input-focused': focusedField === 'email' }">
						<input class="input" v-model="email" placeholder="请输入注册邮箱"
							@focus="focusedField='email'" @blur="focusedField=''" />
					</view>
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
			email: '',
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
					url: apiConfig.baseUrl + 'send_code.php',
					method: 'POST',
					data: { email: this.email },
					header: { 'Content-Type': 'application/json' }
				});
				this.loading = false;
				const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
				if (result.code === 200) {
					const devMsg = result.dev_code ? ' 验证码: ' + result.dev_code : '';
					uni.showToast({ title: '验证码已发送' + devMsg, icon: 'success' });
					setTimeout(() => {
						uni.navigateTo({ url: '/pages/auth/reset-password?email=' + encodeURIComponent(this.email) });
					}, 1000);
				} else {
					uni.showToast({ title: result.message || '操作失败', icon: 'none' });
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

.header-section { position: relative; width: 100%; background: #1b44a6; overflow: hidden; box-sizing: border-box; }
.header-content { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: flex-end; padding: 60upx 48upx 80upx; min-height: 360upx; }
.header-left { display: flex; flex-direction: column; align-items: flex-start; }
.header-greeting { font-size: 56upx; font-weight: 700; color: #ffffff; line-height: 1.2; margin-bottom: 12upx; }
.header-title { font-size: 32upx; font-weight: 600; color: rgba(255,255,255,0.95); margin-bottom: 8upx; }
.header-subtitle { font-size: 24upx; color: rgba(255,255,255,0.65); }

.deco-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.06); z-index: 1; }
.dot-1 { width: 300upx; height: 300upx; top: -100upx; right: 30upx; }
.dot-2 { width: 160upx; height: 160upx; bottom: 40upx; left: -40upx; }
.dot-3 { width: 100upx; height: 100upx; top: 40upx; left: 160upx; }

.form-section { flex: 1; background: #ffffff; padding: 0 40upx; margin-top: -40upx; box-sizing: border-box; }
.form-card { background: #ffffff; border-radius: 24upx; padding: 40upx 36upx; box-shadow: 0 4upx 32upx rgba(0,0,0,0.06); position: relative; z-index: 3; }
.form-subtitle { font-size: 26upx; color: #9e9fa1; display: block; margin-bottom: 40upx; }

.form-item { margin-bottom: 28upx; }
.input-label { font-size: 26upx; color: #303132; display: block; margin-bottom: 14upx; font-weight: 500; }
.input-wrapper { background-color: #ffffff; border: 2upx solid #dde1e8; border-radius: 16upx; padding: 0 20upx; transition: all 0.25s ease; }
.input-wrapper.input-focused { border-color: #3071f6; box-shadow: 0 0 0 4upx rgba(48,113,246,0.08); }
.input { width: 100%; height: 88upx; font-size: 28upx; color: #1A1A2E; border: none; background: transparent; box-sizing: border-box; }
.input::placeholder { color: #b6bcc8; }

.btn-primary { width: 100%; height: 96upx; line-height: 96upx; background: #3071f6; color: #ffffff; border-radius: 16upx; font-size: 32upx; font-weight: 600; letter-spacing: 6upx; border: none; margin-bottom: 24upx; transition: all 0.25s ease; }
.btn-primary:active { background: #285ed4; transform: scale(0.98); }
.btn-primary.btn-loading { opacity: 0.7; pointer-events: none; }

.switch-mode { text-align: center; display: flex; align-items: center; justify-content: center; gap: 8upx; }
.switch-link { font-size: 26upx; color: #3071f6; font-weight: 600; }
.switch-link:active { opacity: 0.7; }
</style>
