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
				<view class="info-item">
					<text class="info-label">邮箱</text>
					<input class="info-input" v-model="email" placeholder="用于找回密码" type="email" maxlength="120" />
				</view>
				<view class="info-item noborder">
					<text class="info-label">生日</text>
					<picker class="info-picker" mode="date" :value="birthday || '2000-01-01'" start="1900-01-01" :end="todayStr" @change="onBirthdayChange">
						<view class="info-right">
							<text class="info-value">{{ birthday || '未设置' }}</text>
							<text class="info-arrow">›</text>
						</view>
					</picker>
				</view>
			</view>

			<view class="info-section">
				<view class="info-item">
					<text class="info-label">用户名</text>
					<text class="info-value">{{ userInfo.username || '-' }}</text>
				</view>
				<view class="info-item identity-item">
					<view class="identity-top">
						<text class="info-label">身份</text>
						<view class="info-right">
							<text v-if="isBadgeRole(userRole)" class="role-badge" :style="badgeStyle(userRole)">{{ badgeLabel(userRole) }}</text>
							<text class="role-badge level" v-if="growthLevel > 0">Lv.{{ growthLevel }}</text>
							<text class="growth-text">成长值 {{ growth }}</text>
						</view>
					</view>
					<view class="growth-bar-wrap" v-if="growth > 0">
						<view class="growth-bar-track">
							<view class="growth-bar-fill" :style="{ width: growthPercent + '%' }"></view>
						</view>
						<text class="growth-bar-tip">{{ growthTip }}</text>
						<view class="growth-detail" v-if="growthDetail.posts !== undefined">
							<text class="gd-item">发帖 {{ growthDetail.posts }} ×20</text>
							<text class="gd-item">评论 {{ growthDetail.comments }} ×2</text>
							<text class="gd-item">在线 {{ growthDetail.onlineHours }}h</text>
						</view>
					</view>
				</view>
				<view class="info-item noborder">
					<text class="info-label">注册时间</text>
					<text class="info-value">{{ registerTime }}</text>
				</view>
			</view>

			<button class="edit-btn" @click="saveProfile">保存</button>
		</scroll-view>

		<!-- 头像选择（底部操作表） -->
		<view class="modal-overlay" v-if="showUploadModal" @click="showUploadModal = false">
			<view class="action-sheet" @click.stop>
				<view class="sheet-head">
					<text class="sheet-title">更换头像</text>
					<text class="sheet-sub">选择图片来源</text>
				</view>
				<view class="sheet-option" @click="chooseFromAlbum">
					<text class="option-text">从相册选择</text>
					<text class="option-arrow">›</text>
				</view>
				<view class="sheet-option" @click="takePhoto">
					<text class="option-text">拍照</text>
					<text class="option-arrow">›</text>
				</view>
				<view class="sheet-cancel" @click="showUploadModal = false">取消</view>
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
import apiConfig from '../../utils/api.js';
import config from '../../utils/config.js';
import { loadRoles, isBadgeRole as badgeRoleFn, badgeLabel as badgeLabelFn, badgeStyle as badgeStyleFn } from '../../utils/role-badges.js';
export default {
	data() {
		return {
			statusBarHeight: 0, isLoggedIn: false, userInfo: null, avatarUrl: apiConfig.getServerUrl(config.defaultAvatar),
			nickname: '', email: '', birthday: '', todayStr: '', registerTime: '', showUploadModal: false, userRole: '', growth: 0, growthLevel: 0, growthPercent: 0, growthTip: '', growthDetail: {},
		};
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.todayStr = this.formatDate(Date.now());
		this.loadUserInfo();
		this.loadBirthday();
		this.loadGrowth();
		loadRoles();
	},
	methods: {
		// 角色徽章辅助（注册为实例方法，供模板调用）
		isBadgeRole(name) { return badgeRoleFn(name); },
		badgeLabel(name) { return badgeLabelFn(name); },
		badgeStyle(name) { return badgeStyleFn(name); },
		loadUserInfo() {
			const ui = uni.getStorageSync('userInfo');
			if (ui && uni.getStorageSync('isLoggedIn')) {
				this.isLoggedIn = true;
				this.userInfo = ui;
				this.userRole = ui.role || '';
				this.nickname = ui.nickname || ui.username || '';
				this.email = ui.email || '';
				this.avatarUrl = this.fixImageUrl(ui.avatar) || apiConfig.getServerUrl(config.defaultAvatar);
				this.birthday = (ui.birthday || '').slice(0, 10);
				this.registerTime = this.formatDate(ui.created_at);
			}
		},
		fixImageUrl(url) {
			return apiConfig.getImageUrl(url);
		},
		// 从服务端取本人最新生日（登录返回里可能没有该字段）
		loadBirthday() {
			const token = uni.getStorageSync('token') || '';
			if (!token) return;
			uni.request({
				url: apiConfig.baseUrl + 'birthday.php',
				method: 'GET',
				header: { 'Authorization': 'Bearer ' + token },
				success: (res) => {
					const d = res.data && res.data.data;
					if (d && d.birthday) this.birthday = String(d.birthday).slice(0, 10);
				}
			});
		},
		onBirthdayChange(e) {
			this.birthday = e.detail.value;
		},
		// 加载成长值（新等级机制：发帖×20 + 有效评论×2 + 在线每10分钟+1）
		loadGrowth() {
			const ui = uni.getStorageSync('userInfo');
			if (!ui || !ui.id) return;
			uni.request({
				url: apiConfig.baseUrl + 'user_growth.php',
				method: 'GET',
				data: { user_id: ui.id },
				success: (res) => {
					try {
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (result && result.code === 200) {
							const d = result.data;
							this.growth = d.growth;
							this.growthLevel = d.level;
							this.growthDetail = {
								posts: d.posts,
								comments: d.valid_comments,
								onlineHours: d.online_hours,
							};
							// 进度条与提示
							this.growthPercent = d.percent;
							if (d.level >= 10) {
								this.growthTip = '已达最高等级';
							} else if (d.is_manual) {
								this.growthTip = '等级由管理员手动设置';
							} else {
								this.growthTip = `距 Lv.${d.level + 1} 还差 ${d.remaining} 成长值`;
							}
						}
					} catch (e) { /* ignore */ }
				}
			});
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
				const res = await uni.uploadFile({ url: apiConfig.baseUrl + 'upload.php', filePath, name:'file' });
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
				const token = uni.getStorageSync('token') || '';
				const data = { user_id: this.userInfo.id, nickname: this.nickname, avatar: this.avatarUrl };
				if (token) data.auth_token = token;
				if (this.email) data.email = this.email;
				if (this.birthday) data.birthday = this.birthday;
				const res = await uni.request({ url: apiConfig.baseUrl + 'update_user.php', method:'POST', data,
					header: {'Content-Type':'application/json'} });
				uni.hideLoading();
				if (res.statusCode === 200) {
					const updated = {...this.userInfo, nickname: this.nickname, avatar: this.avatarUrl};
					if (this.email) updated.email = this.email;
					if (this.birthday) updated.birthday = this.birthday;
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
.info-picker { flex: 1; display: flex; justify-content: flex-end; }
.role-badge { font-size: 20upx; padding: 2upx 12upx; border-radius: 20upx; margin-left: 12upx; flex-shrink: 0; }
.role-badge.super { color: #b8860b; background: #fff8e6; border: 1upx solid #f0d48a; }
.role-badge.admin { color: #1b44a6; background: #f0f5ff; border: 1upx solid #b8cdf5; }
.role-badge.editor { color: #1a7d3a; background: #e8f8ee; border: 1upx solid #b7e4c7; }
.role-badge.level { color: #7c5cfc; background: #f3f0ff; border: 1upx solid #d4c8f7; }
.growth-text { font-size: 24upx; color: #909398; }
.identity-item { flex-direction: column; align-items: stretch; }
.identity-top { display: flex; justify-content: space-between; align-items: center; }
.growth-bar-wrap { display: flex; align-items: center; gap: 12upx; margin-top: 14upx; }
.growth-bar-track { flex: 1; height: 12upx; background: #f0f0f5; border-radius: 6upx; overflow: hidden; }
.growth-bar-fill { height: 100%; background: linear-gradient(90deg, #8b5cf6, #7c5cfc); border-radius: 6upx; transition: width 0.4s ease; }
.growth-bar-tip { font-size: 20upx; color: #9ca3af; flex-shrink: 0; }
.growth-detail { display: flex; flex-wrap: wrap; gap: 12upx; margin-top: 12upx; }
.gd-item { font-size: 20upx; color: #6b7280; background: #f3f4f6; border-radius: 8upx; padding: 4upx 12upx; }
/* 底部操作表（iOS 风格） */
.modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:flex-end; z-index:9999; animation:fadeIn 0.2s ease; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
.action-sheet {
	width: 100%; background: #f7f8fa; border-radius: 28upx 28upx 0 0;
	padding: 32upx 24upx 48upx; box-sizing: border-box;
	animation: sheetUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
.sheet-head { text-align: center; margin-bottom: 24upx; }
.sheet-title { display: block; font-size: 30upx; font-weight: 700; color: #1f2937; }
.sheet-sub { display: block; font-size: 24upx; color: #9ca3af; margin-top: 6upx; }
.sheet-option {
	display: flex; align-items: center; background: #fff; height: 104upx;
	padding: 0 28upx; margin-bottom: 2upx; transition: background 0.15s;
}
.sheet-option:first-of-type { border-radius: 16upx 16upx 0 0; }
.sheet-option:nth-last-of-type(2) { border-radius: 0 0 16upx 16upx; }
.sheet-option:active { background: #f0f2f5; }
.option-text { flex: 1; font-size: 28upx; color: #303132; }
.option-arrow { font-size: 32upx; color: #c0c4cc; font-weight: 300; }
.sheet-cancel {
	margin-top: 16upx; background: #fff; height: 100upx; line-height: 100upx;
	text-align: center; font-size: 28upx; color: #303132; font-weight: 500;
	border-radius: 16upx; transition: background 0.15s;
}
.sheet-cancel:active { background: #f0f2f5; }
/* ===== 用户主页头部卡片 ===== */
.hero {
	position: relative;
	background: linear-gradient(180deg, #1b44a6, #3071f6);
	border-radius: 20upx;
	padding: 52upx 24upx 36upx;
	margin-bottom: 20upx;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 6upx 24upx rgba(48, 113, 246, 0.28);
	overflow: hidden;
}
.hero-avatar-wrap { position: relative; }
.hero-avatar {
	width: 132upx; height: 132upx;
	border-radius: 50%;
	border: 4upx solid rgba(255, 255, 255, 0.55);
	background: #fff;
}
.hero-camera {
	position: absolute; right: -2upx; bottom: -2upx;
	width: 44upx; height: 44upx; border-radius: 50%;
	background: #ffffff; color: #1b44a6;
	font-size: 24upx;
	display: flex; align-items: center; justify-content: center;
	box-shadow: 0 2upx 8upx rgba(0,0,0,0.2);
	border: 2upx solid #1b44a6;
}
.hero-name { color: #ffffff; font-size: 34upx; font-weight: 700; margin-top: 22upx; }
.hero-meta { display: flex; align-items: center; justify-content: center; gap: 14upx; margin-top: 16upx; }
.hero-growth {
	width: 72%; height: 12upx;
	background: rgba(255, 255, 255, 0.28);
	border-radius: 6upx; margin-top: 26upx; overflow: hidden;
}
.hero-growth-fill { height: 100%; background: #ffffff; border-radius: 6upx; transition: width 0.4s ease; }
.hero-growth-tip { color: rgba(255, 255, 255, 0.88); font-size: 20upx; margin-top: 12upx; }

</style>
