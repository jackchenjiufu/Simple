<template>
  <div>
    <h2 style="margin-bottom:16px">内容管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="type" label="类型" width="80" />
      <el-table-column prop="author" label="作者" width="120" />
      <el-table-column label="封面" width="100">
        <template #default="{row}"><el-image :src="row.image_url||row.cover" style="width:60px;height:60px" fit="cover" v-if="row.image_url||row.cover"/></template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="170" />
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {getContent} from '@/api'
const list=ref([]),loading=ref(true)
onMounted(async()=>{try{const r=await getContent();if(r.data.code===200)list.value=r.data.data?.items||r.data.data||[]}catch(e){}loading.value=false})
</script>