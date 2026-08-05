<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">举报管理</h2>
      <div class="header-controls">
        <el-input v-model="searchKey" placeholder="搜索举报人/被举报人/原因" clearable size="small" style="width:220px" @clear="load" @keyup.enter="load" />
        <el-select v-model="typeFilter" placeholder="全部类型" clearable size="small" style="width:110px" @change="() => load()">
          <el-option value="user" label="用户" />
          <el-option value="message" label="私聊消息" />
          <el-option value="article" label="文章" />
          <el-option value="comment" label="评论" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="全部状态" clearable size="small" style="width:110px" @change="() => load()">
          <el-option value="0" label="待处理" />
          <el-option value="1" label="已处理" />
          <el-option value="2" label="已驳回" />
        </el-select>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无举报">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="举报人" width="110">
        <template #default="{row}">{{ row.reporter_nick || row.reporter_name || '用户#' + row.reporter_id }}</template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{row}">
          <el-tag size="small" :type="row.target_type==='user'?'danger':row.target_type==='message'?'warning':'info'">
            {{ row.target_type==='user'?'用户':row.target_type==='message'?'私聊消息':row.target_type==='article'?'文章':'评论' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="被举报对象" min-width="140" show-overflow-tooltip>
        <template #default="{row}">{{ row.target_name || ('#' + row.target_id) }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" min-width="120" show-overflow-tooltip />
      <el-table-column label="详情" min-width="160" show-overflow-tooltip>
        <template #default="{row}">{{ row.detail || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{row}">
          <el-tag :type="row.status==0?'danger':row.status==1?'success':'info'" size="small">
            {{ row.status==0?'待处理':row.status==1?'已处理':'已驳回' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{row}">
          <el-button v-if="row.status==0" size="small" type="success" @click="setStatus(row,1)">处理</el-button>
          <el-button v-if="row.status==0" size="small" type="warning" @click="setStatus(row,2)">驳回</el-button>
          <el-popconfirm title="删除该举报记录？" @confirm="del(row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-row" v-if="total>0">
      <el-pagination
        v-model:current-page="currentPage" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" small @current-change="() => load()"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const list = ref([]), loading = ref(true)
const total = ref(0), currentPage = ref(1), pageSize = ref(10)
const searchKey = ref(''), statusFilter = ref(''), typeFilter = ref('')

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_reports.php', {
      params: {
        page: currentPage.value, limit: pageSize.value,
        status: statusFilter.value === '' ? undefined : statusFilter.value,
        type: typeFilter.value || undefined,
        search: searchKey.value || undefined
      }
    })
    if (r.data.code === 200) {
      list.value = r.data.data || []
      total.value = r.data.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const setStatus = async (row, status) => {
  try {
    await api.put('/admin_reports.php', { id: row.id, status })
    ElMessage.success(status === 1 ? '已标记处理' : '已驳回')
    load()
  } catch (e) { ElMessage.error('操作失败') }
}

const del = async (row) => {
  try {
    await api.delete('/admin_reports.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    if (list.value.length <= 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) { ElMessage.error('删除失败') }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.header-controls { display: flex; gap: 8px; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
</style>
