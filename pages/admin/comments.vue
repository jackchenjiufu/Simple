<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">评论管理</text>
			<view class="nav-placeholder"></view>
		</view>

		<!-- 搜索 + 状态筛选 -->
		<view class="filter-bar">
			<view class="search-row">
				<input
					class="search-input"
					v-model="searchKey"
					placeholder="搜索内容 / 用户 / 文章"
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
			<view class="cmt-item" v-for="c in list" :key="c.id">
				<view class="cmt-header">
					<view class="cmt-user">
						<text class="cmt-nick">{{ c.nickname || c.username || '用户#' + c.user_id }}</text>
						<text class="cmt-tag top" v-if="c.is_top == 1">置顶</text>
						<text class="cmt-tag reply" v-if="c.parent_id > 0">回复</text>
						<text class="cmt-tag" :class="c.status == 1 ? 'hide' : 'normal'">{{ c.status == 1 ? '已隐藏' : '正常' }}</text>
					</view>
					<text class="cmt-time">{{ (c.created_at || '').slice(0, 16) }}</text>
				</view>
				<text class="cmt-content" :class="{ 'cmt-content-hide': c.status == 1 }">{{ c.content }}</text>
				<view class="cmt-article">📄 {{ c.article_title || '文章#' + c.article_id }}</view>
				<view class="cmt-actions">
					<text class="action-btn" @click="toggleTop(c)">{{ c.is_top == 1 ? '取消置顶' : '置顶' }}</text>
					<text class="action-btn" @click="toggleHide(c)">{{ c.status == 1 ? '恢复' : '隐藏' }}</text>
					<text class="action-btn danger" @click="handleDelete(c)">删除</text>
				</view>
			</view>

			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无评论</view>
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
				{ label: '正常', value: 0, count: 0 },
				{ label: '已隐藏', value: 1, count: 0 },
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
		this.load(true);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		onSearch() {
			this.page = 1;
			this.list = [];
			this.load(true);
		},
		changeFilter(v) {
			this.filter = v;
			this.page = 1;
			this.list = [];
			this.load(true);
		},
		load(force) {
			if (this.loading) return;
			if (force) {
				this.page = 1;
				this.list = [];
			}
			this.loading = true;
			const that = this;
			adminApi.getComments(this.page, this.limit, this.filter, this.searchKey.trim())
				.then((res) => {
					if (res && res.code === 200) {
						const items = res.data || [];
						that.list = that.list.concat(items);
						that.hasMore = that.list.length < (res.total || 0);
						that.page++;
						// 状态计数
						const sc = res.status_counts;
						if (sc) {
							that.filters[0].count = (sc['0'] || 0) + (sc['1'] || 0);
							that.filters[1].count = sc['0'] || 0;
							that.filters[2].count = sc['1'] || 0;
						}
					}
				})
				.catch(() => {})
				.finally(() => { that.loading = false; });
		},
		loadMore() {
			if (this.hasMore) this.load(false);
		},
		toggleTop(c) {
			const next = c.is_top == 1 ? 0 : 1;
			adminApi.setCommentTop(c.id, next)
				.then((res) => {
					if (res && res.code === 200) {
						c.is_top = next;
						uni.showToast({ title: next ? '已置顶' : '已取消置顶', icon: 'none' });
					}
				})
				.catch(() => {});
		},
		toggleHide(c) {
			const next = c.status == 1 ? 0 : 1;
			adminApi.setCommentStatus(c.id, next)
				.then((res) => {
					if (res && res.code === 200) {
						c.status = next;
						uni.showToast({ title: next ? '已隐藏' : '已恢复显示', icon: 'none' });
					}
				})
				.catch(() => {});
		},
		handleDelete(c) {
			const that = this;
			uni.showModal({
				title: '删除评论',
				content: '删除该评论及其回复？此操作不可恢复。',
				confirmColor: '#e11d48',
				success: (r) => {
					if (!r.confirm) return;
					adminApi.deleteComment(c.id)
						.then((res) => {
							if (res && res.code === 200) {
								uni.showToast({ title: '已删除', icon: 'success' });
								that.list = that.list.filter((x) => x.id !== c.id);
							}
						})
						.catch(() => {});
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
	padding: 0 16px; border-bottom: 1upx solid #eef1f5; flex-shrink: 0;
}
.nav-back { width: 40px; display: flex; align-items: center; }
.back-icon { width: 22px; height: 22px; }
.nav-title { flex: 1; text-align: center; font-size: 32upx; font-weight: 600; color: #1a1a2e; }
.nav-placeholder { width: 40px; }

.filter-bar { background: #fff; padding: 16upx 24upx 8upx; border-bottom: 1upx solid #eef1f5; flex-shrink: 0; }
.search-row { display: flex; gap: 16upx; margin-bottom: 16upx; }
.search-input {
	flex: 1; height: 64upx; background: #f2f4f8; border-radius: 999upx;
	padding: 0 28upx; font-size: 26upx; color: #1a1a2e;
}
.search-btn {
	height: 64upx; padding: 0 32upx; border-radius: 999upx; background: linear-gradient(90deg, #1b44a6, #3071f6);
	color: #fff; font-size: 26upx; display: flex; align-items: center;
}
.placeholder-style { color: #b0b3ba; }
.filter-row { display: flex; gap: 12upx; }
.filter-item {
	font-size: 24upx; color: #6b7280; background: #f2f4f8; border-radius: 999upx;
	padding: 8upx 24upx;
}
.filter-item.active { background: #eef4ff; color: #1b44a6; font-weight: 600; }

.body { flex: 1; min-height: 0; padding: 16upx 24upx; }
.cmt-item {
	background: #fff; border-radius: 16upx; padding: 24upx; margin-bottom: 16upx;
}
.cmt-header { display: flex; align-items: center; justify-content: space-between; gap: 12upx; }
.cmt-user { display: flex; align-items: center; gap: 8upx; flex-wrap: wrap; }
.cmt-nick { font-size: 26upx; font-weight: 600; color: #2d3748; }
.cmt-tag { font-size: 18upx; padding: 1upx 10upx; border-radius: 20upx; }
.cmt-tag.top { color: #b8860b; background: #fff8e6; border: 1upx solid #f0d48a; }
.cmt-tag.reply { color: #3071f6; background: #f0f5ff; border: 1upx solid #b8cdf5; }
.cmt-tag.normal { color: #1a7d3a; background: #e8f8ee; border: 1upx solid #b7e4c7; }
.cmt-tag.hide { color: #909398; background: #f2f4f8; border: 1upx solid #d5d9e0; }
.cmt-time { font-size: 20upx; color: #b0b3ba; flex-shrink: 0; }
.cmt-content { display: block; font-size: 28upx; color: #374151; line-height: 1.6; margin: 14upx 0; word-break: break-word; }
.cmt-content-hide { color: #b0b3ba; }
.cmt-article { font-size: 22upx; color: #909398; margin-bottom: 14upx; }
.cmt-actions { display: flex; gap: 12upx; border-top: 1upx solid #f2f4f8; padding-top: 16upx; }
.action-btn {
	font-size: 24upx; color: #3071f6; background: #f0f5ff; border-radius: 999upx;
	padding: 8upx 28upx;
}
.action-btn.danger { color: #e11d48; background: #fef0f3; }
.loading-tip { text-align: center; color: #b0b3ba; font-size: 24upx; padding: 32upx 0; }
</style>
