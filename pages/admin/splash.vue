<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack"><image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image></view>
			<text class="nav-title">启动页管理</text>
			<view class="nav-placeholder"></view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<!-- 预览 -->
			<view class="section-title">预览</view>
			<view class="preview-box" :style="{ background: form.bg_color || '#ffffff' }">
				<image v-if="form.image_url" class="preview-bg" :src="form.image_url" mode="aspectFill"></image>
				<image v-if="form.logo_url" class="preview-logo" :src="form.logo_url" mode="aspectFit"></image>
				<text v-else class="preview-logo-text">LOGO</text>
				<text class="preview-title">{{ form.title || 'Simple' }}</text>
				<text class="preview-sub">{{ form.subtitle || '加载中..' }}</text>
			</view>

			<!-- 配置表单 -->
			<view class="section-title">启动页配置</view>
			<view class="form-card">
				<view class="form-item">
					<text class="form-label">启用</text>
					<switch :checked="form.enabled == 1" color="#3071f6" @change="e => form.enabled = e.detail.value ? 1 : 0" />
					<text class="form-tip">{{ form.enabled == 1 ? '已启用' : '已停用' }}</text>
				</view>
				<view class="form-item">
					<text class="form-label">应用名称</text>
					<input class="form-input" v-model="form.title" placeholder="Simple" />
				</view>
				<view class="form-item">
					<text class="form-label">底部文字</text>
					<input class="form-input" v-model="form.subtitle" placeholder="加载中.." />
				</view>
				<view class="form-item">
					<text class="form-label">Logo</text>
					<view class="upload-row">
						<input class="form-input" v-model="form.logo_url" placeholder="https://... 或上传" />
						<view class="upload-btn" @click="chooseUpload('logo')">上传</view>
					</view>
				</view>
				<view class="form-item">
					<text class="form-label">启动图</text>
					<view class="upload-row">
						<input class="form-input" v-model="form.image_url" placeholder="全屏启动图 URL（App 端启动后调用）" />
						<view class="upload-btn" @click="chooseUpload('bg')">上传</view>
					</view>
				</view>
				<view class="form-item">
					<text class="form-label">延迟(ms)</text>
					<input class="form-input" v-model="form.delay_ms" type="number" placeholder="300" />
				</view>
				<view class="form-item">
					<text class="form-label">背景色</text>
					<view class="color-row">
						<view class="color-dot" v-for="c in presetColors" :key="c" :style="{ background: c }" :class="{ active: form.bg_color === c }" @click="form.bg_color = c"></view>
						<input class="color-input" v-model="form.bg_color" placeholder="#ffffff" />
					</view>
				</view>
				<button class="btn btn-primary" style="margin-top:24upx" :disabled="saving" @click="handleSave">保存配置</button>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			saving: false,
			presetColors: ['#ffffff', '#1b44a6', '#0ea5e9', '#f5f6fa', '#000000'],
			form: { enabled: 1, title: 'Simple', subtitle: '加载中..', logo_url: '', image_url: '', delay_ms: 300, bg_color: '#ffffff' },
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.load();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		async load() {
			try {
				const r = await adminApi.getSplashConfig();
				if (r.code === 200 && r.data) {
					Object.assign(this.form, r.data);
					if (!this.form.delay_ms) this.form.delay_ms = 300;
				}
			} catch (e) {}
		},
		chooseUpload(kind) {
			uni.chooseImage({
				count: 1,
				success: (res) => {
					const filePath = res.tempFilePaths[0];
					if (!filePath) return;
					uni.showLoading({ title: '上传中...' });
					const token = uni.getStorageSync('adminToken') || uni.getStorageSync('token') || '';
					const uid = uni.getStorageSync('userId') || '';
					uni.uploadFile({
						url: adminApi.baseUrl + 'upload_image.php?admin_token=' + encodeURIComponent(token) + '&admin_uid=' + uid,
						filePath: filePath,
						name: 'image',
						formData: { title: kind === 'bg' ? 'splash-bg' : 'splash', author: 'admin' },
						success: (up) => {
							uni.hideLoading();
							try {
								const d = JSON.parse(up.data);
								if (d.code === 200 && d.data && d.data.url) {
									if (kind === 'bg') this.form.image_url = d.data.url; else this.form.logo_url = d.data.url;
									uni.showToast({ title: '上传成功', icon: 'success' });
								} else {
									uni.showToast({ title: d.message || '上传失败', icon: 'none' });
								}
							} catch (e) { uni.showToast({ title: '上传失败', icon: 'none' }); }
						},
						fail: () => { uni.hideLoading(); uni.showToast({ title: '上传失败', icon: 'none' }); }
					});
				}
			});
		},
		async handleSave() {
			this.saving = true;
			try {
				const payload = { ...this.form, delay_ms: parseInt(this.form.delay_ms) || 300 };
				const r = await adminApi.saveSplashConfig(payload);
				if (r.code === 200) uni.showToast({ title: r.message || '保存成功', icon: 'success' });
				else uni.showToast({ title: r.message || '保存失败', icon: 'none' });
			} catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }); }
			this.saving = false;
		},
	}
};
</script>

<style>
.content { min-height: 100vh; background: #f7f8fa; }
.status-bar { width: 100%; background: #fff; }
.nav-bar { display: flex; align-items: center; height: 88upx; background: #fff; padding: 0 24upx; border-bottom: 1px solid #f0f0f0; }
.nav-back { width: 64upx; height: 64upx; display: flex; align-items: center; }
.back-icon { width: 44upx; height: 44upx; }
.nav-title { flex: 1; text-align: center; font-size: 32upx; font-weight: 600; }
.nav-placeholder { width: 64upx; }
.body { height: calc(100vh - 88upx); }
.section-title { font-size: 26upx; color: #909399; margin: 24upx 24upx 12upx; }
.form-card { background: #fff; margin: 0 24upx; border-radius: 16upx; padding: 8upx 24upx; }
.form-item { display: flex; align-items: center; padding: 14upx 0; border-bottom: 1px solid #f7f8fa; }
.form-item:last-child { border-bottom: none; }
.form-label { width: 160upx; font-size: 26upx; color: #666; flex-shrink: 0; }
.form-input { flex: 1; font-size: 28upx; color: #333; }
.form-tip { font-size: 24upx; color: #999; margin-left: 16upx; }
.upload-row { flex: 1; display: flex; align-items: center; }
.upload-btn { flex-shrink: 0; padding: 10upx 28upx; background: #2f6bf0; color: #fff; font-size: 26upx; border-radius: 10upx; margin-left: 16upx; }
.color-row { flex: 1; display: flex; align-items: center; }
.color-dot { width: 48upx; height: 48upx; border-radius: 50%; margin-right: 16upx; border: 3upx solid transparent; box-sizing: border-box; }
.color-dot.active { border-color: #2f6bf0; }
.color-input { flex: 1; font-size: 26upx; color: #333; }
.btn { height: 84upx; line-height: 84upx; border-radius: 14upx; font-size: 30upx; }
.btn-primary { background: #2f6bf0; color: #fff; }
.btn-primary[disabled] { opacity: 0.6; }
.preview-box { margin: 0 24upx; height: 560upx; border-radius: 16upx; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2upx dashed #ddd; overflow: hidden; position: relative; }
.preview-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.preview-logo { width: 128upx; height: 128upx; border-radius: 28upx; margin-bottom: 24upx; position: relative; }
.preview-logo-text { width: 128upx; height: 128upx; border-radius: 28upx; background: #f0f0f0; color: #bbb; font-size: 24upx; font-weight: 600; display: flex; align-items: center; justify-content: center; margin-bottom: 24upx; position: relative; }
.preview-title { font-size: 36upx; font-weight: 700; color: #1a1a2e; position: relative; }
.preview-sub { font-size: 24upx; color: #ccc; margin-top: 80upx; position: relative; }
</style>
