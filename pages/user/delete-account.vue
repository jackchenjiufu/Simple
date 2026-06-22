<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="nav-bar">
				<view class="nav-back" @click="goBack">
					<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
				</view>
				<text class="nav-title">注销账号</text>
				<view class="nav-placeholder"></view>
			</view>
			<view class="header-content">
				<view class="header-left">
					<text class="header-greeting">删除账户</text>
					<text class="header-title">注销账号</text>
					<text class="header-subtitle">此操作不可撤销</text>
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
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
			<view class="deco-dot dot-3"></view>
		</view>

		<view class="body">
			<view class="data-list">
				<text class="data-list-title">注销将删除以下数据：</text>
				<view class="data-item"><text class="data-bullet">•</text><text class="data-text">个人资料与账号信息</text></view>
				<view class="data-item"><text class="data-bullet">•</text><text class="data-text">所有发布的内容与文章</text></view>
				<view class="data-item"><text class="data-bullet">•</text><text class="data-text">聊天记录与消息</text></view>
				<view class="data-item"><text class="data-bullet">•</text><text class="data-text">关注关系与收藏内容</text></view>
			</view>

			<button class="btn-confirm" :class="{ 'btn-disabled': countdown > 0 }" @click="handleConfirm" :disabled="countdown > 0">
				<text v-if="countdown > 0">确认注销（{{ countdown }}s）</text>
				<text v-else>确认注销</text>
			</button>
			<button class="btn-cancel" @click="goBack">取消返回</button>
		</view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			statusBarHeight: 0,
			countdown: 3,
			loading: false
		};
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		this.startCountdown();
	},
	onUnload() {
		if (this.timer) clearInterval(this.timer);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		startCountdown() {
			this.countdown = 3;
			this.timer = setInterval(() => {
				this.countdown--;
				if (this.countdown <= 0) {
					clearInterval(this.timer);
					this.timer = null;
				}
			}, 1000);
		},
		handleConfirm() {
			if (this.countdown > 0 || this.loading) return;
			this.loading = true;
			const userInfo = uni.getStorageSync('userInfo');
			if (!userInfo?.id) {
				uni.showToast({ title: '用户信息不存在', icon: 'none' });
				this.loading = false;
				return;
			}
			uni.showLoading({ title: '注销中...' });
			uni.request({
				url: apiConfig.baseUrl + 'delete_account.php',
				method: 'POST',
				data: { user_id: userInfo.id },
				header: { 'Content-Type': 'application/json' },
				success: (res) => {
					uni.hideLoading();
					uni.clearStorageSync();
					uni.showToast({ title: '账号已注销', icon: 'success' });
					setTimeout(() => uni.redirectTo({ url: '/pages/auth/login' }), 2000);
				},
				fail: () => {
					uni.hideLoading();
					this.loading = false;
					uni.showToast({ title: '网络错误', icon: 'none' });
				}
			});
		}
	}
};
</script>

<style>
.content { width: 100%; min-height: 100vh; background-color: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #1b44a6; }

.header-section { position: relative; background: linear-gradient(135deg, #1b44a6, #2563eb); border-radius: 0 0 48upx 48upx; padding-bottom: 60upx; overflow: hidden; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 12upx 24upx 0; position: relative; z-index: 2; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 32upx; font-weight: 600; color: #ffffff; letter-spacing: 2upx; }
.nav-placeholder { width: 72upx; }

.header-content {
	position: relative;
	z-index: 2;
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	padding: 20upx 48upx 40upx;
	min-height: 200upx;
}

.header-left { flex: 1; }
.header-greeting { font-size: 40upx; font-weight: 700; color: #ffffff; display: block; margin-bottom: 6upx; }
.header-title { font-size: 28upx; color: rgba(255,255,255,0.9); display: block; margin-bottom: 4upx; }
.header-subtitle { font-size: 22upx; color: rgba(255,255,255,0.6); display: block; }

.header-right { flex-shrink: 0; margin-left: 20upx; }
.character-area { position: relative; width: 140upx; height: 160upx; }
.char-circle { position: absolute; border-radius: 50%; }
.char-circle-1 { width: 40upx; height: 40upx; background: rgba(255,255,255,0.15); top: 0; right: 10upx; }
.char-circle-2 { width: 24upx; height: 24upx; background: rgba(255,255,255,0.1); top: 36upx; right: 0; }
.char-body { position: absolute; width: 80upx; height: 90upx; background: rgba(255,255,255,0.2); border-radius: 40upx 40upx 20upx 20upx; bottom: 0; left: 50%; transform: translateX(-50%); }
.char-head { position: absolute; width: 52upx; height: 52upx; background: rgba(255,255,255,0.25); border-radius: 50%; bottom: 74upx; left: 50%; transform: translateX(-50%); }

.deco-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); z-index: 1; }
.dot-1 { width: 200upx; height: 200upx; top: -60upx; right: -40upx; }
.dot-2 { width: 120upx; height: 120upx; bottom: 20upx; left: -30upx; }
.dot-3 { width: 80upx; height: 80upx; top: 100upx; left: 30%; }

.body { flex: 1; padding: 40upx 40upx; box-sizing: border-box; }

.data-list { background: #ffffff; border-radius: 16upx; padding: 28upx 28upx; margin-bottom: 32upx; box-shadow: 0 2upx 12upx rgba(0,0,0,0.05); }
.data-list-title { display: block; font-size: 26upx; font-weight: 600; color: #374151; margin-bottom: 16upx; }
.data-item { display: flex; align-items: flex-start; gap: 10upx; margin-bottom: 12upx; }
.data-item:last-child { margin-bottom: 0; }
.data-bullet { font-size: 26upx; color: #ef4444; line-height: 1.6; flex-shrink: 0; }
.data-text { font-size: 26upx; color: #6b7280; line-height: 1.6; }

.btn-confirm {
	width: 100%; height: 96upx; line-height: 96upx;
	background: linear-gradient(135deg, #ef4444, #dc2626);
	color: #ffffff; font-size: 32upx; font-weight: 600;
	border-radius: 16upx; border: none;
	box-shadow: 0 4upx 12upx rgba(239, 68, 68, 0.3);
	text-align: center; margin-bottom: 24upx;
}
.btn-confirm:active { opacity: 0.9; transform: scale(0.97); }
.btn-confirm::after { border: none; }
.btn-disabled {
	background: #d1d5db; color: #9ca3af;
	box-shadow: none;
}
.btn-cancel {
	width: 100%; height: 88upx; line-height: 88upx;
	background: #f3f4f6; color: #374151; font-size: 28upx; font-weight: 500;
	border-radius: 16upx; border: none; text-align: center;
}
.btn-cancel:active { background: #e5e7eb; transform: scale(0.97); }
.btn-cancel::after { border: none; }
</style>
