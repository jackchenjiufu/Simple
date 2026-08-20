<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack"><image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image></view>
			<text class="nav-title">缓存管理</text>
			<view class="nav-placeholder"></view>
		</view>
		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<!-- 概览 -->
			<view class="section-title">缓存概览</view>
			<view class="info-card" v-if="info">
				<view class="info-row"><text class="info-label">连接状态</text><text class="info-value" :style="{color: connected ? '#2f6bf0' : '#f56c6c'}">{{ statusText }}</text></view>
				<view class="info-row"><text class="info-label">Redis 版本</text><text class="info-value">{{ info.redis.server_ver || '-' }}</text></view>
				<view class="info-row"><text class="info-label">缓存条目</text><text class="info-value">{{ info.redis.stats ? info.redis.stats.count : '-' }} 个 / {{ sizeText }}</text></view>
			</view>
			<view class="action-row">
				<button class="btn btn-primary" @click="flushAll">清空全部缓存</button>
			</view>
			<!-- key 列表 -->
			<view class="section-title">缓存 Key（{{ filteredKeys.length }}）</view>
			<view style="background:#fff;margin:0 24upx 16upx;border-radius:999upx;padding:12upx 24upx;display:flex;align-items:center">
				<text style="color:#b0b3b8;margin-right:12upx">🔍</text>
				<input style="flex:1;font-size:26upx" v-model="kw" placeholder="按 key 搜索..." />
			</view>
			<view v-if="filteredKeys.length" class="list-card">
				<view class="list-item" v-for="k in filteredKeys" :key="k.key">
					<text class="list-main">{{ k.key }}</text>
					<text class="list-sub">TTL {{ k.ttl < 0 ? '永久' : k.ttl + 's' }} · {{ formatSize(k.size) }}</text>
					<text class="list-del" @click="delKey(k.key)">删除</text>
				</view>
			</view>
			<view v-else class="empty">{{ kw ? '无匹配 key' : '暂无缓存或未连接 Redis' }}</view>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
export default {
	data() { return { statusBarHeight: 0, info: null, keys: [], connected: false, kw: '' }; },
	computed: {
		statusText() {
			const r = this.info && this.info.redis;
			if (!r) return '未知';
			if (!r.enabled) return '未启用';
			if (!r.extension) return '扩展未安装（降级走DB）';
			return r.connected ? '已连接' : '连接失败（降级走DB）';
		},
		sizeText() {
			const s = this.info && this.info.redis && this.info.redis.stats;
			return s ? this.formatSize(s.total_size) : '-';
		},
		filteredKeys() {
			const k = (this.kw || '').toLowerCase();
			if (!k) return this.keys;
			return this.keys.filter(x => x.key.toLowerCase().includes(k));
		}
	},
	onLoad() { const si = uni.getSystemInfoSync(); this.statusBarHeight = si.statusBarHeight || 0; this.load(); },
	methods: {
		goBack() { uni.navigateBack(); },
		formatSize(b) { if (b == null) return '0B'; if (b < 1024) return b + 'B'; if (b < 1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; },
		async load() {
			try { const r = await adminApi.getCacheStatus(); if (r.code === 200) { this.info = r.data; this.connected = !!(r.data.redis && r.data.redis.connected); this.keys = (r.data.redis && r.data.redis.stats && r.data.redis.stats.keys) || []; } } catch(e) {}
		},
		flushAll() {
			uni.showModal({ title: '清空缓存', content: '确定清空全部缓存？', success: async (res) => { if (!res.confirm) return; try { const r = await adminApi.flushCache(); if (r.code === 200) { uni.showToast({ title: r.message, icon: 'none' }); this.load(); } } catch(e) {} } });
		},
		delKey(key) {
			uni.showModal({ title: '删除', content: '删除 ' + key + ' ?', success: async (res) => { if (!res.confirm) return; try { const r = await adminApi.forgetCache(key.replace(/^[^:]+:/, '').replace(/:.+$/, '') + ':' + key.split(':').pop()); this.load(); } catch(e) {} } });
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
.info-row { display: flex; justify-content: space-between; padding: 16upx 0; border-bottom: 1px solid #f7f8fa; }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 28upx; color: #666; }
.info-value { font-size: 28upx; color: #333; font-weight: 500; }
.action-row { margin: 24upx; }
.btn { height: 84upx; line-height: 84upx; border-radius: 14upx; font-size: 30upx; }
.btn-primary { background: #2f6bf0; color: #fff; }
.list-card { background: #fff; margin: 0 24upx; border-radius: 16upx; overflow: hidden; }
.list-item { display: flex; align-items: center; padding: 20upx 24upx; border-bottom: 1px solid #f7f8fa; }
.list-item:last-child { border-bottom: none; }
.list-main { flex: 1; font-size: 26upx; color: #333; }
.list-sub { font-size: 22upx; color: #999; margin-right: 16upx; }
.list-del { color: #f56c6c; font-size: 26upx; }
.empty { text-align: center; color: #999; font-size: 26upx; padding: 40upx 0; }
</style>
