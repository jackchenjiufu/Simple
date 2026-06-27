<template>
  <div>
    <h2 style="margin-bottom:16px">内容管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="图片" width="80">
        <template #default="{row}"><el-image :src="row.image_url" style="width:50px;height:50px;border-radius:4px" fit="cover" /></template>
      </el-table-column>
      <el-table-column prop="username" label="用户" width="100" />
      <el-table-column prop="likes" label="点赞" width="70" />
      <el-table-column prop="comments" label="评论" width="70" />
      <el-table-column prop="created_at" label="时间" width="160" />
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from "vue"
import api from "@/api"
const list=ref([]),loading=ref(true)
onMounted(async()=>{try{const r=await api.get("/admin_content.php");if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false})
</script>