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
		this.adminUrl = base + '#/?admin_token=' + encodeURIComponent(token) + '&admin_name=' + name;
	}
};
</script>

<style>
.content { width: 100%; height: 100vh; }
</style>
