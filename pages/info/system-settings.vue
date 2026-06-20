<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">系统设置</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="content-area" scroll-y="true">
			<view class="settings-section">
				<view class="settings-item" @click="checkUpdate">
					<view class="item-left">
						<text class="item-text">检查更新</text>
					</view>
					<text class="item-arrow">›</text>
				</view>
				<view class="settings-item" @click="goToChangePassword">
					<view class="item-left">
						<text class="item-text">修改密码</text>
					</view>
					<text class="item-arrow">›</text>
				</view>
			</view>

			<view class="settings-section">
				<view class="settings-item" @click="openUserAgreement">
					<view class="item-left">
						<text class="item-text">用户协议</text>
					</view>
					<text class="item-arrow">›</text>
				</view>
				<view class="settings-item" @click="openPrivacyPolicy">
					<view class="item-left">
						<text class="item-text">隐私政策</text>
					</view>
					<text class="item-arrow">›</text>
				</view>
				<view class="settings-item" @click="openDocumentation">
					<view class="item-left">
						<text class="item-text">文档中心</text>
					</view>
					<text class="item-arrow">›</text>
				</view>
			</view>

			<view class="settings-section">
				<view class="settings-item danger" @click="handleDeleteAccount">
					<view class="item-left">
						<text class="item-text danger-text">注销账号</text>
					</view>
					<text class="item-arrow">›</text>
				</view>
				<view class="settings-item danger" @click="handleLogout">
					<view class="item-left">
						<text class="item-text danger-text">退出登录</text>
					</view>
					<text class="item-arrow">›</text>
				</view>
			</view>

			<!-- 退出登录弹窗 -->
			<view class="modal-overlay" v-if="showLogoutModal" @click.self="showLogoutModal = false">
				<view class="modal-content" @click.stop>
					<view class="modal-icon-wrap warn-icon">
						<text class="modal-icon-text">↵</text>
					</view>
					<text class="modal-title">退出登录</text>
					<text class="modal-desc">退出后需要重新登录才能使用完整功能</text>
					<view class="modal-divider"></view>
					<view class="modal-actions">
						<button class="btn btn-cancel" @click="showLogoutModal = false">取消</button>
						<button class="btn btn-danger" @click="confirmLogout">确认退出</button>
					</view>
				</view>
			</view>

			<!-- 注销账号弹窗 -->
			<view class="modal-overlay" v-if="showDeleteAccountModal" @click.self="showDeleteAccountModal = false">
				<view class="modal-content" @click.stop>
					<view class="modal-icon-wrap danger-icon">
						<text class="modal-icon-text">✕</text>
					</view>
					<text class="modal-title">注销账号</text>
					<text class="modal-desc">此操作将永久删除你的所有数据</text>
					<text class="modal-warn">⚠️ 此操作不可撤销，请谨慎操作！</text>
					<view class="modal-divider"></view>
					<view class="modal-actions">
						<button class="btn btn-cancel" @click="showDeleteAccountModal = false">取消</button>
						<button class="btn btn-danger" @click="confirmDeleteAccount">确认注销</button>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			statusBarHeight: 0,
			isLoggedIn: false,
			showLogoutModal: false,
			showDeleteAccountModal: false,
		};
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		this.isLoggedIn = !!uni.getStorageSync('isLoggedIn');
	},
	methods: {
		checkUpdate() { uni.navigateTo({ url: '/pages/info/check-update' }); },
		goBack() { uni.navigateBack(); },
		goToChangePassword() { uni.navigateTo({ url: '/pages/auth/change-password' }); },
		handleDeleteAccount() {
			if (!this.isLoggedIn) { uni.showToast({ title: '请先登录', icon: 'none' }); return; }
			this.showDeleteAccountModal = true;
		},
		handleLogout() {
			if (!this.isLoggedIn) { uni.showToast({ title: '请先登录', icon: 'none' }); return; }
			this.showLogoutModal = true;
		},
		confirmDeleteAccount() {
			const userInfo = uni.getStorageSync('userInfo');
			if (!userInfo?.id) { uni.showToast({ title: '用户信息不存在', icon: 'none' }); return; }
			uni.showLoading({ title: '注销中...' });
			uni.request({
				url: apiConfig.baseUrl + 'delete_account.php', method: 'POST',
				data: { user_id: userInfo.id }, header: { 'Content-Type': 'application/json' },
				success: (res) => {
					uni.hideLoading(); this.showDeleteAccountModal = false;
					uni.clearStorageSync(); this.isLoggedIn = false;
					uni.showToast({ title: '账号注销成功', icon: 'success' });
					setTimeout(() => uni.redirectTo({ url: '/pages/auth/login' }), 2000);
				},
				fail: () => { uni.hideLoading(); uni.showToast({ title: '网络错误', icon: 'none' }); }
			});
		},
		confirmLogout() {
			uni.removeStorageSync('userInfo'); uni.removeStorageSync('isLoggedIn');
			uni.removeStorageSync('token'); this.isLoggedIn = false;
			this.showLogoutModal = false;
			uni.showToast({ title: '已退出登录', icon: 'success' });
			setTimeout(() => uni.navigateBack(), 1500);
		},
		openUserAgreement() { uni.navigateTo({ url: '/pages/info/user-agreement' }); },
		openPrivacyPolicy() { uni.navigateTo({ url: '/pages/info/privacy-policy' }); },
		openDocumentation() { uni.navigateTo({ url: '/pages/info/documentation' }); }
	}
};
</script>

<style>
.content { width: 100%; height: 100vh; background-color: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { background-color: #ffffff; width: 100%; }

.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 88upx; background-color: #ffffff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }
.content-area { flex: 1; }

.settings-section { background-color: #ffffff; margin: 24upx 24upx 0; border-radius: 16upx; overflow: hidden; box-shadow: 0 2upx 8upx rgba(0,0,0,0.04); }
.settings-item { display: flex; align-items: center; justify-content: space-between; padding: 28upx 24upx; border-bottom: 1px solid #f3f4f6; }
.settings-item:last-child { border-bottom: none; }
.item-left { display: flex; align-items: center; gap: 16upx; }
.item-text { font-size: 28upx; color: #303132; }
.item-text.danger-text { color: #ef4444; }
.item-arrow { font-size: 32upx; color: #c0c4cc; font-weight: 300; }

/* ===================== 弹窗 ===================== */
.modal-overlay {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	display: flex; align-items: center; justify-content: center;
	z-index: 9999; padding: 40upx;
	animation: modalFadeIn 0.2s ease;
}
@keyframes modalFadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

.modal-content {
	background: #ffffff;
	border-radius: 28upx;
	padding: 48upx 36upx 36upx;
	width: 86%;
	max-width: 560upx;
	text-align: center;
	box-shadow: 0 16upx 48upx rgba(0, 0, 0, 0.15);
	animation: modalSlideUp 0.25s ease;
}
@keyframes modalSlideUp {
	from { transform: translateY(30upx); opacity: 0; }
	to { transform: translateY(0); opacity: 1; }
}

.modal-icon-wrap {
	width: 88upx; height: 88upx;
	border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	margin: 0 auto 24upx;
	position: relative;
}
.modal-icon-wrap::after {
	content: '';
	position: absolute;
	inset: -6upx;
	border-radius: 50%;
	opacity: 0.15;
}
.modal-icon-wrap.warn-icon {
	background: linear-gradient(135deg, #fef3c7, #fde68a);
	box-shadow: 0 4upx 16upx rgba(245, 158, 11, 0.25);
}
.modal-icon-wrap.danger-icon {
	background: linear-gradient(135deg, #fef2f2, #fecaca);
	box-shadow: 0 4upx 16upx rgba(239, 68, 68, 0.25);
}

.modal-icon-text { font-size: 36upx; font-weight: 700; }
.warn-icon .modal-icon-text { color: #f59e0b; }
.danger-icon .modal-icon-text { color: #ef4444; }

.modal-title {
	display: block;
	font-size: 34upx;
	font-weight: 700;
	color: #1f2937;
	margin-bottom: 12upx;
}

.modal-desc {
	display: block;
	font-size: 26upx;
	color: #6b7280;
	line-height: 1.6;
	margin-bottom: 8upx;
}

.modal-warn {
	display: block;
	font-size: 24upx;
	color: #ef4444;
	line-height: 1.5;
	margin-bottom: 8upx;
	padding: 12upx 16upx;
	background: #fef2f2;
	border-radius: 12upx;
}

.modal-divider {
	height: 1px;
	background: #f3f4f6;
	margin: 24upx 0 20upx;
}

.modal-actions {
	display: flex;
	gap: 16upx;
}

.btn {
	flex: 1;
	height: 88upx;
	line-height: 88upx;
	font-size: 28upx;
	font-weight: 500;
	border-radius: 16upx;
	border: none;
	text-align: center;
	transition: all 0.2s ease;
}

.btn-cancel {
	background: #f3f4f6;
	color: #374151;
	border: none;
}
.btn-cancel::after {
	border: none;
}
.btn-cancel:active {
	background: #e5e7eb;
	transform: scale(0.97);
}

.btn-danger {
	background: linear-gradient(135deg, #ef4444, #dc2626);
	color: #ffffff;
	font-weight: 600;
	box-shadow: 0 4upx 12upx rgba(239, 68, 68, 0.3);
}
.btn-danger::after {
	border: none;
}
.btn-danger:active {
	opacity: 0.9;
	transform: scale(0.97);
}

::-webkit-scrollbar { width: 0; height: 0; display: none; }
</style>
