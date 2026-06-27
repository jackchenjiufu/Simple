<template>
  <div>
    <h2 style="margin-bottom:16px">数据统计</h2>
    <el-row :gutter="20">
      <el-col :span="6" v-for="s in statItems" :key="s.label">
        <el-card shadow="hover" style="margin-bottom:20px;text-align:center">
          <div style="font-size:36px;font-weight:700;color:#1b44a6">{{ s.value }}</div>
          <div style="font-size:14px;color:#909399;margin-top:8px">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {getStats} from '@/api'
const statItems=ref([])
onMounted(async()=>{
  try{
    const r=await getStats()
    if(r.data.code===200&&r.data.data){
      const d=r.data.data
      statItems.value=[
        {value:d.total_users||'--',label:'用户数'},
        {value:d.total_content||'--',label:'内容数'},
        {value:d.total_follows||'--',label:'关注数'},
        {value:d.total_messages||'--',label:'消息数'},
      ]
    }
  }catch(e){}
})
</script>