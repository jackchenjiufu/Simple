<template>
  <div>
    <h2 style="margin-bottom:16px">反馈管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="content" label="反馈内容" min-width="350" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="100" />
      <el-table-column prop="contact" label="联系方式" width="180" />
      <el-table-column prop="created_at" label="时间" width="170" />
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {getFeedback} from '@/api'
const list=ref([]),loading=ref(true)
onMounted(async()=>{try{const r=await getFeedback();if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false})
</script>