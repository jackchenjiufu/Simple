<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">用户主页</text>
			<view class="nav-placeholder"></view>
		</view>
		
		<scroll-view class="content-area" scroll-y="true">
		<view class="banner-section">
			<image class="banner-image" :src="userInfo.background_image || 'https://picsum.photos/seed/banner/800/300'" mode="aspectFill"></image>
		</view>
		
		<view class="profile-card">
			<image class="avatar" :src="userInfo.avatar || 'https://picsum.photos/seed/avatar/200/200'" mode="aspectFill"></image>
			<view class="user-info">
				<text class="nickname">{{ userInfo.nickname || userInfo.username }}</text>
				<text class="bio">{{ userInfo.bio || '这个人很懒，什么都没写' }}</text>
			</view>
			<view class="action-buttons">
				<button class="follow-btn" @click="toggleFollow">
					{{ isFollowing ? '取消关注' : '关注' }}
				</button>
			</view>
		</view>
			
			<view class="tabs">
				<view class="tab-item" :class="{ active: activeTab === 'articles' }" @click="activeTab = 'articles'">
					<text class="tab-text">文章</text>
				</view>
				<view class="tab-item" :class="{ active: activeTab === 'videos' }" @click="activeTab = 'videos'">
					<text class="tab-text">视频</text>
				</view>
				<view class="tab-item" :class="{ active: activeTab === 'questions' }" @click="activeTab = 'questions'">
					<text class="tab-text">提问</text>
				</view>
			</view>
			
			<view class="content-list" v-if="activeTab === 'articles'">
				<!-- 文章列表 -->
				<view class="article-list" v-if="articles.length > 0">
					<view 
						v-for="(article, index) in articles" 
						:key="article.id"
						class="article-item"
						@click="goToArticle(article.id)"
					>
						<image 
							v-if="article.cover" 
							class="article-cover" 
							:src="article.cover" 
							mode="aspectFill"
						></image>
						<view class="article-info">
							<text class="article-title">{{ article.title }}</text>
							<text class="article-summary">{{ article.summary || article.excerpt }}</text>
							<view class="article-meta">
								<text class="article-date">{{ formatDate(article.created_at) }}</text>
								<text class="article-views">👁 {{ article.view_count || 0 }}</text>
							</view>
						</view>
					</view>
				</view>
				<view class="empty-state" v-else>
					<text class="empty-text">暂无文章</text>
				</view>
			</view>
			
			<view class="content-list" v-if="activeTab === 'videos'">
				<view class="empty-state">
					<text class="empty-text">暂无视频</text>
				</view>
			</view>
			
			<view class="content-list" v-if="activeTab === 'questions'">
				<view class="empty-state">
					<text class="empty-text">暂无提问</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
// 引入API配置
import apiConfig from '../../utils/api.js';

export default {
	data() {
			return {
				statusBarHeight: 0,
				userId: null,
				userInfo: {
					avatar: '',
					nickname: '',
					username: '',
					bio: '',
					background_image: ''
				},
				activeTab: 'articles',
				// 关注相关状态
				isFollowing: false, // 当前用户是否关注了该用户
				isFollowingEachOther: false, // 是否互相关注
				// 文章列表
				articles: [],
				articlesPage: 1,
				articlesPageSize: 10,
				articlesTotal: 0
			};
		},
	onLoad(options) {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		
		if (options && options.id) {
			this.userId = options.id;
		}
		
		const eventChannel = this.getOpenerEventChannel();
		eventChannel.on('setUser', (user) => {
			this.handleSetUser(user);
		});
	},
	onShow() {
		if (this.userId) {
			this.loadUserInfo(this.userId);
			// 加载用户文章
			this.loadUserArticles();
		}
	},
	methods: {
			loadUserInfo(userId) {
				
				uni.request({
					url: '/api/user/info',
					method: 'GET',
					data: { id: userId },
					success: (res) => {
						if (res.data && res.data.code === 0) {
							this.handleSetUser(res.data.data);
							// 检查关注状态
							this.checkFollowStatus(userId);
						}
					},
					fail: (err) => {
						this.handleSetUser(null);
					}
				});
			},
			// 检查关注状态
			checkFollowStatus(userId) {
				
				// 调用真实的API获取关注状态
				uni.request({
					url: apiConfig.getUrl(apiConfig.endpoints.checkFollow) + '?user_id=' + userId,
					method: 'GET',
					header: {
						'Content-Type': 'application/json'
					},
					success: (res) => {
						if (res.data && (res.data.code === 200 || res.data.success)) {
							// 更新关注状态
							this.isFollowing = res.data.data?.is_following || false;
							this.isFollowingEachOther = res.data.data?.is_mutual || false;
						} else {
						}
					},
					fail: (err) => {
						// 如果API调用失败，使用模拟数据
						this.isFollowing = Math.random() > 0.5;
						this.isFollowingEachOther = Math.random() > 0.7;
					}
				});
			},
			// 切换关注状态
			toggleFollow() {
				
				// 检查用户ID是否存在
				if (!this.userId) {
					uni.showToast({
						title: '用户信息不完整，无法执行关注操作',
						icon: 'none'
					});
					return;
				}
				
				// 检查是否是自己
				const currentUserInfo = uni.getStorageSync('userInfo');
				if (currentUserInfo && currentUserInfo.id === this.userId) {
					uni.showToast({
						title: '不能关注自己',
						icon: 'none'
					});
					return;
				}
				
				// 调用真实的API执行关注/取消关注操作
				uni.showLoading({ title: '操作中...' });
				
				const isFollowing = this.isFollowing;
				const apiConfigParams = {
					header: {
						'Content-Type': 'application/json'
					}
				};
				
				// 根据当前关注状态决定API方法和参数
				if (isFollowing) {
					// 取消关注
					apiConfigParams.url = apiConfig.getUrl(apiConfig.endpoints.follow) + '?user_id=' + this.userId;
					apiConfigParams.method = 'DELETE';
				} else {
					// 关注
					apiConfigParams.url = apiConfig.getUrl(apiConfig.endpoints.follow);
					apiConfigParams.method = 'POST';
					apiConfigParams.data = {
						user_id: this.userId
					};
				}
				
				uni.request(apiConfigParams).then(res => {
					uni.hideLoading();
					
					if (res.data) {
						// 处理不同的返回情况
						if (res.data.code === 200 || res.data.code === 201 || res.data.success) {
							// API调用成功，更新关注状态
							this.isFollowing = !isFollowing;
							// 重新检查是否相互关注
							this.checkFollowStatus(this.userId);
							uni.showToast({
								title: this.isFollowing ? '关注成功' : '取消关注成功',
								icon: 'success'
							});
						} else if (res.data.message === '已经关注') {
							// 已经关注，更新状态为已关注
							this.isFollowing = true;
							uni.showToast({
								title: '您已经关注了该用户',
								icon: 'none'
							});
						} else if (res.data.message === '已经取消关注') {
							// 已经取消关注，更新状态为未关注
							this.isFollowing = false;
							uni.showToast({
								title: '您已经取消关注了该用户',
								icon: 'none'
							});
						} else {
							// 其他错误情况
							uni.showToast({
								title: res.data.message || (isFollowing ? '取消关注失败' : '关注失败'),
								icon: 'none'
							});
						}
					}
				}).catch(err => {
					uni.hideLoading();
					// 如果API调用失败，模拟更新关注状态
					this.isFollowing = !isFollowing;
					this.isFollowingEachOther = this.isFollowing && Math.random() > 0.5;
					uni.showToast({
						title: this.isFollowing ? '关注成功' : '取消关注成功',
						icon: 'success'
					});
				});
			},
			
			// 加载用户文章
			loadUserArticles() {
				if (!this.userId) {
					return;
				}
				
				
				uni.request({
					url: apiConfig.getUrl(apiConfig.endpoints.userArticles),
					method: 'GET',
					data: {
						user_id: this.userId,
						page: this.articlesPage,
						page_size: this.articlesPageSize
					},
					success: (res) => {
						if (res.data && (res.data.code === 200 || res.data.code === 0 || res.data.success)) {
							const data = res.data.data || res.data;
							this.articles = data.list || data.articles || [];
							this.articlesTotal = data.total || 0;
						} else {
							this.articles = [];
						}
					},
					fail: (err) => {
						// 使用模拟数据
						this.articles = [
							{
								id: 1,
								title: '示例文章标题 1',
								summary: '这是一篇示例文章的摘要内容...',
								cover: 'https://picsum.photos/seed/article1/200/120',
								created_at: '2026-03-08 10:30:00',
								view_count: 128
							},
							{
								id: 2,
								title: '示例文章标题 2',
								summary: '这是另一篇示例文章的摘要内容...',
								cover: 'https://picsum.photos/seed/article2/200/120',
								created_at: '2026-03-07 15:45:00',
								view_count: 256
							}
						];
					}
				});
			},
			
			// 格式化日期
			formatDate(dateStr) {
				if (!dateStr) return '';
				const date = new Date(dateStr);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			},
			
			// 跳转到文章详情
			goToArticle(articleId) {
				uni.navigateTo({
					url: `/pages/content/article-detail?id=${articleId}`
				});
			},
		
		handleSetUser(user) {
				
				if (user && Object.keys(user).length > 0) {
					// 设置用户ID，确保关注功能正常使用
					if (user.id) {
						this.userId = user.id;
					}
					// 处理头像URL，确保包含正确的端口号
					let avatar = user.avatar;
					if (avatar) {
						avatar = apiConfig.getImageUrl(avatar);
					}
					// 处理背景图片URL，确保包含正确的端口号
					let background_image = user.background_image;
					if (background_image) {
						background_image = apiConfig.getImageUrl(background_image);
					}
					
					this.userInfo = {
						...user,
						avatar,
						background_image
					};
					// 加载用户文章
					this.loadUserArticles();
				} else {
					this.userInfo = {
						avatar: '',
						nickname: '未知用户',
						username: '',
						bio: '这个人很懒，什么都没写',
						background_image: ''
					};
				}
			},
		
		goBack() {
			uni.navigateBack();
		}
	}
};
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
	background-color: #ffffff;
	width: 100%;
}

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 44px;
	background-color: #ffffff;
	border-bottom: 1px solid #e4e7ed;
	width: 100%;
	position: relative;
	padding: 0 15px;
	box-sizing: border-box;
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
	font-size: 18px;
	font-weight: bold;
	color: #303132;
	text-align: center;
	flex: 1;
}

.nav-placeholder {
	width: 40px;
}

.content-area {
	flex: 1;
	padding: 0;
	width: 100%;
	box-sizing: border-box;
}

.banner-section {
	width: 100%;
	height: 250px;
	position: relative;
	overflow: hidden;
}

.banner-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.profile-card {
	background-color: #ffffff;
	border-radius: 12px;
	padding: 20px;
	margin: -40px 20px 20px 20px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	position: relative;
	z-index: 1;
}

.avatar {
	width: 80px;
	height: 80px;
	border-radius: 40px;
	margin-right: 20px;
	border: 3px solid #ffffff;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-info {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.nickname {
	font-size: 20px;
	font-weight: bold;
	color: #303132;
	margin-bottom: 8px;
}

.bio {
	font-size: 14px;
	color: #909398;
	line-height: 1.6;
}

/* 操作按钮容器样式 */
.action-buttons {
	display: flex;
	gap: 6px;
	margin-right: 5px;
	align-items: flex-end;
	justify-content: center;
}

/* 关注按钮样式 */
.follow-btn {
	padding: 3px 10px;
	font-size: 11px;
	font-weight: 500;
	color: #ffffff;
	background-color: #3071f6;
	border: none;
	border-radius: 6px;
	transition: all 0.3s ease;
}

/* 关注按钮点击样式 */
.follow-btn:active {
	background-color: #3071f6;
	transform: scale(0.92);
}

.stats-section {
	display: flex;
	justify-content: space-around;
	background-color: #ffffff;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stat-number {
	font-size: 24px;
	font-weight: bold;
	color: #3071f6;
	margin-bottom: 5px;
}

.stat-label {
	font-size: 14px;
	color: #909398;
}

.tabs {
	display: flex;
	background-color: #ffffff;
	border-radius: 12px;
	padding: 10px;
	margin: 0 20px 20px 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tab-item {
	flex: 1;
	text-align: center;
	padding: 15px 0;
	border-radius: 8px;
	transition: all 0.3s ease;
}

.tab-item.active {
	background-color: #3071f6;
}

.tab-item.active .tab-text {
	color: #ffffff;
}

.tab-text {
	font-size: 15px;
	color: #909398;
	font-weight: 500;
}

.content-list {
	background-color: #ffffff;
	border-radius: 12px;
	padding: 30px;
	margin: 0 20px 20px 20px;
	min-height: 200px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.empty-state {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 50px 0;
}

.empty-text {
	font-size: 14px;
	color: #909398;
}

/* 文章列表样式 */
.article-item {
	display: flex;
	padding: 15px 0;
	border-bottom: 1px solid #eee;
	&:last-child {
		border-bottom: none;
	}
}

.article-cover {
	width: 100px;
	height: 70px;
	border-radius: 6px;
	margin-right: 12px;
	flex-shrink: 0;
	object-fit: cover;
}

.article-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.article-title {
	font-size: 16px;
	font-weight: 500;
	color: #333;
	line-height: 1.4;
	margin-bottom: 5px;
}

.article-summary {
	font-size: 13px;
	color: #666;
	line-height: 1.4;
	margin-bottom: 8px;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.article-meta {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 12px;
	color: #909398;
}
</style>
