<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">文章管理</h2>
      <el-button type="primary" size="small" @click="openForm({})">写文章</el-button>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无文章">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column prop="author" label="作者" width="100" />
      <el-table-column prop="category" label="分类" width="80" />
      <el-table-column label="状态" width="80">
        <template #default="{row}">
          <el-tag :type="row.status=='publish'?'success':'info'" size="small">{{ row.status=='publish'?'已发布':'草稿' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openForm(row)">编辑</el-button>
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

    <el-dialog v-model="showForm" :title="isEdit?'编辑文章':'写文章'" width="650px">
      <el-form :model="form" label-width="60px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="作者"><el-input v-model="form.author" /></el-form-item>
        <el-form-item label="分类"><el-input v-model="form.category" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width:100%">
            <el-option value="draft" label="草稿" />
            <el-option value="publish" label="已发布" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容"><el-input v-model="form.content" type="textarea" :rows="8" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const list = ref([]), loading = ref(true)
const showForm = ref(false), saving = ref(false), form = ref({}), isEdit = ref(false)
const total = ref(0), currentPage = ref(1), pageSize = ref(10)

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

const openForm = (row) => {
  isEdit.value = !!row.id
  form.value = row.id ? { ...row, status: row.status || 'draft' } : { title: '', author: '', category: '', content: '', status: 'draft' }
  showForm.value = true
}

const save = async () => {
  if (!form.value.title) { ElMessage.warning('请输入标题'); return }
  saving.value = true
  try {
    if (isEdit.value) {
      await api.put('/admin_articles.php', form.value)
      ElMessage.success('已更新')
    } else {
      await api.post('/admin_articles.php', form.value)
      ElMessage.success('已创建')
    }
    showForm.value = false
    load()
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
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
</style>
