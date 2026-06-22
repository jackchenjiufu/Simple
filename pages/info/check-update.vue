<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

		<!-- 深蓝色头部 -->
		<view class="header-section">
			<view class="nav-bar">
				<view class="nav-back" @click="goBack">
					<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
				</view>
				<text class="nav-title">检查更新</text>
				<view class="nav-placeholder"></view>
			</view>
			<view class="header-content">
				<text class="header-title">版本检查</text>
				<text class="header-subtitle">保持应用最新状态</text>
			</view>
			<view class="deco-dot dot-1"></view>
			<view class="deco-dot dot-2"></view>
		</view>

		<scroll-view class="body" scroll-y="true">
			<view class="info-card">
				<text class="card-title">版本信息</text>
				<view class="version-row">
					<text class="row-label">当前版本</text>
					<text class="row-value">{{ currentVersion }}</text>
				</view>
				<button class="btn-check-update" @click="checkUpdate">检查更新</button>
				<!-- 检查中 -->
				<view class="version-row" v-show="status === 'checking'">
					<view class="loading-spinner"></view>
					<text class="status-text status-inline">正在检查更新...</text>
				</view>
				<!-- 已是最新 -->
				<view class="version-row" v-show="status === 'latest'">
					<view class="checkmark-circle">
						<text class="checkmark">✓</text>
					</view>
					<text class="status-text success-text status-inline">已是最新版本</text>
				</view>
				<!-- 有更新 -->
				<view class="version-row" v-show="status === 'available'" @click="showUpdateDetail = !showUpdateDetail" style="cursor:pointer;">
					<view class="update-badge"><text class="badge-text">NEW</text></view>
					<text class="status-text update-text status-inline">发现新版本 {{ updateInfo.latestVersion }}</text>
					<text class="status-arrow">{{ showUpdateDetail ? '收起' : '查看' }}</text>
				</view>
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
					<button class="btn-update" @click.stop="startDownload" v-if="!downloading"><text>立即更新</text></button>
					<view class="download-area" v-else>
						<text class="download-text">下载中... {{ downloadProgress }}%</text>
						<view class="progress-track">
							<view class="progress-fill" :style="{ width: downloadProgress + '%' }"></view>
						</view>
						<text class="cancel-link" @click.stop="cancelDownload">取消下载</text>
					</view>
				</view>
				<!-- 检查失败 -->
				<view class="version-row" v-show="status === 'error'">
					<view class="error-circle">
						<text class="error-x">✕</text>
					</view>
					<text class="status-text error-text status-inline">检查更新失败</text>
				</view>
			</view>

			<view class="info-card">
				<text class="card-title">更新日志</text>
				<view class="log-item" v-for="(item, index) in changelog.slice(0, 5)" :key="index">
					<view class="log-left">
						<text class="log-version">v{{ item.version }}</text>
						<text class="log-desc">{{ item.description || '无说明' }}</text>
					</view>
					<text class="log-date">{{ formatDate(item.created_at) }}</text>
				</view>
				<view class="empty-log" v-if="!changelog || changelog.length === 0">
					<text class="empty-text">暂无更新记录</text>
				</view>
			</view>

			<text class="footer-text">Origin v{{ currentVersion }}</text>
		</scroll-view>
	</view>
</template>

<script>
import apiConfig from '../../utils/api.js';
export default {
	data() {
		return {
			statusBarHeight: 0,
			status: 'checking',
			showUpdateDetail: false,
			currentVersion: '1.0.0',
				changelog: [],
			updateInfo: {
				latestVersion: '',
				downloadUrl: '',
				description: ''
			},
			downloading: false,
			downloadProgress: 0,
			downloadTask: null,
			_progressTimer: null
		}
	},
	onLoad() {
		const systemInfo = uni.getSystemInfoSync();
		this.statusBarHeight = systemInfo.statusBarHeight || 0;
		var apkVer = systemInfo.appVersion || '1.0.0';
		var wgtVer = uni.getStorageSync('wgtVersion') || '';
		this.currentVersion = wgtVer && compareVersion(wgtVer, apkVer) > 0
			? wgtVer : apkVer;
		this.checkUpdate();
	},
	onUnload() {
		if (this.downloadTask) this.downloadTask.abort();
		if (this._progressTimer) clearInterval(this._progressTimer);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		async checkUpdate() {
			this.status = 'checking';
			try {
				var wgtVersion = uni.getStorageSync('wgtVersion') || '';
				var ver = wgtVersion && compareVersion(wgtVersion, this.currentVersion) > 0
					? wgtVersion : this.currentVersion;
				const res = await uni.request({
					url: apiConfig.baseUrl + 'check_update.php',
					method: 'POST',
					data: { currentVersion: ver },
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
					// 更新日志不管有无更新都从后端获取
					if (result?.data?.changelog) {
						this.changelog = result.data.changelog;
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
			var url = this.updateInfo.downloadUrl;
			var latestVersion = this.updateInfo.latestVersion;
			if (typeof plus === 'undefined') return;
			var self = this;
			self.downloadTask = plus.downloader.createDownload(url,
				{ filename: '_downloads/' },
				function(dl, status) {
					if (status === 200) {
						self.downloadProgress = 100;
						uni.showToast({ title: '下载完成，正在安装...', icon: 'none' });
						var filePath = dl.filename;
						setTimeout(function() {
							plus.runtime.install(filePath, { force: false }, function() {
								uni.setStorageSync('wgtVersion', latestVersion);
								uni.hideToast();
								uni.showToast({ title: '更新成功，即将重启', icon: 'none' });
								setTimeout(function() {
									plus.runtime.restart();
								}, 1500);
							}, function(e) {
								uni.showToast({ title: '安装失败: ' + (e.message || ''), icon: 'none' });
								self.downloading = false;
							});
						}, 800);
					} else {
						self.downloading = false;
						uni.showToast({ title: '下载失败(' + status + ')', icon: 'none' });
					}
				}
			);
			self.downloadTask.start();
			self._progressTimer = setInterval(function() {
				if (self.downloadTask) {
					var p = Math.round(self.downloadTask.downloadedSize / self.downloadTask.totalSize * 100);
					self.downloadProgress = isNaN(p) ? 0 : p;
				}
			}, 200);
		},
		cancelDownload() {
			if (this.downloadTask) {
				this.downloadTask.abort();
				this.downloadTask = null;
			}
			if (this._progressTimer) {
				clearInterval(this._progressTimer);
				this._progressTimer = null;
			}
			this.downloading = false;
			this.downloadProgress = 0;
		},
		formatDate(dateStr) {
			if (!dateStr) return '';
			return dateStr.substring(0, 10);
		}
	}
}

function compareVersion(v1, v2) {
	var a1 = v1.split('.').map(Number);
	var a2 = v2.split('.').map(Number);
	for (var i = 0; i < Math.max(a1.length, a2.length); i++) {
		var n1 = a1[i] || 0;
		var n2 = a2[i] || 0;
		if (n1 > n2) return 1;
		if (n1 < n2) return -1;
	}
	return 0;
}
</script>

<style>
.content { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: #ffffff; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #1b44a6; flex-shrink: 0; }

.header-section { position: relative; background: #1b44a6; border-radius: 0 0 48upx 48upx; padding-bottom: 60upx; overflow: hidden; flex-shrink: 0; }
.nav-bar { display: flex; align-items: center; justify-content: space-between; padding: 12upx 24upx 0; position: relative; z-index: 2; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { font-size: 32upx; font-weight: 600; color: #ffffff; letter-spacing: 2upx; }
.nav-placeholder { width: 72upx; }
.header-content { position: relative; z-index: 2; padding: 20upx 40upx 0; text-align: left; padding-left: 48upx; }
.header-title { font-size: 34upx; font-weight: 700; color: #ffffff; display: block; margin-bottom: 8upx; }
.header-subtitle { font-size: 24upx; color: rgba(255,255,255,0.65); display: block; }
.deco-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); z-index: 1; }
.dot-1 { width: 200upx; height: 200upx; top: -60upx; right: -40upx; }
.dot-2 { width: 120upx; height: 120upx; bottom: 20upx; left: -30upx; }

.body { flex: 1; min-height: 0; background: #ffffff; padding: 0 40upx; margin-top: -40upx; box-sizing: border-box; }

.info-card { background: #ffffff; border-radius: 16upx; padding: 28upx 24upx; margin-bottom: 16upx; box-shadow: 0 2upx 12upx rgba(0,0,0,0.06); }
.card-title { display: block; font-size: 28upx; font-weight: 600; color: #303132; margin-bottom: 16upx; }
.version-row { display: flex; align-items: center; padding: 10upx 0; gap: 12upx; }
.row-label { font-size: 26upx; color: #6b7280; }
.row-value { font-size: 26upx; color: #303132; font-weight: 500; }

.btn-check-update { width: 100%; height: 80upx; line-height: 80upx; background: #1b44a6; color: #ffffff; font-size: 28upx; font-weight: 600; border-radius: 16upx; border: none; margin: 12upx 0; text-align: center; }
.btn-check-update:active { background: #3071f6; }

.status-inline { flex: 1; }
.loading-spinner { width: 32upx; height: 32upx; border: 3upx solid #e5e7eb; border-top-color: #3071f6; border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
.checkmark-circle { width: 40upx; height: 40upx; border-radius: 50%; background: #ecfdf5; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.checkmark { font-size: 20upx; color: #10b981; font-weight: 700; }
.error-circle { width: 40upx; height: 40upx; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.error-x { font-size: 20upx; color: #ef4444; font-weight: 700; }
.update-badge { background: #ef4444; border-radius: 8upx; padding: 4upx 12upx; flex-shrink: 0; }
.badge-text { font-size: 20upx; color: #ffffff; font-weight: 600; }
.status-text { font-size: 26upx; color: #6b7280; flex: 1; }
.success-text { color: #10b981; font-weight: 500; }
.error-text { color: #ef4444; font-weight: 500; }
.update-text { color: #3071f6; font-weight: 500; }
.status-arrow { font-size: 24upx; color: #9ca3af; }

.update-detail-card { margin-top: 16upx; padding-top: 16upx; border-top: 1px solid #f3f4f6; }
.version-compare { display: flex; align-items: center; justify-content: center; gap: 24upx; margin-bottom: 20upx; }
.version-item { display: flex; flex-direction: column; align-items: center; }
.version-label { font-size: 22upx; color: #9ca3af; margin-bottom: 4upx; }
.version-num { font-size: 30upx; font-weight: 600; }
.version-num.old { color: #909398; text-decoration: line-through; }
.version-num.new { color: #3071f6; }
.version-arrow-icon { font-size: 24upx; color: #c0c4cc; }
.update-desc { display: block; font-size: 24upx; color: #6b7280; line-height: 1.6; margin-bottom: 20upx; text-align: center; }
.btn-update { width: 100%; height: 80upx; line-height: 80upx; background: #3071f6; color: #ffffff; font-size: 28upx; font-weight: 600; border-radius: 16upx; border: none; }
.btn-update:active { background: #285ed4; }
.download-area { display: flex; flex-direction: column; align-items: center; gap: 12upx; }
.download-text { font-size: 24upx; color: #909398; }
.progress-track { width: 100%; height: 8upx; background: #f0f0f0; border-radius: 4upx; overflow: hidden; }
.progress-fill { height: 100%; background: #3071f6; border-radius: 4upx; transition: width 0.3s ease; }
.cancel-link { font-size: 22upx; color: #9ca3af; text-decoration: underline; }

.log-item { display: flex; align-items: center; justify-content: space-between; padding: 14upx 0; border-bottom: 1px solid #f5f5f5; }
.log-left { flex: 1; display: flex; flex-direction: column; gap: 4upx; }
.log-version { font-size: 26upx; font-weight: 600; color: #3071f6; }
.log-desc { font-size: 24upx; color: #6b7280; }
.log-date { font-size: 20upx; color: #c0c4cc; flex-shrink: 0; margin-left: 16upx; }
.empty-log { padding: 24upx 0; text-align: center; }
.empty-text { font-size: 24upx; color: #c0c4cc; }

.footer-text { display: block; text-align: center; font-size: 22upx; color: #c0c4cc; padding: 24upx 0 40upx; }
::-webkit-scrollbar { width: 0; height: 0; display: none; }
</style>
