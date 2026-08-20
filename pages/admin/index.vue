<template>
	<view class="ad-page">
		<admin-nav title="后台管理"></admin-nav>
		<scroll-view class="ad-body" scroll-y="true" show-scrollbar="false">
			<view class="idx-admin-card">
				<view class="idx-admin-info">
					<view class="idx-admin-avatar">{{ adminInitial }}</view>
					<view class="idx-admin-meta">
						<text class="idx-admin-name">{{ adminName }}</text>
						<text class="idx-admin-role">{{ adminRoleText }}</text>
					</view>
				</view>
				<view class="idx-badge"><text>已授权</text></view>
			</view>

			<view class="ad-sec">数据概览</view>
			<view class="idx-stats">
				<view class="idx-stat" v-for="s in visibleStats" :key="s.label" @click="s.go">
					<text class="idx-stat-num" :style="{color: s.color}">{{ s.value }}</text>
					<text class="idx-stat-label">{{ s.label }}</text>
				</view>
			</view>

			<view class="idx-search">
				<text class="idx-search-icon">🔍</text>
				<input class="idx-search-input" v-model="keyword" placeholder="搜索管理功能..." placeholder-class="idx-ph" confirm-type="search" />
				<text v-if="keyword" class="idx-search-clear" @click="keyword=''">✕</text>
			</view>

			<view v-for="group in filteredGroups" :key="group.name">
				<view class="ad-sec">{{ group.name }}</view>
				<view class="idx-menu">
					<view class="idx-menu-item" v-for="m in group.items" :key="m.path" @click="goPage(m)">
						<view class="idx-menu-icon" :style="{background: m.bg}"><text>{{ m.icon }}</text></view>
						<text class="idx-menu-name">{{ m.name }}</text>
					</view>
				</view>
			</view>
			<view class="ad-empty" v-if="!filteredGroups.length">未找到相关功能</view>
		</scroll-view>
	</view>
</template>
<script>
import adminApi from '../../utils/admin-api.js';
import AdminNav from '../../components/admin/AdminNav.vue';
export default {
	components: { AdminNav },
	data() {
		return {
			adminName: '管理员', adminInitial: '管', keyword: '', userRole: 'user', myPerms: null,
			stats: [
				{ label: '用户总数', value: '-', color: '#3071f6', go: () => this.goPath('/pages/admin/users') },
				{ label: '文章总数', value: '-', color: '#00a862', go: () => this.goPath('/pages/admin/articles') },
				{ label: '待处理反馈', value: '-', color: '#ff7d00', go: () => this.goPath('/pages/admin/feedback') },
				{ label: '今日注册', value: '-', color: '#7c5cfc', go: () => this.goPath('/pages/admin/dashboard') },
			],
			groups: [
				{ name: '📊 数据看板', items: [
					{ name: '控制台', icon: '📊', bg: '#eef4ff', path: '/pages/admin/dashboard', permission: 'view_stats' },
					{ name: '行为分析', icon: '🎯', bg: '#eaf6ff', path: '/pages/admin/behaviors', permission: 'view_stats' },
					{ name: '数据统计', icon: '📈', bg: '#e8f6f1', path: '/pages/admin/stats', permission: 'view_stats' },
				]},
				{ name: '👥 用户与内容', items: [
					{ name: '用户管理', icon: '👤', bg: '#e8f7ef', path: '/pages/admin/users', permission: 'manage_users' },
					{ name: '文章管理', icon: '📄', bg: '#fff3e8', path: '/pages/admin/articles', permission: 'manage_articles' },
					{ name: '内容管理', icon: '🖼️', bg: '#fff3e8', path: '/pages/admin/content', permission: 'manage_content' },
					{ name: '评论管理', icon: '🗨️', bg: '#e8f4ff', path: '/pages/admin/comments', permission: 'manage_comments' },
					{ name: '举报管理', icon: '🚩', bg: '#fdeef0', path: '/pages/admin/reports', permission: 'manage_reports' },
				]},
				{ name: '💬 运营管理', items: [
					{ name: '反馈管理', icon: '💬', bg: '#f0ecff', path: '/pages/admin/feedback', permission: 'manage_feedback' },
					{ name: '公告管理', icon: '📢', bg: '#fff8e1', path: '/pages/admin/announcement', permission: 'manage_announcements' },
					{ name: '轮播管理', icon: '🖼️', bg: '#e8f0fe', path: '/pages/admin/carousel', permission: 'manage_carousel' },
					{ name: '热搜抓取', icon: '🔥', bg: '#ffefe8', path: '/pages/admin/hotsearch', permission: 'manage_hotsearch' },
					{ name: '启动页管理', icon: '🚀', bg: '#eaf4f8', path: '/pages/admin/splash', permission: 'manage_splash' },
				]},
				{ name: '⚙️ 系统设置', items: [
					{ name: '内容推荐', icon: '⭐', bg: '#fff3e8', path: '/pages/admin/recommend', permission: 'manage_system' },
					{ name: '缓存管理', icon: '🧊', bg: '#e8f7ef', path: '/pages/admin/cache', permission: 'manage_system' },
					{ name: '数据库管理', icon: '🗄️', bg: '#f0ecff', path: '/pages/admin/database', permission: 'manage_system' },
					{ name: '系统设置', icon: '⚙️', bg: '#f2f4f7', path: '/pages/admin/sysconfig', permission: 'manage_system' },
					{ name: '系统维护', icon: '🛠️', bg: '#f2f4f7', path: '/pages/admin/system', permission: 'manage_system' },
					{ name: 'API 管理', icon: '🔌', bg: '#eef7fa', path: '/pages/admin/apis', permission: 'manage_system' },
					{ name: '系统日志', icon: '📋', bg: '#f2f4f7', path: '/pages/admin/logs', permission: 'manage_logs' },
					{ name: '权限管理', icon: '🔐', bg: '#eef7fa', path: '/pages/admin/permissions', permission: 'manage_permissions' },
				]},
				{ name: '⏱️ 组织人事', items: [
					{ name: '加班管理', icon: '⏱️', bg: '#f5efe8', path: '/pages/admin/overtime', permission: 'manage_overtime' },
					{ name: '版本管理', icon: '📦', bg: '#eaf4f8', path: '/pages/admin/version', permission: 'manage_versions' },
				]},
			],
		};
	},
	computed: {
		visibleStats() {
			const p = this.myPerms;
			if (!p || p.is_super) return this.stats;
			if (!(p.permissions || []).includes('view_stats')) return this.stats.filter(s => s.label === '文章总数');
			return this.stats;
		},
		adminRoleText() {
			const role = (this.myPerms && this.myPerms.role) || this.userRole;
			if (role === 'super_admin') return '超级管理员';
			if (role === 'admin') return '管理员';
			if (role === 'editor') return '编辑';
			return '普通用户';
		},
		filteredGroups() {
			const kw = this.keyword.trim().toLowerCase();
			const p = this.myPerms;
			const hasPerm = (perm) => !perm || (p && p.is_super) || (p && p.permissions && p.permissions.includes(perm));
			const out = [];
			for (const g of this.groups) {
				let items = g.items.filter(m => hasPerm(m.permission));
				if (kw) items = items.filter(m => m.name.toLowerCase().includes(kw));
				if (items.length) out.push({ name: g.name, items });
			}
			return out;
		}
	},
	onLoad() {
		const ui = uni.getStorageSync('userInfo') || {};
		const name = ui.nickname || ui.username || '管理员';
		this.adminName = name; this.adminInitial = name ? name.charAt(0) : '管';
		this.userRole = ui.role || 'user';
		this.loadMyPermissions(); this.loadStats();
	},
	onShow() { if (this._loaded) { this.loadStats(); this.loadMyPermissions(); } this._loaded = true; },
	methods: {
		loadMyPermissions() { adminApi.getMyPermissions().then(res => { if (res.code === 200 && res.data) this.myPerms = res.data; }).catch(() => {}); },
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
	}
};
</script>
<style>
@import url('../../static/admin/admin.css');
.idx-admin-card { background: linear-gradient(135deg,#1b44a6,#3071f6); border-radius: 20upx; padding: 28upx; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 8upx 24upx rgba(48,113,246,.25); }
.idx-admin-info { display: flex; align-items: center; }
.idx-admin-avatar { width: 88upx; height: 88upx; border-radius: 50%; background: rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 36upx; font-weight: 700; }
.idx-admin-meta { margin-left: 20upx; display: flex; flex-direction: column; }
.idx-admin-name { color: #fff; font-size: 32upx; font-weight: 600; }
.idx-admin-role { color: rgba(255,255,255,.78); font-size: 24upx; margin-top: 6upx; }
.idx-badge { background: rgba(255,255,255,.2); border-radius: 999upx; padding: 8upx 20upx; color: #fff; font-size: 24upx; }
.idx-stats { display: flex; flex-wrap: wrap; justify-content: space-between; }
.idx-stat { width: 48.8%; background: #fff; border-radius: 16upx; padding: 24upx; margin-bottom: 16upx; box-sizing: border-box; display: flex; flex-direction: column; box-shadow: 0 2upx 10upx rgba(0,0,0,.04); }
.idx-stat-num { font-size: 44upx; font-weight: 700; }
.idx-stat-label { font-size: 24upx; color: #909399; margin-top: 6upx; }
.idx-search { display: flex; align-items: center; background: #fff; border-radius: 999upx; padding: 16upx 24upx; margin: 8upx 0 8upx; box-shadow: 0 2upx 10upx rgba(0,0,0,.04); }
.idx-search-icon { font-size: 28upx; margin-right: 12upx; }
.idx-search-input { flex: 1; font-size: 28upx; color: #333; }
.idx-ph { color: #b0b3b8; }
.idx-search-clear { color: #ccc; font-size: 28upx; padding: 4upx 8upx; }
.idx-menu { display: flex; flex-wrap: wrap; justify-content: flex-start; }
.idx-menu-item { width: 31.8%; background: #fff; border-radius: 16upx; padding: 24upx 8upx; margin-bottom: 14upx; margin-right: 1.2%; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; box-shadow: 0 2upx 10upx rgba(0,0,0,.04); }
.idx-menu-icon { width: 72upx; height: 72upx; border-radius: 20upx; display: flex; align-items: center; justify-content: center; margin-bottom: 12upx; }
.idx-menu-icon text { font-size: 40upx; }
.idx-menu-name { font-size: 26upx; color: #333; text-align: center; }
</style>
