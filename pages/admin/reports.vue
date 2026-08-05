<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">举报管理</text>
			<view class="nav-placeholder"></view>
		</view>

		<!-- 搜索 + 状态筛选 -->
		<view class="filter-bar">
			<view class="search-row">
				<input
					class="search-input"
					v-model="searchKey"
					placeholder="搜索原因 / 举报人 / 目标"
					placeholder-class="placeholder-style"
					confirm-type="search"
					@confirm="onSearch"
				/>
				<text class="search-btn" @click="onSearch">搜索</text>
			</view>
			<view class="filter-row">
				<view
					class="filter-item"
					:class="{ active: filter === f.value }"
					v-for="f in filters"
					:key="f.value"
					@click="changeFilter(f.value)"
				>{{ f.label }}{{ f.count ? ' (' + f.count + ')' : '' }}</view>
			</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<view class="rep-item" v-for="r in list" :key="r.id">
				<view class="rep-header">
					<view class="rep-user">
						<text class="rep-nick">{{ r.reporter_nick || r.reporter_name || '用户#' + r.reporter_id }}</text>
						<text class="rep-tag" :class="'type-' + r.target_type">{{ typeLabel(r.target_type) }}</text>
						<text class="rep-tag" :class="'st-' + r.status">{{ statusLabel(r.status) }}</text>
					</view>
					<text class="rep-time">{{ (r.created_at || '').slice(0, 16) }}</text>
				</view>
				<text class="rep-reason">原因：{{ r.reason }}</text>
				<text class="rep-target">目标：{{ r.target_name || ('#' + r.target_id) }}（ID:{{ r.target_id }}）</text>
				<text class="rep-detail" v-if="r.detail">详情：{{ r.detail }}</text>
				<view class="rep-actions" v-if="r.status == 0">
					<text class="action-btn ok" @click="handleStatus(r, 1)">处理</text>
					<text class="action-btn" @click="handleStatus(r, 2)">驳回</text>
					<text class="action-btn danger" @click="handleDelete(r)">删除</text>
				</view>
				<view class="rep-actions" v-else>
					<text class="action-btn danger" @click="handleDelete(r)">删除记录</text>
				</view>
			</view>

			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无举报</view>
			<view class="loading-tip" v-if="!loading && list.length && !hasMore">— 已全部加载 —</view>
		</scroll-view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			filters: [
				{ label: '全部', value: -1, count: 0 },
				{ label: '待处理', value: 0, count: 0 },
				{ label: '已处理', value: 1, count: 0 },
				{ label: '已驳回', value: 2, count: 0 },
			],
			filter: -1,
			searchKey: '',
			list: [],
			page: 1,
			limit: 20,
			hasMore: true,
			loading: false,
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadData(true);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadData(reset) {
			if (this.loading) return;
			if (reset) { this.page = 1; this.list = []; }
			this.loading = true;
			adminApi.getReports(this.page, this.limit, this.filter, '', this.searchKey).then((res) => {
				if (res.code === 200) {
					const list = res.data || [];
					this.list = reset ? list : this.list.concat(list);
					// 状态计数
					const sc = res.status_counts || {};
					this.filters.forEach(f => {
						f.count = f.value === -1 ? (res.total || 0) : (sc[f.value] || 0);
					});
					this.hasMore = this.list.length < (res.total || 0);
					if (list.length >= this.limit) this.page++;
				}
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		loadMore() {
			if (this.hasMore) this.loadData(false);
		},
		onSearch() { this.loadData(true); },
		changeFilter(v) {
			if (this.filter === v) return;
			this.filter = v;
			this.loadData(true);
		},
		typeLabel(t) {
			return { user: '用户', message: '消息', article: '文章', comment: '评论' }[t] || t;
		},
		statusLabel(s) {
			return { 0: '待处理', 1: '已处理', 2: '已驳回' }[s] || '未知';
		},
		handleStatus(r, status) {
			const tip = status == 1 ? '处理' : '驳回';
			uni.showModal({
				title: tip + '举报',
				content: `确定将该举报标记为「${tip}」？`,
				success: (res) => {
					if (!res.confirm) return;
					adminApi.setReportStatus(r.id, status).then(() => {
						uni.showToast({ title: tip + '成功', icon: 'success' });
						r.status = status;
					}).catch(() => {
						uni.showToast({ title: '操作失败', icon: 'none' });
					});
				}
			});
		},
		handleDelete(r) {
			uni.showModal({
				title: '删除举报记录',
				content: '确定删除该举报记录？',
				confirmColor: '#e64340',
				success: (res) => {
					if (!res.confirm) return;
					adminApi.deleteReport(r.id).then(() => {
						uni.showToast({ title: '已删除', icon: 'success' });
						this.loadData(true);
					}).catch(() => {
						uni.showToast({ title: '删除失败', icon: 'none' });
					});
				}
			});
		},
	}
};
</script>

<style>
.content { height: 100vh; background: #f5f6fa; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #fff; }
.nav-bar {
	height: 44px; background: #fff; display: flex; align-items: center;
	justify-content: space-between; padding: 0 12px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
}
.nav-back { width: 36px; height: 36px; display: flex; align-items: center; }
.back-icon { width: 20px; height: 20px; }
.nav-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
.nav-placeholder { width: 36px; }

.filter-bar { background: #fff; padding: 12px 16px 4px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.search-row { display: flex; align-items: center; }
.search-input {
	flex: 1; height: 36px; background: #f5f6fa; border-radius: 18px;
	padding: 0 16px; font-size: 14px;
}
.search-btn { color: #3071f6; font-size: 14px; margin-left: 12px; }
.filter-row { display: flex; flex-wrap: wrap; padding: 10px 0 6px; }
.filter-item {
	font-size: 13px; color: #666; padding: 5px 14px; border-radius: 14px;
	margin: 0 8px 8px 0; background: #f5f6fa;
}
.filter-item.active { background: #3071f6; color: #fff; }

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.rep-item {
	background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 10px;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.rep-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.rep-user { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.rep-nick { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.rep-tag { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.rep-tag.type-user { background: #eef4ff; color: #3071f6; }
.rep-tag.type-message { background: #e8f7ef; color: #16a34a; }
.rep-tag.type-article { background: #fff3e8; color: #ff7d00; }
.rep-tag.type-comment { background: #f3f0ff; color: #7c5cfc; }
.rep-tag.st-0 { background: #fdecec; color: #ef4444; }
.rep-tag.st-1 { background: #e8f7ef; color: #16a34a; }
.rep-tag.st-2 { background: #f5f5f5; color: #999; }
.rep-time { font-size: 11px; color: #bbb; flex-shrink: 0; margin-left: 8px; }
.rep-reason { font-size: 14px; color: #333; font-weight: 500; }
.rep-target { font-size: 12px; color: #909399; margin-top: 4px; }
.rep-detail { font-size: 12px; color: #909399; margin-top: 4px; }
.rep-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px; }
.action-btn { font-size: 13px; color: #3071f6; padding: 4px 6px; }
.action-btn.ok { color: #16a34a; }
.action-btn.danger { color: #e64340; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }
</style>
