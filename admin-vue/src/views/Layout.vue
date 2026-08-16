<template>
  <el-container style="height:100vh">
    <!-- 顶部渐变强调线 -->
    <div class="top-accent"></div>

    <!-- 桌面端侧边栏 -->
    <el-aside v-if="isDesktop" :width="collapsed ? '72px' : '224px'" class="sidebar" style="transition:width .25s">
      <div class="sidebar-logo" :class="{ 'is-collapsed': collapsed }">
        <div class="logo-tile">{{ siteShort }}</div>
        <span v-if="!collapsed" class="logo-text">{{ siteName }} 后台管理</span>
      </div>
      <el-scrollbar class="sidebar-scroll">
        <div v-if="!collapsed" class="menu-label">导航</div>
        <el-menu
          :default-active="route.path"
          :collapse="collapsed"
          :collapse-transition="false"
          router
          class="side-menu"
        >
          <el-menu-item v-for="item in visibleMenus" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title><span>{{ item.title }}</span></template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
      <div v-if="!collapsed" class="sidebar-footer">
        <span class="ver-badge">v1.0</span>
      </div>
    </el-aside>

    <el-container>
      <el-header class="admin-header">
        <div class="header-left">
          <!-- 桌面端折叠按钮 -->
          <el-button v-if="isDesktop" class="icon-btn" text circle @click="collapsed=!collapsed">
            <el-icon size="18"><Expand v-if="collapsed" /><Fold v-else /></el-icon>
          </el-button>
          <!-- 移动端汉堡按钮 -->
          <el-button v-else class="icon-btn" text circle @click="drawerOpen=true">
            <el-icon size="18"><Menu /></el-icon>
          </el-button>
          <div class="crumb-wrap">
            <span class="crumb-root">后台管理</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-cur">{{ currentTitle }}</span>
          </div>
        </div>
        <div class="header-right">
          <el-tooltip content="刷新" placement="bottom">
            <el-button class="icon-btn" text circle @click="refreshPage">
              <el-icon size="16"><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
          <div class="header-divider"></div>
          <el-dropdown trigger="click" @command="handleCommand">
            <div class="user-chip">
              <div class="user-avatar">{{ avatarText }}</div>
              <span class="user-name">{{ adminName }}</span>
              <el-icon class="user-arrow"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <div class="dropdown-user">
                  <div class="dropdown-avatar">{{ avatarText }}</div>
                  <div class="dropdown-meta">
                    <div class="dropdown-name">{{ adminName }}</div>
                    <div class="dropdown-role">{{ roleText }}</div>
                  </div>
                </div>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="admin-main">
        <transition name="fade-slide" mode="out-in">
          <router-view />
        </transition>
      </el-main>
    </el-container>

    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-model="drawerOpen"
      direction="ltr"
      size="224px"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="sidebar-logo">
        <div class="logo-tile">{{ siteShort }}</div>
        <span class="logo-text">{{ siteName }} 后台管理</span>
      </div>
      <el-scrollbar class="sidebar-scroll">
        <div class="menu-label">导航</div>
        <el-menu
          :default-active="route.path"
          router
          class="side-menu"
          @select="drawerOpen=false"
        >
          <el-menu-item v-for="item in visibleMenus" :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title><span>{{ item.title }}</span></template>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-drawer>
  </el-container>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  Menu, User, Picture, PictureFilled, Bell, Reading, ChatDotSquare, Connection,
  Monitor, DataAnalysis, DataLine, DocumentCopy, Setting, Tools, Timer, Odometer, Coin, Star,
  Expand, Fold, ArrowDown, Refresh, SwitchButton
} from '@element-plus/icons-vue'
import api, { getMyPermissions } from '@/api'

const route = useRoute()
const router = useRouter()
// 站点名称（后台「系统设置」可改，登录后动态拉取展示在各处）
const siteName = ref('DOO')
const siteShort = computed(() => {
  const n = siteName.value.trim()
  return n ? n.charAt(0).toUpperCase() : 'D'
})
const loadSiteName = async () => {
  try {
    const r = await api.get('/site_info.php')
    if (r.data.code === 200 && r.data.data?.site_name) {
      siteName.value = r.data.data.site_name
      document.title = siteName.value + ' 后台管理'
    }
  } catch (e) { /* 保持默认 */ }
}
// 路由变化时重新拉取权限（权限管理页改权限后实时生效）
watch(() => route.path, () => {
  loadMyPermissions()
})
const collapsed = ref(false)
const drawerOpen = ref(false)
const isMobile = ref(false)
const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}')
const adminName = computed(() => adminInfo.nickname || adminInfo.username || '管理员')
const avatarText = computed(() => (adminName.value || '管').trim().charAt(0).toUpperCase())
const roleText = computed(() => {
  const map = { super_admin: '超级管理员', admin: '管理员', editor: '编辑', 运营: '运营', AI: 'AI 运营' }
  const r = adminInfo.role || 'admin'
  return map[r] || r
})

const menus = [
  { path: '/dashboard', title: '控制台', icon: Menu, permission: 'view_stats' },
  { path: '/users', title: '用户管理', icon: User, permission: 'manage_users' },
  { path: '/carousel', title: '轮播管理', icon: Picture, permission: 'manage_carousel' },
  { path: '/announcement', title: '公告管理', icon: Bell, permission: 'manage_announcements' },
  { path: '/article', title: '文章管理', icon: Reading, permission: 'manage_articles' },
  { path: '/content-manage', title: '内容管理', icon: PictureFilled, permission: 'manage_content' },
  { path: '/feedback', title: '反馈管理', icon: ChatDotSquare, permission: 'manage_feedback' },
  { path: '/comments', title: '评论管理', icon: ChatDotSquare, permission: 'manage_comments' },
  { path: '/reports', title: '举报管理', icon: ChatDotSquare, permission: 'manage_reports' },
  { path: '/version', title: '版本管理', icon: Connection, permission: 'manage_versions' },
  { path: '/splash', title: '启动页管理', icon: Monitor, permission: 'manage_splash' },
  { path: '/stats', title: '数据统计', icon: DataAnalysis, permission: 'view_stats' },
  { path: '/behaviors', title: '行为分析', icon: DataLine, permission: 'view_stats' },
  { path: '/logs', title: '系统日志', icon: DocumentCopy, permission: 'manage_logs' },
  { path: '/permissions', title: '权限管理', icon: Setting, permission: 'manage_permissions' },
  { path: '/overtime', title: '加班管理', icon: Timer, permission: 'manage_overtime' },
  { path: '/apis', title: 'API 管理', icon: Connection, permission: 'manage_system' },
  { path: '/cache', title: '缓存管理', icon: Odometer, permission: 'manage_system' },
  { path: '/database', title: '数据库管理', icon: Coin, permission: 'manage_system' },
  { path: '/recommend', title: '内容推荐', icon: Star, permission: 'manage_system' },
  { path: '/system-config', title: '系统设置', icon: Setting, permission: 'manage_system' },
  { path: '/system', title: '系统维护', icon: Tools, permission: 'manage_system' },
]

// 当前页面标题（面包屑用）
const currentTitle = computed(() => {
  const m = menus.find(x => route.path.startsWith(x.path))
  return m ? m.title : '控制台'
})

// 当前用户角色与权限（来自 admin_my_permissions.php；null=加载中）
const myPerms = ref(null)
// 按权限过滤可见菜单（editor 只有 manage_articles → 只看文章管理）
const visibleMenus = computed(() => {
  if (!myPerms.value) return []
  if (myPerms.value.is_super) return menus
  return menus.filter(m => !m.permission || myPerms.value.permissions.includes(m.permission))
})

const isDesktop = computed(() => !isMobile.value)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// 拉取当前用户权限，过滤菜单
async function loadMyPermissions() {
  try {
    const r = await getMyPermissions()
    if (r.data.code === 200) myPerms.value = r.data.data
  } catch (e) { /* 权限拉取失败则菜单为空（安全优先） */ }
}

const refreshPage = () => router.go(0)

onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  loadMyPermissions()
  loadSiteName()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const handleCommand = (cmd) => {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定退出登录？').then(() => {
      localStorage.removeItem('adminInfo')
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_uid')
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped>
.top-accent {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000; height: 3px;
  background: var(--brand);
}

/* ===== 侧边栏 ===== */
.sidebar {
  background: linear-gradient(180deg, #141a3f 0%, #182354 100%);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.sidebar-logo {
  height: 66px; display: flex; align-items: center; justify-content: center; gap: 10px;
  flex-shrink: 0;
}
.sidebar-logo.is-collapsed { justify-content: center; }
.logo-tile {
  width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
  background: #2f6bf0;
  color: #fff; font-size: 13px; font-weight: 800; letter-spacing: .5px;
  display: flex; align-items: center; justify-content: center;
}
.logo-text { color: #fff; font-size: 15px; font-weight: 700; letter-spacing: .5px; white-space: nowrap; }
.sidebar-scroll { flex: 1; }
.menu-label {
  padding: 6px 24px 6px; margin-top: 2px;
  font-size: 11px; font-weight: 600; letter-spacing: 1.5px;
  color: #5a6699; text-transform: uppercase;
}
.side-menu { border-right: none; background: transparent; }
.side-menu:not(.el-menu--collapse) { width: 100%; }
.side-menu .el-menu-item {
  height: 44px; line-height: 44px; margin: 3px 12px;
  border-radius: 8px; color: #9aa5d6;
  transition: background .16s ease, color .16s ease;
}
.side-menu .el-menu-item .el-icon { font-size: 17px; margin-right: 10px; }
.side-menu .el-menu-item:hover { background: rgba(255,255,255,.05); color: #fff; }
.side-menu .el-menu-item:active { transform: scale(.98); }
.side-menu .el-menu-item.is-active {
  background: #2f6bf0;
  color: #fff; font-weight: 600;
}
.sidebar-footer {
  height: 48px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  border-top: 1px solid rgba(255,255,255,.07);
}
.ver-badge {
  font-size: 11px; color: #7d89b5; background: rgba(255,255,255,.06);
  padding: 2px 12px; border-radius: 10px; letter-spacing: .5px;
}

/* ===== 头部（透明融入背景，仅保留功能项） ===== */
.admin-header {
  background: transparent; border-bottom: none;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 60px;
}
.header-left { display: flex; align-items: center; gap: 6px; min-width: 0; }
.icon-btn { color: #5a6475; }
.icon-btn:hover { color: var(--brand); background: var(--el-color-primary-light-9); }
.crumb-wrap { display: flex; align-items: center; gap: 8px; margin-left: 4px; white-space: nowrap; }
.crumb-root { font-size: 13px; color: #98a1b5; }
.crumb-sep { font-size: 12px; color: #c3c9d6; }
.crumb-cur { font-size: 14px; color: #222a47; font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 8px; }
.header-divider { width: 1px; height: 20px; background: #e8ebf2; margin: 0 6px; }
.user-chip { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px; border-radius: 9px; transition: background .2s; }
.user-chip:hover { background: #f4f6fb; }
.user-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: #2f6bf0;
  color: #fff; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.user-name { font-size: 14px; color: #333c56; font-weight: 500; }
.user-arrow { font-size: 12px; color: #98a1b5; }

/* 下拉用户卡 */
.dropdown-user {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px 10px; border-bottom: 1px solid #f2f4fa;
}
.dropdown-avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: #2f6bf0;
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.dropdown-meta { min-width: 0; }
.dropdown-name { font-size: 14px; font-weight: 600; color: #222a47; }
.dropdown-role { font-size: 12px; color: #98a1b5; margin-top: 2px; }

/* ===== 主内容区：悬浮白色圆角面板（Linear 风） ===== */
.admin-main {
  background: #fff;
  margin: 6px 20px 20px;
  padding: 22px 24px;
  border-radius: 18px;
  border: 1px solid #eceff7;
  box-shadow: 0 10px 44px rgba(16, 24, 60, .10), 0 2px 10px rgba(16, 24, 60, .05);
  overflow-y: auto;
}

/* 移动端抽屉 */
:deep(.mobile-drawer) {
  background: linear-gradient(180deg, #141a3f 0%, #182354 100%);
}
:deep(.mobile-drawer .el-drawer__body) { padding: 0; }

/* 窄屏适配 */
@media (max-width: 767px) {
  .admin-main { margin: 6px 10px 12px; padding: 14px 14px; border-radius: 14px; }
  .admin-header { padding: 0 12px; }
  .crumb-root, .crumb-sep { display: none; }
  .user-name { display: none; }
}
</style>
