<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<text class="nav-title">消息</text>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
			<view class="msg-list">
				<view class="msg-item" v-for="item in list" :key="item.id" @click="viewDetail(item.id)">
					<view class="msg-avatar">
						<text class="avatar-text">{{ item.title.charAt(0) }}</text>
					</view>
					<view class="msg-content">
						<text class="msg-title">{{ item.title }}</text>
						<text class="msg-desc">{{ item.content }}</text>
					</view>
					<text class="msg-time">{{ formatTime(item.created_at) }}</text>
				</view>
				<view class="empty" v-if="list.length === 0"><text>暂无消息</text></view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import apiConfig from '../../../utils/api.js';

export default {
	data() {
		return {
			statusBarHeight: 0, list: [], refreshing: false
		}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.loadData();
	},
	methods: {
		async loadData() {
			try {
				const res = await uni.request({
					url: apiConfig.baseUrl + 'announcements.php',
					method: 'POST',
					data: { action: 'get_announcements' },
					header: { 'Content-Type': 'application/json' }
				});
				const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
				if (result.code === 200) {
					this.list = result.data || [];
				}
			} catch(e) { console.error(e); }
		},
		async onRefresh() {
			this.refreshing = true;
			try {
				await this.loadData();
			} catch(e) { console.error(e); }
			this.refreshing = false;
		},
		viewDetail(id) {
			uni.navigateTo({ url: '/pages/content/announcement-detail?id=' + id });
		},
		formatTime(t) {
			if (!t) return '';
			return t.substr(0, 10);
		}
	}
}
</script>

<style>
.content { height: 100vh; background: #f8f9fb; display: flex; flex-direction: column; overflow: hidden; }
.status-bar { width: 100%; background: #ffffff; flex-shrink:0; }
.nav-bar { display: flex; align-items: center; justify-content: center; height: 88upx; background: #ffffff; border-bottom: 1px solid #f0f0f0; flex-shrink:0; }
.nav-title { font-size: 30upx; font-weight: 600; color: #303132; }
.body { flex: 1; min-height: 0; padding: 0; }

.msg-list { padding: 0; }
.msg-item {
	background: #ffffff;
	display: flex;
	align-items: center;
	padding: 24upx 28upx;
	border-bottom: 1px solid #f5f5f5;
}
.msg-avatar {
	width: 80upx; height: 80upx;
	border-radius: 50%;
	background: linear-gradient(135deg, #1b44a6, #3071f6);
	display: flex; align-items: center; justify-content: center;
	margin-right: 20upx; flex-shrink: 0;
}
.avatar-text { font-size: 32upx; font-weight: 700; color: #ffffff; }
.msg-content { flex: 1; min-width: 0; }
.msg-title { display: block; font-size: 28upx; font-weight: 600; color: #303132; margin-bottom: 4upx; }
.msg-desc { display: block; font-size: 24upx; color: #909398; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-time { font-size: 22upx; color: #c0c4cc; flex-shrink: 0; margin-left: 16upx; }
.empty { padding: 80upx 0; text-align: center; font-size: 26upx; color: #c0c4cc; }
</style>
