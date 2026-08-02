<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">控制台</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<!-- 核心指标 -->
			<view class="stats-grid">
				<view class="stat-card" v-for="s in coreStats" :key="s.label">
					<text class="stat-num" :class="'c' + s.color">{{ s.value }}</text>
					<text class="stat-label">{{ s.label }}</text>
				</view>
			</view>

			<!-- 近7日注册趋势 -->
			<view class="section-title">近 7 日注册趋势</view>
			<view class="panel">
				<view class="trend-bars">
					<view class="bar-col" v-for="(b, i) in trendData" :key="i">
						<view class="bar-track">
							<view class="bar-fill" :style="{ height: b.pct + '%' }"></view>
						</view>
						<text class="bar-label">{{ b.label }}</text>
						<text class="bar-value">{{ b.value }}</text>
					</view>
				</view>
				<view class="empty-tip" v-if="!trendData.length">暂无数据</view>
			</view>

			<!-- 最近动态 -->
			<view class="section-title">最近动态</view>
			<view class="panel">
				<view class="activity-item" v-for="(a, i) in activities" :key="i">
					<view class="activity-dot" :class="'d' + a.color"></view>
					<text class="activity-text">{{ a.text }}</text>
					<text class="activity-time">{{ a.time }}</text>
				</view>
				<view class="empty-tip" v-if="!activities.length">暂无动态</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			coreStats: [
				{ label: '用户总数', value: '-', color: 1 },
				{ label: '内容总数', value: '-', color: 2 },
				{ label: '今日新增', value: '-', color: 3 },
				{ label: '待处理反馈', value: '-', color: 4 },
			],
			trendData: [],
			activities: [],
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadData();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadData() {
			adminApi.getStats().then(res => {
				if (res.code === 200 && res.data) {
					const d = res.data;
					this.coreStats[0].value = d.total_users ?? '-';
					this.coreStats[1].value = d.total_articles ?? d.total_content ?? '-';
					this.coreStats[2].value = d.today_users ?? '-';
					this.coreStats[3].value = d.total_pending_feedback ?? '-';

					// 注册趋势
					if (Array.isArray(d.user_growth)) {
						const max = Math.max(...d.user_growth.map(x => x.count), 1);
						this.trendData = d.user_growth.map(x => ({
							label: (x.date || '').slice(5),
							value: x.count,
							pct: Math.round(x.count / max * 100),
						}));
					}

					// 最近动态
					if (Array.isArray(d.recent_activities)) {
						this.activities = d.recent_activities.slice(0, 6).map(a => ({
							text: a.text || a.action || '',
							time: (a.created_at || a.time || '').slice(5, 16),
							color: Math.floor(Math.random() * 4) + 1,
						}));
					}
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
.stat-num.c5 { color: #f43f5e; }
.stat-label { font-size: 12px; color: #909399; margin-top: 6px; }

.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 20px 0 12px; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }

/* 趋势柱状图 */
.trend-bars { display: flex; align-items: flex-end; justify-content: space-around; height: 180px; }
.bar-col { display: flex; flex-direction: column; align-items: center; width: 12%; }
.bar-track {
	width: 20px; height: 120px; background: #f0f2f5; border-radius: 10px;
	display: flex; align-items: flex-end; overflow: hidden; margin-bottom: 6px;
}
.bar-fill {
	width: 100%; background: linear-gradient(180deg, #5b8df9, #3071f6);
	border-radius: 10px 10px 0 0; transition: height .4s;
}
.bar-label { font-size: 10px; color: #909399; }
.bar-value { font-size: 10px; color: #3071f6; font-weight: 600; }

/* 动态 */
.activity-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.activity-item:last-child { border-bottom: none; }
.activity-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; flex-shrink: 0; }
.activity-dot.d1 { background: #3071f6; }
.activity-dot.d2 { background: #00a862; }
.activity-dot.d3 { background: #ff7d00; }
.activity-dot.d4 { background: #7c5cfc; }
.activity-text { flex: 1; font-size: 13px; color: #333; }
.activity-time { font-size: 11px; color: #bbb; margin-left: 8px; }

.empty-tip { text-align: center; color: #bbb; font-size: 13px; padding: 24px 0; }
</style>
