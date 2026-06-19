<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		
		<view class="settings-container">
			<view class="section">
				<text class="section-title">修改密码</text>
				<view class="form-item">
					<text class="label">原密码</text>
					<input class="input" v-model="oldPassword" type="password" placeholder="请输入原密码" />
				</view>
				<view class="form-item">
					<text class="label">新密码</text>
					<input class="input" v-model="newPassword" type="password" placeholder="请输入新密码" />
				</view>
				<view class="form-item">
					<text class="label">确认密码</text>
					<input class="input" v-model="confirmPassword" type="password" placeholder="请再次输入新密码" />
				</view>
				<button class="btn-primary" @click="handleChangePassword">确认修改</button>
			</view>
			
			<view class="section">
				<text class="section-title">账户操作</text>
				<button class="btn-danger" @click="handleLogout">退出登录</button>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				statusBarHeight: 0,
				userInfo: null,
				oldPassword: '',
				newPassword: '',
				confirmPassword: '',
				apiBase: 'http://139.196.185.197:7070/doo/server/api/'
			}
		},
		onLoad() {
			const systemInfo = uni.getSystemInfoSync();
			this.statusBarHeight = systemInfo.statusBarHeight || 0;
			
			this.loadUserInfo();
		},
		methods: {
			loadUserInfo() {
				const userInfo = uni.getStorageSync('userInfo');
				if (userInfo) {
					this.userInfo = userInfo;
				}
			},
			
			async handleChangePassword() {
				if (!this.oldPassword) {
					uni.showToast({
						title: '请输入原密码',
						icon: 'none'
					});
					return;
				}
				
				if (!this.newPassword) {
					uni.showToast({
						title: '请输入新密码',
						icon: 'none'
					});
					return;
				}
				
				if (this.newPassword !== this.confirmPassword) {
					uni.showToast({
						title: '两次密码不一致',
						icon: 'none'
					});
					return;
				}
				
				if (this.newPassword.length < 6) {
					uni.showToast({
						title: '密码长度不能少于6位',
						icon: 'none'
					});
					return;
				}
				
				uni.showLoading({
					title: '修改中...'
				});
				
				try {
					const res = await uni.request({
						url: this.apiBase + 'change_password.php',
						method: 'POST',
						data: {
							user_id: this.userInfo.id,
							old_password: this.oldPassword,
							new_password: this.newPassword
						},
						header: {
							'Content-Type': 'application/json'
						}
					});
					
					uni.hideLoading();
					
					
					if (res.statusCode === 200) {
						uni.showToast({
							title: '密码修改成功',
							icon: 'success'
						});
						
						this.oldPassword = '';
						this.newPassword = '';
						this.confirmPassword = '';
					} else {
						uni.showToast({
							title: res.data.message || '密码修改失败',
							icon: 'none'
						});
					}
				} catch (error) {
					uni.hideLoading();
					uni.showToast({
						title: '网络错误',
						icon: 'none'
					});
				}
			},
			
			handleLogout() {
				uni.showModal({
					title: '提示',
					content: '确定要退出登录吗？',
					success: (res) => {
						if (res.confirm) {
							uni.removeStorageSync('userInfo');
							uni.removeStorageSync('isLoggedIn');
							
							uni.showToast({
								title: '已退出登录',
								icon: 'success'
							});
							
							setTimeout(() => {
								uni.switchTab({
									url: '/pages/tabbar/tabbar-5/tabbar-5'
								});
							}, 1000);
						}
					}
				});
			}
		}
	}
</script>

<style lang="scss" scoped>
	.content {
		padding: 0;
		background-color: #ffffff;
		min-height: 100vh;
	}

	.status-bar {
		width: 100%;
		background-color: transparent;
	}

	.settings-container {
		padding: 30upx;
	}

	.section {
		background-color: #ffffff;
		border-radius: 20upx;
		padding: 40upx 30upx;
		margin-bottom: 20upx;
		box-shadow: 0 4upx 20upx rgba(0, 0, 0, 0.08);
	}

	.section-title {
		font-size: 36upx;
		font-weight: bold;
		color: #303132;
		display: block;
		margin-bottom: 30upx;
	}

	.form-item {
		margin-bottom: 30upx;
	}

	.label {
		font-size: 28upx;
		color: #909398;
		display: block;
		margin-bottom: 15upx;
	}

	.input {
		width: 100%;
		height: 80upx;
		border: 2upx solid #e0e0e0;
		border-radius: 10upx;
		padding: 0 20upx;
		font-size: 30upx;
		box-sizing: border-box;
	}

	.input:focus {
		border-color: #3071f6;
	}

	.btn-primary {
		width: 100%;
		height: 90upx;
		line-height: 90upx;
		background: #3071f6;
		color: #ffffff;
		border-radius: 16upx;
		font-size: 32upx;
		font-weight: bold;
		border: none;
		margin-top: 20upx;
	}

	.btn-danger {
		width: 100%;
		height: 90upx;
		line-height: 90upx;
		background: #ff4757;
		color: #ffffff;
		border-radius: 16upx;
		font-size: 32upx;
		font-weight: bold;
		border: none;
		margin-top: 20upx;
	}
</style>
