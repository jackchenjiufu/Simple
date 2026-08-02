<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">后台管理</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<!-- 管理员信息卡 -->
			<view class="admin-card">
				<view class="admin-avatar">{{ adminInitial }}</view>
				<view class="admin-info">
					<text class="admin-name">{{ adminName }}</text>
					<text class="admin-role">超级管理员</text>
				</view>
				<view class="admin-badge">
					<text class="badge-text">已授权</text>
				</view>
			</view>

			<!-- 快捷概览 -->
			<view class="section-title">数据概览</view>
			<view class="stats-grid">
				<view class="stat-item" v-for="s in stats" :key="s.label" @click="s.go">
					<text class="stat-num" :class="'c' + s.color">{{ s.value }}</text>
					<text class="stat-label">{{ s.label }}</text>
				</view>
			</view>

			<!-- 功能入口 -->
			<view class="section-title">功能管理</view>
			<view class="menu-grid">
				<view class="menu-item" v-for="m in menus" :key="m.path" @click="goPage(m)">
					<view class="menu-icon" :style="{ background: m.bg }">
						<text class="menu-icon-text">{{ m.icon }}</text>
					</view>
					<text class="menu-name">{{ m.name }}</text>
				</view>
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
			adminName: '管理员',
			adminInitial: '管',
			stats: [
				{ label: '用户总数', value: '-', color: 1, go: () => this.goPath('/pages/admin/users') },
				{ label: '文章总数', value: '-', color: 2, go: () => this.goPath('/pages/admin/articles') },
				{ label: '待处理反馈', value: '-', color: 3, go: () => this.goPath('/pages/admin/feedback') },
				{ label: '今日注册', value: '-', color: 4, go: () => this.goPath('/pages/admin/dashboard') },
			],
			menus: [
				{ name: '控制台', icon: '📊', bg: '#eef4ff', path: '/pages/admin/dashboard' },
				{ name: '用户管理', icon: '👤', bg: '#e8f7ef', path: '/pages/admin/users' },
				{ name: '文章管理', icon: '📄', bg: '#fff3e8', path: '/pages/admin/articles' },
				{ name: '反馈管理', icon: '💬', bg: '#f0ecff', path: '/pages/admin/feedback' },
				{ name: '轮播管理', icon: '🖼️', bg: '#e8f4ff', path: '/pages/admin/carousel' },
				{ name: '公告管理', icon: '📢', bg: '#fff8e1', path: '/pages/admin/announcement' },
				{ name: '版本管理', icon: '📦', bg: '#eaf4f8', path: '/pages/admin/version' },
				{ name: '加班管理', icon: '⏱️', bg: '#f5efe8', path: '/pages/admin/overtime' },
				{ name: '权限管理', icon: '🔐', bg: '#eef7fa', path: '/pages/admin/permissions' },
				{ name: '热搜抓取', icon: '🔥', bg: '#ffefe8', path: '/pages/admin/hotsearch' },
				{ name: '系统日志', icon: '📋', bg: '#f2f4f7', path: '/pages/admin/logs' },
				{ name: '数据统计', icon: '📈', bg: '#e8f6f1', path: '/pages/admin/stats' },
			],
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		const ui = uni.getStorageSync('userInfo') || {};
		const name = ui.nickname || ui.username || '管理员';
		this.adminName = name;
		this.adminInitial = name ? name.charAt(0) : '管';
		this.loadStats();
	},
	onShow() {
		// 从子页面返回时刷新概览
		if (this._loaded) this.loadStats();
		this._loaded = true;
	},
	methods: {
		goBack() { uni.navigateBack(); },
		goPath(path) { uni.navigateTo({ url: path }); },
		goPage(m) { uni.navigateTo({ url: m.path }); },
		loadStats() {
			adminApi.getStats().then(res => {
				if (res.code === 200 && res.data) {
					const d = res.data;
					this.stats[0].value = d.total_users ?? '-';
					this.stats[1].value = d.total_articles ?? d.total_content ?? '-';
					this.stats[2].value = d.total_pending_feedback ?? '-';
					this.stats[3].value = d.today_users ?? '-';
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

/* 管理员卡片 */
.admin-card {
	background: linear-gradient(135deg, #1b44a6, #3071f6);
	border-radius: 16px; padding: 20px; display: flex; align-items: center;
	box-shadow: 0 4px 16px rgba(48, 113, 246, 0.25);
}
.admin-avatar {
	width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.25);
	display: flex; align-items: center; justify-content: center;
	color: #fff; font-size: 20px; font-weight: 700;
}
.admin-info { flex: 1; margin-left: 14px; display: flex; flex-direction: column; }
.admin-name { color: #fff; font-size: 17px; font-weight: 600; }
.admin-role { color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 4px; }
.admin-badge {
	background: rgba(255,255,255,0.2); border-radius: 20px; padding: 5px 12px;
}
.badge-text { color: #fff; font-size: 12px; }

/* 概览 */
.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 20px 0 12px; }
.stats-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.stat-item {
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

/* 功能菜单 */
.menu-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.menu-item {
	width: 31.5%; background: #fff; border-radius: 12px; padding: 16px 8px;
	margin-bottom: 10px; display: flex; flex-direction: column; align-items: center;
	box-sizing: border-box; box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.menu-icon {
	width: 44px; height: 44px; border-radius: 12px;
	display: flex; align-items: center; justify-content: center;
}
.menu-icon-text { font-size: 20px; }
.menu-name { font-size: 12px; color: #333; margin-top: 8px; text-align: center; }
</style>
