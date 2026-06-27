<template>
  <div>
    <h2 style="margin-bottom:16px">轮播管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column label="图片" width="100">
        <template #default="{row}"><el-image :src="row.image_url" style="width:80px;height:50px" fit="cover" /></template>
      </el-table-column>
      <el-table-column prop="author" label="作者" />
      <el-table-column prop="sort_order" label="排序" width="60" />
      <el-table-column prop="is_active" label="状态" width="80">
        <template #default="{row}"><el-tag :type="row.is_active==1?'success':'info'">{{row.is_active==1?'启用':'禁用'}}</el-tag></template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {getCarousels} from '@/api'
const list=ref([]),loading=ref(true)
onMounted(async()=>{try{const r=await getCarousels();if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false})
</script>