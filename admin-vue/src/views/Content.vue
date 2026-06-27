<template>
  <div>
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <h2 style="margin:0">内容管理</h2>
      <el-button type="primary" size="small" @click="$router.push('/content/edit')">添加内容</el-button>
    </div>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="图片" width="80">
        <template #default="{row}"><el-image :src="row.image_url" style="width:50px;height:50px;border-radius:4px" fit="cover" /></template>
      </el-table-column>
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="likes" label="点赞" width="60" />
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="$router.push('/content/edit?id='+row.id)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import api from '@/api'
const list=ref([]),loading=ref(true)
const load=async()=>{loading.value=true;try{const r=await api.get('/admin_content.php');if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false}
const del=(row)=>{ElMessageBox.confirm('确定删除？').then(async()=>{try{await api.delete('/admin_content.php',{params:{id:row.id}});ElMessage.success('已删除');load()}catch(e){ElMessage.error('删除失败')}}).catch(()=>{})}
onMounted(load)
</script>