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
		// 后台地址：siteUrl + /admin-vue/（兼容 apiVersion 版本段，不受 baseUrl 变化影响）
		const base = apiConfig.getServerUrl('/admin-vue/');
		const token = options.token || '';
		const name = options.name ? encodeURIComponent(options.name) : '';
		// 附带 uid 与角色：web 后台按 uid 查权限表过滤菜单
		const uid = uni.getStorageSync('userId') || '';
		const role = (uni.getStorageSync('userInfo') || {}).role || 'admin';
		this.adminUrl = base + '#/?admin_token=' + encodeURIComponent(token) + '&admin_name=' + name
			+ '&admin_uid=' + encodeURIComponent(uid) + '&admin_role=' + encodeURIComponent(role)
			+ '&mobile=1';
	}
};
</script>

<style>
.content { width: 100%; height: 100vh; }
</style>
