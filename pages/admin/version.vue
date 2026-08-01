<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">版本管理</text>
			<view class="nav-action" @click="openAdd">＋发布</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="ver-item" v-for="v in list" :key="v.id">
				<view class="ver-info">
					<view class="ver-title-row">
						<text class="ver-version">v{{ v.version }}</text>
						<text class="ver-type" :class="v.type === 'wgt' ? 't-wgt' : 't-apk'">{{ v.type === 'wgt' ? '热更新' : '全量包' }}</text>
					</view>
					<text class="ver-note">{{ v.note || v.description || '' }}</text>
					<text class="ver-meta">{{ (v.created_at || '').slice(0, 16) }} · {{ v.file_size || '' }}</text>
				</view>
				<view class="ver-actions">
					<text class="del-btn" @click="handleDelete(v)">删除</text>
				</view>
			</view>
			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无版本记录</view>
		</scroll-view>

		<!-- 发布版本弹层 -->
		<view class="mask" v-if="showAdd" @click="showAdd = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">发布新版本</text>
					<text class="sheet-close" @click="showAdd = false">✕</text>
				</view>
				<view class="form-group">
					<text class="form-label">版本号</text>
					<input class="form-input" v-model="addForm.version" placeholder="如 1.0.1" />
				</view>
				<view class="form-group">
					<text class="form-label">版本类型</text>
					<view class="type-select">
						<view
							class="type-option"
							:class="{ active: addForm.type === 'wgt' }"
							@click="addForm.type = 'wgt'"
						>热更新 WGT</view>
						<view
							class="type-option"
							:class="{ active: addForm.type === 'apk' }"
							@click="addForm.type = 'apk'"
						>全量 APK</view>
					</view>
				</view>
				<view class="form-group">
					<text class="form-label">更新说明</text>
					<textarea class="form-textarea" v-model="addForm.note" placeholder="本次更新内容" maxlength="500" />
				</view>
				<view class="form-group">
					<text class="form-label">下载地址</text>
					<input class="form-input" v-model="addForm.download_url" placeholder="https://... 或留空" />
				</view>
				<button class="btn-primary" @click="handleAdd">发布版本</button>
			</view>
		</view>
	</view>
</template>

<script>
import adminApi from '../../utils/admin-api.js';

export default {
	data() {
		return {
			statusBarHeight: 0,
			list: [],
			loading: false,
			showAdd: false,
			addForm: { version: '', type: 'wgt', note: '', download_url: '' },
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadList();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		loadList() {
			this.loading = true;
			adminApi.getVersions().then(res => {
				if (res.code === 200) this.list = (res.data || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		openAdd() {
			this.addForm = { version: '', type: 'wgt', note: '', download_url: '' };
			this.showAdd = true;
		},
		handleAdd() {
			const f = this.addForm;
			if (!f.version) {
				uni.showToast({ title: '版本号必填', icon: 'none' });
				return;
			}
			uni.showLoading({ title: '发布中...' });
			// 上传版本走独立接口 upload_version.php（multipart）
			const token = uni.getStorageSync('adminToken') || uni.getStorageSync('token') || '';
			uni.request({
				url: 'http://139.196.185.197:7070/doo/server/api/upload_version.php',
				method: 'POST',
				data: {
					version: f.version,
					type: f.type,
					note: f.note,
					download_url: f.download_url,
					admin_token: token,
				},
				success: (res) => {
					uni.hideLoading();
					if (res.data && res.data.code === 200) {
						uni.showToast({ title: '发布成功', icon: 'success' });
						this.showAdd = false;
						this.loadList();
					} else {
						uni.showToast({ title: res.data?.message || '发布失败', icon: 'none' });
					}
				},
				fail: () => {
					uni.hideLoading();
					uni.showToast({ title: '网络异常', icon: 'none' });
				},
			});
		},
		handleDelete(v) {
			uni.showModal({
				title: '删除版本',
				content: `确定删除 v${v.version}？`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.deleteVersion(v.id).then(() => {
							uni.showToast({ title: '已删除', icon: 'success' });
							this.loadList();
						}).catch(() => {});
					}
				},
			});
		},
	},
};
</script>

<style>
.content { height: 100vh; background: #f5f6fa; display: flex; flex-direction: column; }
.status-bar { width: 100%; background: #fff; }
.nav-bar {
	height: 44px; background: #fff; display: flex; align-items: center;
	justify-content: space-between; padding: 0 12px; border-bottom: 1px solid #f0f0f0;
}
.nav-back { width: 36px; height: 36px; display: flex; align-items: center; }
.back-icon { width: 20px; height: 20px; }
.nav-title { font-size: 17px; font-weight: 600; color: #1a1a2e; }
.nav-action { font-size: 14px; color: #3071f6; padding: 4px 8px; }

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.ver-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; display: flex; align-items: center;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.ver-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ver-title-row { display: flex; align-items: center; gap: 8px; }
.ver-version { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.ver-type { font-size: 11px; padding: 2px 8px; border-radius: 8px; }
.t-wgt { background: #eef4ff; color: #3071f6; }
.t-apk { background: #fff3e8; color: #ff7d00; }
.ver-note {
	font-size: 13px; color: #666; margin-top: 6px;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ver-meta { font-size: 12px; color: #bbb; margin-top: 6px; }
.ver-actions { padding-left: 12px; }
.del-btn { color: #e64340; font-size: 13px; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }

.mask {
	position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999;
	display: flex; align-items: flex-end;
}
.sheet {
	width: 100%; background: #fff; border-radius: 16px 16px 0 0; padding: 20px 16px 30px;
	box-sizing: border-box; max-height: 75vh; overflow-y: auto;
}
.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.sheet-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
.sheet-close { font-size: 16px; color: #999; padding: 4px; }
.form-group { margin-bottom: 14px; }
.form-label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.form-input {
	height: 42px; background: #f5f6fa; border-radius: 10px; padding: 0 14px; font-size: 14px;
}
.form-textarea {
	height: 100px; background: #f5f6fa; border-radius: 10px; padding: 12px 14px;
	font-size: 14px; width: 100%; box-sizing: border-box;
}
.type-select { display: flex; gap: 10px; }
.type-option {
	flex: 1; text-align: center; padding: 10px 0; border-radius: 10px;
	background: #f5f6fa; color: #666; font-size: 14px;
}
.type-option.active { background: #3071f6; color: #fff; }
.btn-primary {
	background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-radius: 12px; font-size: 15px; height: 44px; line-height: 44px; margin-top: 20px;
}
</style>
