<template>
  <div>
    <h2 style="margin-bottom:16px">系统日志</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="action" label="操作" width="120" />
      <el-table-column prop="message" label="详情" min-width="300" show-overflow-tooltip />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="ip_address" label="IP" width="130" />
      <el-table-column prop="created_at" label="时间" width="170" />
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from "vue"
import {getLogs} from "@/api"
const list=ref([]),loading=ref(true)
onMounted(async()=>{try{const r=await getLogs();if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false})
</script>