<template>
  <div class="mobile-home">
    <!-- 管理员信息卡（与 App 原生后台一致：深蓝渐变） -->
    <div class="admin-card">
      <div class="admin-avatar">{{ adminInitial }}</div>
      <div class="admin-info">
        <div class="admin-name">{{ adminName }}</div>
        <div class="admin-role">{{ roleText }}</div>
      </div>
      <div class="admin-badge">
        <span class="badge-text">已授权</span>
      </div>
    </div>

    <!-- 快捷概览 -->
    <div class="section-title">数据概览</div>
    <div class="stats-grid">
      <div class="stat-item" v-for="s in visibleStats" :key="s.label" @click="s.go">
        <div class="stat-num" :class="'c' + s.color">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>

    <!-- 功能入口（三列宫格，按 RBAC 权限过滤） -->
    <div class="section-title">功能管理</div>
    <div class="menu-grid">
      <div class="menu-item" v-for="m in menus" :key="m.path" @click="goPage(m)">
        <span class="menu-name">{{ m.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { getMyPermissions } from '@/api'

const router = useRouter()

const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}')
const adminName = adminInfo.nickname || adminInfo.username || '管理员'
const adminInitial = computed(() => (adminName || '管').trim().charAt(0))

// 权限（null=加载中，菜单与概览先留空）
const myPerms = ref(null)
const roleText = computed(() => {
  const map = { super_admin: '超级管理员', admin: '管理员', editor: '编辑' }
  const role = (myPerms.value && myPerms.value.role) || adminInfo.role || 'admin'
  return map[role] || role
})

// 数据概览四格（与 App 原生后台一致）
const stats = ref([
  { label: '用户总数', value: '-', color: 1, go: () => router.push('/users') },
  { label: '文章总数', value: '-', color: 2, go: () => router.push('/article') },
  { label: '待处理反馈', value: '-', color: 3, go: () => router.push('/feedback') },
  { label: '今日注册', value: '-', color: 4, go: () => router.push('/users') },
])

// 无 view_stats 权限（editor）只显示文章总数
const visibleStats = computed(() => {
  const p = myPerms.value
  if (!p || p.is_super) return stats.value
  if (!(p.permissions || []).includes('view_stats')) {
    return stats.value.filter(s => s.label === '文章总数')
  }
  return stats.value
})

// 功能入口（对应 admin-vue 路由）
const allMenus = [
  { name: '控制台', icon: '📊', bg: '#eef4ff', path: '/mobile-home', permission: 'view_stats' },
  { name: '用户管理', icon: '👤', bg: '#e8f7ef', path: '/users', permission: 'manage_users' },
  { name: '文章管理', icon: '📄', bg: '#fff3e8', path: '/article', permission: 'manage_articles' },
  { name: '内容管理', icon: '🖼️', bg: '#e8f0fe', path: '/content-manage', permission: 'manage_content' },
  { name: '反馈管理', icon: '💬', bg: '#f0ecff', path: '/feedback', permission: 'manage_feedback' },
  { name: '评论管理', icon: '🗨️', bg: '#e8f4ff', path: '/comments', permission: 'manage_comments' },
  { name: '举报管理', icon: '🚩', bg: '#fdeef0', path: '/reports', permission: 'manage_reports' },
  { name: '公告管理', icon: '📢', bg: '#fff8e1', path: '/announcement', permission: 'manage_announcements' },
  { name: '版本管理', icon: '📦', bg: '#eaf4f8', path: '/version', permission: 'manage_versions' },
  { name: '启动页管理', icon: '🚀', bg: '#eaf4f8', path: '/splash', permission: 'manage_splash' },
  { name: '加班管理', icon: '⏱️', bg: '#f5efe8', path: '/overtime', permission: 'manage_overtime' },
  { name: '权限管理', icon: '🔐', bg: '#eef7fa', path: '/permissions', permission: 'manage_permissions' },
  { name: 'API 管理', icon: '🔌', bg: '#eef7fa', path: '/apis', permission: 'manage_system' },
  { name: '系统日志', icon: '📋', bg: '#f2f4f7', path: '/logs', permission: 'manage_logs' },
  { name: 'AI 审计', icon: '🤖', bg: '#eef7fa', path: '/ai-logs', permission: 'manage_logs' },
  { name: '接口监控', icon: '📡', bg: '#eaf6ff', path: '/api-monitor', permission: 'view_stats' },
  { name: '数据统计', icon: '📈', bg: '#e8f6f1', path: '/stats', permission: 'view_stats' },
  { name: '行为分析', icon: '🎯', bg: '#eaf6ff', path: '/behaviors', permission: 'view_stats' },
  { name: '轮播管理', icon: '🖼️', bg: '#e8f0fe', path: '/carousel', permission: 'manage_carousel' },
  { name: '缓存管理', icon: '🧊', bg: '#e8f7ef', path: '/cache', permission: 'manage_system' },
  { name: '内容推荐', icon: '⭐', bg: '#fff3e8', path: '/recommend', permission: 'manage_system' },
  { name: '数据库管理', icon: '🗄️', bg: '#f0ecff', path: '/database', permission: 'manage_system' },
  { name: '系统设置', icon: '⚙️', bg: '#f2f4f7', path: '/system-config', permission: 'manage_system' },
  { name: '系统维护', icon: '🛠️', bg: '#f2f4f7', path: '/system', permission: 'manage_system' },
]

// 按 RBAC 过滤（super_admin 全量放行）
const menus = computed(() => {
  const p = myPerms.value
  if (!p) return []
  if (p.is_super) return allMenus
  return allMenus.filter(m => !m.permission || (p.permissions || []).includes(m.permission))
})

const goPage = (m) => router.push(m.path)

// 概览数据（与 Dashboard 同一接口；无权限 403 保持占位符）
const loadStats = async () => {
  try {
    const r = await api.get('/admin_stats.php')
    if (r.data.code === 200) {
      const d = r.data.data
      stats.value[0].value = d.total_users ?? '-'
      stats.value[1].value = d.total_articles ?? d.total_content ?? '-'
      stats.value[2].value = d.total_pending_feedback ?? '-'
      stats.value[3].value = d.today_users ?? '-'
    }
  } catch (e) { /* ignore */ }
}

onMounted(async () => {
  loadStats()
  try {
    const r = await getMyPermissions()
    if (r.data.code === 200) myPerms.value = r.data.data
  } catch (e) { /* 权限拉取失败则菜单为空（安全优先） */ }
})
</script>

<style scoped>
.mobile-home {
  min-height: 100%;
  background: #f5f6fa;
  padding: 16px;
  box-sizing: border-box;
}

/* 管理员卡片 */
.admin-card {
  background: linear-gradient(135deg, #1b44a6, #3071f6);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 16px rgba(48, 113, 246, 0.25);
}
.admin-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 20px; font-weight: 700;
  flex-shrink: 0;
}
.admin-info { flex: 1; margin-left: 14px; display: flex; flex-direction: column; min-width: 0; }
.admin-name { color: #fff; font-size: 17px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.admin-role { color: rgba(255, 255, 255, 0.75); font-size: 12px; margin-top: 4px; }
.admin-badge {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 5px 12px;
  flex-shrink: 0;
}
.badge-text { color: #fff; font-size: 12px; }

/* 概览 */
.section-title { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 20px 0 12px; }
.stats-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.stat-item {
  width: 48.5%; background: #fff; border-radius: 12px; padding: 16px;
  margin-bottom: 10px; display: flex; flex-direction: column; box-sizing: border-box;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform .15s ease;
}
.stat-item:active { transform: scale(.97); }
.stat-num { font-size: 24px; font-weight: 700; }
.stat-num.c1 { color: #3071f6; }
.stat-num.c2 { color: #00a862; }
.stat-num.c3 { color: #ff7d00; }
.stat-num.c4 { color: #7c5cfc; }
.stat-label { font-size: 12px; color: #909399; margin-top: 6px; }

/* 功能宫格（三列） */
.menu-grid { display: flex; flex-wrap: wrap; justify-content: space-between; }
.menu-item {
  width: 31.5%; background: #fff; border-radius: 12px; padding: 16px 8px;
  margin-bottom: 10px; display: flex; align-items: center; justify-content: center;
  box-sizing: border-box; box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform .15s ease;
}
.menu-item:active { transform: scale(.96); }
.menu-name { font-size: 13px; color: #333; text-align: center; }
</style>
