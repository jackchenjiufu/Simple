<!-- 我的（个人主页） -->
<template>
	<view class="content">
		<!-- 顶部封面：点一下就能换 -->
		<view class="banner" :style="{ height: bannerHeight + 'px' }">
			<image class="banner-img" :src="backgroundUrl" mode="aspectFill" @click="changeBackground"></image>
			<view class="scrim"></view>

			<!-- 默认封面上才显示品牌水印，用户自定义封面时留干净 -->
			<view class="wm" v-if="!hasCover">
				<text class="wm-big">DOO</text>
				<text class="wm-sm">SIMPLE · LIFE</text>
			</view>

			<!-- 设置 -->
			<view class="gear" :style="{ top: gearTop + 'px' }" @click="handleMenuClick('systemSettings')">
				<image class="gear-ic" src="/static/img/icons/gear.png" mode="aspectFit"></image>
			</view>

			<!-- 换封面 -->
			<view class="cover-chip" @click="changeBackground">
				<image class="chip-ic" src="/static/img/icons/camera.png" mode="aspectFit"></image>
				<text class="chip-tx">{{ hasCover ? '换封面' : '设置封面' }}</text>
			</view>
		</view>

		<!-- 白色内容面板 -->
		<view class="sheet">
			<!-- 身份区 -->
			<view class="idblk">
				<image class="ava" :src="avatarUrl" mode="aspectFill" @click="goToPersonalInfo"></image>
				<view class="who">
					<view class="nm">
						<text class="nm-tx">{{ nickname }}</text>
						<text v-if="isBadgeRole(userRole)" class="role-badge" :style="badgeStyle(userRole)">{{ badgeLabel(userRole) }}</text>
					</view>
					<view class="meta" v-if="isLoggedIn">
						<text class="uid">ID: {{ userId }}</text>
						<text class="lv" v-if="growthLevel > 0">LV.{{ growthLevel }}</text>
					</view>
					<view class="meta" v-else>
						<text class="uid">登录后同步你的主页</text>
					</view>
				</view>

				<view class="acts" v-if="isLoggedIn">
					<view class="btn-pri" @click="goToPersonalInfo">
						<text class="btn-pri-tx">编辑资料</text>
					</view>
					<view class="btn-gh" @click="openMore">
						<text class="btn-gh-tx">···</text>
					</view>
				</view>
				<view class="acts" v-else>
					<view class="btn-pri" @click="handleLogin">
						<text class="btn-pri-tx">登录</text>
					</view>
					<view class="btn-gh btn-gh-w" @click="handleRegister">
						<text class="btn-gh-tx2">注册</text>
					</view>
				</view>
			</view>

			<!-- 常写分类（来自真实文章） -->
			<view class="cats" v-if="isLoggedIn && topCats.length">
				<text class="cats-lb">常写</text>
				<text class="cat" v-for="(c, i) in topCats" :key="c" :class="'c' + (i % 3)">{{ c }}</text>
			</view>

			<!-- 我的动态 -->
			<view class="feedh" v-if="isLoggedIn">
				<text class="feedh-t">我的动态</text>
				<text class="feedh-m" @click="goMyArticles">全部 {{ articleTotal }}</text>
			</view>

			<view class="item" v-for="(a, i) in articles" :key="a.id" :class="{ 'item-last': i === articles.length - 1 }" @click="openArticle(a)">
				<view class="thumb" :class="'th' + (i % 3)">
					<text class="thumb-tx">{{ catChar(a) }}</text>
				</view>
				<view class="it-b">
					<text class="it-t">{{ a.title }}</text>
					<text class="it-m">{{ fmtDate(a.created_at) }} · {{ a.category || '未分类' }}</text>
				</view>
			</view>

			<view class="empty" v-if="isLoggedIn && !articles.length">
				<text class="empty-tx">还没有发布过内容</text>
			</view>

			<view class="morehint" v-if="isLoggedIn && articles.length">— 没有更多了 —</view>

			<view class="guest" v-if="!isLoggedIn">
				<text class="guest-tx">登录后可以换封面、看自己的动态</text>
			</view>
		</view>
		<update-sheet />
	</view>
</template>

<script>
import apiConfig from '../../../utils/api.js';
import config from '../../../utils/config.js';
import { loadRoles, isBadgeRole as badgeRoleFn, badgeLabel as badgeLabelFn, badgeStyle as badgeStyleFn } from '../../../utils/role-badges.js';

const DEFAULT_COVER = '/server/uploads/default_background.png';

export default {
	data() {
		return {
			avatarUrl: apiConfig.getServerUrl(config.defaultAvatar),
			nickname: '未登录',
			isLoggedIn: false,
			backgroundUrl: apiConfig.getServerUrl(DEFAULT_COVER),
			defaultCoverUrl: apiConfig.getServerUrl(DEFAULT_COVER),
			hasCover: false,
			statusBarHeight: 0,
			bannerHeight: 0,
			gearTop: 0,
			userInfo: null,
			userRole: '',
			userId: '',
			growth: 0,
			growthLevel: 0,
			articles: [],
			articleTotal: 0,
			topCats: [],
			apiBase: ''
		};
	},

	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;

		// 封面高度：512rpx（≈ 266px @390 宽）+ 状态栏，保证封面铺到状态栏后面
		const bannerBaseHeight = (512 / 750) * systemInfo.windowWidth;
		this.bannerHeight = bannerBaseHeight + this.statusBarHeight;
		this.gearTop = this.statusBarHeight + 10;

		this.apiBase = apiConfig.baseUrl;
		this.loadUserInfo();
	},

	onShow() {
		this.loadUserInfo();
		this.loadGrowth();
		this.loadArticles();
		loadRoles();
	},

	methods: {
		isBadgeRole(name) { return badgeRoleFn(name); },
		badgeLabel(name) { return badgeLabelFn(name); },
		badgeStyle(name) { return badgeStyleFn(name); },

		processImageUrl(url) {
			if (!url) return '';
			url = String(url).trim();
			if (/^https?:\/\//.test(url)) return url;
			if (url.indexOf('/static/') === 0) return url;
			// 相对路径统一归一化：/doo/server/uploads/x.jpg、/server/uploads/x.jpg、server/uploads/x.jpg
			// 都还原成 siteUrl + server/uploads/x.jpg，避免拼出 /doo/server/server/...
			const clean = url.replace(/^\/+/, '').replace(/^doo\//, '');
			return apiConfig.getServerUrl('/' + clean);
		},

		loadUserInfo() {
			const userInfo = uni.getStorageSync('userInfo');
			const isLoggedIn = uni.getStorageSync('isLoggedIn');

			if (isLoggedIn && userInfo) {
				this.isLoggedIn = true;
				this.userInfo = userInfo;
				this.userRole = userInfo.role || '';
				this.nickname = userInfo.nickname || userInfo.username || '未登录';
				this.userId = userInfo.id || '';

				this.avatarUrl = this.processImageUrl(userInfo.avatar || apiConfig.getServerUrl(config.defaultAvatar));

				const bg = userInfo.background_image
					? this.processImageUrl(userInfo.background_image)
					: this.defaultCoverUrl;
				this.backgroundUrl = bg;
				this.hasCover = !!userInfo.background_image;
			} else {
				this.isLoggedIn = false;
				this.userInfo = null;
				this.nickname = '未登录';
				this.userId = '';
				this.avatarUrl = apiConfig.getServerUrl(config.defaultAvatar);
				this.backgroundUrl = this.defaultCoverUrl;
				this.hasCover = false;
				this.articles = [];
				this.topCats = [];
				this.articleTotal = 0;
			}
		},

		// 成长值（文章数）→ 等级：阈值 5,10,30,60,80,100,120,140,160,180
		loadGrowth() {
			const ui = uni.getStorageSync('userInfo');
			if (!ui || !ui.id) return;
			uni.request({
				url: apiConfig.baseUrl + 'get_user_articles.php',
				method: 'GET',
				data: { user_id: ui.id, page: 1, page_size: 1 },
				success: (res) => {
					try {
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (result && result.code === 200) {
							const total = Number((result.data && result.data.total) || 0);
							const levels = [5, 10, 30, 60, 80, 100, 120, 140, 160, 180];
							let level = 0;
							for (let i = 0; i < levels.length; i++) {
								if (total >= levels[i]) level = i + 1;
							}
							const manual = Number(ui.level || 0);
							if (manual > 0) level = Math.min(10, manual);
							this.growth = total;
							this.growthLevel = level;
						}
					} catch (e) { /* ignore */ }
				}
			});
		},

		// 我的动态 + 常写分类
		loadArticles() {
			const ui = uni.getStorageSync('userInfo');
			if (!uni.getStorageSync('isLoggedIn') || !ui || !ui.id) return;
			uni.request({
				url: apiConfig.baseUrl + 'get_user_articles.php',
				method: 'GET',
				data: { user_id: ui.id, page: 1, page_size: 50 },
				success: (res) => {
					try {
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						if (!result || result.code !== 200) return;
						const list = (result.data && result.data.list) || [];
						this.articleTotal = Number((result.data && result.data.total) || 0);
						this.articles = list.slice(0, 4);

						const tally = {};
						list.forEach((a) => {
							const c = (a.category || '').trim();
							if (c) tally[c] = (tally[c] || 0) + 1;
						});
						this.topCats = Object.keys(tally)
							.sort((x, y) => tally[y] - tally[x])
							.slice(0, 3);
					} catch (e) { /* ignore */ }
				}
			});
		},

		catChar(a) {
			const c = (a && a.category) ? a.category.trim() : '';
			return c ? c.slice(0, 1).toUpperCase() : '文';
		},

		fmtDate(v) {
			if (!v) return '';
			const s = String(v).replace('T', ' ');
			const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
			return m ? m[2] + '-' + m[3] : s.slice(0, 10);
		},

		openArticle(a) {
			if (!a || !a.id) return;
			uni.navigateTo({ url: '/pages/content/article-detail?id=' + a.id });
		},

		goMyArticles() {
			uni.showToast({ title: '全部动态页开发中', icon: 'none' });
		},

		openMore() {
			uni.showActionSheet({
				itemList: ['更换封面', '问题反馈', '关于我们'],
				success: (res) => {
					if (res.tapIndex === 0) this.changeBackground();
					else if (res.tapIndex === 1) this.handleMenuClick('feedback');
					else if (res.tapIndex === 2) this.handleMenuClick('aboutUs');
				}
			});
		},

		handleLogin() {
			uni.navigateTo({ url: '/pages/auth/login' });
		},

		handleRegister() {
			uni.navigateTo({ url: '/pages/auth/login?mode=register' });
		},

		goToPersonalInfo() {
			if (!this.isLoggedIn) {
				uni.showToast({ title: '请先登录', icon: 'none' });
				return;
			}
			uni.navigateTo({ url: '/pages/user/personal-info' });
		},

		changeAvatar() {
			if (!this.isLoggedIn) {
				uni.showToast({ title: '请先登录', icon: 'none' });
				return;
			}
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					await this.uploadImage(res.tempFilePaths[0], 'avatar');
				}
			});
		},

		changeBackground() {
			if (!this.isLoggedIn) {
				uni.showToast({ title: '请先登录', icon: 'none' });
				return;
			}
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					await this.uploadImage(res.tempFilePaths[0], 'background');
				}
			});
		},

		async uploadImage(filePath, type) {
			uni.showLoading({ title: '上传中...' });
			try {
				const uploadRes = await uni.uploadFile({
					url: this.apiBase + 'upload.php',
					filePath: filePath,
					name: 'file'
				});

				if (!uploadRes.data) {
					uni.hideLoading();
					uni.showToast({ title: '上传失败，服务器未返回数据', icon: 'none' });
					return;
				}

				let data;
				try {
					data = JSON.parse(uploadRes.data);
				} catch (e) {
					uni.hideLoading();
					uni.showToast({ title: '服务器返回数据格式错误', icon: 'none' });
					return;
				}

				if (data.code === 200) {
					let imageUrl = this.processImageUrl(data.data.url);
					if (type === 'avatar') {
						this.avatarUrl = imageUrl;
						await this.updateUserInfo({ avatar: imageUrl });
					} else {
						this.backgroundUrl = imageUrl;
						this.hasCover = true;
						await this.updateUserInfo({ background_image: imageUrl });
					}
					uni.hideLoading();
					uni.showToast({ title: '上传成功', icon: 'success' });
				} else {
					uni.hideLoading();
					uni.showToast({ title: data.message || '上传失败', icon: 'none' });
				}
			} catch (error) {
				uni.hideLoading();
				uni.showToast({ title: '上传失败，请检查网络连接', icon: 'none' });
			}
		},

		async updateUserInfo(data) {
			try {
				const token = uni.getStorageSync('token');
				if (token) data.auth_token = token;

				const res = await uni.request({
					url: this.apiBase + 'update_user.php',
					method: 'POST',
					data: data,
					header: { 'Content-Type': 'application/json' }
				});

				if (res.statusCode === 200) {
					const updatedUserInfo = { ...this.userInfo, ...data };
					this.userInfo = updatedUserInfo;
					uni.setStorageSync('userInfo', updatedUserInfo);
					if (data.avatar) this.avatarUrl = data.avatar;
					if (data.background_image) {
						this.backgroundUrl = data.background_image;
						this.hasCover = true;
					}
					this.$forceUpdate();
				}
			} catch (error) { /* ignore */ }
		},

		handleMenuClick(type) {
			const pageMap = {
				personalInfo: '/pages/user/personal-info',
				feedback: '/pages/user/my-feedback',
				aboutUs: '/pages/info/about-us',
				systemSettings: '/pages/info/system-settings'
			};
			const url = pageMap[type];
			if (url) {
				uni.navigateTo({
					url: url,
					fail: () => {
						uni.showToast({ title: '页面跳转失败，请稍后重试', icon: 'none' });
					}
				});
			}
		}
	}
};
</script>

<style lang="scss" scoped>
	.content {
		padding: 0;
		background-color: #ffffff;
		min-height: 100vh;
	}

	/* ---------------- 顶部封面 ---------------- */
	.banner {
		position: relative;
		width: 100%;
		overflow: hidden;
		background: linear-gradient(160deg, #A6C6FF 0%, #7AA3FA 20%, #4B81EE 46%, #2A5CD2 70%, #15337A 100%);
	}

	.banner-img {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.scrim {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(180deg, rgba(6, 18, 52, 0.28) 0%, rgba(6, 18, 52, 0) 42%, rgba(9, 22, 60, 0.42) 100%);
	}

	.wm {
		position: absolute;
		left: 40rpx;
		top: 150rpx;
	}

	.wm-big {
		display: block;
		font-size: 74rpx;
		font-weight: 900;
		letter-spacing: 2rpx;
		line-height: 1;
		color: #ffffff;
		text-shadow: 0 14rpx 42rpx rgba(6, 18, 52, 0.32);
	}

	.wm-sm {
		display: block;
		font-size: 18rpx;
		font-weight: 700;
		letter-spacing: 8rpx;
		opacity: 0.82;
		color: #ffffff;
		margin-top: 14rpx;
	}

	.gear {
		position: absolute;
		right: 30rpx;
		width: 62rpx;
		height: 62rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.20);
		border: 1px solid rgba(255, 255, 255, 0.34);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 24rpx rgba(6, 18, 52, 0.16);
		z-index: 10;
	}

	.gear-ic {
		width: 34rpx;
		height: 34rpx;
	}

	.cover-chip {
		position: absolute;
		right: 30rpx;
		bottom: 88rpx;
		display: flex;
		align-items: center;
		padding: 10rpx 20rpx;
		border-radius: 26rpx;
		background: rgba(255, 255, 255, 0.16);
		border: 1px solid rgba(255, 255, 255, 0.28);
		z-index: 10;
	}

	.chip-ic {
		width: 24rpx;
		height: 24rpx;
		margin-right: 8rpx;
	}

	.chip-tx {
		font-size: 20rpx;
		color: #ffffff;
		letter-spacing: 0.5rpx;
	}

	/* ---------------- 白色面板 ---------------- */
	.sheet {
		position: relative;
		z-index: 16;
		margin-top: -34rpx;
		background: #ffffff;
		border-radius: 50rpx 50rpx 0 0;
		padding: 138rpx 0 40rpx;
		box-shadow: 0 -16rpx 44rpx rgba(10, 26, 66, 0.12);
	}

	.idblk {
		position: relative;
		z-index: 20;
		display: flex;
		align-items: flex-end;
		padding: 0 34rpx;
		margin-top: -170rpx;
	}

	.ava {
		width: 150rpx;
		height: 150rpx;
		border-radius: 50%;
		background: #DCE6F7;
		border: 9rpx solid #ffffff;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.55), 0 14rpx 34rpx rgba(8, 20, 56, 0.34);
		flex: none;
	}

	.who {
		flex: 1;
		padding: 0 14rpx 14rpx 22rpx;
		min-width: 0;
	}

	.nm {
		display: flex;
		align-items: center;
	}

	.nm-tx {
		font-size: 36rpx;
		font-weight: 800;
		color: #171A1F;
		letter-spacing: 0.5rpx;
		max-width: 250rpx;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.role-badge {
		font-size: 18rpx;
		padding: 2rpx 10rpx;
		border-radius: 16rpx;
		margin-left: 12rpx;
		flex-shrink: 0;
	}

	.role-badge.super {
		color: #b8860b;
		background: #fff8e6;
		border: 1px solid #f0d48a;
	}

	.role-badge.admin {
		color: #1b44a6;
		background: #f0f5ff;
		border: 1px solid #b8cdf5;
	}

	.role-badge.editor {
		color: #1a7d3a;
		background: #e8f8ee;
		border: 1px solid #b7e4c7;
	}

	.meta {
		display: flex;
		align-items: center;
		margin-top: 12rpx;
	}

	.uid {
		font-size: 20rpx;
		color: #98A0AB;
		letter-spacing: 0.4rpx;
	}

	.lv {
		font-size: 18rpx;
		font-weight: 800;
		letter-spacing: 0.6rpx;
		color: #C2701D;
		background: linear-gradient(135deg, #FFF1DC, #FFE2BE);
		padding: 4rpx 12rpx;
		border-radius: 10rpx;
		margin-left: 12rpx;
	}

	.acts {
		display: flex;
		align-items: center;
		padding-bottom: 14rpx;
		flex: none;
	}

	.btn-pri {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 26rpx;
		height: 56rpx;
		border-radius: 28rpx;
		background: linear-gradient(135deg, #4C8DFF, #2A5CD2);
		box-shadow: 0 8rpx 22rpx rgba(42, 92, 210, 0.28);
	}

	.btn-pri-tx {
		font-size: 22rpx;
		color: #ffffff;
		letter-spacing: 0.4rpx;
	}

	.btn-gh {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 58rpx;
		height: 56rpx;
		margin-left: 14rpx;
		border-radius: 28rpx;
		background: #ffffff;
		border: 1px solid #E6EAF1;
	}

	.btn-gh-tx {
		font-size: 24rpx;
		color: #6B7280;
		letter-spacing: 1rpx;
	}

	.btn-gh-w {
		width: auto;
		padding: 0 24rpx;
	}

	.btn-gh-tx2 {
		font-size: 22rpx;
		color: #2F63DB;
	}

	/* ---------------- 常写分类 ---------------- */
	.cats {
		display: flex;
		align-items: center;
		padding: 40rpx 34rpx 0;
	}

	.cats-lb {
		font-size: 21rpx;
		color: #98A0AB;
		margin-right: 12rpx;
		letter-spacing: 0.4rpx;
	}

	.cat {
		font-size: 20rpx;
		padding: 8rpx 18rpx;
		border-radius: 22rpx;
		margin-right: 12rpx;
		letter-spacing: 0.4rpx;
	}

	.cat.c0 {
		color: #2F63DB;
		background: #EDF2FF;
	}

	.cat.c1 {
		color: #6B4FD8;
		background: #F3EEFF;
	}

	.cat.c2 {
		color: #0E8A6B;
		background: #E9F8F2;
	}

	/* ---------------- 我的动态 ---------------- */
	.feedh {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 30rpx 34rpx 0;
		padding-top: 28rpx;
		border-top: 1px solid #F1F3F6;
	}

	.feedh-t {
		font-size: 28rpx;
		font-weight: 700;
		color: #171A1F;
		letter-spacing: 0.4rpx;
	}

	.feedh-m {
		font-size: 21rpx;
		color: #98A0AB;
	}

	.item {
		display: flex;
		align-items: center;
		margin: 0 34rpx;
		padding: 23rpx 0;
		border-bottom: 1px solid #F5F6F9;
	}

	.item-last {
		border-bottom: none;
	}

	.thumb {
		width: 88rpx;
		height: 88rpx;
		border-radius: 23rpx;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 22rpx;
	}

	.thumb-tx {
		font-size: 30rpx;
		font-weight: 800;
		color: rgba(255, 255, 255, 0.92);
	}

	.th0 {
		background: linear-gradient(135deg, #BFD6FF, #6E9BFB);
	}

	.th1 {
		background: linear-gradient(135deg, #D5E4FF, #4C8DFF);
	}

	.th2 {
		background: linear-gradient(135deg, #E3ECFF, #8FB4FF);
	}

	.it-b {
		flex: 1;
		min-width: 0;
	}

	.it-t {
		display: block;
		font-size: 26rpx;
		font-weight: 600;
		color: #171A1F;
		line-height: 1.35;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.it-m {
		display: block;
		font-size: 20rpx;
		color: #A6ADB8;
		margin-top: 10rpx;
		letter-spacing: 0.4rpx;
	}

	.morehint {
		text-align: center;
		font-size: 19rpx;
		color: #C6CCD6;
		letter-spacing: 2.4rpx;
		padding: 24rpx 0 6rpx;
	}

	.empty {
		padding: 60rpx 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.empty-tx {
		font-size: 22rpx;
		color: #B4BAC4;
	}

	.guest {
		padding: 70rpx 34rpx 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.guest-tx {
		font-size: 22rpx;
		color: #B4BAC4;
	}
</style>
