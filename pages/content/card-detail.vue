<template>
	<view class="content">
		<NavBar title="详情" />

		<!-- 图片显示区域 -->
		<view class="image-container">
			<image 
				:src="imageUrl" 
				mode="widthFix"
				@load="onImageLoad"
				@error="onImageError"
				@longpress="longPressImage"
			></image>
		</view>
		

	</view>
</template>

<script>
import NavBar from '../../components/nav-bar.vue';
import apiConfig from '../../utils/api.js';
export default {
	components: { NavBar },
	data() {
		return {

			cardData: {
				id: 0,
				title: '',
				cover: '',
				image: '',
				url: ''
			},
			// 用户信息
			userInfo: null,
			isLoggedIn: false,
			userId: 1,

		};
	},
	computed: {
			imageUrl() {
				// 尝试多个字段获取图片URL，适配后端返回的数据结构
				let url = this.cardData.image_url || this.cardData.url || this.cardData.image || this.cardData.cover;
				
				// 如果是测试图片URL，移除size参数获取原图
				if (url && url.includes('text_to_image')) {
					// 移除image_size参数
					url = url.replace(/&image_size=[^&]+/, '');
					url = url.replace(/\?image_size=[^&]+/, '?');
					if (url.endsWith('?')) {
						url = url.slice(0, -1);
					}
				}
				
				return url || '/static/img/default-cover.png';
			}
		},
	onLoad(options) {
		// 加载用户信息
		this.loadUserInfo();
		
		// 尝试多种方式获取事件通道
		let eventChannel = null;
		try {
			// uni-app 标准方式
			eventChannel = uni.getOpenerEventChannel();
		} catch (e) {
			try {
				// Vue 3 方式
				eventChannel = this.getOpenerEventChannel();
			} catch (e1) {
				try {
					// 兼容 Vue 2 方式
					eventChannel = this.$scope.eventChannel;
				} catch (e2) {
				}
			}
		}
		
		if (eventChannel) {
			eventChannel.on('setCard', (data) => {
				this.cardData = data;
			});
		} else {
			// 使用默认数据，确保页面能显示
			this.cardData = {
				id: 1,
				title: '默认图片',
				cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20landscape%20photography&image_size=square'
			};
		}
	},
	methods: {
		onImageLoad() {
		},
		onImageError(e) {
		},
		// 加载用户信息
		loadUserInfo() {
			const userInfo = uni.getStorageSync('userInfo');
			const isLoggedIn = uni.getStorageSync('isLoggedIn');
			
			if (isLoggedIn && userInfo) {
				this.isLoggedIn = true;
				this.userInfo = userInfo;
				this.userId = userInfo.id || 1;
			} else {
				this.isLoggedIn = false;
				this.userInfo = null;
				this.userId = 1;
			}
		},
		// 长按图片
		longPressImage() {
			uni.showActionSheet({
				itemList: ['收藏图片', '保存图片'],
				success: (res) => {
					if (res.tapIndex === 0) {
						// 收藏图片
						this.collectImage();
					} else if (res.tapIndex === 1) {
						// 保存图片
						this.saveImage();
					}
				},
				fail: (err) => {
				}
			});
		},
		// 收藏图片
		collectImage() {
			if (!this.cardData.id) {
				uni.showToast({
					title: '图片信息错误',
					icon: 'none'
				});
				return;
			}
			
			uni.request({
				url: apiConfig.getUrl('add_collection.php'),
				method: 'POST',
				header: {
				'Content-Type': 'application/json'
				},
				data: {
					user_id: this.userId,
					image_id: this.cardData.id
				},
				success: (res) => {
					try {
						const result = res.data;
						if (result.code === 200) {
							uni.showToast({
								title: '收藏成功',
								icon: 'success'
							});
						} else {
							uni.showToast({
								title: result.message || '收藏失败',
								icon: 'none'
							});
						}
					} catch (error) {
						uni.showToast({
							title: '收藏失败，请重试',
							icon: 'none'
						});
					}
				},
				fail: (err) => {
					uni.showToast({
						title: '网络错误，请检查连接',
						icon: 'none'
					});
				}
			});
		},

		// 保存图片到本地
		saveImage() {
			uni.showLoading({
				title: '保存中...'
			});
			
			uni.downloadFile({
				url: this.imageUrl,
				success: (downloadRes) => {
					if (downloadRes.statusCode === 200) {
						uni.saveImageToPhotosAlbum({
							filePath: downloadRes.tempFilePath,
							success: () => {
								uni.hideLoading();
								uni.showToast({
									title: '保存成功',
									icon: 'success'
								});
							},
							fail: (err) => {
								uni.hideLoading();
								uni.showToast({
									title: '保存失败',
									icon: 'none'
								});
							}
						});
					} else {
						uni.hideLoading();
						uni.showToast({
							title: '下载失败',
							icon: 'none'
						});
					}
				},
				fail: (err) => {
					uni.hideLoading();
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				}
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.content {
	width: 100%;
	height: 100vh;
	background-color: #000000;
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

	.status-bar {
		background-color: var(--bg-color);
	}

	.nav-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		background-color: var(--bg-color);
		padding: 0 15px;
		border-bottom: 1px solid var(--border-color);
		z-index: 10;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

.nav-back {
	width: 72upx;
	height: 72upx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.back-icon {
	width: 48upx;
	height: 48upx;
}

.nav-title {
	flex: 1;
	text-align: center;
	font-size: 18px;
	font-weight: bold;
	color: #303132;
}

.nav-placeholder {
	width: 30px;
}

.image-container {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	background-color: #000000;
	margin: 0;
	border-radius: 0;
	box-shadow: none;
}

.image-container image {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	

</style>
