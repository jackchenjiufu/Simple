<template>
	<view>
		<view class="ad-nav-status" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="ad-nav-bar">
			<view class="ad-nav-back" @click="goBack">
				<image class="ad-nav-back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="ad-nav-title">{{ title }}</text>
			<view class="ad-nav-right" @click="onRight">
				<text v-if="rightText" class="ad-nav-right-text">{{ rightText }}</text>
			</view>
		</view>
	</view>
</template>
<script>
export default {
	name: 'AdminNav',
	props: {
		title: { type: String, default: '后台管理' },
		rightText: { type: String, default: '' }
	},
	data() { return { statusBarHeight: 20 }; },
	mounted() {
		try { const i = uni.getSystemInfoSync(); this.statusBarHeight = i.statusBarHeight || 20; } catch(e) {}
	},
	methods: {
		goBack() { uni.navigateBack(); },
		onRight() { this.$emit('right'); }
	}
};
</script>
<style>
.ad-nav-status { width: 100%; background: #fff; flex-shrink: 0; }
.ad-nav-bar { height: 88upx; background: #fff; display: flex; align-items: center; padding: 0 8upx; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.ad-nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.ad-nav-back-icon { width: 44upx; height: 44upx; }
.ad-nav-title { flex: 1; text-align: center; font-size: 32upx; font-weight: 600; color: #1a1a2e; }
.ad-nav-right { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.ad-nav-right-text { font-size: 26upx; color: #2f6bf0; }
</style>
