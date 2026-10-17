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
				<view class="user-role" :class="'role-' + (u.role || 'user')" :style="roleBadgeStyle(u.role)">
					{{ roleName(u.role) }}
				</view>
				<view class="user-level" v-if="u.level > 0">Lv.{{ u.level }}</view>
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
				<view class="detail-row" @click="openLevelPicker">
					<text class="dl">等级</text>
					<text class="dv" style="color:#3071f6">{{ detail.level > 0 ? 'Lv.' + detail.level : '自动' }}{{ detail.article_count !== undefined ? '（' + detail.article_count + ' 篇）' : '' }} ›</text>
				</view>
				<view class="detail-row"><text class="dl">状态</text><text class="dv" :style="detail.status == 1 ? 'color:#ef4444' : detail.status == 2 ? 'color:#f59e0b' : ''">{{ detail.status == 1 ? '已封禁' : detail.status == 2 ? '已禁言' : '正常' }}</text></view>
				<view class="detail-row" v-if="detail.status == 1"><text class="dl">解封时间</text><text class="dv">{{ detail.ban_expire ? detail.ban_expire.replace('T', ' ') : '永久' }}</text></view>
				<view class="detail-row" v-if="detail.status == 2"><text class="dl">禁言到期</text><text class="dv">{{ detail.mute_expire ? detail.mute_expire.replace('T', ' ') : '永久' }}</text></view>
				<view class="detail-row"><text class="dl">注册时间</text><text class="dv">{{ detail.created_at }}</text></view>
				<view class="sheet-actions">
					<button class="btn-edit" @click="openEdit(detail)">编辑</button>
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
						<text class="role-opt-name">{{ roleDisplayName(r) }}</text>
						<text class="role-opt-desc">{{ r.description || '' }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 编辑用户弹层 -->
		<view class="mask" v-if="showEdit" @click="showEdit = false">
			<view class="sheet" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">编辑用户 · {{ editForm.username }}</text>
					<text class="sheet-close" @click="showEdit = false">✕</text>
				</view>
				<view class="form-group">
					<text class="form-label">昵称</text>
					<input class="form-input" v-model="editForm.nickname" placeholder="请输入昵称" />
				</view>
				<view class="form-group">
					<text class="form-label">密码</text>
					<input class="form-input" v-model="editForm.password" placeholder="留空则不修改密码" />
				</view>
				<view class="form-group">
					<text class="form-label">角色</text>
					<view class="role-picker" @click="chooseEditRole">
						<text>{{ roleName(editForm.role) }}</text>
						<text class="picker-arrow">▾</text>
					</view>
				</view>
				<button class="btn-primary" @click="handleEditSave">保存修改</button>
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
				<view class="form-group">
					<text class="form-label">角色</text>
					<view class="role-picker" @click="chooseCreateRole">
						<text>{{ roleName(createForm.role) }}</text>
						<text class="picker-arrow">▾</text>
					</view>
				</view>
				<button class="btn-primary" @click="handleCreate">创建用户</button>
			</view>
		</view>
		<!-- 角色选择弹层（自定义，避免 showActionSheet 被遮挡） -->
		<view class="mask" v-if="showRolePicker" @click="showRolePicker = false">
			<view class="sheet sheet-sm" @click.stop>
				<view class="sheet-header">
					<text class="sheet-title">选择角色</text>
					<text class="sheet-close" @click="showRolePicker = false">✕</text>
				</view>
				<scroll-view class="role-list" scroll-y="true" style="max-height:400px">
					<view
						class="role-opt"
						v-for="r in rolePickerOptions"
						:key="r.name"
						:class="{ active: pickerCurrent === r.name }"
						@click="pickRole(r)"
					>
						<text class="role-opt-name">{{ r.label }}</text>
						<text class="role-opt-check" v-if="pickerCurrent === r.name">✓</text>
					</view>
				</scroll-view>
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
			showEdit: false,
			editForm: { id: 0, username: '', nickname: '', password: '', role: 'user' },
			showCreate: false,
			createForm: { username: '', password: '', nickname: '', role: 'user' },
			showRoleAssign: false,
			roleUser: null,
			roleOptions: [],
			showRolePicker: false,
			rolePickerOptions: [],
			pickerCurrent: '',
			pickerMode: 'edit',
		};
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 0;
		this.loadUsers(true);
		this.loadRoles();
	},
	methods: {
		goBack() { uni.navigateBack(); },
		// 加载真实角色列表（含后台新建的角色）
		loadRoles() {
			adminApi.getRoles().then(res => {
				if (res.code === 200 && Array.isArray(res.data)) {
					this.roleOptions = res.data;
				}
			}).catch(() => {});
		},
		roleName(role) {
			// 兜底：role 可能是对象（{id, name, display_name}），提取字符串再匹配
			if (role && typeof role === 'object') {
				const dn = this.roleDisplayName(role);
				if (dn) return dn;
				role = role.name || role.id || '';
			}
			const map = { super_admin: '超级管理员', admin: '管理员', editor: '编辑', user: '普通用户' };
			if (map[role]) return map[role];
			// 动态角色：从角色列表找显示名（中文优先）
			const found = (this.roleOptions || []).find(r => String(r.name) === role);
			return found ? this.roleDisplayName(found) : (role || '普通用户');
		},
		// 角色显示名：display_name 仅取字符串，避免渲染 [object Object]
		roleDisplayName(r) {
			const dn = r && r.display_name;
			return (typeof dn === 'string' && dn) ? dn : String((r && r.name) || '');
		},
		// 角色徽章颜色：内置角色走 CSS 类；自定义角色（如运营）用 roles 表 badge_color 动态行内样式
		roleBadgeStyle(role) {
			if (['super_admin', 'admin', 'editor', 'user'].indexOf(role) !== -1) return null;
			const found = (this.roleOptions || []).find(r => String(r.name) === role);
			if (found && found.badge_color) {
				return { color: found.badge_color, background: found.badge_color + '1a' };
			}
			return null;
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
		// 归一化 role：后端可能返回字符串（'editor'/'运营'）或对象 {id,name,display_name}
		normRole(r) {
			if (!r) return 'user';
			if (typeof r === 'object') return String(r.name || r.id || 'user');
			return String(r);
		},
		// 角色选择通用：用真实角色列表（含后台新建的角色），显示中文名
		roleOptionsList() {
			const opts = this.roleOptions.length ? this.roleOptions
				: [{ name: 'super_admin', display_name: '超级管理员' }, { name: 'admin', display_name: '管理员' }, { name: 'editor', display_name: '编辑' }, { name: 'user', display_name: '普通用户' }];
			return opts.map(r => {
				const name = String(r.name || '');
				// display_name 仅取字符串类型，其他类型回退角色名
				const dn = r.display_name;
				const label = (typeof dn === 'string' && dn) ? dn : name;
				return { name: name, label: label };
			});
		},
		// 自定义角色选择弹层（替代 showActionSheet，避免在弹层内被遮挡）
		chooseCreateRole() {
			this.rolePickerOptions = this.roleOptionsList();
			this.pickerCurrent = this.createForm.role;
			this.pickerMode = 'create';
			this.showRolePicker = true;
		},
		openEdit(u) {
			this.editForm = { id: u.id, username: u.username, nickname: u.nickname || '', password: '', role: this.normRole(u.role) };
			this.showEdit = true;
		},
		chooseEditRole() {
			this.rolePickerOptions = this.roleOptionsList();
			this.pickerCurrent = this.editForm.role;
			this.pickerMode = 'edit';
			this.showRolePicker = true;
		},
		pickRole(r) {
			if (this.pickerMode === 'create') {
				this.createForm.role = r.name;
			} else {
				this.editForm.role = r.name;
			}
			this.showRolePicker = false;
		},
		handleEditSave() {
			if (!this.editForm.nickname) {
				uni.showToast({ title: '昵称不能为空', icon: 'none' });
				return;
			}
			const data = { id: this.editForm.id, nickname: this.editForm.nickname, role: this.editForm.role };
			if (this.editForm.password) data.password = this.editForm.password;
			adminApi.updateUser(this.editForm.id, data).then(() => {
				uni.showToast({ title: '已保存', icon: 'success' });
				this.showEdit = false;
				this.detail = null;
				this.loadUsers(true);
			}).catch(() => {});
		},
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
		handleUnban(u) {
			uni.showModal({
				title: '解封',
				content: `确定解封用户「${u.username}」？`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						// 同步清空到期时间，避免旧值残留导致封禁判断异常
						adminApi.updateUser(u.id, { status: 0, ban_expire: null }).then(() => {
							uni.showToast({ title: '解封成功', icon: 'success' });
							this.detail = null;
							this.loadUsers(true);
						}).catch(() => {});
					}
				},
			});
		},
		handleMute(u) { this.showDurationPicker(u, 'mute'); },
		handleUnmute(u) {
			uni.showModal({
				title: '解除禁言',
				content: `确定解除用户「${u.username}」的禁言？`,
				confirmColor: '#e64340',
				success: (r) => {
					if (r.confirm) {
						// 同步清空到期时间（评论端按 mute_expire 拦截，必须一并清掉）
						adminApi.updateUser(u.id, { status: 0, mute_expire: null }).then(() => {
							uni.showToast({ title: '解除成功', icon: 'success' });
							this.detail = null;
							this.loadUsers(true);
						}).catch(() => {});
					}
				},
			});
		},
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
		// 等级选择：0=自动，1-10=手动指定
		openLevelPicker() {
			const items = ['自动（按发文数）', 'Lv.1', 'Lv.2', 'Lv.3', 'Lv.4', 'Lv.5', 'Lv.6', 'Lv.7', 'Lv.8', 'Lv.9', 'Lv.10'];
			uni.showActionSheet({
				itemList: items,
				success: (res) => {
					const lv = res.tapIndex;
					uni.showLoading({ title: '保存中...' });
					adminApi.updateUser(this.detail.id, { level: lv }).then(() => {
						uni.hideLoading();
						uni.showToast({ title: lv > 0 ? `已设置 Lv.${lv}` : '已恢复自动等级', icon: 'success' });
						this.detail.level = lv;
						this.loadUsers(true);
					}).catch(() => { uni.hideLoading(); uni.showToast({ title: '设置失败', icon: 'none' }); });
				}
			});
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
				this.createForm = { username: '', password: '', nickname: '', role: 'user' };
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
.role-super_admin { background: #faf0d7; color: #1b44a6; }
.role-admin { background: #fee2e2; color: #dc2626; }
.role-editor { background: #e8f7ef; color: #16a34a; }
.role-运营 { background: #fdeee6; color: #e8590c; }
.user-level {
	font-size: 11px; padding: 3px 10px; border-radius: 10px; flex-shrink: 0;
	background: #f3f0ff; color: #7c5cfc; margin-left: 6px;
}
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
.role-opt.active { background: #eef4ff; }
.role-opt-name { font-size: 15px; font-weight: 500; color: #1a1a2e; }
.role-opt-check { font-size: 16px; color: #3071f6; font-weight: 600; }
.role-opt-desc { font-size: 12px; color: #999; }
.sheet-sm { padding-bottom: 24px; }
.sheet-actions button { flex: 1; min-width: 100px; margin: 0; }
.btn-role {
	background: #fff; color: #3071f6; border: 1px solid #3071f6; border-radius: 12px;
	font-size: 14px; height: 44px; line-height: 44px;
}
.btn-edit {
	background: #fff; color: #16a34a; border: 1px solid #16a34a; border-radius: 12px;
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
.role-picker {
	height: 42px; background: #f5f6fa; border-radius: 10px; padding: 0 14px; font-size: 14px;
	display: flex; align-items: center; justify-content: space-between; color: #333;
}
.picker-arrow { color: #bbb; font-size: 12px; }
</style>
