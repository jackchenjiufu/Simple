<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack"><image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image></view>
			<text class="nav-title">数据库管理</text>
			<view class="nav-placeholder"></view>
		</view>
		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="section-title">数据库概览</view>
			<view class="info-card" v-if="info">
				<view class="info-row"><text class="info-label">数据库</text><text class="info-value">{{ info.database }}</text></view>
				<view class="info-row"><text class="info-label">MySQL</text><text class="info-value">{{ info.version }}</text></view>
				<view class="info-row"><text class="info-label">数据表</text><text class="info-value">{{ info.table_count }} 张</text></view>
				<view class="info-row"><text class="info-label">数据大小</text><text class="info-value">{{ formatSize(info.total_data) }} / 索引 {{ formatSize(info.total_index) }}</text></view>
			</view>
			<view class="section-title">数据表（{{ tables.length }}）</view>
			<view class="list-card" v-if="tables.length">
				<view class="list-item" v-for="t in tables" :key="t.name" @click="viewData(t)">
					<text class="list-main">{{ t.name }}</text>
					<text class="list-sub">{{ t.rows }} 行 · {{ formatSize(t.data_size) }}</text>
					<text class="list-arrow">›</text>
				</view>
			</view>
			<view class="empty" v-else>暂无数据</view>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
export default {
	data() { return { statusBarHeight: 0, info: null, tables: [] }; },
	onLoad() { const si = uni.getSystemInfoSync(); this.statusBarHeight = si.statusBarHeight || 0; this.load(); },
	methods: {
		goBack() { uni.navigateBack(); },
		formatSize(b) { if (b == null) return '-'; if (b < 1024) return b + 'B'; if (b < 1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; },
		async load() { try { const r = await adminApi.getDbOverview(); if (r.code === 200) { this.info = r.data; this.tables = r.data.tables || []; } } catch(e) {} },
		viewData(t) {
			uni.showLoading({ title: '加载中' });
			adminApi.getDbTables({ table: t.name, page: 1, limit: 5 }).then((r) => {
				uni.hideLoading();
				if (r.code === 200 && r.data) {
					const d = r.data;
					const first = (d.rows && d.rows[0]) || {};
					const lines = (d.columns || []).slice(0, 6).map((c) => c + ': ' + (first[c] != null ? String(first[c]).slice(0, 30) : ''));
					uni.showModal({ title: t.name + '（前 5 行）', content: '共 ' + d.total + ' 行\n' + lines.join('\n'), showCancel: false });
				}
			}).catch(() => uni.hideLoading());
		}
	}
};
</script>
<style>
.content { min-height: 100vh; background: #f7f8fa; }
.status-bar { width: 100%; background: #fff; }
.nav-bar { display: flex; align-items: center; height: 88upx; background: #fff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 64upx; height: 64upx; display: flex; align-items: center; }
.back-icon { width: 44upx; height: 44upx; }
.nav-title { flex: 1; text-align: center; font-size: 32upx; font-weight: 600; }
.nav-placeholder { width: 64upx; }
.body { height: calc(100vh - 88upx); }
.section-title { font-size: 26upx; color: #909399; margin: 24upx 24upx 12upx; }
.info-card { background: #fff; margin: 0 24upx; border-radius: 16upx; padding: 8upx 24upx; }
.info-row { display: flex; justify-content: space-between; padding: 14upx 0; border-bottom: 1px solid #f7f8fa; }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26upx; color: #666; }
.info-value { font-size: 26upx; color: #333; font-weight: 500; }
.list-card { background: #fff; margin: 0 24upx; border-radius: 16upx; overflow: hidden; }
.list-item { display: flex; align-items: center; padding: 18upx 24upx; border-bottom: 1px solid #f7f8fa; }
.list-item:last-child { border-bottom: none; }
.list-main { flex: 1; font-size: 26upx; color: #333; }
.list-sub { font-size: 22upx; color: #999; margin-right: 12upx; }
.list-arrow { font-size: 28upx; color: #ccc; }
.empty { text-align: center; color: #999; font-size: 26upx; padding: 40upx 0; }
</style>
