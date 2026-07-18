<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">用户管理</h2>
      <div class="header-controls">
        <el-input v-model="searchKey" placeholder="搜索用户名/昵称" clearable size="small" style="width:200px" @clear="load" @keyup.enter="load" />
        <el-select v-model="roleFilter" placeholder="全部角色" clearable size="small" style="width:100px" @change="load">
          <el-option value="" label="全部" />
          <el-option value="admin" label="管理员" />
          <el-option value="user" label="用户" />
        </el-select>
        <el-button size="small" @click="load">刷新</el-button>
        <el-button type="primary" size="small" @click="openForm({})">添加用户</el-button>
      </div>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无用户">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column label="头像" width="60">
        <template #default="{row}">
          <el-avatar :src="row.avatar" size="small" style="cursor:pointer" @click="uploadAvatar(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="role" label="角色" width="80">
        <template #default="{row}">
          <el-tag :type="row.role==='admin'?'danger':'info'" size="small">{{ row.role==='admin'?'管理员':'用户' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="170">
        <template #default="{row}">{{ row.created_at?.substring(0,16) || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-popconfirm title="确定删除此用户？" @confirm="del(row)">
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

    <!-- 编辑/添加弹窗 -->
    <el-dialog v-model="showForm" :title="isEdit?'编辑用户':'添加用户'" width="420px">
      <el-form :model="form" label-width="70px">
        <el-form-item label="用户名" required>
          <el-input v-model="form.username" :disabled="isEdit" placeholder="登录用" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option label="用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item :label="isEdit?'新密码':'密码'" required>
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit?'留空则不修改':'请输入密码'" />
        </el-form-item>
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
const showForm = ref(false), saving = ref(false)
const form = ref({}), isEdit = ref(false)
const total = ref(0), currentPage = ref(1), pageSize = ref(10)
const searchKey = ref(''), roleFilter = ref('')

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_users.php', {
      params: { page: currentPage.value, limit: pageSize.value }
    })
    if (r.data.code === 200) {
      let data = r.data.data || []
      // 前端搜索/筛选
      if (searchKey.value) {
        const k = searchKey.value.toLowerCase()
        data = data.filter(u => (u.username||'').toLowerCase().includes(k) || (u.nickname||'').toLowerCase().includes(k))
      }
      if (roleFilter.value) {
        data = data.filter(u => u.role === roleFilter.value)
      }
      list.value = data
      total.value = r.data.total || data.length
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}

const openForm = (row) => {
  isEdit.value = !!row.id
  form.value = row.id ? { id: row.id, username: row.username, nickname: row.nickname || '', role: row.role || 'user', password: '' }
                      : { username: '', nickname: '', role: 'user', password: '' }
  showForm.value = true
}

const save = async () => {
  if (!form.value.username) { ElMessage.warning('请输入用户名'); return }
  if (!isEdit.value && !form.value.password) { ElMessage.warning('请输入密码'); return }
  saving.value = true
  try {
    if (isEdit.value) {
      const payload = { id: form.value.id, nickname: form.value.nickname, role: form.value.role }
      if (form.value.password) payload.password = form.value.password
      await api.put('/admin_users.php', payload)
      ElMessage.success('已更新')
    } else {
      await api.post('/admin_users.php', form.value)
      ElMessage.success('已创建')
    }
    showForm.value = false
    load()
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}

const del = async (row) => {
  try {
    await api.delete('/admin_users.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    if (list.value.length <= 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) { ElMessage.error('删除失败') }
}

// 上传头像
const uploadAvatar = async (row) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    fd.append('title', 'avatar')
    fd.append('author', 'admin')
    try {
      const r = await fetch('/doo/server/api/upload_image.php', { method: 'POST', body: fd })
      const res = await r.json()
      if (res.code === 200 && res.data?.image_url) {
        await api.put('/admin_users.php', { id: row.id, avatar: res.data.image_url })
        ElMessage.success('头像已更新')
        load()
      } else { ElMessage.error(res.message || '上传失败') }
    } catch (e) { ElMessage.error('上传失败') }
  }
  input.click()
}

onMounted(load)
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
</style>
