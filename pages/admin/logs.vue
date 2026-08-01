<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">系统日志</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<view class="log-item" v-for="(l, i) in list" :key="i">
				<view class="log-head">
					<text class="log-type" :class="'t' + (l.type || 'info')">{{ l.type || 'info' }}</text>
					<text class="log-time">{{ (l.created_at || '').slice(0, 19) }}</text>
				</view>
				<text class="log-action">{{ l.action }}</text>
				<text class="log-message" v-if="l.message">{{ l.message }}</text>
				<text class="log-ip" v-if="l.ip_address">IP: {{ l.ip_address }}</text>
			</view>
			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无日志</view>
		</scroll-view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			list: [],
			page: 1,
			limit: 20,
			total: 0,
			loading: false,
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadLogs(true);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadLogs(reset) {
			if (this.loading) return;
			if (reset) { this.page = 1; this.list = []; }
			this.loading = true;
			adminApi.getLogs(this.page, this.limit).then(res => {
				if (res.code === 200) {
					const data = res.data || [];
					this.list = reset ? data : this.list.concat(data);
					this.total = res.total || 0;
					if (data.length >= this.limit) this.page++;
				}
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		loadMore() {
			if (this.list.length < this.total) this.loadLogs(false);
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
.log-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.log-head { display: flex; align-items: center; justify-content: space-between; }
.log-type { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.log-type.tinfo, .log-type.tinfo, .log-type.tInfo { background: #eef4ff; color: #3071f6; }
.log-type.twarning, .log-type.tWarn { background: #fff3e8; color: #ff7d00; }
.log-type.terror, .log-type.tError { background: #fdeef0; color: #e64340; }
.log-type.tlogin, .log-type.tLogin { background: #e8f7ef; color: #00a862; }
.log-time { font-size: 11px; color: #bbb; }
.log-action { font-size: 14px; color: #1a1a2e; font-weight: 500; margin-top: 8px; display: block; }
.log-message { font-size: 13px; color: #666; margin-top: 4px; display: block; }
.log-ip { font-size: 11px; color: #ccc; margin-top: 6px; display: block; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }
</style>
