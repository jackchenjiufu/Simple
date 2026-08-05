<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">文章管理</h2>
      <el-button type="primary" size="small" @click="router.push('/article-edit')">写文章</el-button>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无文章">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip>
        <template #default="{row}"><span class="art-title">{{ row.title }}</span></template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="100" />
      <el-table-column label="分类" width="100">
        <template #default="{row}"><el-tag size="small" effect="plain">{{ catLabel(row) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{row}">
          <el-tag :type="isPublished(row) ? 'success' : 'info'" effect="light" round size="small">{{ isPublished(row) ? '已发布' : '草稿' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="router.push('/article-edit/' + row.id)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="del(row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-row" v-if="total>0">
      <el-pagination
        v-model:current-page="currentPage" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" small @current-change="load"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import api from '@/api'
import { catLabelOf } from '@/constants/articleCategories'

const router = useRouter()
const list = ref([]), loading = ref(true)
const total = ref(0), currentPage = ref(1), pageSize = ref(10)

// 已发布：兼容新值 published 与旧数据 publish
const isPublished = (row) => row.status === 'published' || row.status === 'publish'

// 分类展示：取 tags 首项（get_articles.php 的"首标签即分类"体系）
const catLabel = (row) => {
  const v = (row.tags || '').split(',')[0] || row.category || ''
  return catLabelOf(v)
}

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_articles.php', { params: { page: currentPage.value, limit: pageSize.value } })
    if (r.data.code === 200) {
      list.value = r.data.data || []
      total.value = r.data.total || 0
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}

const del = async (row) => {
  try {
    await api.delete('/admin_articles.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    if (list.value.length <= 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) { ElMessage.error('删除失败') }
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
.art-title { font-weight: 600; color: #2b3350; }
</style>
