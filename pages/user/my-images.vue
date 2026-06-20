<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">我的图片</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" v-if="isLoggedIn">
			<view class="grid">
				<view class="card" v-for="(img, i) in myImages" :key="i" @click="previewImage(img)">
					<image class="card-img" :src="img.url" mode="aspectFill"></image>
					<text class="card-title">{{ img.title }}</text>
				</view>
				<view class="empty" v-if="myImages.length === 0"><text>暂无图片</text></view>
			</view>
		</scroll-view>

		<view class="login-box" v-if="!isLoggedIn">
			<text class="login-msg">请先登录</text>
		</view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return { statusBarHeight: 0, myImages: [], isLoggedIn: false, userId: 0}
	},
	onLoad() {
		const info = uni.getSystemInfoSync();
		this.statusBarHeight = info.statusBarHeight || 0;
		const ui = uni.getStorageSync('userInfo');
		if (ui && uni.getStorageSync('isLoggedIn')) {
			this.isLoggedIn = true; this.userId = ui.id;
			this.loadMyImages();
		}
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadMyImages() {
			uni.request({
				url: apiConfig.baseUrl + 'content.php',
				method: 'GET',
				data: { limit: 100, offset: 0, status: 'published' },
				success: (res) => {
					try {
						const result = res.data;
						if (result.code === 200) {
							this.myImages = (result.data.contents || [])
								.filter(item => item.user_id == this.userId && item.image_url)
								.map(item => ({ url: item.image_url, title: item.title || '' }));
						}
					} catch(e) { console.error(e); }
				}
			});
		},
		previewImage(img) { uni.previewImage({ urls: [img.url], current: 0 }); }
	}
}
</script>

<style>
.content { min-height: 100vh; background: #f8f9fb; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #ffffff; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; height: 88upx; background: #ffffff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }
.body { flex: 1; padding: 24upx; }

.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16upx; }
.card { background: #fff; border-radius: 16upx; overflow: hidden; box-shadow: 0 2upx 12upx rgba(0,0,0,0.04); }
.card-img { width: 100%; height: 200upx; display: block; }
.card-title { display: block; padding: 16upx; font-size: 26upx; color: #303132; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { grid-column: 1/-1; padding: 80upx 0; text-align: center; font-size: 26upx; color: #c0c4cc; }
.login-box { flex: 1; display: flex; align-items: center; justify-content: center; }
.login-msg { font-size: 28upx; color: #909398; }
</style>
