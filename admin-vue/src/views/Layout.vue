<template>
  <el-container style="height:100vh">
    <el-aside :width="collapsed ? '64px' : '220px'" style="background:#1a1a2e;transition:width .3s">
      <div class="sidebar-header">{{ collapsed ? 'DOO' : 'DOO 后台管理' }}</div>
      <el-menu
        :default-active="route.path"
        :collapse="collapsed"
        background-color="#1a1a2e"
        text-color="#ffffffa0"
        active-text-color="#fff"
        router
      >
        <el-menu-item index="/dashboard"><el-icon><Menu /></el-icon><span>控制台</span></el-menu-item>
        <el-menu-item index="/users"><el-icon><User /></el-icon><span>用户管理</span></el-menu-item>
        <el-menu-item index="/content"><el-icon><Document /></el-icon><span>内容管理</span></el-menu-item>
        <el-menu-item index="/carousel"><el-icon><Picture /></el-icon><span>轮播管理</span></el-menu-item>
        <el-menu-item index="/announcement"><el-icon><Bell /></el-icon><span>公告管理</span></el-menu-item>
        <el-menu-item index="/article"><el-icon><Reading /></el-icon><span>文章管理</span></el-menu-item>
        <el-menu-item index="/feedback"><el-icon><ChatDotSquare /></el-icon><span>反馈管理</span></el-menu-item>
        <el-menu-item index="/splash"><el-icon><Monitor /></el-icon><span>启动页管理</span></el-menu-item>
        <el-menu-item index="/stats"><el-icon><DataAnalysis /></el-icon><span>数据统计</span></el-menu-item>
        <el-menu-item index="/logs"><el-icon><DocumentCopy /></el-icon><span>系统日志</span></el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="admin-header">
        <el-button @click="collapsed=!collapsed" text>
          <el-icon><Expand v-if="collapsed" /><Fold v-else /></el-icon>
        </el-button>
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
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  Menu, User, Document, Picture, Bell, Reading, ChatDotSquare,
  Monitor, DataAnalysis, DocumentCopy, Expand, Fold, ArrowDown
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}')
const adminName = computed(() => adminInfo.nickname || adminInfo.username || '管理员')

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
.admin-header {
  background: #fff; border-bottom: 1px solid #eee;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; height: 60px;
}
.admin-main {
  background: #f5f6fa; padding: 20px; overflow-y: auto;
}
.admin-user { cursor: pointer; color: #333; font-size: 14px; }
</style>
