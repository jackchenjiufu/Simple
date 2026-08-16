<template>
	<view class="content">
		<web-view :src="pageUrl"></web-view>
	</view>
</template>

<script>
export default {
	data() {
		return { pageUrl: '' };
	},
	onLoad(options) {
		this.pageUrl = decodeURIComponent(options.url || 'about:blank');
	}
};
</script>

<style>
.content { width: 100%; height: 100vh; }
</style>
