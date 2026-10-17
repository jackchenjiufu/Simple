<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <input v-model="searchKey" class="mc-search" placeholder="搜索用户名/昵称"
               @keyup.enter="currentPage=1;load()" @input="currentPage=1;load()" />
        <div class="mc-fbtn" @click="openForm({})">＋添加</div>
      </div>
      <div class="mc-filters">
        <div class="mc-pick" @click="openRolePick('filter')">
          <span>{{ roleFilter ? roleLabel(roleFilter) : '全部角色' }}</span>
          <i class="mc-pick-arrow">▾</i>
        </div>
      </div>

      <div class="mc-list">
        <div v-if="loading && !list.length" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无用户</div>
        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-card-top">
            <div class="mc-thumb mc-thumb-avatar" @click.stop="uploadAvatar(row)">
              <img v-if="row.avatar" :src="row.avatar" alt="" />
              <span v-else class="mc-avatar-char">{{ firstChar(row) }}</span>
            </div>
            <div class="mc-card-info">
              <div class="mc-title">{{ row.nickname || row.username || '(未设置昵称)' }}</div>
              <div class="mc-meta">@{{ row.username || ('用户#' + row.id) }} · Lv.{{ row.level > 0 ? row.level : '自动' }}</div>
              <div class="mc-data" v-if="row.created_at">注册于 {{ row.created_at?.substring(0, 10) || '-' }}</div>
            </div>
            <span class="mc-mod" :class="statusBadge(row).cls">{{ statusBadge(row).text }}</span>
          </div>
          <div class="mc-tags">
            <span class="mc-tag" :class="'m-' + row.role">{{ roleLabel(row.role) }}</span>
            <span class="mc-tag" v-if="row.article_count !== undefined">{{ row.article_count }}篇</span>
            <span class="mc-tag" v-if="statusBadge(row).expire">封禁至 {{ statusBadge(row).expire }}</span>
            <span class="mc-tag" v-if="row.ban_expire || row.mute_expire">待解除</span>
          </div>
          <div class="mc-actions">
            <span class="mc-act pinned" @click.stop="openDetail(row)">详情</span>
            <span class="mc-act" @click.stop="openForm(row)">编辑</span>
            <span class="mc-act" @click.stop="uploadAvatar(row)">头像</span>
            <span class="mc-act danger" @click.stop="del(row)">删除</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 编辑/添加弹层 -->
      <div class="mc-mask" v-if="showForm" @click="showForm=false">
        <div class="mc-sheet mc-form-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>{{ isEdit ? '编辑用户' : '添加用户' }}</span>
            <span class="mc-close" @click="showForm=false">✕</span>
          </div>
          <div class="mc-form-row">
            <label>用户名</label>
            <input v-model="form.username" :disabled="isEdit" placeholder="登录用" />
          </div>
          <div class="mc-form-row">
            <label>昵称</label>
            <input v-model="form.nickname" placeholder="显示名称" />
          </div>
          <div class="mc-form-row">
            <label>角色</label>
            <div class="mc-pick mc-pick-field" @click="openRolePick('form')">
              <span>{{ roleLabel(form.role || 'user') }}</span>
              <i class="mc-pick-arrow">▾</i>
            </div>
          </div>
          <div class="mc-form-row" v-if="isEdit">
            <label>等级</label>
            <select v-model="form.level" class="mc-select" style="flex:1;min-width:0;border:1px solid #e5e8f0;border-radius:8px;padding:8px 10px;font-size:13px;background:#fff">
              <option v-for="l in [0,1,2,3,4,5,6,7,8,9,10]" :key="l" :value="l">{{ l === 0 ? '自动' : 'Lv.' + l }}</option>
            </select>
          </div>
          <div class="mc-form-row">
            <label>{{ isEdit ? '新密码' : '密码' }}</label>
            <input v-model="form.password" type="password" :placeholder="isEdit?'留空则不修改':'请输入密码'" />
          </div>
          <button class="mc-save" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>

      <!-- 详情弹层（卡片化头部 + 信息分组 + 头像点击放大） -->
      <div class="mc-mask" v-if="detail" @click.self="detail=null">
        <div class="mc-sheet mc-sheet-detail">
          <div class="mc-sheet-head">
            <span>用户详情</span>
            <span class="mc-close" @click="detail=null">✕</span>
          </div>
          <div class="mc-detail-scroll">
            <!-- 卡片化头部：背景横幅 + 大头像 + 昵称 + 角色/状态徽章 -->
            <div class="mc-user-hero">
              <div class="mc-user-hero-bg" :style="heroBg(detail)" @click="zoomImg(detail.background_image)"></div>
              <div class="mc-user-avatar" @click="zoomImg(detail.avatar)">
                <img v-if="detail.avatar" :src="detail.avatar" alt="" />
                <span v-else class="mc-avatar-char mc-avatar-char-xxl">{{ firstChar(detail) }}</span>
              </div>
              <div class="mc-user-hero-name">{{ detail.nickname || detail.username || '(未设置昵称)' }}</div>
              <div class="mc-user-hero-sub">@{{ detail.username || ('用户#' + detail.id) }}</div>
              <div class="mc-user-hero-badges">
                <span class="mc-tag" :class="'m-' + (detail.role || 'user')">{{ roleLabel(detail.role) }}</span>
                <span class="mc-mod" :class="statusBadge(detail).cls">{{ statusBadge(detail).text }}</span>
              </div>
            </div>

            <!-- 分组一：账号信息 -->
            <div class="mc-sec mc-sec-detail">
              <div class="mc-dv">账号信息</div>
              <div class="mc-det-row"><label>ID</label><span>#{{ detail.id }}</span></div>
              <div class="mc-det-row"><label>用户名</label><span>{{ detail.username || '-' }}</span></div>
              <div class="mc-det-row"><label>昵称</label><span>{{ detail.nickname || '-' }}</span></div>
              <div class="mc-det-row"><label>角色</label><span>{{ roleLabel(detail.role) }}</span></div>
              <div class="mc-det-row"><label>等级</label><span>{{ detail.level > 0 ? 'Lv.' + detail.level : '自动' }}</span></div>
            </div>

            <!-- 分组二：状态 -->
            <div class="mc-sec mc-sec-detail">
              <div class="mc-dv">状态</div>
              <div class="mc-det-row"><label>状态</label><span>{{ statusBadge(detail).text }}</span></div>
              <div class="mc-det-row"><label>封禁到期</label><span>{{ banText(detail.ban_expire) }}</span></div>
              <div class="mc-det-row"><label>禁言到期</label><span>{{ banText(detail.mute_expire) }}</span></div>
            </div>

            <!-- 分组三：内容与注册 -->
            <div class="mc-sec mc-sec-detail">
              <div class="mc-dv">内容与注册</div>
              <div class="mc-det-row"><label>发文数</label><span>{{ detail.article_count != null ? detail.article_count + ' 篇' : '-' }}</span></div>
              <div class="mc-det-row"><label>注册时间</label><span>{{ fmtDT(detail.created_at) }}</span></div>
              <div class="mc-det-row"><label>背景图</label>
                <span v-if="detail.background_image" class="mc-det-img-link" @click="zoomImg(detail.background_image)">
                  <img class="mc-det-img" :src="detail.background_image" alt="" />
                </span>
                <span v-else>-</span>
              </div>
            </div>
          </div>

          <div class="mc-user-actions">
            <span class="mc-act" @click="openForm(detail); detail=null">编辑</span>
            <span class="mc-act" @click="uploadAvatar(detail)">改头像</span>
            <span class="mc-act" :class="{ warn: !isBanned(detail) || detail.ban_expire }" @click="openPunish(detail, 'ban')">封禁</span>
            <span class="mc-act" :class="{ warn: !isMuted(detail) || detail.mute_expire }" @click="openPunish(detail, 'mute')">禁言</span>
            <span class="mc-act danger" @click="del(detail); detail=null">删除</span>
          </div>
        </div>
      </div>

      <!-- 图片放大预览（点头像/背景图打开） -->
      <div class="mc-mask mc-viewer" v-if="previewUrl" @click="previewUrl=null">
        <img v-if="previewUrl" :src="previewUrl" class="mc-viewer-img" @click.stop />
        <div class="mc-viewer-tip">点击任意处关闭</div>
      </div>

      <!-- 封禁/禁言设置弹层 -->
      <div class="mc-mask" v-if="punishOpen" @click.self="closePunish">
        <div class="mc-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>{{ punish.kind === 'ban' ? '封禁用户' : '禁言用户' }} #{{ punish.row.id }}</span>
            <span class="mc-close" @click="closePunish">✕</span>
          </div>
          <div class="mc-form-row"><label>当前</label><span>{{ punish.kind === 'ban' ? banText(punish.row.ban_expire) : banText(punish.row.mute_expire) }}</span></div>
          <div class="mc-form-row">
            <label>期限</label>
            <div class="mc-punish-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;flex:1">
              <span v-for="dur in punishOptions" :key="dur.value" class="mc-act" :class="{ pinned: punish.dura === dur.value }" style="text-align:center" @click="punish.dura = dur.value">{{ dur.label }}</span>
            </div>
          </div>
          <div class="mc-form-row" v-if="punish.dura === 'custom'">
            <label>到期</label>
            <input v-model="punish.custom" type="datetime-local" />
          </div>
          <div class="mc-form-row">
            <label>解除</label>
            <label class="mc-switch"><input type="checkbox" v-model="punish.release" />立即解除 {{ punish.kind === 'ban' ? '封禁' : '禁言' }}</label>
          </div>
          <div class="mc-actions" style="margin-top:8px">
            <span class="mc-act" @click="closePunish">取消</span>
            <span class="mc-act danger" @click="applyPunish">{{ punish.release ? '确认解除' : '确认' + (punish.kind === 'ban' ? '封禁' : '禁言') }}</span>
          </div>
        </div>
      </div>

      <!-- 角色选择弹层（底部单选列表，显示中文角色名） -->
      <div class="mc-mask" v-if="rolePickOpen" @click="closeRolePick">
        <div class="mc-sheet mc-role-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>{{ rolePickTarget === 'form' ? '选择角色' : '筛选角色' }}</span>
            <span class="mc-close" @click="closeRolePick">✕</span>
          </div>
          <div class="mc-role-list">
            <div v-for="r in rolePickList" :key="r.name" class="mc-role-item"
                 :class="{ active: r.name === rolePickVal }" @click="pickRole(r.name)">
              <span class="mc-role-name">{{ r.display_name || r.name }}</span>
              <span class="mc-role-code" v-if="r.display_name && r.display_name !== r.name">{{ r.name }}</span>
              <span class="mc-role-check" v-if="r.name === rolePickVal">✓</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
    <div class="header-row">
      <h2 style="margin:0">用户管理</h2>
      <div class="header-controls">
        <el-input v-model="searchKey" placeholder="搜索用户名/昵称" clearable size="small" style="width:200px" @clear="load" @keyup.enter="load" />
        <el-select v-model="roleFilter" placeholder="全部角色" clearable size="small" style="width:110px" @change="() => load()">
          <el-option value="" label="全部" />
          <el-option v-for="r in roleOptions" :key="r.name" :value="r.name" :label="r.display_name || r.name" />
        </el-select>
        <el-button size="small" @click="load">刷新</el-button>
        <el-button type="primary" size="small" @click="openForm({})">添加用户</el-button>
      </div>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无用户">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column label="头像" width="60">
        <template #default="{row}">
          <el-avatar :src="row.avatar" size="small" style="cursor:pointer" @click="uploadAvatar(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="role" label="角色" width="90">
        <template #default="{row}">
          <el-tag :type="roleTagType(row.role)" effect="light" round size="small">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="等级" width="170">
        <template #default="{row}">
          <el-select v-model="row.level" size="small" style="width:90px" @change="saveLevel(row)">
            <el-option v-for="l in [0,1,2,3,4,5,6,7,8,9,10]" :key="l" :value="l" :label="l === 0 ? '自动' : 'Lv.' + l" />
          </el-select>
          <span style="color:#999;font-size:12px;margin-left:6px" v-if="row.article_count !== undefined">{{ row.article_count }}篇</span>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="170">
        <template #default="{row}">{{ row.created_at?.substring(0,16) || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="openPunish(row, 'ban')">封禁</el-button>
          <el-button size="small" type="warning" @click="openPunish(row, 'mute')">禁言</el-button>
          <el-popconfirm title="确定删除此用户？" @confirm="del(row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-row" v-if="total>0">
      <el-pagination
        v-model:current-page="currentPage" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" small @current-change="load"
      />
    </div>

    <!-- 编辑/添加弹窗 -->
    <el-dialog v-model="showForm" :title="isEdit?'编辑用户':'添加用户'" width="420px">
      <el-form :model="form" label-width="70px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="isEdit" placeholder="登录用" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option v-for="r in roleOptions" :key="r.name" :value="r.name" :label="r.display_name || r.name" />
          </el-select>
        </el-form-item>
        <el-form-item :label="isEdit?'新密码':'密码'" required>
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit?'留空则不修改':'请输入密码'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const list = ref([]), loading = ref(true)
const showForm = ref(false), saving = ref(false)
const detail = ref(null)
const form = ref({}), isEdit = ref(false)
const total = ref(0), currentPage = ref(1), pageSize = ref(10)
const searchKey = ref(''), roleFilter = ref('')
const roleOptions = ref([])

// 加载角色列表（含后台新建角色）；无 manage_permissions 权限时回退到内置角色
const DEFAULT_ROLES = [
  { name: 'super_admin', display_name: '超级管理员' },
  { name: 'admin', display_name: '管理员' },
  { name: 'editor', display_name: '编辑' },
  { name: 'user', display_name: '普通用户' }
]
const loadRoles = async () => {
  try {
    const r = await api.get('/admin_permissions.php', { params: { type: 'roles' } })
    if (r.data.code === 200 && r.data.data?.length) roleOptions.value = r.data.data
    else roleOptions.value = DEFAULT_ROLES
  } catch (e) { roleOptions.value = DEFAULT_ROLES }
}

// 移动端角色选择弹层：'filter'=列表筛选 | 'form'=编辑表单
const rolePickOpen = ref(false)
const rolePickTarget = ref('')
const rolePickVal = computed(() => rolePickTarget.value === 'filter' ? roleFilter.value : (form.value.role || ''))
// 可选列表：后台角色为空时兜底内置角色；筛选模式额外提供"全部角色"
const rolePickList = computed(() => {
  const roles = roleOptions.value.length ? roleOptions.value : DEFAULT_ROLES
  return rolePickTarget.value === 'filter' ? [{ name: '', display_name: '全部角色' }, ...roles] : roles
})
const openRolePick = (target) => { rolePickTarget.value = target; rolePickOpen.value = true }
const closeRolePick = () => { rolePickOpen.value = false }
const pickRole = (name) => {
  if (rolePickTarget.value === 'filter') {
    roleFilter.value = name
    currentPage.value = 1
    load()
  } else {
    form.value.role = name
  }
  rolePickOpen.value = false
}

// 封禁/禁言到期文案：空=未处罚，'0000-00-00 00:00:00'=永久，否则显示到期时间
const banText = (v) => {
  if (!v || v === '0') return '未处罚'
  if (v === '0000-00-00 00:00:00' || v === '0000-00-00 00:00:00.000000') return '永久'
  return String(v).substring(0, 16) || '-'
}
// 时间兜底显示
const fmtDT = (v) => (v ? String(v).substring(0, 16) : '-')

// 角色显示名（内置映射 + 动态角色中文名）
const roleLabel = (role) => {
  const map = { super_admin: '超级管理员', admin: '管理员', editor: '编辑', user: '普通用户' }
  if (map[role]) return map[role]
  const found = roleOptions.value.find(r => r.name === role)
  return found ? (found.display_name || found.name) : (role || '用户')
}

// 角色标签配色（动态角色按名称映射）
const roleTagType = (role) => {
  const map = { super_admin: 'danger', admin: 'primary', editor: 'warning', user: 'info', 运营: 'success', AI: 'primary' }
  return map[role] || 'primary'
}

// 用户状态徽标：优先根据 ban_expire/mute_expire 判断封禁/禁言，其次取 status 字段
const statusBadge = (row) => {
  if (row.ban_expire) {
    const isPermanent = row.ban_expire === '0000-00-00 00:00:00' || row.ban_expire === null
    const future = !isPermanent && new Date(row.ban_expire.replace(' ', 'T') + 'Z') > new Date()
    if (isPermanent || future) {
      return { text: isPermanent ? '永久封禁' : '已封禁', exp: isPermanent ? '永久' : row.ban_expire.substring(0, 10), expire: !isPermanent ? row.ban_expire.substring(0, 10) : '', cls: 'm-blocked' }
    }
  }
  if (row.mute_expire) {
    const isPermanent = row.mute_expire === '0000-00-00 00:00:00' || row.mute_expire === null
    const future = !isPermanent && new Date(row.mute_expire.replace(' ', 'T') + 'Z') > new Date()
    if (isPermanent || future) {
      return { text: '已禁言', expire: !isPermanent ? row.mute_expire.substring(0, 10) : '', cls: 'm-pending' }
    }
  }
  if (Number(row.status) === 1) return { text: '封禁', expire: '', cls: 'm-blocked' }
  return { text: '正常', expire: '', cls: 'm-safe' }
}

// 打开用户详情弹层
const openDetail = (row) => { detail.value = row }

// 图片放大预览（点头像/背景图打开）
const previewUrl = ref('')
const zoomImg = (url) => { if (url) previewUrl.value = url }
// 头部背景：有背景图则用图，否则深蓝渐变兜底
const heroBg = (row) => row && row.background_image
  ? { backgroundImage: `url(${row.background_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  : { background: 'linear-gradient(135deg,#1b44a6,#4a6cf7)' }

// 保存手动等级
const saveLevel = async (row) => {
  try {
    await api.put('/admin_users.php', { id: row.id, level: row.level })
    ElMessage.success(row.level > 0 ? `已设置 Lv.${row.level}` : '已恢复自动等级')
  } catch (e) { ElMessage.error('设置失败') }
}

// ==================== 封禁 / 禁言（移动端补齐） ====================
const punishOpen = ref(false)
const punish = ref({ kind: 'ban', row: {}, dura: '3d', custom: '', release: false })
const punishOptions = [
  { value: '1d', label: '1天' },
  { value: '3d', label: '3天' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
  { value: 'forever', label: '永久' },
  { value: 'custom', label: '自定义' }
]
// 是否处于封禁/禁言中
const isBanned = (r) => { const v = r?.ban_expire; return !!(v && v !== '0000-00-00 00:00:00' && v !== '0000-00-00 00:00:00.000000' && v !== '0') }
const isMuted = (r) => { const v = r?.mute_expire; return !!(v && v !== '0000-00-00 00:00:00' && v !== '0000-00-00 00:00:00.000000' && v !== '0') }
const openPunish = (row, kind) => {
  const active = kind === 'ban' ? isBanned(row) : isMuted(row)
  punish.value = { kind, row, dura: '3d', custom: '', release: active }
  punishOpen.value = true
}
const closePunish = () => { punishOpen.value = false }
const applyPunish = async () => {
  const p = punish.value
  const field = p.kind === 'ban' ? 'ban_expire' : 'mute_expire'
  let val
  if (p.release) {
    val = null // 解除（后端空=未处罚）
  } else if (p.dura === 'forever') {
    val = '9999-12-31 23:59:59' // 永久（登录逻辑：非空且未过期 → 持续封禁）
  } else if (p.dura === 'custom') {
    val = p.custom || null
  } else {
    const days = parseInt(p.dura) || 3
    const d = new Date(); d.setDate(d.getDate() + days)
    val = d.toISOString().slice(0, 19).replace('T', ' ')
  }
  // 解除时 val 为 null（清空到期）；仅"执行封禁/禁言"才要求选择期限
  if (!p.release && !val) { ElMessage.warning('请选择封禁期限或到期时间'); return }
  try {
    // 同步 status：封禁=1 / 禁言=2 / 解除=0（登录与评论端据此强制生效）
    const status = p.release ? 0 : (p.kind === 'ban' ? 1 : 2)
    await api.put('/admin_users.php', { id: p.row.id, [field]: val, status })
    ElMessage.success(p.release ? `已解除 ${p.kind === 'ban' ? '封禁' : '禁言'}` : `已${p.kind === 'ban' ? '封禁' : '禁言'}`)
    closePunish()
    // 更新详情与列表
    if (detail.value && detail.value.id === p.row.id) { detail.value[field] = val; detail.value.status = status }
    const t = list.value.find(u => u.id === p.row.id); if (t) { t[field] = val; t.status = status }
  } catch (e) { ElMessage.error('操作失败') }
}

// 拉取当前页数据并做前端搜索/筛选（桌面端与移动端共用）
const fetchPage = async () => {
  const r = await api.get('/admin_users.php', {
    params: { page: currentPage.value, limit: pageSize.value }
  })
  let data = []
  let tt = 0
  if (r.data.code === 200) {
    data = r.data.data || []
    tt = r.data.total || data.length
  }
  // 前端搜索/筛选
  if (searchKey.value) {
    const k = searchKey.value.toLowerCase()
    data = data.filter(u => (u.username||'').toLowerCase().includes(k) || (u.nickname||'').toLowerCase().includes(k))
  }
  if (roleFilter.value) {
    data = data.filter(u => u.role === roleFilter.value)
  }
  return { data, total: tt }
}

const load = async () => {
  loading.value = true
  try {
    const { data, total: tt } = await fetchPage()
    list.value = data
    total.value = tt
  } catch (e) { /* ignore */ }
  loading.value = false
}

// 移动端加载状态 & 上拉加载
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  currentPage.value += 1
  try {
    const { data, total: tt } = await fetchPage()
    list.value = list.value.concat(data)
    total.value = tt
  } catch (e) { currentPage.value -= 1 } // 失败回退页码
  mLoadingMore.value = false
}
// 滚动到底部自动加载（滚动容器为 .admin-main）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}
onMounted(() => { load(); loadRoles(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })

const firstChar = (row) => {
  const s = row.nickname || row.username || ('用户#' + row.id)
  return s ? s.charAt(0).toUpperCase() : '?'
}

const openForm = (row) => {
  isEdit.value = !!row.id
  form.value = row.id ? { id: row.id, username: row.username, nickname: row.nickname || '', role: row.role || 'user', password: '', level: row.level != null ? row.level : 0 }
                      : { username: '', nickname: '', role: 'user', password: '' }
  showForm.value = true
}

const save = async () => {
  if (!form.value.username) { ElMessage.warning('请输入用户名'); return }
  if (!isEdit.value && !form.value.password) { ElMessage.warning('请输入密码'); return }
  saving.value = true
  try {
    if (isEdit.value) {
      const payload = { id: form.value.id, nickname: form.value.nickname, role: form.value.role }
      if (form.value.password) payload.password = form.value.password
      if (form.value.level !== undefined && form.value.level !== null) payload.level = form.value.level
      await api.put('/admin_users.php', payload)
      ElMessage.success('已更新')
    } else {
      await api.post('/admin_users.php', form.value)
      ElMessage.success('已创建')
    }
    showForm.value = false
    load()
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}

const del = async (row) => {
  try {
    await api.delete('/admin_users.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    if (list.value.length <= 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) { ElMessage.error('删除失败') }
}

// 上传头像
const uploadAvatar = async (row) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    fd.append('title', 'avatar')
    fd.append('author', 'admin')
    try {
      const r = await fetch('/doo/server/api/upload_image.php', {
        method: 'POST',
        body: fd,
        headers: { 'X-Admin-Token': localStorage.getItem('admin_token') || '' }
      })
      const res = await r.json()
      if (res.code === 200 && res.data?.url) {
        await api.put('/admin_users.php', { id: row.id, avatar: res.data.url })
        ElMessage.success('头像已更新')
        load()
      } else { ElMessage.error(res.message || '上传失败') }
    } catch (e) { ElMessage.error('上传失败') }
  }
  input.click()
}
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
.mc-avatar-char { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 22px; color: #fff; background: linear-gradient(135deg, #409eff, #79bbff); }
/* 编辑/添加表单弹层：键盘弹出时保证可滚动 */
.mc-form-sheet { max-height: 86vh; overflow-y: auto; }
/* 详情弹层：卡片化头部 + 分组 */
.mc-sheet-detail { display: flex; flex-direction: column; max-height: 86vh; }
.mc-detail-scroll { overflow-y: auto; flex: 1; padding: 4px 2px; }
.mc-user-hero { position: relative; border-radius: 14px; overflow: hidden; text-align: center; margin-bottom: 12px; padding-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.06); }
.mc-user-hero-bg { position: absolute; top: 0; left: 0; right: 0; height: 108px; cursor: zoom-in; background-size: cover; background-position: center; }
.mc-user-hero-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.05) 60%, rgba(255,255,255,.9)); }
.mc-user-avatar { position: relative; width: 88px; height: 88px; margin: 56px auto 0; border-radius: 50%; border: 4px solid #fff; background: #fff; cursor: zoom-in; box-shadow: 0 2px 10px rgba(0,0,0,.12); }
.mc-user-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.mc-avatar-char-xxl { width: 100%; height: 100%; border-radius: 50%; font-size: 32px; }
.mc-user-hero-name { margin-top: 10px; font-size: 17px; font-weight: 700; color: #1a1a2e; }
.mc-user-hero-sub { font-size: 12px; color: #909399; margin-top: 3px; }
.mc-user-hero-badges { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.mc-sec-detail { margin-bottom: 10px; }
.mc-det-img-link { cursor: zoom-in; display: inline-block; }
.mc-user-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 2px 4px; border-top: 1px solid #f2f4f7; }
.mc-user-actions .mc-act { flex: 1 1 30%; justify-content: center; text-align: center; }
/* 图片放大预览 */
.mc-viewer { background: rgba(0,0,0,.86); align-items: center; justify-content: center; }
.mc-viewer-img { max-width: 92%; max-height: 86%; border-radius: 10px; object-fit: contain; box-shadow: 0 4px 30px rgba(0,0,0,.5); }
.mc-viewer-tip { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,.75); font-size: 12px; }
/* 移动端角色选择触发条（替代原生 select） */
.mc-pick { flex: 1; display: flex; align-items: center; justify-content: space-between; height: 36px; background: #fff; border-radius: 10px; padding: 0 12px; font-size: 13px; color: #333; box-shadow: 0 1px 6px rgba(0,0,0,.04); }
.mc-pick-field { height: 40px; border: 1px solid #e5e7eb; border-radius: 9px; box-shadow: none; }
.mc-pick-arrow { font-style: normal; font-size: 12px; color: #bbb; }
/* 角色选择弹层 */
.mc-role-sheet { max-height: 70vh; display: flex; flex-direction: column; }
.mc-role-list { overflow-y: auto; }
.mc-role-item { display: flex; align-items: center; gap: 10px; padding: 13px 14px; border-radius: 9px; font-size: 14px; color: #1a1a2e; }
.mc-role-item + .mc-role-item { margin-top: 2px; }
.mc-role-item.active { background: #eef4ff; color: #2f6bf0; font-weight: 600; }
.mc-role-code { font-size: 11px; color: #b0b4bd; flex-shrink: 0; }
.mc-role-check { margin-left: auto; color: #2f6bf0; font-weight: 700; }
</style>
