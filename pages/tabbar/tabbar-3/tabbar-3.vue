<template>
	<view class="content">
		<!-- 状态栏占位 -->
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		
		<!-- 导航栏 -->
		<view class="nav-bar">
			<text class="nav-title">发布</text>
		</view>
		
		<!-- 发布类型切换 -->
		<view class="publish-type-switch">
			<view 
				class="switch-item" 
				:class="{ active: publishType === 'image' }"
				@click="publishType = 'image'"
			>
				<text>图片</text>
			</view>
			<view 
				class="switch-item" 
				:class="{ active: publishType === 'article' }"
				@click="publishType = 'article'"
			>
				<text>文章</text>
			</view>
		</view>
		
		<!-- 上传区域 -->
		<view class="upload-section" v-if="publishType === 'image'">
			<view class="upload-button" @click="chooseImage" :disabled="uploading">
				<image class="upload-icon" src="../../../static/img/release.png" mode="aspectFit"></image>
				<text class="upload-text">选择图片</text>
			</view>
			<view class="upload-tip" v-if="selectedImages.length === 0 && !uploading">
				<text>点击上方按钮选择图片上传，最多可选择9张</text>
			</view>
			
			<!-- 上传进度 -->
			<view class="progress-section" v-if="uploading">
				<view class="progress-bar">
					<view class="progress-fill" :style="{ width: uploadProgress + '%' }"></view>
				</view>
				<text class="progress-text">上传中... {{ uploadProgress }}%</text>
			</view>
			
			<!-- 图片预览 -->
			<view class="preview-section" v-if="selectedImages.length > 0 && !uploading">
				<view class="preview-grid">
					<view 
						class="preview-item" 
						v-for="(image, index) in selectedImages" 
						:key="index"
					>
						<image class="preview-image" :src="image" mode="aspectFit"></image>
						<text class="delete-button" @click="selectedImages.splice(index, 1)">×</text>
					</view>
				</view>
				<view class="edit-actions">
					<text class="action-button" @click="chooseImage">重新选择</text>
					<text class="action-button delete" @click="selectedImages = []">清空全部</text>
				</view>
				<view class="image-count">
					<text>已选择 {{ selectedImages.length }} 张图片</text>
				</view>
			</view>
		</view>
		
		<!-- 标签输入 -->
		<view class="tags-section" v-if="(publishType === 'image' && selectedImages.length > 0 && !uploading) || (publishType === 'article' && !uploading)">
			<text class="section-title">添加标签</text>
			<input 
				class="tag-input" 
				v-model="tagInput" 
				placeholder="输入标签后按回车添加"
				@confirm="addTag"
			/>
			<view class="tags-container">
				<view 
					class="tag-item" 
					v-for="(tag, index) in tags" 
					:key="index"
				>
					<text class="tag-text">{{ tag }}</text>
					<text class="tag-remove" @click="removeTag(index)">×</text>
				</view>
			</view>
		</view>
		
		<!-- 图片标题 -->
		<view class="title-section" v-if="publishType === 'image' && selectedImages.length > 0 && !uploading">
			<text class="section-title">图片标题</text>
			<input 
				class="title-input" 
				v-model="imageTitle" 
				placeholder="为图片添加标题"
			/>
		</view>
		
		<!-- 文章发布表单 -->
		<view class="article-section" v-if="publishType === 'article' && !uploading">
			<!-- 文章标题 -->
			<view class="title-section">
				<text class="section-title">文章标题</text>
				<input 
					class="title-input" 
					v-model="articleTitle" 
					placeholder="请输入文章标题"
				/>
			</view>
			
			<!-- 文章内容 -->
			<view class="content-section">
				<text class="section-title">文章内容</text>
				<textarea 
					class="content-input" 
					v-model="articleContent" 
					placeholder="请输入文章内容"
					rows="10"
				></textarea>
			</view>
		</view>
		
		<!-- 发布按钮 -->
		<view class="publish-section" v-if="!uploading">
			<button 
				class="publish-button" 
				@click="publishContent" 
				:disabled="publishType === 'image' ? !imageTitle || selectedImages.length === 0 : !articleTitle || !articleContent"
			>
				{{ publishType === 'image' ? `发布图片 (${selectedImages.length}张)` : '发布文章' }}
			</button>
		</view>
		

	</view>
</template> 

<script>
import imageLazy from '../../../components/image-lazy/image-lazy.vue';

export default {
	components: {
		imageLazy
	},
	data() {
			return {
				statusBarHeight: 0,
				publishType: 'image', // 默认发布类型为图片
				selectedImages: [],
				imageTitle: '',
				articleTitle: '', // 文章标题
				articleContent: '', // 文章内容
				tagInput: '',
				tags: [],
				uploading: false,
				uploadProgress: 0,
				userInfo: null,
				isLoggedIn: false,
				username: '当前用户'
			};
		},
	onLoad() {
		// 获取状态栏高度
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		// 加载用户信息，获取真实的用户名
		this.loadUserInfo();
	},
	methods: {
		// 加载用户信息
		loadUserInfo() {
			const userInfo = uni.getStorageSync('userInfo');
			const isLoggedIn = uni.getStorageSync('isLoggedIn');
			
			if (isLoggedIn && userInfo) {
				this.isLoggedIn = true;
				this.userInfo = userInfo;
				this.username = userInfo.nickname || userInfo.username || '当前用户';
			} else {
				this.isLoggedIn = false;
				this.userInfo = null;
				this.username = '当前用户';
			}
		},
		// 选择图片
		chooseImage() {
			uni.chooseImage({
				count: 9,
				sizeType: ['original', 'compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					this.selectedImages = res.tempFilePaths;
				},
				fail: (err) => {
					uni.showToast({
						title: '选择图片失败',
						icon: 'none'
					});
				}
			});
		},
		
		// 添加标签
		addTag() {
			const tag = this.tagInput.trim();
			if (tag && !this.tags.includes(tag)) {
				this.tags.push(tag);
				this.tagInput = '';
			}
		},
		
		// 移除标签
		removeTag(index) {
			this.tags.splice(index, 1);
		},
		
		// 发布内容
		publishContent() {
			if (this.publishType === 'image') {
				this.publishImage();
			} else if (this.publishType === 'article') {
				this.publishArticle();
			}
		},
		
		// 发布图片
		publishImage() {
			if (this.selectedImages.length === 0 || !this.imageTitle) {
				uni.showToast({
					title: '请选择图片并输入标题',
					icon: 'none'
				});
				return;
			}
			
			this.uploading = true;
			this.uploadProgress = 0;
			const totalImages = this.selectedImages.length;
			let uploadedImages = 0;
			let failedImages = 0;
			
			// 批量上传图片
			this.selectedImages.forEach((imagePath, index) => {
				uni.uploadFile({
					url: 'http://139.196.185.197:7070/doo/server/api/upload_image.php',
					filePath: imagePath,
					name: 'image',
					formData: {
						title: `${this.imageTitle} (${index + 1})`,
						author: this.username,
						tags: this.tags.join(','),
						category: 'photography',
						user_id: this.userInfo?.id || 1
					},
					onProgressUpdate: (progress) => {
						// 计算整体上传进度
						const currentProgress = Math.round((uploadedImages * 100 + progress.progress) / totalImages);
						this.uploadProgress = Math.min(currentProgress, 100);
					},
					success: (res) => {
						try {
							const result = JSON.parse(res.data);
							if (result.code === 200) {
								// 上传成功
								uploadedImages++;
							} else {
								failedImages++;
							}
						} catch (error) {
							failedImages++;
						}
						
						// 检查是否所有图片都已上传完成
						if (uploadedImages + failedImages === totalImages) {
							this.uploading = false;
							this.uploadProgress = 0;
							
							// 显示上传结果
							if (uploadedImages > 0) {
								// 重置表单
								this.selectedImages = [];
								this.imageTitle = '';
								this.tags = [];
								this.tagInput = '';
								
								// 显示成功提示
								uni.showToast({
									title: `成功上传 ${uploadedImages} 张图片`,
									icon: 'success'
								});
							} else {
								// 显示失败提示
								uni.showToast({
									title: '上传失败，请重试',
									icon: 'none'
								});
							}
						}
					},
					fail: (err) => {
						failedImages++;
						
						// 检查是否所有图片都已上传完成
						if (uploadedImages + failedImages === totalImages) {
							this.uploading = false;
							this.uploadProgress = 0;
							
							// 显示上传结果
							if (uploadedImages > 0) {
								// 重置表单
								this.selectedImages = [];
								this.imageTitle = '';
								this.tags = [];
								this.tagInput = '';
								
								// 显示成功提示
								uni.showToast({
									title: `成功上传 ${uploadedImages} 张图片`,
									icon: 'success'
								});
							} else {
								// 显示失败提示
								uni.showToast({
									title: '上传失败，请重试',
									icon: 'none'
								});
							}
						}
					}
				});
			});
		},
		
		// 发布文章
		publishArticle() {
			if (!this.articleTitle || !this.articleContent) {
				uni.showToast({
					title: '请输入文章标题和内容',
					icon: 'none'
				});
				return;
			}
			
			this.uploading = true;
			
			// 发布文章
			uni.request({
				url: 'http://139.196.185.197:7070/doo/server/api/upload_article.php',
				method: 'POST',
				header: {
					'Content-Type': 'application/json'
				},
				data: {
					title: this.articleTitle,
					content: this.articleContent,
					author: this.username,
					tags: this.tags.join(','),
					category: 'article',
					user_id: this.userInfo?.id || 1
				},
				success: (res) => {
					try {
						const result = res.data;
						if (result.code === 200) {
							// 发布成功
							
							// 重置表单
							this.articleTitle = '';
							this.articleContent = '';
							this.tags = [];
							this.tagInput = '';
							
							// 显示成功提示
							uni.showToast({
								title: '文章发布成功',
								icon: 'success'
							});
						} else {
							// 显示失败提示
							uni.showToast({
								title: '发布失败，请重试',
								icon: 'none'
							});
						}
					} catch (error) {
						// 显示失败提示
						uni.showToast({
							title: '发布失败，请重试',
							icon: 'none'
						});
					}
					
					// 无论成功失败，都重置上传状态
					this.uploading = false;
				},
				fail: (err) => {
					// 显示失败提示
					uni.showToast({
						title: '网络错误，请检查连接',
						icon: 'none'
					});
					// 重置上传状态
					this.uploading = false;
				}
			});
		},
		

	}
};
</script>

<style lang="scss" scoped>
.content {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100vh;
	background-color: var(--bg-color);
}

/* 状态栏占位样式 */
.status-bar {
	background-color: var(--bg-color);
	width: 100%;
}

/* 导航栏样式 */
.nav-bar {
	display: flex;
	align-items: center;
	height: 44px;
	background-color: var(--bg-color);
	padding: 0 var(--spacing-lg);
	border-bottom: 1px solid var(--border-color);
	z-index: 10;
	.nav-title {
		font-size: var(--font-lg);
		font-weight: 600;
		color: var(--text-primary);
		flex: 1;
		text-align: center;
	}
}

/* 发布类型切换样式 */
.publish-type-switch {
	display: flex;
	background-color: var(--bg-light);
	margin: var(--spacing-lg);
	border-radius: var(--radius-md);
	overflow: hidden;
	.switch-item {
		flex: 1;
		padding: var(--spacing-md);
		text-align: center;
		cursor: pointer;
		transition: all var(--transition-normal);
		text {
			font-size: var(--font-md);
			color: var(--text-secondary);
		}
		&.active {
			background-color: var(--primary-color);
			text {
				color: white;
				font-weight: 600;
			}
		}
	}
}

/* 文章内容输入区域样式 */
.content-section {
	padding: var(--spacing-lg);
	border-bottom: 1px solid var(--border-color);
	.section-title {
		font-size: var(--font-md);
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: var(--spacing-md);
		display: block;
	}
	.content-input {
		width: 100%;
		min-height: 200px;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: var(--spacing-md);
		font-size: var(--font-base);
		background-color: var(--bg-light);
		resize: vertical;
	}
}

/* 上传区域样式 */
.upload-section {
	padding: var(--spacing-xl);
	background-color: var(--bg-color);
	border-bottom: 1px solid var(--border-color);
	.upload-button {
		width: 100%;
		height: 120px;
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background-color: var(--bg-light);
		cursor: pointer;
		transition: all var(--transition-normal);
		&:hover:not(:disabled) {
			border-color: var(--primary-color);
			background-color: rgba(64, 158, 255, 0.05);
		}
		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
		.upload-icon {
			width: 40px;
			height: 40px;
			margin-bottom: var(--spacing-sm);
		}
		.upload-text {
			font-size: var(--font-md);
			color: var(--text-secondary);
		}
	}
	.upload-tip {
		margin-top: var(--spacing-md);
		text-align: center;
		text {
			font-size: var(--font-sm);
			color: var(--text-tertiary);
		}
	}
	
	/* 上传进度样式 */
	.progress-section {
		margin-top: var(--spacing-md);
		.progress-bar {
			width: 100%;
			height: 8px;
			background-color: var(--bg-light);
			border-radius: var(--radius-sm);
			overflow: hidden;
			.progress-fill {
				height: 100%;
				background-color: var(--primary-color);
				border-radius: var(--radius-sm);
				transition: width var(--transition-fast);
			}
		}
		.progress-text {
			margin-top: var(--spacing-sm);
			text-align: center;
			font-size: var(--font-sm);
			color: var(--text-secondary);
		}
	}
	
	/* 预览区域样式 */
	.preview-section {
		margin-top: var(--spacing-md);
		
		/* 图片预览网格 */
		.preview-grid {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: var(--spacing-sm);
			
			.preview-item {
				position: relative;
				width: 100%;
				height: 100px;
				border-radius: var(--radius-md);
				overflow: hidden;
				background-color: var(--bg-light);
				
				.preview-image {
					width: 100%;
					height: 100%;
					object-fit: cover;
				}
				
				.delete-button {
					position: absolute;
					top: 4px;
					right: 4px;
					width: 24px;
					height: 24px;
					background-color: rgba(0, 0, 0, 0.6);
					color: white;
					border-radius: 50%;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: var(--font-lg);
					cursor: pointer;
					transition: all var(--transition-fast);
					&:hover {
						background-color: var(--danger-color);
					}
				}
			}
		}
		
		/* 操作按钮 */
		.edit-actions {
			display: flex;
			justify-content: flex-end;
			margin-top: var(--spacing-sm);
			gap: var(--spacing-md);
			.action-button {
				font-size: var(--font-sm);
				color: var(--primary-color);
				cursor: pointer;
				&.delete {
					color: var(--danger-color);
				}
			}
		}
		
		/* 图片计数 */
		.image-count {
			margin-top: var(--spacing-sm);
			text-align: right;
			text {
				font-size: var(--font-sm);
				color: var(--text-tertiary);
			}
		}
	}
}

/* 标签输入区域样式 */
.tags-section {
	padding: var(--spacing-lg);
	border-bottom: 1px solid var(--border-color);
	.section-title {
		font-size: var(--font-md);
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: var(--spacing-md);
		display: block;
	}
	.tag-input {
		width: 100%;
		height: 40px;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0 var(--spacing-md);
		font-size: var(--font-base);
		background-color: var(--bg-light);
		margin-bottom: var(--spacing-md);
	}
	.tags-container {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-sm);
		.tag-item {
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 4px 12px;
			background-color: var(--bg-light);
			border-radius: var(--radius-sm);
			border: 1px solid var(--border-color);
			.tag-text {
				font-size: var(--font-sm);
				color: var(--text-secondary);
			}
			.tag-remove {
				font-size: var(--font-lg);
				color: var(--text-tertiary);
				cursor: pointer;
				&:hover {
					color: var(--danger-color);
				}
			}
		}
	}
}

/* 标题输入区域样式 */
.title-section {
	padding: var(--spacing-lg);
	border-bottom: 1px solid var(--border-color);
	.section-title {
		font-size: var(--font-md);
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: var(--spacing-md);
		display: block;
	}
	.title-input {
		width: 100%;
		height: 40px;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		padding: 0 var(--spacing-md);
		font-size: var(--font-base);
		background-color: var(--bg-light);
	}
}

/* 发布按钮区域样式 */
.publish-section {
	padding: var(--spacing-lg);
	.publish-button {
		width: 100%;
		height: 44px;
		background-color: var(--primary-color);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: var(--font-md);
		font-weight: 600;
		transition: all var(--transition-normal);
		&:hover:not(:disabled) {
			background-color: var(--primary-dark);
		}
		&:disabled {
			background-color: var(--text-tertiary);
			cursor: not-allowed;
		}
	}
}


</style>
