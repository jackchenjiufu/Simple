<template>
  <div>
    <h2 style="margin-bottom:16px">反馈管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="content" label="内容" min-width="350" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="status" label="状态" width="70">
        <template #default="{row}"><el-tag :type="row.status==1?'success':'info'" size="small">{{row.status==1?'已处理':'待处理'}}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{row}">
          <el-button size="small" :type="row.status==1?'default':'success'" @click="toggleStatus(row)">{{row.status==1?'标记待处理':'标记已处理'}}</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {ElMessage} from 'element-plus'
import api from '@/api'
const list=ref([]),loading=ref(true)
const load=async()=>{loading.value=true;try{const r=await api.get('/admin_feedback.php');if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false}
const toggleStatus=async(row)=>{
  const newStatus = row.status==1?0:1
  try{await api.put('/admin_feedback.php',{id:row.id,status:newStatus});ElMessage.success('已更新');load()}catch(e){ElMessage.error('更新失败')}
}
onMounted(load)
</script>