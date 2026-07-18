<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">API 管理</h2>
      <span style="font-size:13px;color:#909399">共 {{ total }} 个接口</span>
    </div>

    <el-collapse v-model="activeGroups" style="margin-top:12px">
      <el-collapse-item v-for="g in groups" :key="g.group" :name="g.group">
        <template #title>
          <span style="font-weight:600">{{ g.group }}</span>
          <el-tag size="small" style="margin-left:8px">{{ g.count }}</el-tag>
        </template>
        <el-table :data="g.items" size="small" stripe :show-header="false">
          <el-table-column width="140">
            <template #default="{row}">
              <el-tag v-for="m in row.methods" :key="m" :type="methodType(m)" size="small" style="margin:1px;font-weight:600;font-size:11px">{{ m }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column width="260">
            <template #default="{row}">
              <code style="font-size:12px;color:#333">{{ row.path }}</code>
            </template>
          </el-table-column>
          <el-table-column min-width="260">
            <template #default="{row}">
              <span style="font-size:13px;color:#666">{{ row.desc }}</span>
            </template>
          </el-table-column>
          <el-table-column width="70">
            <template #default="{row}">
              <el-tag :type="row.exists?'success':'danger'" size="small">{{ row.exists?'就绪':'缺失' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const groups = ref([])
const total = ref(0)
const activeGroups = ref([])

const methodType = (m) => {
  if (m === 'GET') return 'success'
  if (m === 'POST') return 'primary'
  if (m === 'PUT') return 'warning'
  if (m === 'DELETE') return 'danger'
  return 'info'
}

onMounted(async () => {
  try {
    const r = await api.get('/admin_apis.php')
    if (r.data.code === 200) {
      groups.value = r.data.data || []
      total.value = r.data.total || 0
      activeGroups.value = groups.value.map(g => g.group)
    }
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
</style>
