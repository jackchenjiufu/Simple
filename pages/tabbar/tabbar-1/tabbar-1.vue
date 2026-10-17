<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<nav-bar
			:activeTab="activeTab"
			@switch="switchTab"
		></nav-bar>

		<swiper
			class="tab-swiper"
			:current="activeTabIndex"
			@change="onSwiperChange"
			:autoplay="false"
			:duration="300"
			:circular="false"
			:vertical="false"
			:indicator-dots="false"
			:disable-touch="activeTabIndex === 2"
		>
			<!-- 首页（轮播 + 公告） -->
			<swiper-item class="swiper-item">
				<scroll-view class="content-area" scroll-y="true" show-scrollbar="false"
					:refresher-enabled="true"
					:refresher-triggered="homeRefreshing"
					@refresherrefresh="onHomeRefresh">
					<view class="tab-content">
						<!-- 轮播横幅（swiper：平滑动画，内联高度防覆盖） -->
						<view class="banner-wrap" v-if="homeBanners.length">
							<swiper
								class="banner-swiper"
								style="height: 320rpx;"
								indicator-dots
								indicator-active-color="#2f6bf0"
								autoplay
								circular
								interval="4000"
								duration="500"
							>
								<swiper-item v-for="b in homeBanners" :key="b.id" @click="onBannerClick(b)">
									<view class="banner-card">
										<image class="banner-img" :src="b.image" mode="aspectFill"></image>
										<view class="banner-overlay"></view>
										<text class="banner-title" v-if="b.title">{{ b.title }}</text>
									</view>
								</swiper-item>
							</swiper>
						</view>
						<!-- 公告条 -->
						<view class="notice-bar" v-if="homeNotice" @click="goAnnouncement(homeNotice.id)">
							<text class="notice-icon">📢</text>
							<text class="notice-text">{{ homeNotice.title }}</text>
							<text class="notice-arrow">›</text>
						</view>
						<!-- 推荐图片流：双列瀑布流 -->
						<view class="rec-section" v-if="recItems.length">
							<view class="rec-header">
								<text class="rec-title">{{ recTitle }}</text>
								<text class="rec-more" @click="goMoreImages">更多 ›</text>
							</view>
							<view class="waterfall">
								<view class="wf-col" v-for="(col, ci) in wfCols" :key="ci">
									<view class="wf-item" v-for="img in col" :key="img.id" @click="openImage(img)">
										<image v-if="!img.video_url" class="wf-img" :src="img.image_url" mode="widthFix" lazy-load></image>
										<!-- 视频卡片：封面 + 播放角标，点击进播放页 -->
										<view v-else class="wf-video" @click.stop="openVideo(img)">
											<image class="wf-img" :src="img.image_url || defaultVideoCover" mode="widthFix" lazy-load></image>
											<view class="wf-play">
												<text class="wf-play-icon">▶</text>
											</view>
											<text class="wf-video-tag">视频</text>
										</view>
										<view class="wf-mask"></view>
										<text class="wf-title">{{ img.title || (img.video_url ? '视频' : '图片') }}</text>
									</view>
								</view>
							</view>
						</view>
						<view class="home-placeholder" v-if="!homeBanners.length && !homeLoading" style="height:160px;display:flex;align-items:center;justify-content:center;color:#999;font-size:13px">
							暂无内容
						</view>
					</view>
				</scroll-view>
			</swiper-item>
			<!-- 文章 -->
			<swiper-item class="swiper-item">
		<scroll-view
			class="content-area"
			scroll-y="true"
			show-scrollbar="false"
			:refresher-enabled="true"
			:refresher-triggered="articlesRefreshing"
					@refresherrefresh="onArticlesRefresh"
					@scrolltolower="loadMoreArticles"
				>
					<view class="tab-content">
						<view class="articles-section">
							<view class="section-header">
								<text class="section-title">文章</text>
								<text class="section-count" v-if="articleTotal">共 {{ articleTotal }} 篇</text>
							</view>
							<scroll-view class="category-tabs" scroll-x="true" show-scrollbar="false" v-if="categories.length">
								<view class="cat-bar">
									<view class="cat-tab" :class="{act:activeCategory==='all'}" @click="activeCategory='all';loadArticles(false)">全部</view>
									<view class="cat-tab" v-for="c in categories" :key="c.cat_name" :class="{act:activeCategory===c.cat_name}" @click="activeCategory=c.cat_name;loadArticles(false)">{{ c.cat_name }}({{ c.count }})</view>
								</view>
							</scroll-view>
							<view class="article-list">
								<!-- 骨架屏：首次加载中显示（避免白屏闪烁） -->
								<view class="article-skeleton" v-if="articleLoading && articleList.length === 0">
									<view class="sk-item" v-for="n in 4" :key="n">
										<view class="sk-line sk-title"></view>
										<view class="sk-line sk-excerpt w60"></view>
										<view class="sk-line sk-excerpt w80"></view>
									</view>
								</view>
								<view v-for="(group, date) in groupedArticles" :key="date" class="date-group">
									<view class="date-header">
										<text class="date-text">{{ date }}</text>
									</view>
									<view
										class="article-item"
										v-for="article in group"
										:key="article.date + '_' + article.id"
										@click="viewArticle(article)"
									>
										<view class="article-header">
											<view class="author-info">
												<image class="author-avatar" :src="article.author_avatar || defaultAvatarUrl" mode="aspectFill" @click.stop="chatWith(article.user_id, article.author)"></image>
												<view class="author-name-wrap">
													<text class="author-name">{{ article.author || '未知作者' }}</text>
													<text v-if="isBadgeRole(article.author_role)" class="role-badge" :style="badgeStyle(article.author_role)">{{ badgeLabel(article.author_role) }}</text>
												<text class="role-badge level" v-if="article.author_level > 0">Lv.{{ article.author_level }}</text>
												</view>
												<text class="article-date">{{ article.date }}</text>
											</view>
											<text class="article-title">{{ article.title }}</text>
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
								</view>
								<view class="empty-state" v-if="!articleLoading && articleList.length === 0">
									<text class="empty-text">暂无文章</text>
								</view>
							</view>
						</view>
					</view>
				</scroll-view>
			</swiper-item>

			<!-- 智能体 -->
			<swiper-item class="swiper-item">
				<view class="agent-page">
				<scroll-view class="agent-scroll" scroll-y="true" scroll-with-animation :scroll-into-view="agentScrl" show-scrollbar="false">
						<view class="agent-empty" v-if="agentMsgs.length===0">
							<view class="agent-logo"><text class="agent-logo-icon">✦</text></view>
							<text class="agent-logo-name">智能助手</text>
							<text class="agent-logo-desc">有什么可以帮你的？</text>
						</view>
						<view class="agent-chat" v-else>
							<view class="agent-msg-wrap" v-for="(m,i) in agentMsgs" :key="i" :class="m.role">
								<view class="agent-avatar" v-if="m.role==='ai'"><text class="agent-avatar-t">AI</text></view>
								<view class="agent-bubble" :class="{wait:m.wait}"><text class="agent-bubble-t">{{m.content}}</text></view>
							</view>
						</view>
						<view id="agent-bottom" style="height:1px"></view>
					</scroll-view>
					<view class="agent-foot">
						<view class="agent-input-wrap">
							<input class="agent-input" v-model="agentInput" placeholder="发消息..." @confirm="agentSend" :disabled="agentLoading" cursor-spacing="100" confirm-type="send"/>
							<view class="agent-send" @click="agentSend" v-if="agentInput.trim()"><text class="agent-send-icon">↑</text></view>
						</view>
					</view>
				</view>
			</swiper-item>
		</swiper>

	</view>
</template>

<script>
import apiConfig from '../../../utils/api.js';
import { loadRoles, isBadgeRole as badgeRoleFn, badgeLabel as badgeLabelFn, badgeStyle as badgeStyleFn } from '../../../utils/role-badges.js';
// 请求模块（自带 uni.request 全局 Token 注入副作用），文章列表走缓存
import requestModule from '../../../utils/request.js';
import NavBar from '../../../components/modules/nav-bar/nav-bar.vue';


const API_BASE = apiConfig.baseUrl;

// 本地日期字符串（YYYY-MM-DD），避免 toISOString 的 UTC 时区偏差
function localDateString() {
	const d = new Date();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

export default {
	components: { NavBar },
	data() {
		return {
			activeTab: 'home',
			activeTabIndex: 0,
			statusBarHeight: 0,
			homeBanners: [],
			homeNotice: null,
			homeLoading: false,
			homeRefreshing: false,
			recItems: [],
			recTitle: '图片推荐',
			defaultVideoCover: apiConfig.getServerUrl('/server/uploads/default_avatar.png'),
			defaultAvatarUrl: apiConfig.getServerUrl('/server/uploads/default_avatar.png'),
			articleList: [],
			articleTotal: 0,
			articleLoading: false,
			articlePage: 1,
			articleHasMore: true,
			categories: [],
			activeCategory: 'all',
			articlesRefreshing: false,
			agentInput: '',
			agentMsgs: [],
			agentLoading: false,
			agentScrl: ''
		};
	},
	computed: {
		// 双列瀑布流分列（交替放入，配合 widthFix 实现错落效果）
		wfCols() {
			const cols = [[], []];
			this.recItems.forEach((img, i) => {
				cols[i % 2].push(img);
			});
			return cols;
		},
		groupedArticles() {
			const groups = {};
			this.articleList.forEach(article => {
				const date = article.date;
				if (!groups[date]) groups[date] = [];
				groups[date].push(article);
			});
			// 日期解析兼容 "2025-01-15" 与 MySQL "2025-01-15 10:30:00"（iOS 解析带空格日期返回 Invalid Date）
			const parseTime = (d) => {
				const t = new Date(String(d).replace(' ', 'T')).getTime();
				return isNaN(t) ? 0 : t;
			};
			const sorted = {};
			Object.keys(groups).sort((a, b) => parseTime(b) - parseTime(a)).forEach(d => { sorted[d] = groups[d]; });
			return sorted;
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		// 预加载角色列表，保证作者徽章（含自定义角色如「运营」）正常显示
		loadRoles();
		// 加载首页轮播 + 公告 + 推荐
		this.loadHome(true);
		this.loadRecommend();
		// 监听键盘高度变化（onKeyboardHeightChange 仅 App 端支持，需能力检测）
		if (uni.onKeyboardHeightChange) {
			this._keyboardHandler = (res) => {
				if (res.height > 0) {
					this.$nextTick(() => { this.agentScrl = 'agent-bottom'; });
				}
			};
			uni.onKeyboardHeightChange(this._keyboardHandler);
		}
	},
	onShow() {
		// 回到页面优先读缓存秒开；下拉刷新/切分类可强制获取最新
		if (this.activeTab === 'articles') this.loadArticles(true);
	},
	onUnload() {
		// 移除键盘监听，防止内存泄漏
		if (this._keyboardHandler && uni.offKeyboardHeightChange) {
			uni.offKeyboardHeightChange(this._keyboardHandler);
			this._keyboardHandler = null;
		}
	},
	methods: {
		// ===== 首页（轮播 + 公告）=====
		// 下拉刷新：重新加载轮播 + 公告 + 推荐（绕开 Redis 缓存，强制取最新）
		onHomeRefresh() {
			this.homeRefreshing = true;
			this.loadHome(true);
			this.loadRecommend();
			setTimeout(() => { this.homeRefreshing = false; }, 800);
		},
		loadHome(useCache = false) {
			if (this.homeLoading) return;
			this.homeLoading = true;
			const base = apiConfig.baseUrl;
			uni.request({
				url: base + 'get_carousels.php',
				method: 'GET',
				timeout: 10000,
				success: (res) => {
					if (res.statusCode === 200 && res.data && res.data.code === 200) {
						this.homeBanners = res.data.data || [];
					}
				},
				fail: () => { /* 轮播失败不阻塞页面 */ },
				complete: () => {
					// 公告（最新一条）
					uni.request({
						url: base + 'announcements.php',
						method: 'POST',
						data: { action: 'get_announcements' },
						header: { 'Content-Type': 'application/json' },
						timeout: 10000,
						success: (res) => {
							if (res.statusCode === 200 && res.data && res.data.code === 200) {
								const list = res.data.data || [];
								this.homeNotice = list.length ? list[0] : null;
							}
						},
						fail: () => {},
						complete: () => { this.homeLoading = false; }
					});
				}
			});
		},
		// 轮播点击：按跳转类型打开对应页面
		onBannerClick(b) {
			if (!b) return;
			const type = b.link_type || 'none';
			if (type === 'none') {
				uni.showToast({ title: '敬请期待', icon: 'none' });
			} else if (type === 'article') {
				if (b.link_id) uni.navigateTo({ url: '/pages/content/article-detail?id=' + b.link_id });
			} else if (type === 'announcement') {
				if (b.link_id) uni.navigateTo({ url: '/pages/content/announcement-detail?id=' + b.link_id });
			} else if (type === 'web' && b.link_url) {
				// App 内嵌网页打开（区别于外链的跳系统浏览器）
				uni.navigateTo({ url: '/pages/info/webview?url=' + encodeURIComponent(b.link_url) });
			} else if (type === 'url' && b.link_url) {
				// #ifdef APP-PLUS
				plus.runtime.openURL(b.link_url);
				// #endif
				// #ifdef H5
				window.open(b.link_url, '_blank');
				// #endif
			}
		},
		// 公告条点击
		goAnnouncement(id) {
			if (id) uni.navigateTo({ url: '/pages/content/announcement-detail?id=' + id });
		},
		// ===== 推荐图片流 =====
		loadRecommend() {
			const base = apiConfig.baseUrl;
			const uid = uni.getStorageSync('userId') || 0;
			const url = base + 'recommend_images.php' + (uid ? '?user_id=' + uid : '');
			uni.request({
				url: url,
				method: 'GET',
				timeout: 10000,
				success: (res) => {
					if (res.statusCode === 200 && res.data && res.data.code === 200) {
						this.recItems = (res.data.data && res.data.data.items) || [];
						this.recTitle = (res.data.data && res.data.data.title) || '图片推荐';
						// 推荐曝光上报（前 6 条，供 CTR 统计）
						this.reportRecView(this.recItems.slice(0, 6));
					}
				},
				fail: () => { /* 推荐失败不阻塞页面 */ }
			});
		},
		// 推荐曝光上报（rec_view，CTR 统计用）
		reportRecView(items) {
			const token = uni.getStorageSync('token');
			const uid = uni.getStorageSync('userId') || 0;
			if (!token || !uid || !items || !items.length) return;
			items.forEach((img, idx) => {
				if (!img || !img.id) return;
				uni.request({
					url: apiConfig.baseUrl + 'user_behavior.php?token=' + token,
					method: 'POST',
					data: { type: 'rec_view', content_id: img.id, duration: idx },
					header: { 'Content-Type': 'application/json' },
					fail: () => {}
				});
			});
		},
		// 点击推荐图片：上报行为（推荐闭环）并进入详情
		openImage(img) {
			if (!img || !img.id) return;
			const token = uni.getStorageSync('token');
			const uid = uni.getStorageSync('userId') || 0;
			if (token && uid) {
				uni.request({
					url: apiConfig.baseUrl + 'user_behavior.php?token=' + token,
					method: 'POST',
					data: { type: 'content_click', content_id: img.id, duration: 0 },
					header: { 'Content-Type': 'application/json' },
					fail: () => {}
				});
			}
			// 跳转带图片数据（card-detail 从 query 读取，避免只传 id 无数据）
			const q = 'id=' + img.id +
				'&image_url=' + encodeURIComponent(img.image_url || '') +
				'&title=' + encodeURIComponent(img.title || '');
			uni.navigateTo({ url: '/pages/content/card-detail?' + q });
		},
		// 点击视频卡片：上报行为并进入视频播放页
		openVideo(img) {
			if (!img || !img.id) return;
			const token = uni.getStorageSync('token');
			const uid = uni.getStorageSync('userId') || 0;
			if (token && uid) {
				uni.request({
					url: apiConfig.baseUrl + 'user_behavior.php?token=' + token,
					method: 'POST',
					data: { type: 'content_click', content_id: img.id, duration: 0 },
					header: { 'Content-Type': 'application/json' },
					fail: () => {}
				});
			}
			const q = 'id=' + img.id +
				'&video_url=' + encodeURIComponent(img.video_url || '') +
				'&image_url=' + encodeURIComponent(img.image_url || '') +
				'&title=' + encodeURIComponent(img.title || '视频');
			uni.navigateTo({ url: '/pages/content/video-player?' + q });
		},
		goMoreImages() {
			uni.showToast({ title: '更多图片敬请期待', icon: 'none' });
		},
		// 角色徽章辅助（注册为实例方法，供模板调用）
		isBadgeRole(name) { return badgeRoleFn(name); },
		badgeLabel(name) { return badgeLabelFn(name); },
		badgeStyle(name) { return badgeStyleFn(name); },
		switchTab(tab) {
			this.activeTab = tab;
			const map = { home: 0, articles: 1, agent: 2 };
			const index = map[tab] !== undefined ? map[tab] : 0;
			if (index === this.activeTabIndex) {
				// 已是当前 Tab：swiper 不会触发 change，手动刷新一次（用户主动点击，强制取最新）
				if (tab === 'home') this.loadHome(true);
				else if (tab === 'articles') this.loadArticles(false);
				return;
			}
			// 切换 Tab：由 onSwiperChange 统一加载，避免重复请求
			this.activeTabIndex = index;
		},
		onSwiperChange(event) {
			const index = event.detail.current;
			this.activeTabIndex = index;
			const tabs = ['home', 'articles', 'agent'];
			this.activeTab = tabs[index] || 'home';
			if (this.activeTab === 'home') this.loadHome(true);
			else if (this.activeTab === 'articles') this.loadArticles(true);
		},
		async loadArticles(useCache = false) {
			this.articleLoading = true;
			this.articlePage = 1;
			this.articleHasMore = true;
			try {
				const params = { limit: 20, offset: 0 };
				if (this.activeCategory !== 'all') params.category = this.activeCategory;
				// 走 request.js：onShow/切Tab 读缓存秒开，下拉刷新/切分类强制新数据
				const result = await requestModule.get('get_articles.php', params, {
					cache: useCache,
					cacheTime: 30 * 60 * 1000
				});
				if (result && result.code === 200 && result.data) {
					if (result.data.articles) {
						this.articleList = result.data.articles.map(article => {
							return {
								...article,
								author_avatar: article.author_avatar || this.defaultAvatarUrl,
								date: article.date || article.created_at || localDateString()
							};
						});
					}
					this.articleTotal = result.data.total || 0;
					this.articleHasMore = this.articleList.length < this.articleTotal;
					if (result.data.categories) {
						this.categories = result.data.categories;
					}
				} else {
					this.articleList = [];
				}
			} catch (e) {
				this.articleList = [];
			} finally {
				this.articleLoading = false;
			}
		},
		async loadMoreArticles() {
			if (this.articleLoading || !this.articleHasMore) return;
			this.articleLoading = true;
			try {
				const params = { limit: 20, offset: this.articlePage * 20 };
				if (this.activeCategory !== 'all') params.category = this.activeCategory;
				const res = await uni.request({
					url: API_BASE + 'get_articles.php',
					method: 'GET',
					data: params
				});
				const result = res.data;
				if (result.code === 200 && result.data && result.data.articles && result.data.articles.length > 0) {
					const more = result.data.articles.map(article => {
						return {
							...article,
							author_avatar: article.author_avatar || this.defaultAvatarUrl,
							date: article.date || article.created_at || localDateString()
						};
					});
					this.articleList = this.articleList.concat(more);
					this.articlePage++;
					this.articleHasMore = this.articleList.length < (result.data.total || this.articleTotal);
				} else {
					this.articleHasMore = false;
				}
			} catch (e) {
				this.articleHasMore = false;
			} finally {
				this.articleLoading = false;
			}
		},
		async onArticlesRefresh() {
			this.articlesRefreshing = true;
			try { await this.loadArticles(false); } catch (e) { /* silent */ }
			this.articlesRefreshing = false;
		},
		async agentSend() {
			const t = this.agentInput.trim();
			if (!t || this.agentLoading) return;
			this.agentInput = '';
			this.agentLoading = true;
			this.agentMsgs.push({ role: 'user', content: t });
			this.agentMsgs.push({ role: 'ai', content: '...', wait: true });
			this.$nextTick(() => { this.agentScrl = 'agent-bottom'; });
			try {
				const res = await uni.request({
					url: API_BASE + 'ai_proxy.php',
					method: 'POST',
					header: { 'Content-Type': 'application/json' },
					data: { message: t, max_tokens: 500 },
					timeout: 90000
				});
				this.agentLoading = false;
				this.agentMsgs = this.agentMsgs.filter(m => !m.wait);
				const reply = res?.data?.data?.reply || res?.data?.reply || '...';
				this.agentMsgs.push({ role: 'ai', content: reply });
			} catch (e) {
				this.agentLoading = false;
				this.agentMsgs = this.agentMsgs.filter(m => !m.wait);
				this.agentMsgs.push({ role: 'ai', content: '连接失败' });
			}
			this.$nextTick(() => { this.agentScrl = 'agent-bottom'; });
		},
		viewArticle(article) {
			uni.navigateTo({
				url: '/pages/content/article-detail',
				success: (res) => res.eventChannel.emit('setArticle', article)
			});
		},
		// 点击用户头像 → 私聊
		chatWith(userId, nickname) {
			if (!userId) {
				uni.showToast({ title: '用户信息缺失', icon: 'none' });
				return;
			}
			const myId = uni.getStorageSync('userId');
			if (!myId) {
				uni.showModal({
					title: '未登录',
					content: '登录后才能私聊，现在去登录？',
					confirmText: '去登录',
					success: (r) => {
						if (r.confirm) uni.navigateTo({ url: '/pages/auth/login' });
					}
				});
				return;
			}
			if (Number(myId) === Number(userId)) {
				uni.showToast({ title: '这是你自己', icon: 'none' });
				return;
			}
			uni.navigateTo({
				url: `/pages/chat/chat?user_id=${userId}&nickname=${encodeURIComponent(nickname || '用户')}`
			});
		}
	}
};
</script>

<style>
.content {
	width: 100%;
	height: 100%;
	background-color: #ffffff;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

	.status-bar {
		background-color: #ffffff;
		width: 100%;
		flex-shrink: 0;
	}

.tab-swiper {
	width: 100%;
	flex: 1;
	overflow: hidden;
}

.swiper-item {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.content-area {
	width: 100%;
	height: 100%;
}

.tab-content {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

/* ========== 主页标签 ========== */
.native-gallery-tab {
	padding: 24upx;
}

.gallery-header {
	margin-bottom: 24upx;
}

.gallery-title {
	font-size: 34upx;
	font-weight: 700;
	color: #1f2937;
	display: block;
	margin-bottom: 8upx;
}

.gallery-subtitle {
	font-size: 24upx;
	color: #6b7280;
}

.gallery-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 12upx;
}

.gallery-placeholder {
	aspect-ratio: 1;
	background: #ffffff;
	border-radius: 12upx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2upx 8upx rgba(0, 0, 0, 0.06);
}

.placeholder-icon {
	font-size: 48upx;
	margin-bottom: 8upx;
}

.placeholder-text {
	font-size: 22upx;
	color: #9ca3af;
}

/* ========== 文章部分 ========== */
/* 文章分类 */
.category-tabs { white-space:nowrap; padding:0 16upx 12upx; margin-top:-4upx; }
.section-header { display:flex; align-items:baseline; justify-content:space-between; }
.section-count { font-size:22upx; color:#9ca3af; }
.cat-bar { display:flex; gap:8upx; white-space:nowrap; }
.cat-tab { display:inline-block; font-size:20upx; color:#6b7280; background:#f3f4f6; padding:4upx 14upx; border-radius:9999upx; }
.cat-tab.act { color:#fff; background:#1b44a6; }

.articles-section {
	padding: 24upx;
}

.section-header {
	margin-bottom: 24upx;
}

.section-title {
	font-size: 34upx;
	font-weight: 600;
	color: #1f2937;
}

.article-list {
	display: flex;
	flex-direction: column;
	gap: 24upx;
}

.article-item {
	background-color: #ffffff;
	border-radius: 12upx;
	padding: 24upx;
	box-shadow: 0 2upx 8upx rgba(0, 0, 0, 0.06);
	transition: all 0.3s ease;
}

.article-item:active {
	box-shadow: 0 4upx 16upx rgba(0, 0, 0, 0.1);
	transform: translateY(-2upx);
}

.article-header {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	margin-bottom: 12upx;
}

.author-info {
	display: flex;
	align-items: center;
	margin-bottom: 8upx;
	gap: 8upx;
}

.author-avatar {
	width: 40upx;
	height: 40upx;
	border-radius: 50%;
}

.author-name-wrap {
	display: flex;
	align-items: center;
	gap: 8upx;
	min-width: 0;
}

.author-name {
	font-size: 24upx;
	color: #6b7280;
}

.role-badge {
	font-size: 16upx;
	padding: 1upx 10upx;
	border-radius: 20upx;
	flex-shrink: 0;
}
.role-badge.super { color: #b8860b; background: #fff8e6; border: 1upx solid #f0d48a; }
.role-badge.admin { color: #1b44a6; background: #f0f5ff; border: 1upx solid #b8cdf5; }
.role-badge.editor { color: #1a7d3a; background: #e8f8ee; border: 1upx solid #b7e4c7; }
.role-badge.level { color: #7c5cfc; background: #f3f0ff; border: 1upx solid #d4c8f7; }

.article-date {
	font-size: 24upx;
	color: #9ca3af;
}

.article-title {
	font-size: 30upx;
	font-weight: 600;
	color: #1f2937;
	width: 100%;
	margin-bottom: 8upx;
}

.article-excerpt {
	font-size: 26upx;
	color: #6b7280;
	margin-bottom: 12upx;
	line-height: 1.5;
}

.article-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8upx;
}

.article-tag {
	font-size: 22upx;
	color: #1b44a6;
	background-color: rgba(27, 68, 166, 0.08);
	padding: 4upx 12upx;
	border-radius: 9999upx;
}

.empty-state {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 200px;
}

/* 骨架屏 */
.article-skeleton { padding: 4upx 0; }
.sk-item { background: #ffffff; border-radius: 12upx; padding: 24upx; margin-bottom: 20upx; box-shadow: 0 2upx 8upx rgba(0,0,0,0.04); }
.sk-line { background: linear-gradient(90deg, #f0f0f0 25%, #e7e7e7 37%, #f0f0f0 63%); background-size: 400% 100%; border-radius: 6upx; animation: sk-shimmer 1.4s ease infinite; }
.sk-title { height: 32upx; width: 70%; margin-bottom: 16upx; }
.sk-excerpt { height: 24upx; margin-bottom: 12upx; }
.w60 { width: 60%; }
.w80 { width: 80%; }
@keyframes sk-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

.empty-text {
	font-size: 26upx;
	color: #9ca3af;
}

.date-group {
	margin-bottom: 32upx;
}

.date-header {
	margin-bottom: 16upx;
	padding-bottom: 12upx;
	border-bottom: 1px solid #e5e7eb;
}

.date-text {
	font-size: 24upx;
	font-weight: 500;
	color: #6b7280;
	background-color: #f3f4f6;
	padding: 4upx 12upx;
	border-radius: 12upx;
}

/* 隐藏滚动条 */
/* 智能体 */
.agent-page{display:flex;flex-direction:column;height:100%;overflow:hidden}
.agent-scroll{flex:1;height:0;min-height:0;padding:24upx 20upx;background:#f5f6f8;box-sizing:border-box}
.agent-empty{text-align:center;padding:200upx 0}
.agent-logo{width:88upx;height:88upx;border-radius:24upx;background:linear-gradient(135deg,#1b44a6,#3071f6);display:flex;align-items:center;justify-content:center;margin:0 auto 20upx;box-shadow:0 8upx 30upx rgba(48,113,246,.3)}
.agent-logo-icon{font-size:48upx;color:#fff}
.agent-logo-name{font-size:36upx;font-weight:700;color:#1f2937;display:block;margin-bottom:6upx}
.agent-logo-desc{font-size:22upx;color:#9ca3af;display:block}
.agent-msg-wrap{display:flex;margin-bottom:20upx}
.agent-msg-wrap.user{justify-content:flex-end}
.agent-msg-wrap.ai{justify-content:flex-start}
.agent-avatar{width:60upx;height:60upx;border-radius:50%;background:#e8f0fe;display:flex;align-items:center;justify-content:center;margin-right:12upx;flex-shrink:0}
.agent-avatar-t{font-size:20upx;font-weight:700;color:#3071f6}
.agent-bubble{max-width:75%;padding:18upx 22upx;border-radius:18upx}
.agent-msg-wrap.user .agent-bubble{background:#3071f6;border-bottom-right-radius:4upx}
.agent-msg-wrap.ai .agent-bubble{background:#fff;border-bottom-left-radius:4upx;box-shadow:0 2upx 8upx rgba(0,0,0,.04)}
.agent-bubble-t{font-size:28upx;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.agent-msg-wrap.user .agent-bubble-t{color:#fff}
.agent-msg-wrap.ai .agent-bubble-t{color:#303132}
.agent-bubble.wait{background:#e5e7eb}
.agent-bubble.wait .agent-bubble-t{color:#909398}
.agent-foot{flex-shrink:0;background:#fff;padding:16upx 20upx;padding-bottom:calc(16upx + env(safe-area-inset-bottom));border-top:1px solid #f0f0f0;transition:padding-bottom .3s}
.agent-input-wrap{display:flex;align-items:center;background:#f3f4f6;border-radius:40upx;padding:8upx 12upx 8upx 24upx}
.agent-input{flex:1;height:60upx;font-size:28upx;color:#303132;border:none;background:transparent}
.agent-send{width:60upx;height:60upx;border-radius:50%;background:#3071f6;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.agent-send-icon{font-size:28upx;color:#fff;font-weight:700}
::-webkit-scrollbar{width:0;height:0;background:transparent}
/* ===== 首页：推荐图片流（双列瀑布流） ===== */
.rec-section { margin-top: 24upx; }
.rec-header { display: flex; align-items: center; justify-content: space-between; padding: 0 24upx; margin-bottom: 14upx; }
.rec-title { font-size: 30upx; font-weight: 700; color: #1f2937; }
.rec-more { font-size: 24upx; color: #9ca3af; }
.waterfall { display: flex; padding: 0 20upx; }
.wf-col { flex: 1; min-width: 0; }
.wf-col:first-child { margin-right: 14upx; }
.wf-item { position: relative; margin-bottom: 14upx; border-radius: 14upx; overflow: hidden; }
.wf-img { width: 100%; display: block; border-radius: 14upx; }
/* 视频卡片：居中播放角标 + 左上角标签 */
.wf-video { position: relative; }
.wf-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 72upx; height: 72upx; border-radius: 50%; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 2; }
.wf-play-icon { color: #fff; font-size: 30upx; margin-left: 6upx; }
.wf-video-tag { position: absolute; left: 10upx; top: 10upx; z-index: 2; background: rgba(0,0,0,.55); color: #fff; font-size: 20upx; padding: 2upx 12upx; border-radius: 8upx; }
.wf-mask { position: absolute; left: 0; right: 0; bottom: 0; height: 60upx; background: linear-gradient(transparent, rgba(0,0,0,.45)); border-radius: 0 0 14upx 14upx; }
.wf-title { position: absolute; left: 12upx; bottom: 8upx; right: 12upx; color: #fff; font-size: 22upx; font-weight: 600; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

/* ===== 首页：轮播 + 公告 ===== */
.banner-wrap { margin-top: 20upx; padding: 0 20upx; }
.banner-swiper { width: 100%; height: 320upx; border-radius: 20upx; overflow: hidden; }
.banner-card { position: relative; width: 100%; height: 100%; border-radius: 20upx; overflow: hidden; }
.banner-img { width: 100%; height: 100%; }
.banner-overlay { position: absolute; left: 0; right: 0; bottom: 0; height: 90upx; background: linear-gradient(transparent, rgba(0,0,0,.45)); }
.banner-title { position: absolute; left: 24upx; bottom: 16upx; color: #fff; font-size: 30upx; font-weight: 600; text-shadow: 0 2upx 8upx rgba(0,0,0,.4); max-width: 80%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.notice-bar { display: flex; align-items: center; gap: 12upx; margin: 20upx 24upx 0; padding: 18upx 22upx; background: #f6f8fb; border-radius: 14upx; }
.notice-icon { font-size: 26upx; }
.notice-text { flex: 1; font-size: 24upx; color: #374151; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.notice-arrow { font-size: 28upx; color: #9ca3af; }
</style>
