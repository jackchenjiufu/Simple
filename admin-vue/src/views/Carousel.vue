<template><div><h2 style="margin-bottom:20px">轮播管理</h2><el-table :data="list" stripe v-loading="loading"><el-table-column prop="id" label="ID" width="60"/><el-table-column prop="title" label="标题"/><el-table-column prop="image_url" label="图片"><template #default="{row}"><el-image :src="row.image_url" style="width:80px;height:50px" fit="cover"/></template></el-table-column></el-table></div></template>
<script setup>
import {ref,onMounted} from 'vue'
import {getCarousels} from '@/api'
const list=ref([]);const loading=ref(true)
onMounted(async()=>{try{const r=await getCarousels();if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false})
</script>
