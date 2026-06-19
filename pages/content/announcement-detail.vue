<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">公告详情</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" v-if="announcement">
			<!-- 头部 -->
			<view class="detail-header">
				<view class="header-avatar">
					<text class="avatar-text">{{ announcement.title.charAt(0) }}</text>
				</view>
				<view class="header-info">
					<text class="header-name">系统公告</text>
					<text class="header-time">{{ formatDateTime(announcement.created_at) }}</text>
				</view>
			</view>

			<!-- 内容 -->
			<view class="detail-body">
				<text class="detail-title">{{ announcement.title }}</text>
				<view class="detail-content">
					<text>{{ announcement.content }}</text>
				</view>
			</view>
		</scroll-view>

		<view class="empty-state" v-else>
			<text>加载中...</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return { statusBarHeight: 0, announcement: null, id: null }
	},
	onLoad(options) {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		this.id = options.id;
		if (this.id) this.loadDetail();
	},
	methods: {
		async loadDetail() {
			try {
				const res = await uni.request({
					url: 'http://139.196.185.197:7070/doo/server/api/announcements.php',
					method: 'POST',
					data: { action: 'get_announcements' },
					header: { 'Content-Type': 'application/json' }
				});
				const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
				if (result.code === 200 && result.data) {
					this.announcement = result.data.find(item => item.id == this.id);
				}
			} catch(e) {}
		},
		formatDateTime(t) {
			if (!t) return '';
			return t.substr(0, 16).replace('T', ' ');
		},
		goBack() { uni.navigateBack(); }
	}
}
</script>

<style>
.content { min-height: 100vh; background: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #ffffff; }

.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 88upx; background: #ffffff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { flex:1; text-align:center; font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }

.body { flex: 1; padding: 24upx; }

.detail-header {
	display: flex;
	align-items: center;
	padding: 24upx;
	background: #ffffff;
	border-radius: 16upx;
	margin-bottom: 20upx;
	box-shadow: 0 2upx 12upx rgba(0,0,0,0.04);
}
.header-avatar {
	width: 80upx; height: 80upx;
	border-radius: 50%;
	background: linear-gradient(135deg, #1b44a6, #3071f6);
	display: flex; align-items: center; justify-content: center;
	margin-right: 20upx; flex-shrink: 0;
}
.avatar-text { font-size: 32upx; font-weight: 700; color: #ffffff; }
.header-info { flex: 1; }
.header-name { display: block; font-size: 28upx; font-weight: 600; color: #303132; margin-bottom: 4upx; }
.header-time { display: block; font-size: 22upx; color: #909398; }

.detail-body {
	background: #ffffff;
	border-radius: 16upx;
	padding: 32upx 28upx;
	box-shadow: 0 2upx 12upx rgba(0,0,0,0.04);
}
.detail-title { display: block; font-size: 36upx; font-weight: 700; color: #303132; margin-bottom: 20upx; line-height: 1.4; }
.detail-content { font-size: 28upx; color: #4b5563; line-height: 1.8; }

.empty-state { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 26upx; color: #909398; }
</style>
