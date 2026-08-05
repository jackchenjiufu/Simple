<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">权限管理</text>
			<view class="nav-new" @click="openCreate">新建角色</view>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" style="height: calc(100vh - 88px);">
			<!-- 角色列表（点击进入权限分配） -->
			<view class="section-title">角色列表</view>
			<view class="panel">
				<view class="role-item" v-for="r in roles" :key="r.id" @click="openRole(r)">
					<view class="role-avatar" :class="'ra-' + (r.id % 4 + 1)">{{ (r.name || '?').charAt(0) }}</view>
					<view class="role-info">
						<text class="role-name">{{ roleDisplayName(r) }}</text>
						<text class="role-desc">{{ r.description || '暂无描述' }}</text>
					</view>
					<view class="role-count">{{ (r.permissions || []).length }} 项权限</view>
				</view>
				<view class="empty-tip" v-if="!roles.length">暂无角色</view>
			</view>

			<!-- 全部权限总览 -->
			<view class="section-title">权限总览（{{ permissions.length }} 项）</view>
			<view class="panel">
				<view class="perm-item" v-for="p in permissions" :key="p.id">
					<view class="perm-icon">🔑</view>
					<view class="perm-info">
						<text class="perm-name">{{ p.name }}</text>
						<text class="perm-desc">{{ p.description || '' }}</text>
					</view>
				</view>
				<view class="empty-tip" v-if="!permissions.length">暂无权限</view>
			</view>
		</scroll-view>

		<!-- 角色权限分配弹层 -->
		<view class="mask" v-if="showAssign" @click="showAssign = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">分配权限 · {{ currentRole.name }}</text>
					<text class="sheet-close" @click="showAssign = false">✕</text>
				</view>
				<scroll-view class="assign-body" scroll-y="true" show-scrollbar="false">
					<view class="assign-item" v-for="p in permissions" :key="p.id" @click="togglePerm(p.id)">
						<view class="perm-check" :class="{ checked: assignedPerms.includes(p.id) }">
							<text v-if="assignedPerms.includes(p.id)">✓</text>
						</view>
						<view class="perm-info">
							<text class="perm-name">{{ p.name }}</text>
							<text class="perm-desc">{{ p.description || '' }}</text>
						</view>
					</view>
				</scroll-view>
				<view class="sheet-actions">
					<button class="btn-save" @click="saveAssign">保存分配</button>
				</view>
			</view>
		</view>

		<!-- 新建角色弹层 -->
		<view class="mask" v-if="showCreate" @click="closeCreate">
			<view class="sheet sheet-sm" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">新建角色</text>
					<text class="sheet-close" @click="closeCreate">✕</text>
				</view>
				<view class="form-item">
					<text class="form-label">角色名</text>
					<input class="form-input" v-model="createForm.name" placeholder="例如：editor" />
				</view>
				<view class="form-item">
					<text class="form-label">描述</text>
					<input class="form-input" v-model="createForm.description" placeholder="角色说明（可选）" />
				</view>
				<view class="sheet-actions">
					<button class="btn-save" @click="createRole">创建</button>
				</view>
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
			roles: [],
			permissions: [],
			showAssign: false,
			currentRole: null,
			assignedPerms: [],
			showCreate: false,
			createForm: { name: '', description: '' },
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadData();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		// 角色显示名：display_name 仅取字符串，避免渲染 [object Object]
		roleDisplayName(r) {
			const dn = r && r.display_name;
			return (typeof dn === 'string' && dn) ? dn : String((r && r.name) || '');
		},
		loadData() {
			adminApi.getRoles().then(res => {
				if (res.code === 200) this.roles = res.data || [];
			}).catch(() => {});
			adminApi.getPermissions().then(res => {
				if (res.code === 200) this.permissions = res.data || [];
			}).catch(() => {});
		},
		openRole(r) {
			this.currentRole = r;
			this.assignedPerms = (r.permissions || []).map(p => p.id);
			this.showAssign = true;
		},
		togglePerm(id) {
			const idx = this.assignedPerms.indexOf(id);
			if (idx >= 0) this.assignedPerms.splice(idx, 1);
			else this.assignedPerms.push(id);
		},
		openCreate() {
			this.createForm = { name: '', description: '' };
			this.showCreate = true;
		},
		closeCreate() {
			this.showCreate = false;
		},
		createRole() {
			if (!this.createForm.name.trim()) {
				uni.showToast({ title: '请输入角色名', icon: 'none' });
				return;
			}
			uni.showLoading({ title: '创建中...' });
			adminApi.createRole({
				role_name: this.createForm.name.trim(),
				description: this.createForm.description || ''
			}).then(res => {
				uni.hideLoading();
				if (res.code === 200) {
					uni.showToast({ title: '创建成功', icon: 'success' });
					this.showCreate = false;
					this.loadData();
				} else {
					uni.showToast({ title: res.message || '创建失败', icon: 'none' });
				}
			}).catch(e => {
				uni.hideLoading();
				uni.showToast({ title: (e && e.message) || '创建失败', icon: 'none' });
			});
		},
		saveAssign() {
			uni.showLoading({ title: '保存中...' });
			adminApi.updateRole(this.currentRole.id, {
				description: this.currentRole.description,
				permissions: this.assignedPerms
			}).then(() => {
				uni.hideLoading();
				uni.showToast({ title: '保存成功', icon: 'success' });
				this.showAssign = false;
				this.loadData();
			}).catch(() => { uni.hideLoading(); });
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
.nav-new { font-size: 14px; font-weight: 600; color: #3071f6; padding: 6px 8px; }
.body { flex: 1; min-height: 0; overflow: hidden; padding: 16px; box-sizing: border-box; }

.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 20px 0 12px; }
.panel {
	background: #fff; border-radius: 12px; padding: 4px 16px;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.role-item {
	display: flex; align-items: center; padding: 16px 0; border-bottom: 1px solid #f5f5f5;
}
.role-item:last-child { border-bottom: none; }
.role-avatar {
	width: 40px; height: 40px; border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	color: #fff; font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.ra-1 { background: linear-gradient(135deg, #ef4444, #f97316); }
.ra-2 { background: linear-gradient(135deg, #3071f6, #7c5cfc); }
.ra-3 { background: linear-gradient(135deg, #00a862, #10b981); }
.ra-4 { background: linear-gradient(135deg, #ff7d00, #f59e0b); }
.role-info { flex: 1; margin-left: 12px; min-width: 0; }
.role-name { font-size: 15px; font-weight: 600; color: #1a1a2e; display: block; }
.role-desc { font-size: 12px; color: #999; margin-top: 4px; display: block; }
.role-count { font-size: 12px; color: #3071f6; background: #eef4ff; padding: 4px 10px; border-radius: 10px; flex-shrink: 0; }

.perm-item {
	display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f5f5f5;
}
.perm-item:last-child { border-bottom: none; }
.perm-icon { font-size: 16px; margin-right: 10px; flex-shrink: 0; }
.perm-info { flex: 1; min-width: 0; }
.perm-name { font-size: 13px; font-weight: 500; color: #1a1a2e; display: block; }
.perm-desc { font-size: 12px; color: #999; margin-top: 2px; display: block; }
.empty-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }

.mask {
	position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999;
	display: flex; align-items: flex-end;
}
.sheet {
	width: 100%; background: #fff; border-radius: 16px 16px 0 0;
	padding: 20px 16px 30px; box-sizing: border-box; height: 75vh;
	display: flex; flex-direction: column;
}
.sheet-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sheet-title { font-size: 16px; font-weight: 600; color: #1a1a2e; flex: 1; }
.sheet-close { font-size: 16px; color: #999; padding: 4px; }
.sheet-sm { height: auto; }
.form-item { margin-bottom: 16px; }
.form-label { font-size: 13px; color: #666; margin-bottom: 8px; display: block; }
.form-input {
	width: 100%; height: 44px; line-height: 44px; background: #f5f6fa;
	border-radius: 10px; padding: 0 14px; box-sizing: border-box; font-size: 14px;
}
.assign-body { flex: 1; min-height: 0; }
.assign-item {
	display: flex; align-items: center; padding: 12px 4px; border-bottom: 1px solid #f5f5f5;
}
.perm-check {
	width: 22px; height: 22px; border-radius: 6px; border: 2px solid #ddd;
	margin-right: 12px; display: flex; align-items: center; justify-content: center;
	font-size: 14px; color: #fff; flex-shrink: 0; transition: all 0.2s;
}
.perm-check.checked { background: #3071f6; border-color: #3071f6; }
.sheet-actions { margin-top: 16px; }
.btn-save {
	width: 100%; height: 44px; line-height: 44px;
	background: linear-gradient(135deg, #1b44a6, #3071f6);
	color: #fff; font-size: 15px; font-weight: 600;
	border-radius: 12px; border: none;
}
</style>
