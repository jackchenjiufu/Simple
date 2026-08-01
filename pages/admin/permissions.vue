<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">权限管理</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="section-title">角色列表</view>
			<view class="panel">
				<view class="role-item" v-for="r in roles" :key="r.id">
					<view class="role-avatar">{{ (r.name || '?').charAt(0) }}</view>
					<view class="role-info">
						<text class="role-name">{{ r.name }}</text>
						<text class="role-desc">{{ r.description || '暂无描述' }}</text>
					</view>
				</view>
				<view class="empty-tip" v-if="!roles.length">暂无角色</view>
			</view>

			<view class="section-title">权限列表</view>
			<view class="panel">
				<view class="perm-item" v-for="p in permissions" :key="p.id">
					<text class="perm-name">{{ p.name }}</text>
					<text class="perm-desc">{{ p.description || '' }}</text>
				</view>
				<view class="empty-tip" v-if="!permissions.length">暂无权限</view>
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
			roles: [],
			permissions: [],
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadData();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadData() {
			adminApi.getRoles().then(res => {
				if (res.code === 200) this.roles = res.data || [];
			}).catch(() => {});
			adminApi.getPermissions().then(res => {
				if (res.code === 200) this.permissions = res.data || [];
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

.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 20px 0 12px; }
.panel { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }

.role-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.role-item:last-child { border-bottom: none; }
.role-avatar {
	width: 38px; height: 38px; border-radius: 10px; background: #eef4ff;
	color: #3071f6; display: flex; align-items: center; justify-content: center;
	font-size: 16px; font-weight: 600; margin-right: 12px; flex-shrink: 0;
}
.role-info { display: flex; flex-direction: column; }
.role-name { font-size: 14px; font-weight: 600; color: #333; }
.role-desc { font-size: 12px; color: #bbb; margin-top: 4px; }

.perm-item {
	display: flex; align-items: center; justify-content: space-between;
	padding: 10px 0; border-bottom: 1px solid #f5f5f5;
}
.perm-item:last-child { border-bottom: none; }
.perm-name { font-size: 14px; color: #333; }
.perm-desc { font-size: 12px; color: #bbb; }

.empty-tip { text-align: center; color: #bbb; font-size: 13px; padding: 24px 0; }
</style>
