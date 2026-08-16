<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">行为分析</text>
			<view class="nav-placeholder"></view>
		</view>

		<view class="search-row">
			<input class="search-input" v-model="keyword" placeholder="搜索用户名/昵称" confirm-type="search" @confirm="loadList(1)" />
			<view class="search-btn" @click="loadList(1)">搜索</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<view class="user-card" v-for="u in list" :key="u.user_id" @click="openDetail(u)">
				<view class="user-top">
					<text class="user-name">{{ u.nickname || u.username }}</text>
					<text class="user-role" :class="'role-' + (u.role || 'user')">{{ roleLabel(u.role) }}</text>
				</view>
				<view class="user-meta">行为 {{ u.total }} 条 · 活跃 {{ u.active_days }} 天 · 偏好 {{ u.top_category || '-' }}</view>
				<view class="user-stats">
					<view class="us-item"><text class="us-num">{{ u.clicks }}</text><text class="us-label">点击</text></view>
					<view class="us-item"><text class="us-num">{{ u.views }}</text><text class="us-label">浏览</text></view>
					<view class="us-item"><text class="us-num">{{ u.stays }}</text><text class="us-label">停留</text></view>
					<view class="us-item"><text class="us-num">{{ u.exposures }}</text><text class="us-label">曝光</text></view>
					<view class="us-item"><text class="us-num">{{ fmtSeconds(u.stay_seconds) }}</text><text class="us-label">总时长</text></view>
				</view>
				<view class="user-last">最后活跃 {{ u.last_active || '-' }}</view>
			</view>
			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无行为数据</view>
			<view class="loading-tip" v-if="!loading && list.length && !hasMore">没有更多了</view>
		</scroll-view>

		<!-- 用户行为明细弹层 -->
		<view class="mask" v-if="showDetail" @click="showDetail = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">{{ curUser ? (curUser.nickname || curUser.username) : '' }} · 行为明细</text>
					<text class="sheet-close" @click="showDetail = false">✕</text>
				</view>
				<view class="type-tabs">
					<view class="type-tab" :class="{ act: typeFilter === 'all' }" @click="switchType('all')">全部</view>
					<view class="type-tab" :class="{ act: typeFilter === 'content_click' }" @click="switchType('content_click')">点击</view>
					<view class="type-tab" :class="{ act: typeFilter === 'page_view' }" @click="switchType('page_view')">浏览</view>
					<view class="type-tab" :class="{ act: typeFilter === 'page_stay' }" @click="switchType('page_stay')">停留</view>
					<view class="type-tab" :class="{ act: typeFilter === 'rec_view' }" @click="switchType('rec_view')">曝光</view>
				</view>
				<scroll-view class="detail-list" scroll-y="true" show-scrollbar="false" @scrolltolower="loadDetailMore">
					<view class="beh-item" v-for="b in detailItems" :key="b.id" @longpress="manageBehavior(b)">
						<view class="beh-main">
							<view class="beh-top">
								<text class="beh-type" :class="'t-' + b.type">{{ typeLabel(b.type) }}</text>
								<text class="beh-time">{{ b.timestamp || '' }}</text>
							</view>
							<view class="beh-title">{{ b.title || ('内容 #' + b.content_id) }}</view>
							<view class="beh-sub" v-if="b.category || b.duration">分类 {{ b.category || '-' }} · 停留 {{ b.duration }}s</view>
						</view>
						<image v-if="b.image_url" class="beh-img" :src="b.image_url" mode="aspectFill" @click.stop="previewImg(b.image_url)" />
					</view>
					<view class="loading-tip" v-if="detailLoading">加载中...</view>
					<view class="loading-tip" v-if="!detailLoading && !detailItems.length">暂无记录</view>
					<view class="loading-tip" v-if="!detailLoading && detailItems.length && !detailHasMore">没有更多了</view>
				</scroll-view>
				<view class="clear-btn" @click="clearUser">清空该用户全部行为</view>
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
			keyword: '',
			list: [],
			page: 1,
			hasMore: true,
			loading: false,
			showDetail: false,
			curUser: null,
			typeFilter: 'all',
			detailItems: [],
			detailPage: 1,
			detailHasMore: true,
			detailLoading: false,
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadList(1);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		roleLabel(r) {
			return { super_admin: '超管', admin: '管理员', editor: '编辑', operator: '运营', user: '普通' }[r] || r || '普通';
		},
		typeLabel(t) {
			return { content_click: '点击', page_view: '浏览', page_stay: '停留', rec_view: '曝光' }[t] || t;
		},
		fmtSeconds(s) {
			s = Number(s) || 0;
			if (s >= 3600) return (s / 3600).toFixed(1) + 'h';
			if (s >= 60) return Math.round(s / 60) + 'm';
			return s + 's';
		},
		loadList(page) {
			this.loading = true;
			adminApi.getBehaviorUsers({ page: page, limit: 20, keyword: this.keyword }).then(res => {
				if (res.code === 200) {
					const items = (res.data && res.data.items) || [];
					this.list = page === 1 ? items : this.list.concat(items);
					this.page = page;
					this.hasMore = items.length >= 20;
				}
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		loadMore() { if (this.hasMore && !this.loading) this.loadList(this.page + 1); },
		openDetail(u) {
			this.curUser = u;
			this.typeFilter = 'all';
			this.detailItems = [];
			this.detailPage = 1;
			this.detailHasMore = true;
			this.showDetail = true;
			this.loadDetail(1);
		},
		switchType(t) {
			this.typeFilter = t;
			this.detailItems = [];
			this.detailPage = 1;
			this.detailHasMore = true;
			this.loadDetail(1);
		},
		loadDetail(page) {
			if (!this.curUser) return;
			this.detailLoading = true;
			adminApi.getBehaviorDetail({ user_id: this.curUser.user_id, page: page, limit: 30, type: this.typeFilter }).then(res => {
				if (res.code === 200) {
					const items = (res.data && res.data.items) || [];
					this.detailItems = page === 1 ? items : this.detailItems.concat(items);
					this.detailPage = page;
					this.detailHasMore = items.length >= 30;
				}
			}).catch(() => {}).finally(() => { this.detailLoading = false; });
		},
		loadDetailMore() { if (this.detailHasMore && !this.detailLoading) this.loadDetail(this.detailPage + 1); },
		previewImg(url) {
			uni.previewImage({ urls: [url], current: url });
		},
		manageBehavior(b) {
			uni.showActionSheet({
				itemList: ['删除该条记录'],
				itemColor: '#e64340',
				success: (r) => {
					if (r.tapIndex === 0) {
						adminApi.deleteBehavior(b.id).then(res => {
							if (res.code === 200) {
								uni.showToast({ title: '已删除', icon: 'success' });
								this.loadDetail(1);
							}
						}).catch(() => {});
					}
				},
			});
		},
		clearUser() {
			if (!this.curUser) return;
			uni.showModal({
				title: '清空行为',
				content: `确定清空「${this.curUser.nickname || this.curUser.username}」的全部行为记录？此操作不可恢复`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.clearUserBehaviors(this.curUser.user_id).then(res => {
							if (res.code === 200) {
								uni.showToast({ title: '已清空', icon: 'success' });
								this.showDetail = false;
								this.loadList(1);
							}
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
	padding: 0 12px; border-bottom: 1px solid #f0f0f0;
}
.nav-back { width: 36px; height: 36px; display: flex; align-items: center; }
.back-icon { width: 20px; height: 20px; }
.nav-title { flex: 1; text-align: center; font-size: 17px; font-weight: 600; color: #1a1a2e; }
.nav-placeholder { width: 36px; }

.search-row { display: flex; gap: 8px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #f0f0f0; }
.search-input {
	flex: 1; height: 36px; background: #f5f6fa; border-radius: 10px; padding: 0 14px; font-size: 14px;
}
.search-btn {
	flex-shrink: 0; background: #3071f6; color: #fff; font-size: 13px; padding: 0 18px;
	border-radius: 10px; display: flex; align-items: center;
}

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.user-card {
	background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 10px;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.user-top { display: flex; align-items: center; gap: 8px; }
.user-name { font-size: 16px; font-weight: 600; color: #1a1a2e; }
.user-role { font-size: 11px; padding: 2px 8px; border-radius: 6px; }
.role-super_admin { background: #fff7e6; color: #b8860b; }
.role-admin { background: #e8f0ff; color: #3071f6; }
.role-editor { background: #e8f7ef; color: #00a862; }
.role-operator { background: #fff3e8; color: #e8590c; }
.role-user { background: #f0f2f5; color: #666; }
.user-meta { font-size: 12px; color: #888; margin-top: 4px; }
.user-stats { display: flex; margin-top: 10px; background: #f8f9fb; border-radius: 10px; padding: 8px 0; }
.us-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.us-num { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.us-label { font-size: 11px; color: #999; margin-top: 2px; }
.user-last { font-size: 11px; color: #bbb; margin-top: 8px; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 16px 0; }

.mask {
	position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999;
	display: flex; align-items: flex-end;
}
.sheet {
	width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 16px 16px 24px;
	box-sizing: border-box; max-height: 82vh; display: flex; flex-direction: column;
}
.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sheet-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
.sheet-close { font-size: 16px; color: #999; padding: 4px; }
.type-tabs { display: flex; gap: 8px; margin-bottom: 10px; }
.type-tab {
	flex: 1; height: 34px; line-height: 34px; text-align: center; background: #f5f6fa;
	border-radius: 8px; font-size: 13px; color: #666;
}
.type-tab.act { background: #e8f0ff; color: #3071f6; font-weight: 500; }
.detail-list { flex: 1; min-height: 0; max-height: 52vh; }
.beh-item {
	background: #f8f9fb; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px;
	display: flex; align-items: flex-start;
}
.beh-main { flex: 1; min-width: 0; }
.beh-img { width: 72px; height: 72px; border-radius: 8px; margin-left: 10px; background: #eceef2; flex-shrink: 0; }
.beh-top { display: flex; justify-content: space-between; align-items: center; }
.beh-type { font-size: 11px; padding: 2px 8px; border-radius: 6px; background: #e8f0ff; color: #3071f6; }
.beh-type.t-page_view { background: #e8f7ef; color: #00a862; }
.beh-type.t-page_stay { background: #fff3e8; color: #e8590c; }
.beh-type.t-rec_view { background: #f0ecff; color: #7c5cfc; }
.beh-time { font-size: 11px; color: #bbb; }
.beh-title { font-size: 14px; color: #1a1a2e; margin-top: 6px; }
.beh-sub { font-size: 11px; color: #999; margin-top: 4px; }
.clear-btn {
	margin-top: 12px; height: 42px; line-height: 42px; text-align: center;
	background: #fdeef0; color: #e64340; border-radius: 10px; font-size: 14px;
}
</style>
