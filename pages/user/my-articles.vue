<template>
	<view class="content">
		<!-- 状态栏占位，确保导航栏不与状态栏重叠 -->
		<view 
			class="status-bar" 
			:style="{ height: statusBarHeight + 'px', backgroundColor: '#ffffff' }"
		></view>
		
		<!-- 导航栏，固定在状态栏下方 -->
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">我的文章</text>
			<view class="nav-placeholder"></view>
		</view>
		
		<!-- 内容区域 -->
		<scroll-view class="content-area" scroll-y="true">
			<view class="articles-section">
				<view v-if="isLoggedIn">
					<text class="section-title">我的发布</text>
					<view class="article-list" v-if="myArticles.length > 0">
						<view 
							class="article-item" 
							v-for="(article, index) in myArticles" 
							:key="article.id"
						>
							<view class="article-content" @click="viewArticle(article)">
								<view class="article-header">
									<text class="article-title">{{ article.title }}</text>
									<text class="article-date">{{ article.date }}</text>
								</view>
								<text class="article-excerpt">{{ article.excerpt }}</text>
								<view class="article-tags">
									<text 
										class="article-tag" 
										v-for="(tag, tagIndex) in article.tags" 
										:key="tagIndex"
									>{{ tag }}</text>
								</view>
							</view>
							<view class="article-actions">
								<view class="action-btn delete-btn" @click="deleteArticle(article.id)">
									<text class="action-text">删除</text>
								</view>
							</view>
						</view>
					</view>
					<view class="empty-state" v-else>
						<text class="empty-text">暂无发布的文章</text>
					</view>
				</view>
				<view class="login-required" v-else>
					<text class="login-text">请先登录</text>
					<text class="login-desc">登录后才能查看您的文章</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0,
			myArticles: [],
			userInfo: null,
			isLoggedIn: false,
			userId: 0
		};
	},
	onLoad() {
			const systemInfo = uni.getSystemInfoSync();
			this.statusBarHeight = systemInfo.statusBarHeight || 0;
			// 设置CSS变量，用于样式中引用
			uni.setStorageSync('statusBarHeight', this.statusBarHeight);
			// 加载用户信息，获取真实的用户ID
			this.loadUserInfo();
			// 只有登录后才加载文章
			if (this.isLoggedIn) {
				this.loadMyArticles();
			}
		},
	methods: {
		// 加载用户信息
		loadUserInfo() {
			const userInfo = uni.getStorageSync('userInfo');
			const isLoggedIn = uni.getStorageSync('isLoggedIn');
			
			if (isLoggedIn && userInfo) {
				this.isLoggedIn = true;
				this.userInfo = userInfo;
				this.userId = userInfo.id || 1;
				// 登录状态，清空文章数组并重新加载
				this.myArticles = [];
			} else {
				this.isLoggedIn = false;
				this.userInfo = null;
				this.userId = null;
				// 未登录状态，清空文章数组
				this.myArticles = [];
			}
		},
		goBack() {
			uni.navigateBack();
		},
		loadMyArticles() {
			uni.request({
				url: 'http://139.196.185.197:7070/doo/server/api/get_articles.php',
				method: 'GET',
				data: {
					limit: 100,
					offset: 0
				},
				success: (res) => {
					try {
						const result = res.data;
						if (result.code === 200) {
							const articles = result.data.articles || [];
							// 过滤出当前用户的文章
							this.myArticles = articles
								.filter(item => item.user_id == this.userId)
								.map(item => ({
									id: item.id,
									title: item.title,
									date: item.date,
									excerpt: item.excerpt,
									tags: item.tags || [],
									content: item.content
								}));
						} else {
							throw new Error(result.message || '获取文章失败');
						}
					} catch (error) {
						uni.showToast({
							title: '获取文章失败，请重试',
							icon: 'none'
						});
					}
				},
				fail: (err) => {
					uni.showToast({
						title: '网络错误，请检查连接',
						icon: 'none'
					});
				}
			});
		},
		viewArticle(article) {
			// 跳转到文章详情页面
			uni.navigateTo({
				url: '/pages/content/article-detail',
				success: (res) => {
					// 通过事件通道传递文章数据
					res.eventChannel.emit('setArticle', article);
				}
			});
		},
		deleteArticle(articleId) {
			uni.showModal({
				title: '删除文章',
				content: '确定要删除这篇文章吗？',
				confirmText: '删除',
				cancelText: '取消',
				success: (res) => {
					if (res.confirm) {
						// 调用删除API
						uni.request({
							url: 'http://139.196.185.197:7070/doo/server/api/delete_article.php',
							method: 'POST',
							header: {
								'Content-Type': 'application/json'
							},
							data: {
								id: articleId,
								user_id: this.userId
							},
							success: (res) => {
								try {
									const result = res.data;
									if (result.code === 200) {
										// 删除成功，重新加载文章列表
										uni.showToast({
											title: '删除成功',
											icon: 'success'
										});
										this.loadMyArticles();
									} else {
										throw new Error(result.message || '删除失败');
									}
								} catch (error) {
									uni.showToast({
										title: '删除失败，请重试',
										icon: 'none'
									});
								}
							},
							fail: (err) => {
								uni.showToast({
									title: '网络错误，请检查连接',
									icon: 'none'
								});
							}
						});
					}
				}
			});
		}
	}
};
</script>

<style lang="scss" scoped>
	.content {
		display: flex;
		flex-direction: column;
		width: 100%;
		min-height: 100vh;
		background-color: #ffffff;
		padding-top: 0;
		margin-top: 0;
	}

	.status-bar {
		background-color: var(--bg-color);
		width: 100%;
		position: relative;
		z-index: 101;
	}

	.nav-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		background-color: var(--bg-color);
		border-bottom: 1px solid var(--border-color);
		width: 100%;
		padding: 0 15px;
		box-sizing: border-box;
		position: relative;
		z-index: 99;
		margin-top: 0;
		padding-top: 0;
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

	.articles-section {
		flex: 1;
		padding: 20px;
		overflow-y: auto;
		.section-title {
			font-size: 18px;
			font-weight: 600;
			color: #303132;
			margin-bottom: 20px;
			display: block;
		}
		.article-list {
			display: flex;
			flex-direction: column;
			gap: 15px;
		}
		.empty-state {
			text-align: center;
			padding: 60px 0;
			.empty-text {
				font-size: 14px;
				color: #909398;
			}
		}
	}

	.article-item {
		background-color: #ffffff;
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		transition: box-shadow 0.3s ease;
		&:hover {
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
		}
		.article-content {
			padding: 15px;
			.article-header {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				margin-bottom: 10px;
				.article-title {
					font-size: 16px;
					font-weight: 600;
					color: #303132;
					flex: 1;
					margin-right: 10px;
				}
				.article-date {
					font-size: 12px;
					color: #909398;
				}
			}
			.article-excerpt {
				font-size: 14px;
				color: #909398;
				margin-bottom: 10px;
				line-height: 1.5;
			}
			.article-tags {
				display: flex;
				flex-wrap: wrap;
				gap: 6px;
				.article-tag {
					font-size: 12px;
					color: #3071f6;
					background-color: rgba(64, 158, 255, 0.1);
					padding: 2px 8px;
					border-radius: 4px;
				}
			}
		}
		.article-actions {
			display: flex;
			border-top: 1px solid #f0f0f0;
			.action-btn {
				flex: 1;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 40px;
				.action-text {
					font-size: 14px;
				}
			}
			.delete-btn {
				border-left: 1px solid #f0f0f0;
				.action-text {
					color: #3071f6;
				}
			}
		}
	}

	.login-required {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 80px 20px;
		text-align: center;
		.login-text {
			font-size: 18px;
			font-weight: bold;
			color: #303132;
			margin-bottom: 10px;
			display: block;
		}
		.login-desc {
			font-size: 14px;
			color: #909398;
			display: block;
		}
	}
</style>