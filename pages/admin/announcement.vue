<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">公告管理</text>
			<view class="nav-action" @click="openEdit(null)">＋新增</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="notice-item" v-for="n in list" :key="n.id">
				<view class="notice-info" @click="openEdit(n)">
					<text class="notice-title">{{ n.title }}</text>
					<text class="notice-preview">{{ (n.content || '').slice(0, 40) }}</text>
					<text class="notice-meta">{{ (n.created_at || '').slice(0, 16) }}</text>
				</view>
				<view class="notice-actions">
					<text class="del-btn" @click="handleDelete(n)">删除</text>
				</view>
			</view>
			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无公告</view>
		</scroll-view>

		<!-- 编辑弹层 -->
		<view class="mask" v-if="showEdit" @click="showEdit = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">{{ editForm.id ? '编辑公告' : '新增公告' }}</text>
					<text class="sheet-close" @click="showEdit = false">✕</text>
				</view>
				<view class="form-group">
					<text class="form-label">标题</text>
					<input class="form-input" v-model="editForm.title" placeholder="请输入公告标题" />
				</view>
				<view class="form-group">
					<text class="form-label">内容</text>
					<textarea class="form-textarea" v-model="editForm.content" placeholder="请输入公告内容" maxlength="2000" />
				</view>
				<button class="btn-primary" @click="handleSave">保存</button>
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
			showEdit: false,
			editForm: { id: null, title: '', content: '' },
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
			adminApi.getAnnouncements().then(res => {
				if (res.code === 200) this.list = res.data || [];
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		openEdit(n) {
			this.editForm = n ? { id: n.id, title: n.title || '', content: n.content || '' } : { id: null, title: '', content: '' };
			this.showEdit = true;
		},
		handleSave() {
			const f = this.editForm;
			if (!f.title || !f.content) {
				uni.showToast({ title: '标题和内容必填', icon: 'none' });
				return;
			}
			adminApi.saveAnnouncement(f).then(() => {
				uni.showToast({ title: '保存成功', icon: 'success' });
				this.showEdit = false;
				this.loadList();
			}).catch(() => {});
		},
		handleDelete(n) {
			uni.showModal({
				title: '删除公告',
				content: `确定删除「${n.title}」？`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.deleteAnnouncement(n.id).then(() => {
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
.notice-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; display: flex; align-items: center;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.notice-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.notice-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.notice-preview {
	font-size: 13px; color: #666; margin-top: 6px;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.notice-meta { font-size: 12px; color: #bbb; margin-top: 6px; }
.notice-actions { padding-left: 12px; }
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
	height: 120px; background: #f5f6fa; border-radius: 10px; padding: 12px 14px;
	font-size: 14px; width: 100%; box-sizing: border-box;
}
.btn-primary {
	background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-radius: 12px; font-size: 15px; height: 44px; line-height: 44px; margin-top: 20px;
}
</style>
