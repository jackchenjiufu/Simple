<template>
	<view>
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">{{ title }}</text>
			<view class="nav-placeholder"></view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'NavBar',
	props: {
		title: { type: String, default: '' }
	},
	data() {
		return {
			statusBarHeight: 20
		};
	},
	mounted() {
		try {
			const info = uni.getSystemInfoSync();
			this.statusBarHeight = info.statusBarHeight || 20;
		} catch(e) { console.warn(e); }
	},
	methods: {
		goBack() {
			uni.navigateBack();
		}
	}
};
</script>

<style>
.status-bar { width: 100%; background-color: #ffffff; }
.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 44px;
	background-color: #ffffff;
	padding: 0 15px;
	border-bottom: 1px solid #f0f0f0;
	z-index: 10;
	flex-shrink: 0;
}
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { flex: 1; text-align: center; font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }
</style>
