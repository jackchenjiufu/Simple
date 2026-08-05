<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">评论管理</h2>
      <div class="header-controls">
        <el-input v-model="searchKey" placeholder="搜索内容/用户/文章" clearable size="small" style="width:200px" @clear="load" @keyup.enter="load" />
        <el-select v-model="statusFilter" placeholder="全部状态" clearable size="small" style="width:110px" @change="() => load()">
          <el-option value="0" label="正常" />
          <el-option value="1" label="已隐藏" />
        </el-select>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无评论">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="内容" min-width="260" show-overflow-tooltip>
        <template #default="{row}">
          <span :style="row.status==1 ? 'color:#bbb' : ''">{{ row.content }}</span>
          <el-tag v-if="row.is_top==1" type="warning" size="small" style="margin-left:6px">置顶</el-tag>
          <el-tag v-if="row.parent_id>0" type="info" size="small" style="margin-left:6px">回复</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="用户" width="110">
        <template #default="{row}">{{ row.nickname || row.username || '用户#' + row.user_id }}</template>
      </el-table-column>
      <el-table-column label="文章" min-width="150" show-overflow-tooltip>
        <template #default="{row}">{{ row.article_title || '文章#' + row.article_id }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{row}">
          <el-tag :type="row.status==1?'info':'success'" size="small">{{ row.status==1?'已隐藏':'正常' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="toggleTop(row)">{{ row.is_top==1?'取消置顶':'置顶' }}</el-button>
          <el-button size="small" :type="row.status==1?'success':'warning'" @click="toggleHide(row)">{{ row.status==1?'恢复':'隐藏' }}</el-button>
          <el-popconfirm title="删除该评论及其回复？" @confirm="del(row)">
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
const searchKey = ref(''), statusFilter = ref('')

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_comments.php', {
      params: {
        page: currentPage.value, limit: pageSize.value,
        status: statusFilter.value === '' ? undefined : statusFilter.value,
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

const toggleTop = async (row) => {
  try {
    await api.put('/admin_comments.php', { id: row.id, is_top: row.is_top == 1 ? 0 : 1 })
    ElMessage.success(row.is_top == 1 ? '已取消置顶' : '已置顶')
    load()
  } catch (e) { ElMessage.error('操作失败') }
}

const toggleHide = async (row) => {
  try {
    await api.put('/admin_comments.php', { id: row.id, status: row.status == 1 ? 0 : 1 })
    ElMessage.success(row.status == 1 ? '已恢复显示' : '已隐藏')
    load()
  } catch (e) { ElMessage.error('操作失败') }
}

const del = async (row) => {
  try {
    await api.delete('/admin_comments.php', { params: { id: row.id } })
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
