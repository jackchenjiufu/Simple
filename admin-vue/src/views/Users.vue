<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">用户管理</h2>
      <div class="header-controls">
        <el-input v-model="searchKey" placeholder="搜索用户名/昵称" clearable size="small" style="width:200px" @clear="load" @keyup.enter="load" />
        <el-select v-model="roleFilter" placeholder="全部角色" clearable size="small" style="width:110px" @change="() => load()">
          <el-option value="" label="全部" />
          <el-option v-for="r in roleOptions" :key="r.name" :value="r.name" :label="r.display_name || r.name" />
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
      <el-table-column prop="role" label="角色" width="90">
        <template #default="{row}">
          <el-tag :type="roleTagType(row.role)" effect="light" round size="small">{{ roleLabel(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="等级" width="170">
        <template #default="{row}">
          <el-select v-model="row.level" size="small" style="width:90px" @change="saveLevel(row)">
            <el-option v-for="l in [0,1,2,3,4,5,6,7,8,9,10]" :key="l" :value="l" :label="l === 0 ? '自动' : 'Lv.' + l" />
          </el-select>
          <span style="color:#999;font-size:12px;margin-left:6px" v-if="row.article_count !== undefined">{{ row.article_count }}篇</span>
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
            <el-option v-for="r in roleOptions" :key="r.name" :value="r.name" :label="r.display_name || r.name" />
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
const roleOptions = ref([])

// 加载角色列表（含后台新建角色）；无 manage_permissions 权限时回退到内置角色
const DEFAULT_ROLES = [
  { name: 'super_admin', display_name: '超级管理员' },
  { name: 'admin', display_name: '管理员' },
  { name: 'editor', display_name: '编辑' },
  { name: 'user', display_name: '普通用户' }
]
const loadRoles = async () => {
  try {
    const r = await api.get('/admin_permissions.php', { params: { type: 'roles' } })
    if (r.data.code === 200 && r.data.data?.length) roleOptions.value = r.data.data
    else roleOptions.value = DEFAULT_ROLES
  } catch (e) { roleOptions.value = DEFAULT_ROLES }
}

// 角色显示名（内置映射 + 动态角色中文名）
const roleLabel = (role) => {
  const map = { super_admin: '超级管理员', admin: '管理员', editor: '编辑', user: '普通用户' }
  if (map[role]) return map[role]
  const found = roleOptions.value.find(r => r.name === role)
  return found ? (found.display_name || found.name) : (role || '用户')
}

// 角色标签配色（动态角色按名称映射）
const roleTagType = (role) => {
  const map = { super_admin: 'danger', admin: 'primary', editor: 'warning', user: 'info', 运营: 'success', AI: 'primary' }
  return map[role] || 'primary'
}

// 保存手动等级
const saveLevel = async (row) => {
  try {
    await api.put('/admin_users.php', { id: row.id, level: row.level })
    ElMessage.success(row.level > 0 ? `已设置 Lv.${row.level}` : '已恢复自动等级')
  } catch (e) { ElMessage.error('设置失败') }
}

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
      if (res.code === 200 && res.data?.url) {
        await api.put('/admin_users.php', { id: row.id, avatar: res.data.image_url })
        ElMessage.success('头像已更新')
        load()
      } else { ElMessage.error(res.message || '上传失败') }
    } catch (e) { ElMessage.error('上传失败') }
  }
  input.click()
}

onMounted(() => { load(); loadRoles() })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
</style>
