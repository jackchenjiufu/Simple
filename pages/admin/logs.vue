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

		<!-- 类型过滤 -->
		<view class="filter-bar">
			<scroll-view scroll-x="true" show-scrollbar="false" class="filter-scroll">
				<view class="filter-item" :class="{ act: filterType === '' }" @click="changeFilter('')">全部</view>
				<view class="filter-item" :class="{ act: filterType === 'login' }" @click="changeFilter('login')">登录</view>
				<view class="filter-item" :class="{ act: filterType === 'behavior' }" @click="changeFilter('behavior')">行为</view>
				<view class="filter-item" :class="{ act: filterType === 'admin' }" @click="changeFilter('admin')">管理</view>
				<view class="filter-item" :class="{ act: filterType === 'content' }" @click="changeFilter('content')">内容</view>
				<view class="filter-item" :class="{ act: filterType === 'follow' }" @click="changeFilter('follow')">关注</view>
				<view class="filter-item" :class="{ act: filterType === 'error' }" @click="changeFilter('error')">错误</view>
				<view class="filter-item" :class="{ act: filterType === 'warning' }" @click="changeFilter('warning')">警告</view>
			</scroll-view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<view class="count-tip" v-if="total > 0">共 {{ total }} 条</view>
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
			filterType: '',
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadLogs(true);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		changeFilter(t) {
			if (this.filterType === t) return;
			this.filterType = t;
			this.loadLogs(true);
		},
		loadLogs(reset) {
			if (this.loading) return;
			if (reset) { this.page = 1; this.list = []; }
			this.loading = true;
			adminApi.getLogs(this.page, this.limit, this.filterType).then(res => {
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

.filter-bar { background: #fff; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.filter-scroll { white-space: nowrap; padding: 0 12px; }
.filter-item {
	display: inline-block; padding: 6px 16px; margin-right: 8px;
	font-size: 13px; color: #666; background: #f5f6fa;
	border-radius: 16px; transition: all 0.2s;
}
.filter-item.act { background: #3071f6; color: #fff; }
.count-tip { font-size: 12px; color: #999; padding: 8px 2px; }

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.log-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.log-head { display: flex; align-items: center; justify-content: space-between; }
.log-type { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.log-type.tinfo, .log-type.tInfo { background: #eef4ff; color: #3071f6; }
.log-type.twarning, .log-type.tWarn, .log-type.twarning { background: #fff3e8; color: #ff7d00; }
.log-type.terror, .log-type.tError { background: #fdeef0; color: #e64340; }
.log-type.tlogin, .log-type.tLogin { background: #e8f7ef; color: #00a862; }
.log-type.tbehavior, .log-type.tBehavior { background: #f0ecff; color: #7c5cfc; }
.log-type.tadmin, .log-type.tAdmin { background: #fdeef4; color: #e64340; }
.log-type.tcontent, .log-type.tContent { background: #eaf4f8; color: #3071f6; }
.log-type.tfollow, .log-type.tFollow { background: #fff8e1; color: #ff7d00; }
.log-time { font-size: 11px; color: #bbb; }
.log-action { font-size: 14px; color: #1a1a2e; font-weight: 500; margin-top: 8px; display: block; }
.log-message { font-size: 13px; color: #666; margin-top: 4px; display: block; }
.log-ip { font-size: 11px; color: #ccc; margin-top: 6px; display: block; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }
</style>
