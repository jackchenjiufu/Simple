<template>
  <div>
    <h2 style="margin-bottom:16px">数据统计</h2>
    <el-row :gutter="20">
      <el-col :span="8" v-for="s in stats" :key="s.label">
        <el-card shadow="hover" style="margin-bottom:20px;text-align:center">
          <div style="font-size:36px;font-weight:700;color:#1b44a6">{{ s.value }}</div>
          <div style="font-size:14px;color:#909399;margin-top:8px">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>
    <el-table :data="detailList" stripe v-loading="loading" style="width:100%" v-if="detailList.length">
      <el-table-column prop="key" label="指标" />
      <el-table-column prop="value" label="数值" />
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {getStats} from '@/api'
const stats=ref([]),detailList=ref([]),loading=ref(true)
onMounted(async()=>{
  try{
    const r=await getStats()
    if(r.data.code===200&&r.data.data){
      detailList.value=Object.entries(r.data.data).map(([key,value])=>({key,value}))
      stats.value=Object.entries(r.data.data).slice(0,6).map(([key,value])=>({label:key,value}))
    }
  }catch(e){}
  loading.value=false
})
</script>