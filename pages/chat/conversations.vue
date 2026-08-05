<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">私信</text>
			<view class="nav-action" @click="loadData(true)">刷新</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false"
			refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
			<view class="conv-item" v-for="c in list" :key="c.conversation_id" @click="openChat(c)">
				<view class="conv-avatar">
					<image v-if="c.peer.avatar" class="avatar-img" :src="fixUrl(c.peer.avatar)" mode="aspectFill"></image>
					<text v-else class="avatar-text">{{ (c.peer.nickname || '?').charAt(0) }}</text>
					<view class="badge" v-if="c.unread > 0">{{ c.unread > 99 ? '99+' : c.unread }}</view>
				</view>
				<view class="conv-info">
					<view class="conv-top">
						<text class="conv-name">{{ c.peer.nickname }}</text>
						<text class="conv-time">{{ formatTime(c.last_time) }}</text>
					</view>
					<view class="conv-bottom">
						<text class="conv-last" :class="{ unread: c.unread > 0 }">
							{{ c.last_sender_id && c.last_sender_id !== myUserId ? '' : '' }}{{ c.last_message || '开始聊天吧' }}
						</text>
						<text class="conv-blocked" v-if="c.blocked">已拉黑</text>
					</view>
				</view>
			</view>

			<view class="empty" v-if="!loading && list.length === 0">
				<text>暂无私信</text>
				<text class="empty-sub">在文章详情页点击作者「私聊」发起对话</text>
			</view>
			<view class="loading-tip" v-if="loading">加载中...</view>
		</scroll-view>
	</view>
</template>

<script>
import chatApi from '../../utils/chat-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			list: [],
			loading: false,
			refreshing: false,
			myUserId: 0,
			pollTimer: null,
		};
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.myUserId = uni.getStorageSync('userId') || 0;
		this.loadData(true);
		this.pollTimer = setInterval(() => this.loadData(false), 10000);
	},
	onShow() {
		this.loadData(false);
	},
	onUnload() {
		if (this.pollTimer) clearInterval(this.pollTimer);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		// 图片 URL 补全
		fixUrl(url) {
			if (!url) return '';
			if (url.startsWith('http://') || url.startsWith('https://')) return url;
			return 'http://139.196.185.197:7070/doo/' + url.replace(/^\//, '');
		},
		loadData(reset) {
			if (this.loading) return;
			this.loading = true;
			chatApi.getConversations().then((res) => {
				this.list = res.data || [];
				if (reset) this.refreshing = false;
			}).catch(() => {
				if (reset) this.refreshing = false;
			}).finally(() => { this.loading = false; });
		},
		onRefresh() {
			this.refreshing = true;
			this.loadData(true);
		},
		openChat(c) {
			uni.navigateTo({
				url: `/pages/chat/chat?conversation_id=${c.conversation_id}&user_id=${c.peer.id}&nickname=${encodeURIComponent(c.peer.nickname)}`
			});
		},
		formatTime(t) {
			if (!t) return '';
			const d = new Date(t.replace(/-/g, '/'));
			const now = new Date();
			const sameDay = d.toDateString() === now.toDateString();
			const pad = (n) => (n < 10 ? '0' + n : '' + n);
			const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
			if (sameDay) return hm;
			const yesterday = new Date(now.getTime() - 86400000);
			if (d.toDateString() === yesterday.toDateString()) return '昨天';
			if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`;
			return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
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
.nav-action { font-size: 13px; color: #3071f6; padding: 4px 8px; }

.body { flex: 1; min-height: 0; overflow: hidden; }
.conv-item {
	background: #fff; display: flex; align-items: center; padding: 14px 16px;
	border-bottom: 1px solid #f5f5f5;
}
.conv-avatar {
	width: 48px; height: 48px; border-radius: 50%;
	background: linear-gradient(135deg, #1b44a6, #3071f6);
	display: flex; align-items: center; justify-content: center;
	overflow: hidden; margin-right: 14px; flex-shrink: 0; position: relative;
}
.avatar-img { width: 100%; height: 100%; }
.avatar-text { font-size: 19px; font-weight: 700; color: #fff; }
.badge {
	position: absolute; top: -4px; right: -6px; min-width: 18px; height: 18px;
	border-radius: 9px; background: #e64340; color: #fff; font-size: 10px;
	display: flex; align-items: center; justify-content: center; padding: 0 4px;
}
.conv-info { flex: 1; min-width: 0; }
.conv-top { display: flex; align-items: center; justify-content: space-between; }
.conv-name { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.conv-time { font-size: 11px; color: #bbb; }
.conv-bottom { display: flex; align-items: center; margin-top: 4px; }
.conv-last {
	flex: 1; min-width: 0; font-size: 13px; color: #999;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.conv-last.unread { color: #333; font-weight: 500; }
.conv-blocked { font-size: 11px; color: #e64340; margin-left: 8px; flex-shrink: 0; }

.empty { text-align: center; color: #bbb; font-size: 14px; padding: 60px 0; }
.empty-sub { display: block; font-size: 12px; color: #ccc; margin-top: 8px; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }
</style>
