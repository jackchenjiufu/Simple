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
		</scroll-view>

		<!-- 退出登录弹窗 -->
		<view class="modal-overlay" v-if="showLogoutModal" @click.self="showLogoutModal = false">
			<view class="modal-content" @click.stop>
				<view class="modal-icon-wrap warn-icon">
					<text class="modal-icon">!</text>
				</view>
				<text class="modal-title">退出登录</text>
				<text class="modal-desc">退出后需要重新登录才能使用完整功能</text>
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
					<text class="modal-icon">!</text>
				</view>
				<text class="modal-title">注销账号</text>
				<text class="modal-desc">此操作将永久删除你的所有数据，不可撤销，请谨慎操作！</text>
				<view class="modal-actions">
					<button class="btn btn-cancel" @click="showDeleteAccountModal = false">取消</button>
					<button class="btn btn-danger" @click="confirmDeleteAccount">确认注销</button>
				</view>
			</view>
		</view>


	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0,
			isLoggedIn: false,
			showLogoutModal: false,
			showDeleteAccountModal: false,
			apiBase: 'http://139.196.185.197:7070/doo/server/api/'
		};
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		this.isLoggedIn = !!uni.getStorageSync('isLoggedIn');
	},
	methods: {
		checkUpdate() {
			uni.navigateTo({ url: '/pages/info/check-update' });
		},



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
			if (!userInfo?.id) {
				uni.showToast({ title: '用户信息不存在', icon: 'none' });
				return;
			}

			uni.showLoading({ title: '注销中...' });
			uni.request({
				url: this.apiBase + 'delete_account.php',
				method: 'POST',
				data: { user_id: userInfo.id },
				header: { 'Content-Type': 'application/json' },
				success: (res) => {
					uni.hideLoading();
					this.showDeleteAccountModal = false;
					uni.clearStorageSync();
					this.isLoggedIn = false;
					uni.showToast({ title: '账号注销成功', icon: 'success' });
					setTimeout(() => uni.redirectTo({ url: '/pages/auth/login' }), 2000);
				},
				fail: () => {
					uni.hideLoading();
					uni.showToast({ title: '网络错误', icon: 'none' });
				}
			});
		},

		confirmLogout() {
			uni.removeStorageSync('userInfo');
			uni.removeStorageSync('isLoggedIn');
			this.isLoggedIn = false;
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
.content {
	width: 100%;
	height: 100vh;
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

.content-area {
	flex: 1;
}

/* 设置分组 */
.settings-section {
	background-color: #ffffff;
	margin: 24upx 24upx 0;
	border-radius: 16upx;
	overflow: hidden;
	box-shadow: 0 2upx 8upx rgba(0, 0, 0, 0.04);
}

.settings-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28upx 24upx;
	border-bottom: 1px solid #f3f4f6;
}

.settings-item:last-child {
	border-bottom: none;
}

.item-left {
	display: flex;
	align-items: center;
	gap: 16upx;
}

.item-text {
	font-size: 28upx;
	color: #303132;
}

.item-text.danger-text {
	color: #ef4444;
}

.item-arrow {
	font-size: 32upx;
	color: #c0c4cc;
	font-weight: 300;
}

/* 模态框 */
.modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.4);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	padding: 40upx;
}

.modal-content {
	background-color: #ffffff;
	border-radius: 24upx;
	padding: 48upx 40upx;
	width: 85%;
	max-width: 560upx;
	text-align: center;
	box-shadow: 0 8upx 40upx rgba(0, 0, 0, 0.12);
}

.modal-title {
	display: block;
	font-size: 32upx;
	font-weight: 600;
	color: #303132;
	margin-bottom: 16upx;
}

.modal-desc {
	display: block;
	font-size: 26upx;
	color: #909398;
	line-height: 1.6;
	margin-bottom: 36upx;
}

.modal-actions {
	display: flex;
	gap: 20upx;
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
}

.btn-cancel {
	background: #f3f4f6;
	color: #303132;
}

.btn-primary {
	background: #3071f6;
	color: #ffffff;
	font-weight: 600;
}

.btn-danger {
	flex: 1;
	height: 88upx;
	line-height: 88upx;
	font-size: 28upx;
	font-weight: 600;
	border-radius: 16upx;
	border: none;
	text-align: center;
	background: #ef4444;
	color: #ffffff;
}

.btn-danger:active {
	opacity: 0.8;
}

.btn-cancel:active {
	opacity: 0.7;
}

/* 弹窗图标 */
.modal-icon-wrap {
	width: 80upx;
	height: 80upx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 20upx;
}

.modal-icon-wrap.warn-icon {
	background-color: #fef3c7;
}

.modal-icon-wrap.danger-icon {
	background-color: #fef2f2;
}

.modal-icon-wrap.info-icon {
	background-color: #eff6ff;
}

.modal-icon {
	font-size: 36upx;
	font-weight: 700;
}

.warn-icon .modal-icon {
	color: #f59e0b;
}

.danger-icon .modal-icon {
	color: #ef4444;
}

.info-icon .modal-icon {
	color: #3071f6;
}

.btn-primary:active {
	background: #285ed4;
}





/* 隐藏滚动条 */
::-webkit-scrollbar {
	width: 0;
	height: 0;
	display: none;
}
</style>
