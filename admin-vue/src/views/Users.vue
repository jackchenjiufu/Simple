<template>
  <div>
    <h2 style="margin-bottom:20px">用户管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" width="80" />
      <el-table-column prop="created_at" label="注册时间" width="180" />
    </el-table>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { getUsers } from '@/api'
const list = ref([])
const loading = ref(true)
onMounted(async () => {
  try {
    const res = await getUsers(1, 50)
    if (res.data.code === 200) list.value = res.data.data?.users || res.data.data || []
  } catch(e) {}
  loading.value = false
})
</script>
