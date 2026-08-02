<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">数据统计</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<!-- 指标卡片 -->
			<view class="stats-grid">
				<view class="stat-card" v-for="s in stats" :key="s.label">
					<text class="stat-num" :class="'c' + s.color">{{ s.value }}</text>
					<text class="stat-label">{{ s.label }}</text>
				</view>
			</view>

			<!-- 内容类型分布 -->
			<view class="section-title">内容类型分布</view>
			<view class="panel">
				<view class="dist-row" v-for="(d, i) in contentTypes" :key="i">
					<text class="dist-label">{{ d.type || d.name || '未知' }}</text>
					<view class="dist-track">
						<view class="dist-fill" :style="{ width: d.pct + '%', background: d.color }"></view>
					</view>
					<text class="dist-value">{{ d.count }}</text>
				</view>
				<view class="empty-tip" v-if="!contentTypes.length">暂无数据</view>
			</view>

			<!-- 活跃用户 -->
			<view class="section-title">活跃用户 TOP</view>
			<view class="panel">
				<view class="active-row" v-for="(u, i) in activeUsers" :key="i">
					<text class="active-rank" :class="'r' + (i + 1)">{{ i + 1 }}</text>
					<text class="active-name">{{ u.nickname || u.username || '用户' }}</text>
					<text class="active-count">{{ u.count || u.content_count || 0 }} 内容</text>
				</view>
				<view class="empty-tip" v-if="!activeUsers.length">暂无数据</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

const PALETTE = ['#3071f6', '#00a862', '#ff7d00', '#7c5cfc', '#ff5c8a', '#00b8c9', '#f6b73c', '#8a7cfc'];

export default {
	data() {
		return {
			statusBarHeight: 0,
			stats: [
				{ label: '用户总数', value: '-', color: 1 },
				{ label: '文章总数', value: '-', color: 2 },
				{ label: '今日新增', value: '-', color: 3 },
				{ label: '待处理反馈', value: '-', color: 4 },
			],
			contentTypes: [],
			activeUsers: [],
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadData();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadData() {
			// 概览统计
			adminApi.getStats('overview').then(res => {
				if (res.code === 200 && res.data) {
					const d = res.data;
					this.stats[0].value = d.total_users ?? '-';
					this.stats[1].value = d.total_articles ?? d.total_content ?? '-';
					this.stats[2].value = d.today_users ?? '-';
					this.stats[3].value = d.total_pending_feedback ?? '-';
				}
			}).catch(() => {});

			// 内容类型分布
			adminApi.getStats('content_types').then(res => {
				if (res.code === 200 && Array.isArray(res.data)) {
					const max = Math.max(...res.data.map(x => x.count), 1);
					this.contentTypes = res.data.map((x, i) => ({
						type: x.type || x.name,
						count: x.count,
						pct: Math.round(x.count / max * 100),
						color: PALETTE[i % PALETTE.length],
					}));
				}
			}).catch(() => {});

			// 活跃用户
			adminApi.getStats('active_users').then(res => {
				if (res.code === 200 && Array.isArray(res.data)) {
					this.activeUsers = res.data.slice(0, 10);
				}
			}).catch(() => {});
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
.body { flex: 1; min-height: 0; overflow: hidden; padding: 16px; box-sizing: border-box; }

.stats-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.stat-card {
	width: 48.5%; background: #fff; border-radius: 12px; padding: 16px;
	margin-bottom: 10px; display: flex; flex-direction: column; box-sizing: border-box;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.stat-num { font-size: 24px; font-weight: 700; }
.stat-num.c1 { color: #3071f6; }
.stat-num.c2 { color: #00a862; }
.stat-num.c3 { color: #ff7d00; }
.stat-num.c4 { color: #7c5cfc; }
.stat-label { font-size: 12px; color: #909399; margin-top: 6px; }

.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 20px 0 12px; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }

.dist-row { display: flex; align-items: center; padding: 8px 0; }
.dist-label { width: 70px; font-size: 13px; color: #333; }
.dist-track { flex: 1; height: 14px; background: #f0f2f5; border-radius: 7px; overflow: hidden; margin: 0 10px; }
.dist-fill { height: 100%; border-radius: 7px; transition: width .4s; }
.dist-value { width: 40px; text-align: right; font-size: 13px; color: #666; }

.active-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.active-row:last-child { border-bottom: none; }
.active-rank {
	width: 22px; height: 22px; border-radius: 50%; background: #f0f2f5;
	color: #666; font-size: 12px; display: flex; align-items: center; justify-content: center;
	margin-right: 12px; flex-shrink: 0;
}
.active-rank.r1 { background: #ff7d00; color: #fff; }
.active-rank.r2 { background: #7c5cfc; color: #fff; }
.active-rank.r3 { background: #3071f6; color: #fff; }
.active-name { flex: 1; font-size: 14px; color: #333; }
.active-count { font-size: 12px; color: #bbb; }

.empty-tip { text-align: center; color: #bbb; font-size: 13px; padding: 24px 0; }
</style>
