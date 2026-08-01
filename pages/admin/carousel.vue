<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">轮播管理</text>
			<view class="nav-action" @click="openEdit(null)">＋新增</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false">
			<view class="carousel-item" v-for="c in list" :key="c.id">
				<view class="carousel-info">
					<text class="carousel-title">{{ c.title || '(无标题)' }}</text>
					<text class="carousel-meta">排序 {{ c.sort_order }} · {{ c.is_active ? '启用' : '停用' }}</text>
				</view>
				<view class="carousel-actions">
					<text class="edit-btn" @click="openEdit(c)">编辑</text>
					<text class="del-btn" @click="handleDelete(c)">删除</text>
				</view>
			</view>
			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !list.length">暂无轮播图</view>
		</scroll-view>

		<!-- 编辑弹层 -->
		<view class="mask" v-if="showEdit" @click="showEdit = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">{{ editForm.id ? '编辑轮播' : '新增轮播' }}</text>
					<text class="sheet-close" @click="showEdit = false">✕</text>
				</view>
				<view class="form-group">
					<text class="form-label">标题</text>
					<input class="form-input" v-model="editForm.title" placeholder="请输入标题" />
				</view>
				<view class="form-group">
					<text class="form-label">图片 URL</text>
					<input class="form-input" v-model="editForm.image_url" placeholder="https://..." />
				</view>
				<view class="form-group">
					<text class="form-label">作者</text>
					<input class="form-input" v-model="editForm.author" placeholder="请输入作者" />
				</view>
				<view class="form-group">
					<text class="form-label">排序号</text>
					<input class="form-input" v-model="editForm.sort_order" type="number" placeholder="数字，越小越靠前" />
				</view>
				<view class="form-group switch-row">
					<text class="form-label">启用</text>
					<switch :checked="editForm.is_active == 1" color="#3071f6" @change="e => editForm.is_active = e.detail.value ? 1 : 0" />
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
			editForm: { id: null, title: '', image_url: '', author: '', sort_order: 0, is_active: 1 },
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
			adminApi.getCarousels().then(res => {
				if (res.code === 200) this.list = res.data || [];
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		openEdit(c) {
			this.editForm = c ? {
				id: c.id, title: c.title || '', image_url: c.image_url || '',
				author: c.author || '', sort_order: c.sort_order || 0, is_active: c.is_active == null ? 1 : c.is_active,
			} : { id: null, title: '', image_url: '', author: '', sort_order: 0, is_active: 1 };
			this.showEdit = true;
		},
		handleSave() {
			const f = this.editForm;
			if (!f.title || !f.image_url) {
				uni.showToast({ title: '标题和图片URL必填', icon: 'none' });
				return;
			}
			const payload = { title: f.title, image_url: f.image_url, author: f.author || 'admin', sort_order: parseInt(f.sort_order) || 0, is_active: f.is_active };
			const p = f.id ? adminApi.updateCarousel(f.id, payload) : adminApi.saveCarousel(payload);
			p.then(() => {
				uni.showToast({ title: '保存成功', icon: 'success' });
				this.showEdit = false;
				this.loadList();
			}).catch(() => {});
		},
		handleDelete(c) {
			uni.showModal({
				title: '删除轮播',
				content: `确定删除「${c.title || '该轮播'}」？`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.deleteCarousel(c.id).then(() => {
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
.carousel-item {
	background: #fff; border-radius: 12px; padding: 14px;
	margin-bottom: 10px; display: flex; align-items: center;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.carousel-info { flex: 1; display: flex; flex-direction: column; }
.carousel-title { font-size: 15px; font-weight: 600; color: #1a1a2e; }
.carousel-meta { font-size: 12px; color: #bbb; margin-top: 4px; }
.carousel-actions { display: flex; gap: 16px; }
.edit-btn { color: #3071f6; font-size: 13px; }
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
.switch-row { display: flex; align-items: center; justify-content: space-between; }
.btn-primary {
	background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-radius: 12px; font-size: 15px; height: 44px; line-height: 44px; margin-top: 20px;
}
</style>
