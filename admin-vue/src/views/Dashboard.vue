<template>
  <div>
    <h2 style="margin-bottom:20px">控制台</h2>
    <el-row :gutter="20">
      <el-col :span="6" v-for="s in statItems" :key="s.label">
        <el-card shadow="hover" style="margin-bottom:20px;text-align:center">
          <div style="font-size:36px;font-weight:700;color:#1b44a6">{{ s.value }}</div>
          <div style="font-size:14px;color:#909399;margin-top:8px">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="12"><el-card shadow="never"><template #header>快速入口</template><el-space wrap>
        <el-button @click="$router.push('/carousel')">轮播管理</el-button>
        <el-button @click="$router.push('/announcement')">公告管理</el-button>
        <el-button @click="$router.push('/users')">用户管理</el-button>
        <el-button @click="$router.push('/splash')">启动页配置</el-button>
        <el-button @click="$router.push('/feedback')">反馈管理</el-button>
        <el-button @click="$router.push('/logs')">系统日志</el-button>
      </el-space></el-card></el-col>
      <el-col :span="12"><el-card shadow="never"><template #header>最近动态</template>
        <div v-if="recentLogs.length">{{recentLogs[0]?.message||'暂无'}}</div>
        <div v-else style="color:#909399;font-size:13px">暂无</div>
      </el-card></el-col>
    </el-row>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import api from '@/api'
const statItems=ref([]),recentLogs=ref([])
onMounted(async()=>{
  try{
    const rs=await api.get('/admin_stats.php')
    if(rs.data.code===200&&rs.data.data){
      const d=rs.data.data
      statItems.value=[{value:d.total_users||'--',label:'用户数'},{value:d.total_content||'--',label:'内容数'},{value:d.total_follows||'--',label:'关注数'},{value:d.total_messages||'--',label:'消息数'}]
    }
  }catch(e){}
  try{const rl=await api.get('/admin_logs.php?limit=5');if(rl.data.code===200)recentLogs.value=rl.data.data||[]}catch(e){}
})
</script>