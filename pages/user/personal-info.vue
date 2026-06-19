<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">个人信息</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" v-if="isLoggedIn">
			<view class="info-section">
				<view class="info-item" @click="changeAvatar">
					<text class="info-label">头像</text>
					<view class="info-right">
						<image class="info-avatar" :src="avatarUrl" mode="aspectFill"></image>
						<text class="info-arrow">›</text>
					</view>
				</view>
				<view class="info-item">
					<text class="info-label">昵称</text>
					<input class="info-input" v-model="nickname" placeholder="请输入昵称" maxlength="20" />
				</view>
				<view class="info-item noborder">
					<text class="info-label">邮箱</text>
					<input class="info-input" v-model="email" placeholder="用于找回密码" type="email" maxlength="120" />
				</view>
			</view>

			<view class="info-section">
				<view class="info-item">
					<text class="info-label">用户名</text>
					<text class="info-value">{{ userInfo.username || '-' }}</text>
				</view>
				<view class="info-item noborder">
					<text class="info-label">注册时间</text>
					<text class="info-value">{{ registerTime }}</text>
				</view>
			</view>

			<button class="edit-btn" @click="saveProfile">保存</button>
		</scroll-view>

		<!-- 头像选择 -->
		<view class="modal-overlay" v-if="showUploadModal" @click.self="showUploadModal = false">
			<view class="action-sheet" @click.stop>
				<view class="action-sheet-handle"></view>
				<text class="action-sheet-title">更换头像</text>
				<button class="action-btn" @click="chooseFromAlbum">从相册选择</button>
				<button class="action-btn" @click="takePhoto">拍照</button>
				<button class="action-btn cancel" @click="showUploadModal = false">取消</button>
			</view>
		</view>

		<!-- 未登录 -->
		<view class="login-required" v-if="!isLoggedIn">
			<text class="login-text">请先登录</text>
			<button class="login-btn" @click="goLogin">去登录</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0, isLoggedIn: false, userInfo: null, avatarUrl: '/static/img/qa.png',
			nickname: '', email: '', registerTime: '', showUploadModal: false,
			apiBase: 'http://139.196.185.197:7070/doo/server/api/'
		}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.loadUserInfo();
	},
	methods: {
		loadUserInfo() {
			const ui = uni.getStorageSync('userInfo');
			if (ui && uni.getStorageSync('isLoggedIn')) {
				this.isLoggedIn = true;
				this.userInfo = ui;
				this.nickname = ui.nickname || ui.username || '';
				this.email = ui.email || '';
				this.avatarUrl = this.fixImageUrl(ui.avatar) || '/static/img/qa.png';
				this.registerTime = this.formatDate(ui.created_at);
			}
		},
		fixImageUrl(url) {
			if (!url || url.startsWith('/static/')) return url;
			if (!url.includes(':')) return 'http://139.196.185.197:7070' + url;
			if (url.includes('139.196.185.197') && !url.includes('7070')) {
				return url.replace('http://139.196.185.197/', 'http://139.196.185.197:7070/');
			}
			return url;
		},
		formatDate(d) {
			if (!d) return '-';
			let date = typeof d === 'number' ? new Date(d < 10000000000 ? d * 1000 : d) : new Date(d);
			if (isNaN(date.getTime())) return '-';
			return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
		},
		goBack() { uni.navigateBack(); },
		goLogin() { uni.navigateTo({ url: '/pages/auth/login' }); },
		changeAvatar() { this.showUploadModal = true; },
		chooseFromAlbum() {
			uni.chooseImage({ count:1, sizeType:['compressed'], sourceType:['album'],
				success: (res) => { this.uploadAvatar(res.tempFilePaths[0]); this.showUploadModal = false; }
			});
		},
		takePhoto() {
			uni.chooseImage({ count:1, sizeType:['compressed'], sourceType:['camera'],
				success: (res) => { this.uploadAvatar(res.tempFilePaths[0]); this.showUploadModal = false; }
			});
		},
		async uploadAvatar(filePath) {
			uni.showLoading({ title:'上传中...' });
			try {
				const res = await uni.uploadFile({ url: this.apiBase + 'upload.php', filePath, name:'file' });
				const data = JSON.parse(res.data);
				uni.hideLoading();
				if (data.code === 200) {
					this.avatarUrl = this.fixImageUrl(data.data.url);
					uni.showToast({ title:'头像已更新', icon:'success' });
				} else { uni.showToast({ title: data.message||'上传失败', icon:'none' }); }
			} catch(e) { uni.hideLoading(); uni.showToast({ title:'上传失败', icon:'none' }); }
		},
		async saveProfile() {
			if (!this.nickname) { uni.showToast({ title:'请输入昵称', icon:'none' }); return; }
			if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
				uni.showToast({ title:'邮箱格式不正确', icon:'none' }); return;
			}
			uni.showLoading({ title:'保存中...' });
			try {
				const data = { user_id: this.userInfo.id, nickname: this.nickname, avatar: this.avatarUrl };
				if (this.email) data.email = this.email;
				const res = await uni.request({ url: this.apiBase + 'update_user.php', method:'POST', data,
					header: {'Content-Type':'application/json'} });
				uni.hideLoading();
				if (res.statusCode === 200) {
					const updated = {...this.userInfo, nickname: this.nickname, avatar: this.avatarUrl};
					if (this.email) updated.email = this.email;
					uni.setStorageSync('userInfo', updated);
					uni.showToast({ title:'保存成功', icon:'success' });
				} else { uni.showToast({ title: res.data?.message||'保存失败', icon:'none' }); }
			} catch(e) { uni.hideLoading(); uni.showToast({ title:'网络错误', icon:'none' }); }
		}
	}
}
</script>

<style>
.content { min-height: 100vh; background: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #ffffff; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 88upx; background: #ffffff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }
.body { flex: 1; padding: 24upx; }

.info-section {
	background: #ffffff;
	border-radius: 16upx;
	margin-bottom: 20upx;
	box-shadow: 0 2upx 12upx rgba(0,0,0,0.04);
	overflow: hidden;
}
.info-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 28upx 24upx;
	border-bottom: 1px solid #f5f5f5;
}
.info-item.noborder { border-bottom: none; }
.info-label { font-size: 28upx; color: #303132; }
.info-right { display: flex; align-items: center; gap: 16upx; }
.info-value { font-size: 28upx; color: #909398; }
.info-arrow { font-size: 32upx; color: #c0c4cc; }
.info-avatar { width: 72upx; height: 72upx; border-radius: 50%; }

.edit-btn {
	width: 100%; height: 88upx; line-height: 88upx;
	background: #3071f6; color: #ffffff;
	font-size: 28upx; font-weight: 600;
	border-radius: 16upx; border: none;
	margin-top: 8upx;
}

.login-required { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20upx; }
.login-text { font-size: 28upx; color: #909398; }
.login-btn { width: 300upx; height: 80upx; line-height: 80upx; background: #3071f6; color: #fff; font-size: 28upx; border-radius: 16upx; border: none; }
.info-input { flex:1; height:56upx; font-size:28upx; color:#303132; text-align:right; border:none; background:transparent; }
.modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.4); display:flex; align-items:flex-end; z-index:9999; }
.action-sheet { background:#fff; border-radius:24upx 24upx 0 0; padding:16upx 24upx 48upx; width:100%; }
.action-sheet-handle { width:64upx; height:6upx; background:#e5e7eb; border-radius:3upx; margin:0 auto 24upx; }
.action-sheet-title { display:block; text-align:center; font-size:30upx; font-weight:600; color:#303132; margin-bottom:24upx; }
.action-btn { width:100%; height:88upx; line-height:88upx; font-size:28upx; font-weight:500; border-radius:16upx; border:1px solid #e5e7eb; margin-bottom:12upx; background:#fff; color:#303132; }
.action-btn.cancel { background:#f3f4f6; border:none; color:#909398; }
</style>
