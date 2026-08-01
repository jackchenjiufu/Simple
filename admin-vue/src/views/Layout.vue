<template>
  <el-container style="height:100vh">
    <!-- 桌面端侧边栏 -->
    <el-aside v-if="isDesktop" :width="collapsed ? '64px' : '220px'" style="background:#1a1a2e;transition:width .3s">
      <div class="sidebar-header">{{ collapsed ? 'DOO' : 'DOO 后台管理' }}</div>
      <el-menu
        :default-active="route.path"
        :collapse="collapsed"
        background-color="#1a1a2e"
        text-color="#ffffffa0"
        active-text-color="#fff"
        router
      >
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <!-- 移动端汉堡按钮 -->
        <el-button v-if="!isDesktop" @click="drawerOpen=true" text>
          <el-icon size="20"><Menu /></el-icon>
        </el-button>
        <!-- 桌面端折叠按钮 -->
        <el-button v-else @click="collapsed=!collapsed" text>
          <el-icon><Expand v-if="collapsed" /><Fold v-else /></el-icon>
        </el-button>
        <span class="mobile-title" v-if="!isDesktop">DOO 后台管理</span>
        <el-dropdown @command="handleCommand">
          <span class="admin-user">{{ adminName }}<el-icon class="el-icon--right"><ArrowDown /></el-icon></span>
          <template #dropdown>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>

    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-model="drawerOpen"
      direction="ltr"
      size="220px"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="drawer-header">DOO 后台管理</div>
      <el-menu
        :default-active="route.path"
        background-color="#1a1a2e"
        text-color="#ffffffa0"
        active-text-color="#fff"
        router
        @select="drawerOpen=false"
        style="border-right:none"
      >
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  Menu, User, Picture, Bell, Reading, ChatDotSquare, Connection,
  Monitor, DataAnalysis, DocumentCopy, Setting, Tools, Timer, Expand, Fold, ArrowDown
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const drawerOpen = ref(false)
const isMobile = ref(false)
const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}')
const adminName = computed(() => adminInfo.nickname || adminInfo.username || '管理员')

const menus = [
  { path: '/dashboard', title: '控制台', icon: Menu },
  { path: '/users', title: '用户管理', icon: User },
  { path: '/carousel', title: '轮播管理', icon: Picture },
  { path: '/announcement', title: '公告管理', icon: Bell },
  { path: '/article', title: '文章管理', icon: Reading },
  { path: '/feedback', title: '反馈管理', icon: ChatDotSquare },
  { path: '/version', title: '版本管理', icon: Connection },
  { path: '/splash', title: '启动页管理', icon: Monitor },
  { path: '/stats', title: '数据统计', icon: DataAnalysis },
  { path: '/logs', title: '系统日志', icon: DocumentCopy },
  { path: '/permissions', title: '权限管理', icon: Setting },
  { path: '/overtime', title: '加班管理', icon: Timer },
  { path: '/apis', title: 'API 管理', icon: Connection },
  { path: '/system', title: '系统维护', icon: Tools },
]

const isDesktop = computed(() => !isMobile.value)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

const handleCommand = (cmd) => {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定退出登录？').then(() => {
      localStorage.removeItem('adminInfo')
      router.push('/login')
    }).catch(() => {})
  }
}
</script>

<style scoped>
.sidebar-header {
  height: 60px; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px; font-weight: 700; letter-spacing: 2px;
  white-space: nowrap; overflow: hidden;
}
.drawer-header {
  height: 60px; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 16px; font-weight: 700; letter-spacing: 2px;
  background: #1a1a2e;
}
.admin-header {
  background: #fff; border-bottom: 1px solid #eee;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; height: 60px;
}
.mobile-title {
  font-size: 16px; font-weight: 600; color: #1a1a2e; flex: 1; margin-left: 8px;
}
.admin-main {
  background: #f5f6fa; padding: 20px; overflow-y: auto;
}
.admin-user { cursor: pointer; color: #333; font-size: 14px; }

/* 移动端抽屉样式（非scoped，作用于el-drawer内部） */
:deep(.mobile-drawer .el-drawer__body) {
  padding: 0; background: #1a1a2e;
}

/* 窄屏主区域 padding 缩小 */
@media (max-width: 767px) {
  .admin-main { padding: 12px; }
  .admin-header { padding: 0 12px; }
}
</style>
