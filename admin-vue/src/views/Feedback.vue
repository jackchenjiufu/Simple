<template>
  <div>
    <h2 style="margin-bottom:16px">反馈管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="content" label="内容" min-width="340" show-overflow-tooltip />
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{row}">
          <el-tag :type="row.status===2?'success':row.status===1?'warning':'info'" size="small">{{row.status===2?'已解决':row.status===1?'已读':'未读'}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180">
        <template #default="{row}">
          <el-select size="small" :model-value="row.status" @change="(v)=>setStatus(row,v)" style="width:110px">
            <el-option :value="0" label="未读" />
            <el-option :value="1" label="已读" />
            <el-option :value="2" label="已解决" />
          </el-select>
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
const setStatus=async(row,v)=>{try{await api.put('/admin_feedback.php',{id:row.id,status:v});ElMessage.success('已更新');load()}catch(e){ElMessage.error('更新失败')}}
onMounted(load)
</script>
