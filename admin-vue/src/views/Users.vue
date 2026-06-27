<template>
  <div>
    <h2 style="margin-bottom:16px">用户管理</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" width="80" />
      <el-table-column prop="created_at" label="注册时间" width="170" />
    </el-table>
    <el-pagination
      v-if="total>limit"
      background layout="prev,pager,next"
      :total="total" :page-size="limit"
      @current-change="loadPage"
      style="margin-top:16px;justify-content:center"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUsers } from '@/api'
const list = ref([]), loading = ref(true), total = ref(0)
const limit = 15
const loadPage = async (page) => {
  loading.value = true
  try { const r = await getUsers(page || 1, limit); if (r.data.code === 200) { list.value = r.data.data || []; total.value = parseInt(r.data.total) || list.value.length } } catch(e) {}
  loading.value = false
}
onMounted(() => loadPage(1))
</script>
