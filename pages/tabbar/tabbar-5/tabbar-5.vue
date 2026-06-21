<!-- 用户资料页面组件 -->
<template>
	<!-- 页面根容器 -->
	<view class="content">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		
		<!-- 背景横幅，可点击更换背景 -->
		<view class="background-banner" :style="{ backgroundImage: 'url(' + backgroundUrl + ')', marginTop: '-' + statusBarHeight + 'px', height: bannerHeight + 'px' }" @click="changeBackground">
		<view class="banner-overlay"></view>
		</view>
		
		<!-- 用户卡片，包含头像、昵称和登录/注册按钮 -->
		<view class="user-card">
			<!-- 头像容器，可点击更换头像 -->
			<view class="avatar-wrapper" @click="goToPersonalInfo">
				<image 
					class="avatar" 
					:src="avatarUrl" 
					mode="aspectFill"
					lazy-load="true"
				></image>
			</view>
			
			<!-- 用户信息区域 -->
			<view class="user-info">
				<!-- 昵称，可点击进入编辑资料 -->
				<text class="nickname" @click="goToPersonalInfo">{{ nickname }}</text>
			</view>
			
			<!-- 未登录状态下显示登录/注册按钮组 -->
			<view class="button-group" v-if="!isLoggedIn">
				<button class="btn btn-login" @click="handleLogin">登录</button>
				<button class="btn btn-register" @click="handleRegister">注册</button>
			</view>
		</view>
		

		<!-- 功能菜单列表 -->
		<view class="menu-list">
			<view class="menu-item" @click="handleMenuClick('personalInfo')">
				<text class="menu-text">个人信息</text>
				<text class="menu-arrow">›</text>
			</view>
			
<view class="menu-item" @click="handleMenuClick('feedback')">
				<text class="menu-text">问题反馈</text>
				<text class="menu-arrow">›</text>
			</view>
			<view class="menu-item" @click="handleMenuClick('systemSettings')">
				<text class="menu-text">系统设置</text>
				<text class="menu-arrow">›</text>
			</view>
			<view class="menu-item" @click="handleMenuClick('aboutUs')">
				<text class="menu-text">关于我们</text>
				<text class="menu-arrow">›</text>
			</view>
			<!-- 管理员入口，仅对管理员用户显示 -->
		</view>
	</view>
</template>

<script>
export default {
	/**
	 * 组件数据
	 */
	data() {
		return {
			avatarUrl: 'https://via.placeholder.com/150', // 头像URL
			nickname: '未登录', // 用户昵称
			isLoggedIn: false, // 登录状态
			backgroundUrl: 'https://via.placeholder.com/750x450/f33e54/ffffff?text=Background', // 背景图URL
			statusBarHeight: 0, // 状态栏高度
			bannerHeight: 0, // 背景横幅总高度（含状态栏延伸部分）
			userInfo: null, // 用户信息对象
			apiBase: 'http://139.196.185.197:7070/doo/server/api/', // API基础地址
			registerTime: '' // 注册时间
		};
	},
	
	/**
	 * 生命周期钩子：页面加载时执行
	 */
	onLoad() {
		// 获取系统信息，设置状态栏高度
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		
		// 计算背景横幅高度：将450upx转换为px（uni-app中750rpx=屏幕宽度），再加上状态栏高度
		// 这样背景图可以覆盖到状态栏背后，实现透明状态栏效果
		const bannerBaseHeight = (450 / 750) * systemInfo.windowWidth;
		this.bannerHeight = bannerBaseHeight + this.statusBarHeight;
		
		// 加载用户信息
		this.loadUserInfo();
	},
	
	/**
	 * 生命周期钩子：页面显示时执行
	 */
	onShow() {
		// 每次显示页面时重新加载用户信息，确保数据最新
		this.loadUserInfo();
	},
	
	/**
	 * 组件方法
	 */
	methods: {
		/**
		 * 处理图片 URL，确保包含正确的端口号
		 * @param {string} url - 原始图片 URL
		 * @returns {string} 处理后的完整图片 URL
		 */
		processImageUrl(url) {
			if (!url) {
				return '';
			}
			
			let processedUrl = url;
			if (!processedUrl.includes(':')) {
				// 相对路径，添加完整 URL
				processedUrl = `http://139.196.185.197:7070${processedUrl}`;
			} else if (processedUrl.includes('http') && !processedUrl.includes('7070')) {
				// 已经是完整 URL，但缺少正确端口
				if (processedUrl.startsWith('http://')) {
					// 替换 http:// 开头的 URL，添加 7070 端口
					if (processedUrl.includes('139.196.185.197')) {
						// 已经包含正确 IP，只需要添加端口号
						processedUrl = processedUrl.replace('http://139.196.185.197/', 'http://139.196.185.197:7070/');
					} else {
						// 其他 HTTP URL，替换为正确的 IP 和端口
						processedUrl = processedUrl.replace(/^http:\/\/[^\/]+\//, 'http://139.196.185.197:7070/');
					}
				} else if (processedUrl.startsWith('https://')) {
					// HTTPS URL，替换为正确的 IP 和端口
					if (processedUrl.includes('139.196.185.197')) {
						// 已经包含正确 IP，只需要添加端口号
						processedUrl = processedUrl.replace('https://139.196.185.197/', 'http://139.196.185.197:7070/');
					} else {
						// 其他 HTTPS URL，替换为正确的 IP 和端口
						processedUrl = processedUrl.replace(/^https:\/\/[^\/]+\//, 'http://139.196.185.197:7070/');
					}
				}
			}
			
			return processedUrl;
		},
		/**
		 * 加载用户信息
		 * 从本地存储获取用户信息和登录状态，处理头像和背景图URL
		 */
		loadUserInfo() {
			const userInfo = uni.getStorageSync('userInfo');
			const isLoggedIn = uni.getStorageSync('isLoggedIn');
			
			
			// 如果已登录且有用户信息
			if (isLoggedIn && userInfo) {
				this.isLoggedIn = true;
				this.userInfo = userInfo;
				this.nickname = userInfo.nickname || userInfo.username;
				
				// 处理头像URL，确保包含正确的端口号
				let avatarUrl = userInfo.avatar || 'https://via.placeholder.com/150';
				this.avatarUrl = this.processImageUrl(avatarUrl);
				
				// 处理背景图片URL，确保包含正确的端口号
				let backgroundUrl = userInfo.background_image || 'https://via.placeholder.com/750x450/f33e54/ffffff?text=Background';
				this.backgroundUrl = this.processImageUrl(backgroundUrl);
				
			} else {
				// 未登录状态，使用默认值
				this.isLoggedIn = false;
				this.userInfo = null;
				this.nickname = '未登录';
				this.avatarUrl = 'https://via.placeholder.com/150';
				this.backgroundUrl = 'https://via.placeholder.com/750x450/f33e54/ffffff?text=Background';
			}
		},
		
		/**
		 * 处理登录按钮点击
		 * 跳转到登录页面
		 */
		handleLogin() {
			uni.navigateTo({
				url: '/pages/auth/login',
				fail: (err) => {
					uni.showToast({
						title: '页面跳转失败，请稍后重试',
						icon: 'none'
					});
				}
			});
		},
		
		/**
		 * 处理注册按钮点击
		 * 跳转到注册页面
		 */
		handleRegister() {
			uni.navigateTo({
				url: '/pages/auth/login?mode=register',
				fail: (err) => {
					uni.showToast({
						title: '页面跳转失败，请稍后重试',
						icon: 'none'
					});
				}
			});
		},

		/**
		 * 处理编辑按钮点击（已废弃，保留用于兼容）
		 */
		handleEdit() {
			uni.showToast({
				title: '编辑资料功能开发中',
				icon: 'none'
			});
		},
		
		/**
		 * 跳转到编辑资料页面
		 */
		goToPersonalInfo() {
			// 未登录时提示先登录
			if (!this.isLoggedIn) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				});
				return;
			}
			
			// 跳转到编辑资料页面
			uni.navigateTo({
				url: '/pages/user/personal-info',
				fail: (err) => {
					uni.showToast({
						title: '页面跳转失败，请稍后重试',
						icon: 'none'
					});
				}
			});
		},
		
		/**
		 * 更换头像
		 * 选择图片并上传到服务器
		 */
		changeAvatar() {
			// 未登录时提示先登录
			if (!this.isLoggedIn) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				});
				return;
			}
			
			// 选择图片
			uni.chooseImage({
				count: 1, // 只能选择一张图片
				sizeType: ['compressed'], // 压缩图片
				sourceType: ['album', 'camera'], // 从相册或相机选择
				success: async (res) => {
					const tempFilePath = res.tempFilePaths[0];
					await this.uploadImage(tempFilePath, 'avatar'); // 上传图片
				}
			});
		},
		
		/**
		 * 更换背景图片
		 * 选择图片并上传到服务器
		 */
		changeBackground() {
			// 未登录时提示先登录
			if (!this.isLoggedIn) {
				uni.showToast({
					title: '请先登录',
					icon: 'none'
				});
				return;
			}
			
			// 选择图片
			uni.chooseImage({
				count: 1, // 只能选择一张图片
				sizeType: ['compressed'], // 压缩图片
				sourceType: ['album', 'camera'], // 从相册或相机选择
				success: async (res) => {
					const tempFilePath = res.tempFilePaths[0];
					await this.uploadImage(tempFilePath, 'background'); // 上传图片
				}
			});
		},
		
		/**
		 * 上传图片到服务器
		 * @param {string} filePath - 图片临时路径
		 * @param {string} type - 图片类型（avatar/background）
		 */
		async uploadImage(filePath, type) {
			uni.showLoading({
				title: '上传中...'
			});
			
			try {
				
				// 上传图片到服务器
				const uploadRes = await uni.uploadFile({
					url: this.apiBase + 'upload.php',
					filePath: filePath,
					name: 'file'
				});
				
				
				// 处理响应
				if (!uploadRes.data) {
					uni.hideLoading();
					uni.showToast({
						title: '上传失败，服务器未返回数据',
						icon: 'none'
					});
					return;
				}
				
				// 解析响应数据
				let data;
				try {
					data = JSON.parse(uploadRes.data);
				} catch (e) {
					uni.hideLoading();
					uni.showToast({
						title: '服务器返回数据格式错误',
						icon: 'none'
					});
					return;
				}
				
				
				// 上传成功
				if (data.code === 200) {
					let imageUrl = data.data.url;
					
					// 确保图片URL包含正确的端口号
					imageUrl = this.processImageUrl(imageUrl);
					
					// 更新头像或背景
					if (type === 'avatar') {
						this.avatarUrl = imageUrl;
						await this.updateUserInfo({ avatar: imageUrl }); // 更新用户信息
					} else if (type === 'background') {
						this.backgroundUrl = imageUrl;
						await this.updateUserInfo({ background_image: imageUrl }); // 更新用户信息
					}
					
					// 上传成功提示
					uni.hideLoading();
					uni.showToast({
						title: '上传成功',
						icon: 'success'
					});
				} else {
					// 上传失败提示
					uni.hideLoading();
					uni.showToast({
						title: data.message || '上传失败',
						icon: 'none'
					});
				}
			} catch (error) {
				// 捕获上传错误
				uni.hideLoading();
				uni.showToast({
					title: '上传失败，请检查网络连接',
					icon: 'none'
				});
			}
		},
		
		/**
		 * 更新用户信息到服务器
		 * @param {Object} data - 要更新的用户信息字段
		 */
		async updateUserInfo(data) {
			try {
				
				// 发送请求更新用户信息
				const res = await uni.request({
					url: this.apiBase + 'update_user.php',
					method: 'POST',
					data: data,
					header: {
						'Content-Type': 'application/json'
					}
				});
				
				
				// 处理更新成功
				if (res.statusCode === 200) {
					const updatedUserInfo = { ...this.userInfo, ...data };
					this.userInfo = updatedUserInfo;
					uni.setStorageSync('userInfo', updatedUserInfo); // 更新本地存储
					
					// 更新视图
					if (data.avatar) {
						this.avatarUrl = data.avatar;
					}
					if (data.background_image) {
						this.backgroundUrl = data.background_image;
					}
					
					// 强制更新组件
					this.$forceUpdate();
				} else {
				}
			} catch (error) {
			}
		},

		/**
		 * 处理菜单点击
		 * 根据菜单类型跳转到对应页面
		 * @param {string} type - 菜单类型
		 */
		handleMenuClick(type) {
			// 菜单页面映射
			const pageMap = {
				personalInfo: '/pages/user/personal-info', // 个人信息

feedback: '/pages/user/my-feedback', // 问题反馈
				aboutUs: '/pages/info/about-us', // 关于
				systemSettings: '/pages/info/system-settings', // 系统设置
			};
			
			// 获取页面URL并跳转
			const url = pageMap[type];
			if (url) {
				uni.navigateTo({
					url: url,
					fail: (err) => {
						uni.showToast({
							title: '页面跳转失败，请稍后重试',
							icon: 'none'
						});
					}
				});
			}
		}
	}
};
</script>

<style lang="scss" scoped>
	.content {
		padding: 0;
		background-color: #ffffff;
		min-height: 100vh;
	}

	.status-bar {
		width: 100%;
	}

	.background-banner {
		width: 100%;
		height: 450upx;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		position: relative;
	}

	.banner-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.1) 100%);
	}

	.settings-icon {
		position: absolute;
		top: 20px;
		right: 20px;
		width: 40px;
		height: 40px;
		background-color: rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 10;
	}

	.settings-text {
		font-size: 20px;
	}

	.user-card {
		background-color: #ffffff;
		border-radius: 20upx;
		padding: 40upx 30upx;
		display: flex;
		flex-direction: row;
		align-items: center;
		box-shadow: 0 4upx 20upx rgba(0, 0, 0, 0.08);
		margin: -80upx 30upx 20upx 30upx;
		position: relative;
		z-index: 2;
	}

	.avatar-wrapper {
		margin-right: 30upx;
	}

	.avatar {
		width: 120upx;
		height: 120upx;
		border-radius: 50%;
		border: 4upx solid #ffffff;
		box-shadow: 0 4upx 12upx rgba(0, 0, 0, 0.15);
	}

	.user-info {
		flex: 1;
		margin-right: 20upx;
	}

	.nickname {
		font-size: 36upx;
		font-weight: bold;
		color: #303132;
		display: block;
		margin-bottom: 15upx;
	}

	.button-group {
		display: flex;
		gap: 20upx;
	}

	.btn {
		padding: 0 30upx;
		height: 70upx;
		line-height: 70upx;
		border-radius: 16upx;
		font-size: 28upx;
		font-weight: 500;
		border: none;
		margin: 0;
	}

	.btn-login {
		background: #3071f6;
		color: #ffffff;
	}

	.btn-register {
		background: #ffffff;
		color: #3071f6;
		border: 2upx solid #3071f6;
	}

	.edit-btn {
		padding: 0 30upx;
		height: 70upx;
		line-height: 70upx;
		border-radius: 16upx;
		border: 2upx solid #3071f6;
		background: #ffffff;
	}

	.edit-text {
		font-size: 28upx;
		color: #3071f6;
		font-weight: 500;
	}

	.menu-list {
		background-color: #ffffff;
		border-radius: 20upx;
		overflow: hidden;
		box-shadow: 0 4upx 20upx rgba(0, 0, 0, 0.08);
	}

	.menu-item {
		display: flex;
		align-items: center;
		padding: 25upx 30upx;
		border-bottom: 1upx solid #f0f0f0;
		position: relative;
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.admin-entry {
		background: #3071f6;
	}

	.admin-entry .menu-text {
		color: #ffffff;
		font-weight: 600;
	}

	.admin-entry .menu-arrow {
		color: rgba(255, 255, 255, 0.8);
	}

	.menu-text {
		flex: 1;
		font-size: 30upx;
		color: #303132;
	}

	.menu-arrow {
		font-size: 40upx;
		color: #909398;
		font-weight: 300;
	}
</style>
