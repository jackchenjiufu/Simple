<template>
  <div>
    <h2 style="margin-bottom:20px">控制台</h2>
    <el-row :gutter="20">
      <el-col :span="6" v-for="s in statItems" :key="s.label">
        <el-card shadow="hover" style="margin-bottom:20px;text-align:center">
          <div style="font-size:32px;font-weight:700;color:#1b44a6">{{ s.value }}</div>
          <div style="font-size:14px;color:#909399;margin-top:8px">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="16">
        <el-card shadow="never">
          <template #header>快速入口</template>
          <el-space wrap>
            <el-button @click="$router.push('/carousel')">轮播管理</el-button>
            <el-button @click="$router.push('/announcement')">公告管理</el-button>
            <el-button @click="$router.push('/users')">用户管理</el-button>
            <el-button @click="$router.push('/article')">文章管理</el-button>
            <el-button @click="$router.push('/splash')">启动页配置</el-button>
            <el-button @click="$router.push('/feedback')">反馈管理</el-button>
            <el-button @click="$router.push('/logs')">系统日志</el-button>
          </el-space>
        </el-card>
        <el-card shadow="never" style="margin-top:16px">
          <template #header>最近动态</template>
          <div v-if="recentLogs.length">
            <div v-for="log in recentLogs.slice(0,6)" :key="log.id" style="padding:8px 0;font-size:13px;color:#666;border-bottom:1px solid #f5f5f5">
              <span style="color:#999;margin-right:8px">{{log.created_at?.substring(0,16)}}</span>{{log.message||log.action}}
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px">暂无动态</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>系统信息</template>
          <div style="font-size:13px;color:#666;line-height:2">
            <div>应用版本：v1.2.5</div>
            <div>PHP 版本：8.0.26</div>
            <div>数据库：MySQL 5.7+</div>
            <div>Node.js：16.20.2</div>
            <div>WebSocket：Node.js</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import api from '@/api'
const statItems=ref([]),recentLogs=ref([]),onlineCount=ref("--")
onMounted(async()=>{
  try{const rs=await api.get('/admin_stats.php');if(rs.data.code===200&&rs.data.data){const d=rs.data.data;statItems.value=[{value:d.total_users||'--',label:'用户数'},{value:d.total_content||'--',label:'内容数'},{value:d.today_users??'--',label:'今日新增'},{value:onlineCount,label:'在线人数'}]}}catch(e){}
  try{const r=await api.get("/online_count.php");if(r.data.code===200)onlineCount.value=r.data.online??"--"}catch(e){}
    try{const rl=await api.get('/admin_logs.php?limit=10');if(rl.data.code===200)recentLogs.value=rl.data.data||[]}catch(e){}
})
</script>
