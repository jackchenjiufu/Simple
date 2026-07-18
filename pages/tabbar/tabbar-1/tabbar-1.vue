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
		>
			<!-- 推荐 -->
						<swiper-item class="swiper-item">
				<scroll-view class="content-area" scroll-y="true" show-scrollbar="false">
					<view class="tab-content">
						<view class="ledger-page">
							<view class="lm-summary">
								<view class="lm-nav">
									<text class="lm-nav-btn" @click="lmChgMonth(-1)">‹</text>
									<text class="lm-nav-label">{{ lmYear }}.{{ lmMonth }}</text>
									<text class="lm-nav-btn" @click="lmChgMonth(1)">›</text>
								</view>
								<view class="lm-row">
									<view class="lm-item"><text class="lm-lbl">收入</text><text class="lm-val inc">¥{{ lmSummary.income.toFixed(2) }}</text></view>
									<view class="lm-item"><text class="lm-lbl">支出</text><text class="lm-val exp">¥{{ lmSummary.expense.toFixed(2) }}</text></view>
									<view class="lm-item"><text class="lm-lbl">结余</text><text class="lm-val" :class="lmSummary.balance>=0?'inc':'exp'">¥{{ lmSummary.balance.toFixed(2) }}</text></view>
								</view>
							</view>
							<scroll-view class="lm-cat-scroll" scroll-x="true" show-scrollbar="false" v-if="lmCats.length">
								<view class="lm-cat-bar">
									<view class="lm-cat" :class="{act:lmCat==='all'}" @click="lmCat='all';loadLedger()">全部</view>
									<view class="lm-cat" v-for="c in lmCats" :key="c" :class="{act:lmCat===c}" @click="lmCat=c;loadLedger()">{{ c }}</view>
								</view>
							</scroll-view>
							<view class="lm-list">
								<view class="lm-empty" v-if="!lmItems.length"><text class="lm-empty-txt">暂无记录</text></view>
								<view class="lm-row-item" v-for="item in lmItems" :key="item.id" @click="editItem(item)">
									<view class="lm-left"><text class="lm-cat-tag" :class="item.type">{{ item.category }}</text><text class="lm-note">{{ item.note || item.category }}</text></view>
									<view class="lm-right"><text class="lm-amt" :class="item.type">{{ item.type==='income'?'+':'-' }}¥{{ parseFloat(item.amount).toFixed(2) }}</text><text class="lm-dt">{{ item.record_date.slice(5) }}</text></view>
								</view>
							</view>
							<view class="lm-add" @click="llAddNew">+</view>
						</view>
						<view class="modal-overlay" v-if="lmShowAdd" @click="llCancel">
							<view class="modal-content" @click.stop>
								<view class="modal-handle"></view>
								<text class="modal-title">{{ editingId ? '编辑' : '记一笔' }}</text>
								<view class="type-switch">
									<view class="type-btn" :class="{act:lmForm.type==='expense'}" @click="lmForm.type='expense'">支出</view>
									<view class="type-btn" :class="{act:lmForm.type==='income'}" @click="lmForm.type='income'">收入</view>
								</view>
								<view class="fg"><text class="fl">金额</text><input class="fi amt-i" v-model="lmForm.amount" type="digit" placeholder="0.00" /></view>
								<view class="fg">
									<text class="fl">分类</text>
									<scroll-view class="cp" scroll-x="true" show-scrollbar="false">
										<view class="co" v-for="c in catOpts" :key="c" :class="{act:lmForm.category===c}" @click="lmForm.category=c">{{ c }}</view>
									</scroll-view>
								</view>
								<view class="fg"><text class="fl">备注</text><input class="fi" v-model="lmForm.note" type="text" placeholder="选填" /></view>
								<view class="modal-btns">
								<button v-if="editingId" class="lm-del-btn" @click="handleLmDelete">删除</button>
								<button class="lm-save-btn" @click="handleLmAdd" :disabled="lmAdding">{{ lmAdding ? '保存中...' : (editingId ? '更新' : '保存') }}</button>
							</view>
							</view>
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
				>
					<view class="tab-content">
						<view class="articles-section">
							<view class="section-header">
								<text class="section-title">文章</text>
								<text class="section-count" v-if="articleTotal">共 {{ articleTotal }} 篇</text>
							</view>
							<scroll-view class="category-tabs" scroll-x="true" show-scrollbar="false" v-if="categories.length">
								<view class="cat-bar">
									<view class="cat-tab" :class="{act:activeCategory==='all'}" @click="activeCategory='all';loadArticles()">全部</view>
									<view class="cat-tab" v-for="c in categories" :key="c.cat_name" :class="{act:activeCategory===c.cat_name}" @click="activeCategory=c.cat_name;loadArticles()">{{ c.cat_name }}({{ c.count }})</view>
								</view>
							</scroll-view>
							<view class="article-list">
								<view v-for="(group, date) in groupedArticles" :key="date" class="date-group">
									<view class="date-header">
										<text class="date-text">{{ date }}</text>
									</view>
									<view
										class="article-item"
										v-for="(article, index) in group"
										:key="index"
										@click="viewArticle(article)"
									>
										<view class="article-header">
											<view class="author-info">
												<image class="author-avatar" :src="article.author_avatar || '/static/img/qa.png'" mode="aspectFill"></image>
												<text class="author-name">{{ article.author || '未知作者' }}</text>
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
								<view class="empty-state" v-if="articleList.length === 0">
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

		<!-- 删除确认弹窗 -->
		<view class="modal-overlay" v-if="showDeleteConfirm" @click="showDeleteConfirm=false;deleteTargetId=null">
			<view class="modal-content confirm-modal" @click.stop>
				<view class="confirm-icon-wrap danger-icon">
					<text class="confirm-icon-text">!</text>
				</view>
				<text class="confirm-title">确认删除</text>
				<text class="confirm-desc">确定要删除这条记录吗？</text>
				<text class="confirm-warn">删除后无法恢复</text>
				<view class="confirm-divider"></view>
				<view class="confirm-actions">
					<button class="btn-cancel" @click="showDeleteConfirm=false;deleteTargetId=null">取消</button>
					<button class="btn-danger" @click="doDelete">删除</button>
				</view>
			</view>
		</view>

		<!-- 版本更新弹窗 -->
		<view class="modal-overlay" v-if="showUpdateModal" @click="showUpdateModal=false">
			<view class="modal-content update-modal" @click.stop>
				<view class="update-graphic">
					<text class="update-icon">↑</text>
				</view>
				<text class="update-modal-title">发现新版本</text>
				<view class="update-versions">
					<view class="uv-item"><text class="uv-label">当前版本</text><text class="uv-num old">{{ currentVersion }}</text></view>
					<text class="uv-arrow">→</text>
					<view class="uv-item"><text class="uv-label">最新版本</text><text class="uv-num new">{{ updateInfo.latestVersion }}</text></view>
				</view>
				<text class="update-modal-desc">{{ updateInfo.description || '新版本已准备就绪，建议立即更新' }}</text>
				<view class="confirm-divider"></view>
				<view class="confirm-actions">
					<button class="btn-cancel" @click="showUpdateModal=false">稍后再说</button>
					<button class="btn-primary" @click="goUpdate">立即更新</button>
				</view>
			</view>
		</view>

	</view>
</template>

<script>
import apiConfig from '../../../utils/api.js';
import request from '../../../utils/request.js';
import NavBar from '../../../components/modules/nav-bar/nav-bar.vue';


const API_BASE = apiConfig.baseUrl;

export default {
	components: { NavBar },
	data() {
		return {
			activeTab: 'ledger',
			activeTabIndex: 0,
			statusBarHeight: 0,
			carouselList: [],
			cardList: [],
			currentRecommendId: '',
			refreshing: false,
			loadingRecommend: false,
			loadingMore: false,
			currentPage: 1,
			pageSize: 4,
			articleList: [],
			articleTotal: 0,
			articleLoading: false,
			categories: [],
			activeCategory: 'all',
			articlesRefreshing: false,
			hasMoreCards: true,
			agentInput: '',
			agentMsgs: [],
			agentLoading: false,
			agentScrl: '',
			lmYear: new Date().getFullYear(),
			lmMonth: String(new Date().getMonth()+1).padStart(2,'0'),
			lmItems: [],
			lmSummary: { income:0, expense:0, balance:0 },
			lmCats: [],
			lmCat: 'all',
			lmShowAdd: false,
			lmAdding: false,
			lmForm: { type:'expense', amount:'', category:'', note:'' },
				editingId: null,
			showDeleteConfirm: false,
			deleteTargetId: null,
			showUpdateModal: false,
			updateInfo: { latestVersion:'', downloadUrl:'', apkDownloadUrl:'', description:'' },
			catOpts: ['餐饮','购物','交通','娱乐','住房','日用','服饰','医疗','教育','通讯','人情','工资','奖金','收入','其他'],
			kbHeight: 0,
			currentVersion: '1.0.0'
		};
	},
	computed: {
		groupedArticles() {
			const groups = {};
			this.articleList.forEach(article => {
				const date = article.date;
				if (!groups[date]) groups[date] = [];
				groups[date].push(article);
			});
			const sorted = {};
			Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).forEach(d => { sorted[d] = groups[d]; });
			return sorted;
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		this.loadCarouselData();
			this.generateRecommendations();
		// 监听键盘高度变化
		uni.onKeyboardHeightChange(res => {
			if (res.height > 0) {
				this.$nextTick(() => { this.agentScrl = 'agent-bottom'; });
			}
		});
		// 检查版本更新
		const apkVer = systemInfo.appVersion || '1.0.0';
		const wgtVer = uni.getStorageSync('wgtVersion') || '';
		this.currentVersion = wgtVer && this.compareVersion(wgtVer, apkVer) > 0 ? wgtVer : apkVer;
		this.checkAppUpdate();
	},
	onShow() {
		// 键盘监听在 onLoad 已注册，无需重复
	},
	methods: {
		switchTab(tab) {
			this.activeTab = tab;
			const map = { ledger: 0, articles: 1, agent: 2 };
			this.activeTabIndex = map[tab] || 0;
			if (tab === 'articles') this.loadArticles();
			},
		onSwiperChange(event) {
			const index = event.detail.current;
			this.activeTabIndex = index;
			const tabs = ['ledger', 'articles', 'agent'];
				this.activeTab = tabs[index] || 'ledger';
			if (this.activeTab === 'articles') this.loadArticles();
				},
		async loadCarouselData() {
			try {
				const result = await request.get(apiConfig.endpoints.carousel, {}, { cache: true, cacheTime: 15 * 60 * 1000 });
				if (result) {
					if (Array.isArray(result)) {
						this.carouselList = result;
					} else if (result.code === 200 && result.data) {
						this.carouselList = Array.isArray(result.data) ? result.data : [];
					}
				}
				if (this.carouselList.length === 0) this.useDefaultCarouselData();
			} catch (e) {
				this.useDefaultCarouselData();
			}
		},
		useDefaultCarouselData() {
			this.carouselList = [
				{ id: 1, title: '热门推荐', author: '官方推荐', image: '/static/img/banner1.jpg' },
				{ id: 2, title: '精选内容', author: '编辑精选', image: '/static/img/banner2.jpg' },
				{ id: 3, title: '最新发布', author: '用户发布', image: '/static/img/banner3.jpg' },
				{ id: 4, title: '关注推荐', author: '好友推荐', image: '/static/img/banner4.jpg' }
			];
		},
		async onRefresh() {
			this.refreshing = true;
			try {
				await this.loadCarouselData();
				await this.generateRecommendations();
			} catch (e) { /* silent */ }
			this.refreshing = false;
		},
		clickCarouselItem(item) {
			uni.navigateTo({ url: '/pages/content/card-detail' });
		},
		async clickCard(card) {
			try {
				await uni.request({
					url: API_BASE + 'recommend.php',
					method: 'POST',
					header: { 'Content-Type': 'application/json' },
					data: { action: 'click', content_id: card.id, algorithm: card.recommendedBy || 'hybrid' }
				});
			} catch (e) { /* silent */ }
			uni.navigateTo({
				url: '/pages/content/card-detail',
				success: (res) => res.eventChannel.emit('setCard', card)
		});
		},
		async generateRecommendations() {
			this.loadingRecommend = true;
			try {
				const res = await uni.request({
					url: API_BASE + 'user_profile.php?action=recommendations',
					method: 'GET',
					data: { limit: 10, offset: 0 }
				});
				const result = res.data;
				if (result.code === 200 && result.data) {
					const recommendations = result.data.recommendations || [];
					this.currentRecommendId = `rec_${Date.now()}`;
					if (recommendations.length > 0) {
						this.cardList = recommendations.map(item => ({
							id: item.id,
							title: item.title || '无标题',
							author: item.username || '未知用户',
							cover: item.image_url || '/static/img/logo.png',
							type: 'image',
							recommendedBy: 'personalized'
						}));
					} else {
						this.useDefaultRecommendations();
					}
				} else {
					this.useDefaultRecommendations();
				}
			} catch (e) {
				this.useDefaultRecommendations();
			}
			this.loadingRecommend = false;
		},
		useDefaultRecommendations() {
			this.cardList = [
				{ id: 1, title: '美丽的自然风光', author: '推荐系统', cover: '/static/img/banner1.jpg', type: 'image', recommendedBy: 'default' },
				{ id: 2, title: '城市夜景', author: '推荐系统', cover: '/static/img/banner2.jpg', type: 'image', recommendedBy: 'default' },
				{ id: 3, title: '精选内容', author: '推荐系统', cover: '/static/img/banner3.jpg', type: 'image', recommendedBy: 'default' },
				{ id: 4, title: '关注推荐', author: '推荐系统', cover: '/static/img/banner4.jpg', type: 'image', recommendedBy: 'default' }
			];
		},
		loadMoreCards() {
			if (this.loadingMore || !this.hasMoreCards) return;
			this.loadingMore = true;
			uni.request({
				url: API_BASE + 'content.php',
				method: 'GET',
				data: { limit: this.pageSize, offset: (this.currentPage - 1) * this.pageSize, status: 'published' },
				success: (res) => {
					try {
						const result = res.data;
						if (result.code === 200) {
							const contents = (result.data.contents || []).filter(item => item.image_url);
							if (contents.length > 0) {
								const moreCards = contents.map(item => ({
									id: item.id,
									title: item.title,
									author: item.author || (item.user_id ? `用户${item.user_id}` : '未知用户'),
									cover: item.image_url,
									type: 'image',
									recommendedBy: 'content'
								}));
								this.cardList = [...this.cardList, ...moreCards];
								this.currentPage++;
							} else {
								this.hasMoreCards = false;
							}
						}
					} catch (e) { /* silent */ }
				},
				complete: () => { this.loadingMore = false; }
			});
		},
		async loadArticles() {
			this.articleLoading = true;
			try {
				const params = { limit: 200, offset: 0 };
				if (this.activeCategory !== 'all') params.category = this.activeCategory;
				const res = await uni.request({
					url: API_BASE + 'get_articles.php',
					method: 'GET',
					data: params
				});
				const result = res.data;
				if (result.code === 200 && result.data) {
					if (result.data.articles) {
						this.articleList = result.data.articles.map(article => {
							return {
								...article,
								author_avatar: article.author_avatar || '/static/img/qa.png',
								date: article.date || article.created_at || new Date().toISOString().split('T')[0]
							};
						});
					}
					this.articleTotal = result.data.total || 0;
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
		async onArticlesRefresh() {
			this.articlesRefreshing = true;
			try { await this.loadArticles(); } catch (e) { /* silent */ }
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
		loadLedger() {
			const ui = uni.getStorageSync('userInfo');
			if (!ui) return;
			const p = { user_id: ui.id, year: this.lmYear, month: this.lmMonth };
			if (this.lmCat !== 'all') p.category = this.lmCat;
			uni.request({ url: apiConfig.baseUrl + 'ledger.php', method:'GET', data: p, success: (res) => {
				const r = res.data;
				if (r.code===200 && r.data) {
					this.lmItems = r.data.items||[];
					this.lmSummary = r.data.summary||{income:0,expense:0,balance:0};
					this.lmCats = r.data.categories||[];
				}
			}});
		},
		lmChgMonth(d) {
			let m = parseInt(this.lmMonth)+d, y = this.lmYear;
			if (m<1){m=12;y--;} if(m>12){m=1;y++;}
			this.lmYear=y; this.lmMonth=String(m).padStart(2,'0'); this.loadLedger();
		},
		llAddNew() {
			this.lmForm = { type:'expense', amount:'', category:'', note:'' };
			this.editingId = null;
			this.lmShowAdd = true;
		},
		llCancel() {
			this.lmForm = { type:'expense', amount:'', category:'', note:'' };
			this.editingId = null;
			this.lmShowAdd = false;
		},
		editItem(item) {
			this.lmForm = { type: item.type, amount: String(parseFloat(item.amount)), category: item.category, note: item.note||'' };
			this.editingId = item.id;
			this.lmShowAdd = true;
		},
		deleteItem(id) {
			this.deleteTargetId = id;
			this.showDeleteConfirm = true;
		},
		doDelete() {
			if (!this.deleteTargetId) return;
			const ui = uni.getStorageSync('userInfo');
			if (!ui) return;
			const id = this.deleteTargetId;
			this.showDeleteConfirm = false;
			this.deleteTargetId = null;
			uni.request({ url: apiConfig.baseUrl + 'ledger.php?id='+id+'&user_id='+ui.id, method:'DELETE', success:(res)=>{
				if(res.data.code===200){uni.showToast({title:'已删除',icon:'success'});this.loadLedger();}
			}});
		},
		handleLmDelete() {
			if (!this.editingId) return;
			this.deleteItem(this.editingId);
			this.lmForm = { type:'expense', amount:'', category:'', note:'' };
			this.lmShowAdd = false;
			this.editingId = null;
		},
		handleLmAdd() {
			const ui = uni.getStorageSync('userInfo');
			if (!ui) return;
			const amt = parseFloat(this.lmForm.amount);
			if (!amt||amt<=0){uni.showToast({title:'请输入金额',icon:'none'});return;}
			if (!this.lmForm.category){uni.showToast({title:'请选择分类',icon:'none'});return;}
			this.lmAdding = true;
			const url = apiConfig.baseUrl + 'ledger.php';
			const method = this.editingId ? 'PUT' : 'POST';
			const data = {user_id:ui.id, type:this.lmForm.type, amount:amt, category:this.lmForm.category, note:this.lmForm.note};
			if (this.editingId) data.id = this.editingId;
			if (method === 'POST') data.date = new Date().toISOString().slice(0,10);
			uni.request({ url, method, data, success:(res)=>{
				if(res.data.code===200){
					uni.showToast({title:this.editingId?'已更新':'已保存',icon:'success'});
					this.lmForm = { type:'expense', amount:'', category:'', note:'' };
					this.lmShowAdd=false; this.editingId=null; this.loadLedger();
				}else{uni.showToast({title:res.data.message||'失败',icon:'none'});}
			}, complete:()=>{this.lmAdding=false;} });
		},
		checkAppUpdate() {
			uni.request({
				url: apiConfig.baseUrl + 'check_update.php',
				method: 'POST',
				data: { currentVersion: this.currentVersion },
				header: { 'Content-Type': 'application/json' },
				success: (res) => {
					const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
					if (result?.code === 200 && result.data?.hasUpdate) {
						this.updateInfo = {
							latestVersion: result.data.latestVersion,
							downloadUrl: result.data.downloadUrl || '',
							apkDownloadUrl: result.data.apkDownloadUrl || '',
							description: result.data.description || ''
						};
						this.showUpdateModal = true;
					}
				},
				fail: () => {}
			});
		},
		goUpdate() {
			this.showUpdateModal = false;
			uni.navigateTo({ url: '/pages/info/check-update' });
		},
		compareVersion(v1, v2) {
			const a1 = String(v1).split('.').map(Number);
			const a2 = String(v2).split('.').map(Number);
			for (let i = 0; i < Math.max(a1.length, a2.length); i++) {
				const n1 = a1[i] || 0, n2 = a2[i] || 0;
				if (n1 > n2) return 1;
				if (n1 < n2) return -1;
			}
			return 0;
		},
		viewArticle(article) {
			uni.navigateTo({
				url: '/pages/content/article-detail',
				success: (res) => res.eventChannel.emit('setArticle', article)
			});
		}
	}
};
</script>

<style>
/* 记账 */
.ledger-page { flex:1; display:flex; flex-direction:column; }
.lm-summary { background:linear-gradient(135deg,#1b44a6,#3071f6); border-radius:14upx; padding:16upx; margin:12upx 16upx 8upx; }
.lm-nav { display:flex; align-items:center; justify-content:center; gap:28upx; margin-bottom:10upx; }
.lm-nav-btn { font-size:32upx; color:#fff; font-weight:700; padding:4upx 12upx; }
.lm-nav-label { font-size:28upx; font-weight:600; color:#fff; }
.lm-row { display:flex; gap:6upx; }
.lm-item { flex:1; text-align:center; }
.lm-lbl { display:block; font-size:18upx; color:rgba(255,255,255,0.7); margin-bottom:2upx; }
.salary-hint { text-align:center; margin-top:6upx; }
.salary-hint-text { font-size:20upx; color:rgba(255,255,255,0.5); }
.lm-val { display:block; font-size:28upx; font-weight:700; }
.inc { color:#22c55e; }
.exp { color:#ef4444; }
.lm-cat-scroll { padding:0 16upx 6upx; }
.lm-cat-bar { display:flex; gap:8upx; white-space:nowrap; }
.lm-cat { display:inline-block; font-size:20upx; color:#6b7280; background:#f3f4f6; padding:4upx 14upx; border-radius:9999upx; }
.lm-cat.act { color:#fff; background:#1b44a6; }
.lm-list { flex:1; padding:0 16upx 120upx; }
.lm-empty { text-align:center; padding:40upx 0; }
.lm-empty-txt { font-size:24upx; color:#9ca3af; }
.lm-row-item { background:#fff; border-radius:10upx; padding:12upx 16upx; margin-bottom:6upx; display:flex; justify-content:space-between; align-items:center; }
.lm-left { display:flex; flex-direction:column; gap:2upx; flex:1; }
.lm-cat-tag { font-size:16upx; padding:2upx 8upx; border-radius:9999upx; align-self:flex-start; }
.lm-cat-tag.income { color:#22c55e; background:#f0fdf4; }
.lm-cat-tag.expense { color:#ef4444; background:#fef2f2; }
.lm-note { font-size:20upx; color:#6b7280; }
.lm-right { text-align:right; }
.lm-amt { font-size:24upx; font-weight:600; display:block; }
.lm-amt.income { color:#22c55e; }
.lm-amt.expense { color:#ef4444; }
.lm-dt { font-size:16upx; color:#d1d5db; }
.lm-del { font-size:18upx; color:#ef4444; padding:8upx 4upx; display:inline-block; }
.lm-add { position:fixed; right:32upx; bottom:40upx; width:90upx; height:90upx; background:#3071f6; color:#fff; font-size:44upx; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6upx 20upx rgba(48,113,246,0.3); }
.lm-save-btn { flex:1; height:76upx; line-height:76upx; background:#1b44a6; color:#fff; font-size:26upx; font-weight:600; border-radius:12upx; border:none; margin-top:16upx; }
.lm-del-btn { height:76upx; line-height:76upx; background:#fff; color:#ef4444; font-size:26upx; font-weight:500; border-radius:12upx; border:1px solid #ef4444; margin-top:16upx; flex:1; }
.modal-btns { display:flex; gap:14upx; }
.fg { margin-bottom:18upx; }
.fl { font-size:24upx; color:#6b7280; display:block; margin-bottom:6upx; font-weight:500; }
.fi { height:64upx; padding:0 16upx; background:#f5f6f8; border-radius:10upx; font-size:24upx; color:#303132; width:100%; box-sizing:border-box; }
.amt-i { font-size:36upx; font-weight:700; text-align:center; height:80upx; background:#fafafa; }
.cp { white-space:nowrap; }
.co { display:inline-block; font-size:22upx; color:#6b7280; background:#f3f4f6; padding:8upx 20upx; border-radius:9999upx; margin-right:8upx; }
.co.act { color:#fff; background:#1b44a6; }

/* 确认弹窗 */
.confirm-modal { text-align:center; padding:40upx 36upx 32upx; }
.confirm-icon-wrap { width:80upx; height:80upx; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20upx; }
.confirm-icon-wrap.danger-icon { background:linear-gradient(135deg,#fef2f2,#fecaca); box-shadow:0 4upx 16upx rgba(239,68,68,0.25); }
.confirm-icon-text { font-size:36upx; font-weight:700; }
.danger-icon .confirm-icon-text { color:#ef4444; }
.confirm-title { display:block; font-size:30upx; font-weight:700; color:#1f2937; margin-bottom:10upx; }
.confirm-desc { display:block; font-size:26upx; color:#6b7280; line-height:1.6; margin-bottom:4upx; }
.confirm-warn { display:block; font-size:24upx; color:#ef4444; padding:8upx 12upx; background:#fef2f2; border-radius:10upx; margin-top:8upx; }
.confirm-divider { height:1px; background:#f3f4f6; margin:22upx 0 18upx; }
.confirm-actions { display:flex; gap:16upx; }
.confirm-actions .btn-cancel { flex:1; height:80upx; line-height:80upx; background:#f3f4f6; color:#374151; font-size:28upx; font-weight:500; border-radius:14upx; border:none; text-align:center; }
.confirm-actions .btn-danger { flex:1; height:80upx; line-height:80upx; background:linear-gradient(135deg,#ef4444,#dc2626); color:#fff; font-size:28upx; font-weight:600; border-radius:14upx; border:none; text-align:center; box-shadow:0 4upx 12upx rgba(239,68,68,0.3); }

/* 版本更新弹窗 */
.update-modal { text-align:center; padding:40upx 36upx 32upx; }
.update-graphic { width:88upx; height:88upx; border-radius:50%; background:linear-gradient(135deg,#eff6ff,#dbeafe); display:flex; align-items:center; justify-content:center; margin:0 auto 20upx; box-shadow:0 4upx 16upx rgba(48,113,246,0.25); }
.update-icon { font-size:40upx; color:#3071f6; font-weight:700; }
.update-modal-title { display:block; font-size:30upx; font-weight:700; color:#1f2937; margin-bottom:20upx; }
.update-versions { display:flex; align-items:center; justify-content:center; gap:20upx; margin-bottom:20upx; }
.uv-item { display:flex; flex-direction:column; align-items:center; }
.uv-label { font-size:20upx; color:#9ca3af; margin-bottom:4upx; }
.uv-num { font-size:28upx; font-weight:600; }
.uv-num.old { color:#909398; text-decoration:line-through; }
.uv-num.new { color:#3071f6; }
.uv-arrow { font-size:24upx; color:#c0c4cc; }
.update-modal-desc { display:block; font-size:24upx; color:#6b7280; line-height:1.6; margin-bottom:8upx; }
.confirm-actions .btn-primary { flex:1; height:80upx; line-height:80upx; background:linear-gradient(135deg,#3071f6,#1b44a6); color:#fff; font-size:28upx; font-weight:600; border-radius:14upx; border:none; text-align:center; box-shadow:0 4upx 12upx rgba(48,113,246,0.3); }

.modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:9999; padding:40upx; animation:lmFadeIn 0.2s ease; }
@keyframes lmFadeIn { from{opacity:0} to{opacity:1} }
.modal-content { background:#fff; border-radius:28upx; padding:36upx 32upx 28upx; width:86%; max-width:560upx; box-shadow:0 16upx 48upx rgba(0,0,0,0.15); animation:lmSlideUp 0.25s ease; max-height:78vh; overflow-y:auto; }
@keyframes lmSlideUp { from{transform:translateY(30upx);opacity:0} to{transform:translateY(0);opacity:1} }
.modal-handle { display:none; }
.modal-title { font-size:30upx; font-weight:700; color:#1f2937; text-align:center; display:block; margin-bottom:24upx; }
.type-switch { display:flex; background:#f3f4f6; border-radius:12upx; padding:3upx; margin-bottom:22upx; }
.type-btn { flex:1; text-align:center; padding:14upx 0; font-size:26upx; color:#9ca3af; border-radius:10upx; transition:all 0.2s; }
.type-btn.act { background:#fff; color:#1b44a6; font-weight:600; box-shadow:0 2upx 6upx rgba(0,0,0,0.08); }

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

.author-name {
	font-size: 24upx;
	color: #6b7280;
}

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
.agent-page{display:flex;flex-direction:column;height:100%}
.agent-scroll{flex:1;min-height:0;padding:24upx 20upx;background:#f5f6f8}
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
.agent-foot{background:#fff;padding:16upx 20upx;padding-bottom:calc(16upx + env(safe-area-inset-bottom));border-top:1px solid #f0f0f0;transition:padding-bottom .3s}
.agent-input-wrap{display:flex;align-items:center;background:#f3f4f6;border-radius:40upx;padding:8upx 12upx 8upx 24upx}
.agent-input{flex:1;height:60upx;font-size:28upx;color:#303132;border:none;background:transparent}
.agent-send{width:60upx;height:60upx;border-radius:50%;background:#3071f6;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.agent-send-icon{font-size:28upx;color:#fff;font-weight:700}
::-webkit-scrollbar{width:0;height:0;background:transparent}
</style>
