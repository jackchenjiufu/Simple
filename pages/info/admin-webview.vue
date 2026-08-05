<template>
	<view class="content">
		<web-view :src="adminUrl"></web-view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			adminUrl: ''
		};
	},
	onLoad(options) {
		// 从 baseUrl 推导后台地址：.../doo/server/api/ → .../doo/admin-vue/
		const base = apiConfig.baseUrl.replace(/\/server\/api\/$/, '/admin-vue/');
		const token = options.token || '';
		const name = options.name ? encodeURIComponent(options.name) : '';
		// 附带 uid 与角色：web 后台按 uid 查权限表过滤菜单
		const uid = uni.getStorageSync('userId') || '';
		const role = (uni.getStorageSync('userInfo') || {}).role || 'admin';
		this.adminUrl = base + '#/?admin_token=' + encodeURIComponent(token) + '&admin_name=' + name
			+ '&admin_uid=' + encodeURIComponent(uid) + '&admin_role=' + encodeURIComponent(role);
	}
};
</script>

<style>
.content { width: 100%; height: 100vh; }
</style>
