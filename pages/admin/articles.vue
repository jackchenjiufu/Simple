<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">文章管理</text>
			<view class="nav-action" @click="showCreate = true">＋发布</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<view class="count-tip" v-if="total > 0">共 {{ total }} 篇 · 已加载 {{ articles.length }} 篇</view>
			<view class="article-item" v-for="a in articles" :key="a.id">
				<view class="article-body" @click="openDetail(a)">
					<view class="title-row">
						<text class="article-title">{{ a.title }}</text>
						<text class="article-status" :class="a.status == 'draft' ? 'st-draft' : 'st-pub'">{{ a.status == 'draft' ? '草稿' : '已发布' }}</text>
					</view>
					<view class="article-meta">
						<text class="meta-text">{{ a.author || '系统通知' }}</text>
						<text class="meta-text">{{ a.created_at ? a.created_at.slice(0, 16) : '' }}</text>
					</view>
					<text class="article-preview">{{ (a.content || '').replace(/[#*\n]/g, ' ').slice(0, 60) }}</text>
				</view>
				<view class="article-actions">
					<text class="pub-btn" @click="togglePublish(a)">{{ a.status == 'draft' ? '发布' : '下架' }}</text>
					<text class="del-btn" @click="handleDelete(a)">删除</text>
				</view>
			</view>

			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !articles.length">暂无文章</view>
			<view class="loading-tip" v-if="!loading && articles.length && !hasMore">— 已全部加载 —</view>
		</scroll-view>

		<!-- 文章详情弹层 -->
		<view class="mask" v-if="detail" @click="detail = null">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">{{ detail.title }}</text>
					<text class="sheet-close" @click="detail = null">✕</text>
				</view>
				<scroll-view class="detail-content" scroll-y="true">
					<text class="detail-text">{{ detail.content }}</text>
				</scroll-view>
			</view>
		</view>

		<!-- 发布文章弹层 -->
		<view class="mask" v-if="showCreate" @click="showCreate = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">发布文章</text>
					<text class="sheet-close" @click="showCreate = false">✕</text>
				</view>
				<view class="form-group">
					<text class="form-label">标题</text>
					<input class="form-input" v-model="createForm.title" placeholder="请输入标题" />
				</view>
				<view class="form-group">
					<text class="form-label">作者</text>
					<input class="form-input" v-model="createForm.author" placeholder="请输入作者" />
				</view>
				<view class="form-group">
					<text class="form-label">内容</text>
					<textarea class="form-textarea" v-model="createForm.content" placeholder="请输入文章内容" />
				</view>
				<view class="sheet-actions">
					<button class="btn-primary" @click="handleCreate">发布</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			articles: [],
			loading: false,
			loadingMore: false,
			page: 1,
			pageSize: 20,
			total: 0,
			hasMore: true,
			detail: null,
			showCreate: false,
			createForm: { title: '', author: '', content: '' },
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadArticles();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadArticles() {
			this.loading = true;
			this.page = 1;
			adminApi.getAdminArticles(1, this.pageSize).then(res => {
				if (res.code === 200) {
					this.articles = (res.data || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
					this.total = res.total || this.articles.length;
					this.hasMore = this.articles.length < this.total;
				}
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		loadMore() {
			if (this.loading || this.loadingMore || !this.hasMore) return;
			this.loadingMore = true;
			const nextPage = this.page + 1;
			adminApi.getAdminArticles(nextPage, this.pageSize).then(res => {
				if (res.code === 200 && res.data && res.data.length) {
					const more = (res.data || []).filter(a => !this.articles.some(x => x.id === a.id));
					this.articles = this.articles.concat(more);
					this.page = nextPage;
					this.hasMore = this.articles.length < (res.total || this.total);
				} else {
					this.hasMore = false;
				}
			}).catch(() => { this.hasMore = false; }).finally(() => { this.loadingMore = false; });
		},
		openDetail(a) { this.detail = a; },
		togglePublish(a) {
			const next = a.status == 'draft' ? 'published' : 'draft';
			const tip = a.status == 'draft' ? '发布' : '下架';
			uni.showModal({
				title: tip + '文章',
				content: `确定${tip}「${a.title}」？`,
				success: (r) => {
					if (r.confirm) {
						adminApi.updateArticle(a.id, { status: next }).then(() => {
							uni.showToast({ title: `${tip}成功`, icon: 'success' });
							this.loadArticles();
						}).catch(() => {});
					}
				},
			});
		},
		handleCreate() {
			const f = this.createForm;
			if (!f.title.trim()) {
				uni.showToast({ title: '标题不能为空', icon: 'none' });
				return;
			}
			uni.showLoading({ title: '发布中...' });
			adminApi.createArticle({
				title: f.title,
				author: f.author || '系统通知',
				content: f.content,
				status: 'published'
			}).then(() => {
				uni.hideLoading();
				uni.showToast({ title: '发布成功', icon: 'success' });
				this.showCreate = false;
				this.createForm = { title: '', author: '', content: '' };
				this.loadArticles();
			}).catch(() => { uni.hideLoading(); });
		},
		handleDelete(a) {
			uni.showModal({
				title: '删除文章',
				content: `确定删除「${a.title}」？`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.deleteArticle(a.id).then(() => {
							uni.showToast({ title: '已删除', icon: 'success' });
							this.detail = null;
							this.loadArticles();
						}).catch(() => {});
					}
				},
			});
		},
	},
};
</script>

<style>
.content { height: 100vh; background: #f5f6fa; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #fff; }
.nav-bar {
	height: 44px; background: #fff; display: flex; align-items: center;
	justify-content: space-between; padding: 0 12px; border-bottom: 1px solid #f0f0f0;
}
.nav-back { width: 36px; height: 36px; display: flex; align-items: center; }
.back-icon { width: 20px; height: 20px; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a2e; }
.nav-placeholder { width: 36px; }

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.count-tip { font-size: 12px; color: #909399; text-align: center; padding: 4px 0 10px; }
.article-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; display: flex;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.article-body { flex: 1; min-width: 0; }
.title-row { display: flex; align-items: center; gap: 8px; }
.article-title {
	font-size: 15px; font-weight: 600; color: #1a1a2e; display: block;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.article-meta { display: flex; gap: 12px; margin-top: 6px; }
.meta-text { font-size: 12px; color: #bbb; }
.article-preview {
	font-size: 13px; color: #666; margin-top: 8px; display: block;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.article-actions {
	display: flex; align-items: center; gap: 10px; padding-left: 12px;
	border-left: 1px solid #f0f0f0; margin-left: 12px;
}
.pub-btn { color: #3071f6; font-size: 13px; }
.del-btn { color: #e64340; font-size: 13px; }
.article-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; flex-shrink: 0; }
.st-pub { background: #e8f7ef; color: #10b981; }
.st-draft { background: #f5f5f5; color: #999; }
.nav-action { font-size: 15px; color: #3071f6; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }
.form-group { margin-bottom: 14px; }
.form-label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.form-input {
	width: 100%; height: 44px; border: 1px solid #e5e5e5; border-radius: 10px;
	padding: 0 12px; box-sizing: border-box; font-size: 14px;
}
.form-textarea {
	width: 100%; height: 160px; border: 1px solid #e5e5e5; border-radius: 10px;
	padding: 10px 12px; box-sizing: border-box; font-size: 14px;
}
.sheet-actions { margin-top: 16px; }
.btn-primary {
	width: 100%; background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-radius: 12px; font-size: 15px; height: 44px; line-height: 44px; border: none;
}

.mask {
	position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999;
	display: flex; align-items: flex-end;
}
.sheet {
	width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px 16px 30px;
	box-sizing: border-box; max-height: 75vh; display: flex; flex-direction: column;
}
.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sheet-title { font-size: 16px; font-weight: 600; color: #1a1a2e; flex: 1; }
.sheet-close { font-size: 16px; color: #999; padding: 4px; }
.detail-content { flex: 1; max-height: 55vh; }
.detail-text {
	font-size: 14px; color: #333; line-height: 1.7;
	white-space: pre-wrap; word-break: break-all;
}
</style>
