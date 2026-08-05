<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<text class="nav-title">消息</text>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
			<!-- 私信入口 -->
			<view class="chat-entry" @click="goChat">
				<view class="chat-icon">
					<text class="chat-icon-text">聊</text>
					<view class="chat-badge" v-if="unreadTotal > 0">{{ unreadTotal > 99 ? '99+' : unreadTotal }}</view>
				</view>
				<view class="chat-entry-info">
					<text class="chat-entry-title">私信</text>
					<text class="chat-entry-desc">{{ unreadTotal > 0 ? unreadTotal + ' 条未读消息' : '暂无未读消息' }}</text>
				</view>
				<text class="chat-entry-arrow">›</text>
			</view>

			<view class="section-divider"><text class="section-title">系统公告</text></view>
			<view class="msg-list">
				<view class="msg-card" v-for="item in list" :key="item.id" @click="viewDetail(item.id)">
					<view class="msg-item">
						<view class="msg-avatar">
							<text class="avatar-text">{{ item.title.charAt(0) }}</text>
						</view>
						<view class="msg-content">
							<text class="msg-title">{{ item.title }}</text>
							<text class="msg-desc">{{ item.content }}</text>
						</view>
						<text class="msg-time">{{ formatTime(item.created_at) }}</text>
					</view>
				</view>
				<view class="empty" v-if="list.length === 0"><text>暂无公告</text></view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import apiConfig from '../../../utils/api.js';
import chatApi from '../../../utils/chat-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0, list: [], refreshing: false,
			unreadTotal: 0, pollTimer: null
		}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.loadData();
		this.loadChat();
		// 私信未读轮询
		this.pollTimer = setInterval(() => this.loadChat(false), 15000);
	},
	onShow() {
		this.loadChat(false);
	},
	onUnload() {
		if (this.pollTimer) clearInterval(this.pollTimer);
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
					this.list = (result.data || []);
				}
			} catch(e) { console.error(e); }
		},
		loadChat() {
			if (!uni.getStorageSync('token')) { this.unreadTotal = 0; return; }
			chatApi.getConversations().then((res) => {
				const convs = res.data || [];
				this.unreadTotal = convs.reduce((s, c) => s + (c.unread || 0), 0);
			}).catch(() => {});
		},
		async onRefresh() {
			this.refreshing = true;
			try {
				await this.loadData();
				this.loadChat();
			} catch(e) { console.error(e); }
			this.refreshing = false;
		},
		viewDetail(id) {
			uni.navigateTo({ url: '/pages/content/announcement-detail?id=' + id });
		},
		goChat() {
			uni.navigateTo({ url: '/pages/chat/conversations' });
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

.msg-card {
	background: #ffffff;
}

/* 私信入口 */
.chat-entry {
	background: #ffffff; display: flex; align-items: center; padding: 24upx 28upx;
	margin-bottom: 12upx;
}
.chat-icon {
	width: 88upx; height: 88upx; border-radius: 50%;
	background: linear-gradient(135deg, #1b44a6, #3071f6);
	display: flex; align-items: center; justify-content: center;
	margin-right: 20upx; position: relative; flex-shrink: 0;
}
.chat-icon-text { font-size: 34upx; font-weight: 700; color: #ffffff; }
.chat-badge {
	position: absolute; top: -6upx; right: -8upx; min-width: 32upx; height: 32upx;
	border-radius: 16upx; background: #e64340; color: #ffffff; font-size: 20upx;
	display: flex; align-items: center; justify-content: center; padding: 0 8upx;
}
.chat-entry-info { flex: 1; min-width: 0; }
.chat-entry-title { font-size: 30upx; font-weight: 600; color: #303132; display: block; }
.chat-entry-desc { font-size: 24upx; color: #909398; margin-top: 4upx; display: block; }
.chat-entry-arrow { font-size: 34upx; color: #c0c4cc; flex-shrink: 0; }
.section-divider { padding: 16upx 28upx 12upx; }
.section-title { font-size: 24upx; color: #909398; }
</style>
