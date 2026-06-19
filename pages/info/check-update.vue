<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px', backgroundColor: '#ffffff' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">关于我们</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true">
			<!-- 检查更新状态 -->
			<view class="update-status">
				<!-- 检查中 -->
				<view class="status-row" v-show="status === 'checking'">
					<view class="loading-spinner"></view>
					<text class="status-text">正在检查更新...</text>
				</view>

				<!-- 已是最新 -->
				<view class="status-row" v-show="status === 'latest'">
					<view class="checkmark-circle">
						<text class="checkmark">✓</text>
					</view>
					<text class="status-text success-text">已是最新版本 {{ currentVersion }}</text>
				</view>

				<!-- 有更新 -->
				<view class="status-row" v-show="status === 'available'" @click="showUpdateDetail = !showUpdateDetail">
					<view class="update-badge">
						<text class="badge-text">NEW</text>
					</view>
					<text class="status-text update-text">发现新版本 {{ updateInfo.latestVersion }}</text>
					<text class="status-arrow">{{ showUpdateDetail ? '收起' : '查看' }}</text>
				</view>

				<!-- 更新详情 -->

				<!-- 更新详情 -->
				<view class="update-detail-card" v-if="status === 'available' && showUpdateDetail">
					<view class="version-compare">
						<view class="version-item">
							<text class="version-label">当前版本</text>
							<text class="version-num old">{{ currentVersion }}</text>
						</view>
						<text class="version-arrow-icon">→</text>
						<view class="version-item">
							<text class="version-label">最新版本</text>
							<text class="version-num new">{{ updateInfo.latestVersion }}</text>
						</view>
					</view>
					<text class="update-desc">{{ updateInfo.description || '新版本已准备就绪' }}</text>
					<button class="btn-update" @click.stop="startDownload" v-if="!downloading">
						<text>立即更新</text>
					</button>
					<view class="download-area" v-else>
						<text class="download-text">下载中... {{ downloadProgress }}%</text>
						<view class="progress-track">
							<view class="progress-fill" :style="{ width: downloadProgress + '%' }"></view>
						</view>
						<text class="cancel-link" @click.stop="cancelDownload">取消下载</text>
					</view>
				</view>

				<!-- 检查失败 -->
				<view class="status-row" v-else-if="status === 'error'">
					<view class="error-circle">
						<text class="error-x">✕</text>
					</view>
					<text class="status-text error-text">检查更新失败</text>
				</view>
			</view>

			<!-- 关于我们 -->
			<view class="about-section">
				<view class="app-info-card">
					<view class="app-logo-wrap">
						<image class="app-logo" src="/static/logo.png" mode="aspectFit"></image>
					</view>
					<text class="app-name">Origin</text>
					<text class="app-desc">内容分享 · 发现美好</text>
				</view>

				<view class="info-card">
					<text class="card-title">应用介绍</text>
					<text class="card-text">Origin功能等你发现。</text>
				</view>

				<view class="info-card">
					<text class="card-title">版本信息</text>
					<view class="version-row">
						<text class="row-label">当前版本</text>
						<text class="row-value">{{ currentVersion }}</text>
					</view>
				</view>

				<view class="info-card">
					<text class="card-title">联系我们</text>
					<view class="contact-row">
						<text class="contact-icon"></text>
						<text class="contact-text">chensauce@qq.com</text>
					</view>
					<view class="contact-row">
						<text class="contact-icon"></text>
						<text class="contact-text">微信：ChenSauce</text>
					</view>
				</view>

				<text class="footer-text">Origin v{{ currentVersion }}</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			statusBarHeight: 0,
			status: 'checking',
			showUpdateDetail: false,
			currentVersion: '1.0.0',
			updateInfo: {
				latestVersion: '',
				downloadUrl: '',
				description: ''
			},
			downloading: false,
			downloadProgress: 0,
			downloadTask: null,
			apiBase: 'http://139.196.185.197:7070/doo/server/api/'
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		this.currentVersion = systemInfo.appVersion || '1.0.0';
		this.checkUpdate();
	},
	onUnload() {
		if (this.downloadTask) this.downloadTask.abort();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		async checkUpdate() {
			this.status = 'checking';
			try {
				const res = await uni.request({
					url: this.apiBase + 'check_update.php',
					method: 'POST',
					data: { currentVersion: this.currentVersion },
					header: { 'Content-Type': 'application/json' }
				});
				if (res.statusCode === 200) {
					const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
					if (result?.code === 200 && result.data?.hasUpdate) {
						this.updateInfo = {
							latestVersion: result.data.latestVersion,
							downloadUrl: result.data.downloadUrl,
							description: result.data.description
						};
						this.status = 'available';
					} else {
						this.status = 'latest';
					}
				} else {
					this.status = 'error';
				}
			} catch (e) {
				this.status = 'error';
			}
		},
		startDownload() {
			if (!this.updateInfo.downloadUrl) {
				uni.showToast({ title: '下载地址无效', icon: 'none' });
				return;
			}
			this.downloading = true;
			this.downloadProgress = 0;
			this.downloadTask = uni.downloadFile({
				url: this.updateInfo.downloadUrl,
				success: (res) => {
					if (res.statusCode === 200) {
						this.downloadProgress = 100;
						uni.showToast({ title: '下载完成', icon: 'success' });
						setTimeout(() => {
							this.downloading = false;
							if (typeof plus !== 'undefined') {
								plus.runtime.install(res.tempFilePath, { force: false });
							}
						}, 1500);
					}
				},
				fail: () => {
					this.downloading = false;
					this.downloadProgress = 0;
					uni.showToast({ title: '下载失败', icon: 'none' });
				}
			});
			this.downloadTask.onProgressUpdate((res) => {
				this.downloadProgress = res.progress;
			});
		},
		cancelDownload() {
			if (this.downloadTask) this.downloadTask.abort();
			this.downloading = false;
			this.downloadProgress = 0;
			this.downloadTask = null;
		}
	}
}
</script>

<style>
.content {
	width: 100%;
	height: 100vh;
	background-color: #f8f9fb;
	display: flex;
	flex-direction: column;
}

.status-bar { background-color: #ffffff; width: 100%; }

.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88upx;
	background-color: #ffffff;
	padding: 0 24upx;
	border-bottom: 1px solid #f0f0f0;
}

.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }

.body { flex: 1; }

/* 更新状态栏 */
.update-status { background:#ffffff; margin:24upx 24upx 0; border-radius:16upx; padding:24upx; box-shadow:0 2upx 8upx rgba(0,0,0,0.04); min-height:88upx; display:flex; align-items:center; }

.status-row {
	display: flex;
	align-items: center;
	gap: 16upx;
}

.loading-spinner {
	width: 32upx;
	height: 32upx;
	border: 3upx solid #e5e7eb;
	border-top-color: #3071f6;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
	flex-shrink: 0;
}

@keyframes spin { to { transform: rotate(360deg); } }

.checkmark-circle {
	width: 40upx;
	height: 40upx;
	border-radius: 50%;
	background: #ecfdf5;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.checkmark { font-size: 20upx; color: #10b981; font-weight: 700; }

.error-circle {
	width: 40upx;
	height: 40upx;
	border-radius: 50%;
	background: #fef2f2;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.error-x { font-size: 20upx; color: #ef4444; font-weight: 700; }

.update-badge {
	background: #ef4444;
	border-radius: 8upx;
	padding: 4upx 12upx;
	flex-shrink: 0;
}

.badge-text { font-size: 20upx; color: #ffffff; font-weight: 600; }

.status-text { font-size: 26upx; color: #6b7280; flex: 1; }
.success-text { color: #10b981; font-weight: 500; }
.error-text { color: #ef4444; font-weight: 500; }
.update-text { color: #3071f6; font-weight: 500; }

.status-arrow { font-size: 24upx; color: #9ca3af; }

/* 更新详情 */
.update-detail-card {
	margin-top: 24upx;
	padding-top: 24upx;
	border-top: 1px solid #f3f4f6;
}

.version-compare {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 24upx;
	margin-bottom: 20upx;
}

.version-item { display: flex; flex-direction: column; align-items: center; }
.version-label { font-size: 22upx; color: #9ca3af; margin-bottom: 4upx; }
.version-num { font-size: 30upx; font-weight: 600; }
.version-num.old { color: #909398; text-decoration: line-through; }
.version-num.new { color: #3071f6; }

.version-arrow-icon { font-size: 24upx; color: #c0c4cc; }

.update-desc { display: block; font-size: 24upx; color: #6b7280; line-height: 1.6; margin-bottom: 20upx; text-align: center; }

.btn-update {
	width: 100%;
	height: 80upx;
	line-height: 80upx;
	background: #3071f6;
	color: #ffffff;
	font-size: 28upx;
	font-weight: 600;
	border-radius: 16upx;
	border: none;
}

.btn-update:active { background: #285ed4; }

.download-area { display: flex; flex-direction: column; align-items: center; gap: 12upx; }
.download-text { font-size: 24upx; color: #909398; }
.progress-track { width: 100%; height: 8upx; background: #f0f0f0; border-radius: 4upx; overflow: hidden; }
.progress-fill { height: 100%; background: #3071f6; border-radius: 4upx; transition: width 0.3s ease; }
.cancel-link { font-size: 22upx; color: #9ca3af; text-decoration: underline; }

/* 关于我们 */
.about-section {
	padding: 24upx;
}

.app-info-card {
	background: linear-gradient(135deg, #1b44a6 0%, #3071f6 100%);
	border-radius: 20upx;
	padding: 48upx 32upx;
	text-align: center;
	margin-bottom: 24upx;
	box-shadow: 0 8upx 32upx rgba(48, 113, 246, 0.25);
}

.app-logo-wrap {
	width: 120upx;
	height: 120upx;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 28upx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 0 auto 16upx;
	backdrop-filter: blur(4px);
}

.app-logo {
	width: 72upx;
	height: 72upx;
}

.app-name {
	display: block;
	font-size: 36upx;
	font-weight: 700;
	color: #ffffff;
	margin-bottom: 8upx;
	letter-spacing: 4upx;
}

.app-desc {
	display: block;
	font-size: 24upx;
	color: rgba(255, 255, 255, 0.7);
}

.info-card {
	background: #ffffff;
	border-radius: 16upx;
	padding: 28upx 24upx;
	margin-bottom: 16upx;
	box-shadow: 0 2upx 8upx rgba(0, 0, 0, 0.04);
}

.card-title {
	display: block;
	font-size: 28upx;
	font-weight: 600;
	color: #303132;
	margin-bottom: 16upx;
}

.card-text {
	display: block;
	font-size: 26upx;
	color: #6b7280;
	line-height: 1.7;
}

.version-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.row-label { font-size: 26upx; color: #6b7280; }
.row-value { font-size: 26upx; color: #303132; font-weight: 500; }

.contact-row {
	display: flex;
	align-items: center;
	gap: 12upx;
	margin-bottom: 12upx;
}

.contact-row:last-child { margin-bottom: 0; }

.contact-icon { font-size: 28upx; }
.contact-text { font-size: 26upx; color: #6b7280; }

.footer-text {
	display: block;
	text-align: center;
	font-size: 22upx;
	color: #c0c4cc;
	padding: 24upx 0 40upx;
}

/* 隐藏滚动条 */
::-webkit-scrollbar { width: 0; height: 0; display: none; }
</style>
