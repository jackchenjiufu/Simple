<template>
	<view class="ad-empty" :style="{padding: padding + 'px 0'}">
		<text class="ad-empty-icon">{{ icon }}</text>
		<text class="ad-empty-text">{{ text }}</text>
		<view v-if="actionText" class="ad-empty-action" @click="$emit('action')">{{ actionText }}</view>
	</view>
</template>
<script>
export default {
	name: 'EmptyState',
	props: {
		text: { type: String, default: '暂无数据' },
		icon: { type: String, default: '📭' },
		actionText: { type: String, default: '' },
		padding: { type: Number, default: 80 }
	}
};
</script>
<style>
.ad-empty { text-align: center; color: #b0b3b8; }
.ad-empty-icon { display: block; font-size: 64upx; margin-bottom: 16upx; }
.ad-empty-text { font-size: 26upx; color: #b0b3b8; }
.ad-empty-action { display: inline-block; margin-top: 20upx; font-size: 26upx; color: #2f6bf0; padding: 12upx 32upx; border: 1px solid #2f6bf0; border-radius: 999upx; }
</style>
