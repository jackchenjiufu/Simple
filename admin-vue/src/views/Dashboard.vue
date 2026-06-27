<template>
  <div>
    <h2 style="margin-bottom:20px">控制台</h2>
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="hover" style="margin-bottom:20px;text-align:center">
          <div class="card-value">{{ card.value }}</div>
          <div class="card-label">{{ card.label }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card shadow="never" style="margin-top:20px">
      <template #header>快速入口</template>
      <el-space wrap>
        <el-button @click="$router.push('/splash')">启动页配置</el-button>
        <el-button @click="$router.push('/announcement')">公告管理</el-button>
        <el-button @click="$router.push('/users')">用户管理</el-button>
        <el-button @click="$router.push('/carousel')">轮播管理</el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getStats } from '@/api'

const cards = ref([
  { value: '--', label: '用户总数' },
  { value: '--', label: '内容总数' },
  { value: '--', label: '公告数' },
  { value: '--', label: '反馈数' },
])

onMounted(async () => {
  try {
    const r = await getStats()
    if (r.data.code === 200 && r.data.data) {
      const d = r.data.data
      cards.value = [
        { value: d.total_users || d.users || '--', label: '用户总数' },
        { value: d.total_contents || d.contents || '--', label: '内容总数' },
        { value: d.total_announcements || d.announcements || '--', label: '公告数' },
        { value: d.total_feedback || d.feedback || '--', label: '反馈数' },
      ]
    }
  } catch(e) {}
})
</script>

<style scoped>
.card-value { font-size: 32px; font-weight: 700; color: #1b44a6; }
.card-label { font-size: 14px; color: #909399; margin-top: 8px; }
</style>
