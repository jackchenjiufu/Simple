<template>
  <div>
    <h2 style="margin-bottom:16px">文章管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip />
      <el-table-column prop="author" label="作者" width="100" />
      <el-table-column prop="category" label="分类" width="80" />
      <el-table-column prop="created_at" label="时间" width="170" />
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import api from '@/api'
const list=ref([]),loading=ref(true)
onMounted(async()=>{loading.value=true;try{const r=await api.get('/admin_articles.php');if(r.data.code===200)list.value=r.data.data||r.data.data?.articles||[]}catch(e){}loading.value=false})
</script>