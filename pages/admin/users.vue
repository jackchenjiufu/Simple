<template>
	<view class="content">
		<view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
		<view class="nav-bar">
			<view class="nav-back" @click="goBack">
				<image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
			</view>
			<text class="nav-title">用户管理</text>
			<view class="nav-action" @click="showCreate = true">＋新增</view>
		</view>

		<!-- 搜索栏 -->
		<view class="search-bar">
			<input
				class="search-input"
				v-model="keyword"
				placeholder="搜索用户名 / 昵称"
				placeholder-class="placeholder-style"
				confirm-type="search"
				@confirm="searchUsers"
			/>
			<text class="search-btn" @click="searchUsers">搜索</text>
		</view>

		<scroll-view class="body" scroll-y="true" show-scrollbar="false" @scrolltolower="loadMore">
			<view class="user-item" v-for="u in users" :key="u.id" @click="openDetail(u)">
				<view class="user-avatar">{{ (u.nickname || u.username || '?').charAt(0) }}</view>
				<view class="user-info">
					<text class="user-name">{{ u.nickname || u.username }}</text>
					<text class="user-meta">ID: {{ u.id }} · {{ u.created_at ? u.created_at.slice(0, 10) : '' }}</text>
				</view>
				<view class="user-role" :class="u.role === 'admin' ? 'role-admin' : 'role-user'">
					{{ u.role === 'admin' ? '管理员' : '用户' }}
				</view>
				<view class="user-status st-ban" v-if="u.status == 1">封禁</view>
				<view class="user-status st-mute" v-else-if="u.status == 2">禁言</view>
			</view>

			<view class="loading-tip" v-if="loading">加载中...</view>
			<view class="loading-tip" v-if="!loading && !users.length">暂无用户</view>
		</scroll-view>

		<!-- 用户详情弹层 -->
		<view class="mask" v-if="detail" @click="detail = null">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">用户详情</text>
					<text class="sheet-close" @click="detail = null">✕</text>
				</view>
				<view class="detail-row"><text class="dl">用户名</text><text class="dv">{{ detail.username }}</text></view>
				<view class="detail-row"><text class="dl">昵称</text><text class="dv">{{ detail.nickname || '-' }}</text></view>
				<view class="detail-row"><text class="dl">角色</text><text class="dv">{{ roleName(detail.role) }}</text></view>
				<view class="detail-row"><text class="dl">状态</text><text class="dv" :style="detail.status == 1 ? 'color:#ef4444' : detail.status == 2 ? 'color:#f59e0b' : ''">{{ detail.status == 1 ? '已封禁' : detail.status == 2 ? '已禁言' : '正常' }}</text></view>
				<view class="detail-row" v-if="detail.status == 1"><text class="dl">解封时间</text><text class="dv">{{ detail.ban_expire ? detail.ban_expire.replace('T', ' ') : '永久' }}</text></view>
				<view class="detail-row" v-if="detail.status == 2"><text class="dl">禁言到期</text><text class="dv">{{ detail.mute_expire ? detail.mute_expire.replace('T', ' ') : '永久' }}</text></view>
				<view class="detail-row"><text class="dl">注册时间</text><text class="dv">{{ detail.created_at }}</text></view>
				<view class="sheet-actions">
					<button class="btn-warn" v-if="detail.status != 1" @click="handleBan(detail)">封禁</button>
					<button class="btn-warn" v-if="detail.status == 1" @click="handleUnban(detail)">解封</button>
					<button class="btn-warn" v-if="detail.status != 2" @click="handleMute(detail)">禁言</button>
					<button class="btn-warn" v-if="detail.status == 2" @click="handleUnmute(detail)">解除禁言</button>
					<button class="btn-role" @click="openRoleAssign(detail)">权限管理</button>
					<button class="btn-danger" @click="handleDelete(detail)">删除用户</button>
				</view>
			</view>
		</view>

		<!-- 角色分配弹层 -->
		<view class="mask" v-if="showRoleAssign" @click="showRoleAssign = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">分配角色 · {{ roleUser.username }}</text>
					<text class="sheet-close" @click="showRoleAssign = false">✕</text>
				</view>
				<view class="role-list">
					<view class="role-opt" v-for="r in roleOptions" :key="r.id" @click="assignRole(r)">
						<text class="role-opt-name">{{ r.name }}</text>
						<text class="role-opt-desc">{{ r.description || '' }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 新增用户弹层 -->
		<view class="mask" v-if="showCreate" @click="showCreate = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">新增用户</text>
					<text class="sheet-close" @click="showCreate = false">✕</text>
				</view>
				<view class="form-group">
					<text class="form-label">用户名</text>
					<input class="form-input" v-model="createForm.username" placeholder="请输入用户名" />
				</view>
				<view class="form-group">
					<text class="form-label">密码</text>
					<input class="form-input" v-model="createForm.password" placeholder="请输入密码" />
				</view>
				<view class="form-group">
					<text class="form-label">昵称</text>
					<input class="form-input" v-model="createForm.nickname" placeholder="请输入昵称" />
				</view>
				<button class="btn-primary" @click="handleCreate">创建用户</button>
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
			users: [],
			page: 1,
			limit: 20,
			total: 0,
			loading: false,
			keyword: '',
			detail: null,
			showCreate: false,
			createForm: { username: '', password: '', nickname: '' },
			showRoleAssign: false,
			roleUser: null,
			roleOptions: [],
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadUsers(true);
	},
	methods: {
		goBack() { uni.navigateBack(); },
		roleName(role) {
			const map = { super_admin: '超级管理员', admin: '管理员', editor: '编辑', user: '普通用户' };
			return map[role] || role || '普通用户';
		},
		searchUsers() { this.loadUsers(true); },
		loadUsers(reset) {
			if (this.loading) return;
			if (reset) { this.page = 1; this.users = []; }
			this.loading = true;
			adminApi.getUsers(this.page, this.limit).then(res => {
				if (res.code === 200) {
					const list = res.data || [];
					this.users = reset ? list : this.users.concat(list);
					this.total = res.total || 0;
					if (list.length >= this.limit) this.page++;
				}
			}).catch(() => {}).finally(() => { this.loading = false; });
		},
		loadMore() {
			if (this.users.length < this.total) this.loadUsers(false);
		},
		openDetail(u) { this.detail = u; },
		// 封禁/禁言带时长选择
		showDurationPicker(u, type) {
			const isBan = type === 'ban';
			const items = ['1天', '3天', '7天', '30天', '永久'];
			uni.showActionSheet({
				title: isBan ? `封禁用户「${u.username}」` : `禁言用户「${u.username}」`,
				itemList: items,
				success: (res) => {
					const days = [1, 3, 7, 30, -1][res.tapIndex]; // -1 = 永久
					this.applyStatus(u, isBan ? 1 : 2, days, isBan ? 'ban_expire' : 'mute_expire', isBan ? '封禁' : '禁言');
				},
			});
		},
		applyStatus(u, status, days, expireField, tip) {
			const data = { status };
			if (days === -1) {
				// 永久：expire = null
				data[expireField] = null;
			} else {
				// 计算过期时间
				const expire = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
				const pad = (n) => (n < 10 ? '0' + n : '' + n);
				data[expireField] = `${expire.getFullYear()}-${pad(expire.getMonth()+1)}-${pad(expire.getDate())} ${pad(expire.getHours())}:${pad(expire.getMinutes())}:${pad(expire.getSeconds())}`;
			}
			adminApi.updateUser(u.id, data).then(() => {
				uni.showToast({ title: `${tip}成功`, icon: 'success' });
				this.detail = null;
				this.loadUsers(true);
			}).catch(() => {});
		},
		setUserStatus(u, status, tip) {
			uni.showModal({
				title: tip,
				content: `确定${tip}用户「${u.username}」？`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.updateUser(u.id, { status }).then(() => {
							uni.showToast({ title: `${tip}成功`, icon: 'success' });
							this.detail = null;
							this.loadUsers(true);
						}).catch(() => {});
					}
				},
			});
		},
		handleBan(u) { this.showDurationPicker(u, 'ban'); },
		handleUnban(u) { this.setUserStatus(u, 0, '解封'); },
		handleMute(u) { this.showDurationPicker(u, 'mute'); },
		handleUnmute(u) { this.setUserStatus(u, 0, '解除禁言'); },
		openRoleAssign(u) {
			this.roleUser = u;
			this.showRoleAssign = true;
			adminApi.getRoles().then(res => {
				if (res.code === 200) this.roleOptions = res.data || [];
			}).catch(() => {});
		},
		assignRole(r) {
			uni.showLoading({ title: '分配中...' });
			adminApi.assignUserRole(this.roleUser.id, r.id).then(() => {
				uni.hideLoading();
				uni.showToast({ title: '已分配 ' + r.name, icon: 'success' });
				this.showRoleAssign = false;
			}).catch(() => { uni.hideLoading(); });
		},
		handleDelete(u) {
			uni.showModal({
				title: '删除用户',
				content: `确定删除用户「${u.username}」？此操作不可恢复。`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						adminApi.deleteUser(u.id).then(() => {
							uni.showToast({ title: '已删除', icon: 'success' });
							this.detail = null;
							this.loadUsers(true);
						}).catch(() => {});
					}
				},
			});
		},
		handleCreate() {
			const f = this.createForm;
			if (!f.username || !f.password) {
				uni.showToast({ title: '用户名和密码不能为空', icon: 'none' });
				return;
			}
			adminApi.createUser(f).then(() => {
				uni.showToast({ title: '创建成功', icon: 'success' });
				this.showCreate = false;
				this.createForm = { username: '', password: '', nickname: '' };
				this.loadUsers(true);
			}).catch(() => {});
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

.search-bar {
	display: flex; align-items: center; padding: 12px 16px; background: #fff;
	border-bottom: 1px solid #f0f0f0;
}
.search-input {
	flex: 1; height: 36px; background: #f5f6fa; border-radius: 18px;
	padding: 0 16px; font-size: 14px;
}
.search-btn { color: #3071f6; font-size: 14px; margin-left: 12px; }

.body { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; box-sizing: border-box; }
.user-item {
	background: #fff; border-radius: 12px; padding: 14px;
	display: flex; align-items: center; margin-bottom: 10px;
	box-shadow: 0 1px 6px rgba(0,0,0,0.04);
}
.user-avatar {
	width: 42px; height: 42px; border-radius: 50%; background: #eef4ff;
	color: #3071f6; display: flex; align-items: center; justify-content: center;
	font-size: 17px; font-weight: 600; flex-shrink: 0;
}
.user-info { flex: 1; margin-left: 12px; display: flex; flex-direction: column; }
.user-name { font-size: 15px; font-weight: 500; color: #333; }
.user-meta { font-size: 12px; color: #bbb; margin-top: 4px; }
.user-role {
	font-size: 11px; padding: 3px 10px; border-radius: 10px; flex-shrink: 0;
}
.role-admin { background: #fff3e8; color: #ff7d00; }
.role-user { background: #eef4ff; color: #3071f6; }
.user-status { font-size: 11px; padding: 3px 10px; border-radius: 10px; flex-shrink: 0; margin-left: 6px; }
.user-status.st-ban { background: #fdecec; color: #ef4444; }
.user-status.st-mute { background: #fef3e2; color: #f59e0b; }
.loading-tip { text-align: center; color: #bbb; font-size: 13px; padding: 20px 0; }

/* 弹层 */
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
.detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
.dl { width: 80px; color: #909399; font-size: 14px; }
.dv { flex: 1; color: #333; font-size: 14px; }
.sheet-actions { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 10px; }
.role-list { max-height: 50vh; overflow-y: auto; }
.role-opt {
	display: flex; align-items: center; justify-content: space-between;
	padding: 14px 8px; border-bottom: 1px solid #f5f5f5;
}
.role-opt:last-child { border-bottom: none; }
.role-opt-name { font-size: 15px; font-weight: 500; color: #1a1a2e; }
.role-opt-desc { font-size: 12px; color: #999; }
.sheet-actions button { flex: 1; min-width: 100px; margin: 0; }
.btn-role {
	background: #fff; color: #3071f6; border: 1px solid #3071f6; border-radius: 12px;
	font-size: 14px; height: 44px; line-height: 44px;
}
.btn-warn {
	background: #fff; color: #f59e0b; border: 1px solid #f59e0b; border-radius: 12px;
	font-size: 14px; height: 44px; line-height: 44px;
}
.btn-danger {
	background: #fff; color: #e64340; border: 1px solid #e64340; border-radius: 12px;
	font-size: 15px; height: 44px; line-height: 44px;
}
.btn-primary {
	background: linear-gradient(135deg, #1b44a6, #3071f6); color: #fff;
	border-radius: 12px; font-size: 15px; height: 44px; line-height: 44px; margin-top: 20px;
}
.form-group { margin-bottom: 14px; }
.form-label { font-size: 13px; color: #666; display: block; margin-bottom: 6px; }
.form-input {
	height: 42px; background: #f5f6fa; border-radius: 10px; padding: 0 14px; font-size: 14px;
}
</style>
