<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">反馈管理</text>
			<view class="nav-placeholder"></view>
		</view>

		<!-- 状态筛选 -->
		<view class="filter-bar">
			<view
				class="filter-item"
				:class="{ active: filter === f.value }"
				v-for="f in filters"
				:key="f.value"
				@click="changeFilter(f.value)"
			>{{ f.label }}{{ f.count ? ' (' + f.count + ')' : '' }}</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<view class="fb-item" v-for="f in list" :key="f.id">
				<view class="fb-header" @click="toggleExpand(f)">
					<view class="fb-left">
						<text class="fb-user">{{ f.username || f.nickname || '用户#' + f.user_id }}</text>
						<text class="fb-status" :class="'s' + (f.status || 0)">
							{{ f.status === 2 ? '已回复' : f.status === 3 ? '已完结' : f.status === 1 ? '已读' : '待处理' }}
						</text>
					</view>
					<text class="fb-time">{{ (f.created_at || '').slice(0, 16) }}</text>
				</view>
				<text class="fb-content">{{ f.content }}</text>

				<!-- 回复区 -->
				<view class="fb-replies" v-if="expanded[f.id]">
					<view class="reply-bubble" v-for="(r, ri) in f.replies" :key="ri">
						<text class="reply-label" v-if="r.role === 'admin'">管理员</text>
						<text class="reply-text">{{ r.content }}</text>
						<text class="reply-time">{{ (r.created_at || '').slice(11, 16) }}</text>
					</view>

					<view class="reply-input-row">
						<input
							class="reply-input"
							v-model="replyTexts[f.id]"
							placeholder="输入回复内容..."
							placeholder-class="placeholder-style"
							confirm-type="send"
							@confirm="sendReply(f)"
						/>
						<text class="reply-send" @click="sendReply(f)">发送</text>
					</view>
					<view class="fb-actions">
						<text class="action-btn" @click="setStatus(f, 3)">完结</text>
						<text class="action-btn danger" @click="handleDelete(f)">删除</text>
					</view>
				</view>
			</view>

			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无反馈</view>
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
				{ label: '已回复', value: 2, count: 0 },
				{ label: '已完结', value: 3, count: 0 },
			],
			filter: -1,
			list: [],
			page: 1,
			limit: 20,
			total: 0,
			loading: false,
			expanded: {},
			replyTexts: {},
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadFeedback(true);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		changeFilter(v) {
			this.filter = v;
			this.loadFeedback(true);
		},
		loadFeedback(reset) {
			if (this.loading) return;
			if (reset) { this.page = 1; this.list = []; }
			this.loading = true;
			const status = this.filter === -1 ? undefined : this.filter;
			adminApi.getFeedback(this.page, this.limit, status).then(res => {
				if (res.code === 200) {
					const data = res.data || [];
					this.list = reset ? data : this.list.concat(data);
					this.total = res.total || 0;
					// 更新各状态数量（筛选标签角标）
					if (res.status_counts) {
						const sc = res.status_counts;
						this.filters.forEach(f => {
							f.count = f.value === -1 ? (res.total || 0) : (sc[f.value] || 0);
						});
					}
					if (data.length >= this.limit) this.page++;
				}
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		loadMore() {
			if (this.list.length < this.total) this.loadFeedback(false);
		},
		toggleExpand(f) {
			this.$set(this.expanded, f.id, !this.expanded[f.id]);
		},
		sendReply(f) {
			const text = (this.replyTexts[f.id] || '').trim();
			if (!text) {
				uni.showToast({ title: '请输入回复内容', icon: 'none' });
				return;
			}
			adminApi.replyFeedback(f.id, text).then(() => {
				uni.showToast({ title: '回复成功', icon: 'success' });
				this.replyTexts[f.id] = '';
				this.loadFeedback(true);
			}).catch(() => {});
		},
		setStatus(f, status) {
			adminApi.setFeedbackStatus(f.id, status).then(() => {
				uni.showToast({ title: status === 3 ? '已完结' : '已更新', icon: 'success' });
				this.loadFeedback(true);
			}).catch(() => {});
		},
		handleDelete(f) {
			uni.showModal({
				title: '删除反馈',
				content: '确定删除这条反馈？',
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.deleteFeedback(f.id).then(() => {
							uni.showToast({ title: '已删除', icon: 'success' });
							this.loadFeedback(true);
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

.filter-bar {
	display: flex; background: #fff; padding: 10px 12px; gap: 8px;
	border-bottom: 1px solid #f0f0f0;
}
.filter-item {
	font-size: 13px; color: #666; padding: 6px 14px; border-radius: 16px;
	background: #f5f6fa;
}
.filter-item.active { background: #3071f6; color: #fff; }

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.fb-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.fb-header { display: flex; align-items: center; justify-content: space-between; }
.fb-left { display: flex; align-items: center; gap: 8px; }
.fb-user { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.fb-status { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.fb-status.s0 { background: #fff3e8; color: #ff7d00; }
.fb-status.s1 { background: #eef4ff; color: #3071f6; }
.fb-status.s2 { background: #e8f7ef; color: #00a862; }
.fb-status.s3 { background: #f0f2f5; color: #999; }
.fb-time { font-size: 11px; color: #bbb; }
.fb-content {
	font-size: 14px; color: #333; margin-top: 10px; line-height: 1.6;
	display: block;
}

.fb-replies { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f5f5f5; }
.reply-bubble {
	background: #f5f6fa; border-radius: 10px; padding: 10px 12px;
	margin-bottom: 8px; display: flex; flex-direction: column;
}
.reply-label { font-size: 11px; color: #3071f6; margin-bottom: 4px; }
.reply-text { font-size: 13px; color: #333; }
.reply-time { font-size: 10px; color: #bbb; margin-top: 4px; align-self: flex-end; }

.reply-input-row {
	display: flex; align-items: center; margin-top: 10px; gap: 10px;
}
.reply-input {
	flex: 1; height: 36px; background: #f5f6fa; border-radius: 18px;
	padding: 0 14px; font-size: 13px;
}
.reply-send { color: #3071f6; font-size: 14px; padding: 4px; }

.fb-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 10px; }
.action-btn { font-size: 13px; color: #3071f6; padding: 4px 8px; }
.action-btn.danger { color: #e64340; }

.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }
</style>
