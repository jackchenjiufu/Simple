<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">权限管理</h2>
      <el-button type="primary" size="small" @click="roleForm={id:null,name:'',description:''};showRoleDialog=false;roleDialogVisible=true">新建角色</el-button>
    </div>

    <el-tabs v-model="activeTab" style="margin-top:12px">
      <!-- 角色管理 -->
      <el-tab-pane label="角色管理" name="roles">
        <el-table :data="roles" stripe v-loading="loading.roles" empty-text="暂无角色">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column label="角色名称" width="120">
          <template #default="{row}">{{ row.display_name || row.name }}</template>
        </el-table-column>
          <el-table-column prop="description" label="描述" min-width="200" />
          <el-table-column label="权限" min-width="250">
            <template #default="{row}">
              <el-tag v-for="p in (row.permissions||[]).slice(0,4)" :key="p.id" size="small" style="margin:2px">{{ p.name }}</el-tag>
              <el-tag v-if="(row.permissions||[]).length>4" size="small" type="info">+{{ row.permissions.length-4 }}</el-tag>
              <span v-if="!row.permissions?.length" style="color:#999">未分配</span>
              <el-button size="small" type="primary" link @click="openPermDialog(row)">分配权限</el-button>
            </template>
          </el-table-column>
          <el-table-column label="用户数" width="80">
            <template #default="{row}">{{ row.user_count || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{row}">
              <el-button size="small" @click="editRole(row)">编辑</el-button>
              <el-button size="small" type="primary" plain @click="openPermDialog(row)">分配权限</el-button>
              <el-popconfirm title="删除此角色？" @confirm="deleteRole(row.id)">
                <template #reference><el-button size="small" type="danger">删除</el-button></template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 用户角色分配 -->
      <el-tab-pane label="用户角色" name="users">
        <el-table :data="userRoles" stripe v-loading="loading.users" empty-text="暂无数据">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column label="用户名">
            <template #default="{row}">{{ row.username || '未知' }}</template>
          </el-table-column>
          <el-table-column label="当前角色">
            <template #default="{row}">
              <el-tag v-for="r in (row.roles||[])" :key="r.id" size="small" style="margin:2px">{{ r.display_name || r.name }}</el-tag>
              <span v-if="!row.roles?.length" style="color:#999">无角色</span>
            </template>
          </el-table-column>
          <el-table-column label="分配角色" width="250">
            <template #default="{row}">
              <el-select v-model="row._newRole" placeholder="选择角色" size="small" style="width:130px">
                <el-option v-for="r in roles" :key="r.id" :value="r.id" :label="r.display_name || r.name" />
              </el-select>
              <el-button size="small" type="primary" @click="assignRole(row)" style="margin-left:4px">分配</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 权限分配弹窗 -->
    <el-dialog v-model="permDialogVisible" :title="'分配权限 · ' + (permTarget?.name || '')" width="560px">
      <div v-if="allPerms.length" class="perm-list">
        <el-checkbox-group v-model="permChecked">
          <div v-for="p in allPerms" :key="p.id" class="perm-item">
            <el-checkbox :value="p.id">{{ p.name }}</el-checkbox>
            <span class="perm-desc">{{ p.description || '' }}</span>
          </div>
        </el-checkbox-group>
      </div>
      <el-empty v-else description="权限列表为空" :image-size="60" />
      <template #footer>
        <el-button @click="permDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="savePermDialog">保存权限</el-button>
      </template>
    </el-dialog>

    <!-- 角色编辑弹窗 -->
    <el-dialog v-model="roleDialogVisible" :title="showRoleDialog?'编辑角色':'新建角色'" width="420px">
      <el-form :model="roleForm" label-width="80px">
        <el-form-item label="角色名" required>
          <el-input v-model="roleForm.name" placeholder="英文标识，例如：editor" :disabled="showRoleDialog" />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="roleForm.display_name" placeholder="中文名称，例如：编辑" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="roleForm.description" placeholder="角色说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="roleDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="saveRole">{{ showRoleDialog?'保存':'创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const activeTab = ref('roles')
const roles = ref([])
const allPerms = ref([])
const userRoles = ref([])
const loading = reactive({ roles: false, users: false })
const roleDialogVisible = ref(false)
const showRoleDialog = ref(false)
const roleForm = ref({ id: null, name: '', display_name: '', description: '' })
const permDialogVisible = ref(false)
const permTarget = ref(null)
const permChecked = ref([])

const loadRoles = async () => {
  loading.roles = true
  try {
    const [rr, pr] = await Promise.all([
      api.get('/admin_permissions.php', { params: { type: 'roles' } }),
      api.get('/admin_permissions.php', { params: { type: 'permissions' } })
    ])
    if (rr.data.code === 200) {
      // 回显：勾选权限 ID 数组
      roles.value = (rr.data.data || []).map(r => ({
        ...r,
        _editPerms: (r.permissions || []).map(p => p.id)
      }))
    }
    if (pr.data.code === 200) allPerms.value = pr.data.data || []
  } catch (e) { ElMessage.error('加载失败') }
  loading.roles = false
}

const loadUsers = async () => {
  loading.users = true
  try {
    const r = await api.get('/admin_permissions.php', { params: { type: 'users' } })
    if (r.data.code === 200) userRoles.value = (r.data.data || []).map(u => ({ ...u, _newRole: '' }))
    else ElMessage.error(r.data.message || '加载失败')
  } catch (e) { ElMessage.error('加载失败') }
  loading.users = false
}

const editRole = (row) => {
  showRoleDialog.value = true
  roleForm.value = { id: row.id, name: row.name, display_name: row.display_name || '', description: row.description || '' }
  roleDialogVisible.value = true
}

const saveRole = async () => {
  if (!roleForm.value.name) { ElMessage.warning('请输入角色名'); return }
  try {
    // 创建：POST role_name；编辑：PUT role_id + description
    if (showRoleDialog.value) {
      const r = await api.put('/admin_permissions.php', {
        role_id: roleForm.value.id, display_name: roleForm.value.display_name || '', description: roleForm.value.description || ''
      })
      if (r.data.code === 200) { ElMessage.success('已更新'); roleDialogVisible.value = false; loadRoles() }
      else ElMessage.error(r.data.message || '更新失败')
    } else {
      const r = await api.post('/admin_permissions.php', {
        role_name: roleForm.value.name, display_name: roleForm.value.display_name || '', description: roleForm.value.description || ''
      })
      if (r.data.code === 200) { ElMessage.success('已创建'); roleDialogVisible.value = false; loadRoles() }
      else ElMessage.error(r.data.message || '创建失败')
    }
  } catch (e) { ElMessage.error('操作失败') }
}

// 打开权限分配弹窗（回显当前角色权限）
const openPermDialog = (row) => {
  permTarget.value = row
  permChecked.value = (row.permissions || []).map(p => p.id)
  permDialogVisible.value = true
}

const savePermDialog = async () => {
  if (!permTarget.value) return
  try {
    const r = await api.put('/admin_permissions.php', {
      role_id: permTarget.value.id,
      description: permTarget.value.description || '',
      display_name: permTarget.value.display_name || '',
      permissions: permChecked.value  // 权限 ID 数组
    })
    if (r.data.code === 200) {
      ElMessage.success('权限已更新')
      permDialogVisible.value = false
      loadRoles()
    } else { ElMessage.error(r.data.message || '保存失败') }
  } catch (e) { ElMessage.error('保存失败') }
}

const saveRolePerms = async (row) => {
  try {
    const r = await api.put('/admin_permissions.php', {
      role_id: row.id,
      description: row.description || '',
      permissions: row._editPerms  // 权限 ID 数组
    })
    if (r.data.code === 200) {
      ElMessage.success('权限已更新')
      loadRoles()
    } else { ElMessage.error(r.data.message || '保存失败') }
  } catch (e) { ElMessage.error('保存失败') }
}

const deleteRole = async (id) => {
  try {
    const r = await api.delete('/admin_permissions.php', { params: { role_id: id } })
    if (r.data.code === 200) { ElMessage.success('已删除'); loadRoles() }
    else ElMessage.error(r.data.message || '删除失败')
  } catch (e) { ElMessage.error('删除失败') }
}

const assignRole = async (row) => {
  if (!row._newRole) { ElMessage.warning('请选择角色'); return }
  try {
    const r = await api.post('/admin_permissions.php', {
      user_id: row.id, role_id: row._newRole
    })
    if (r.data.code === 200) { ElMessage.success('已分配'); loadUsers() }
    else ElMessage.error(r.data.message || '分配失败')
  } catch (e) { ElMessage.error('分配失败') }
}

onMounted(() => { loadRoles(); loadUsers() })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.perm-list { max-height: 420px; overflow-y: auto; }
.perm-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 4px; border-bottom: 1px solid #f5f5f5;
}
.perm-item:last-child { border-bottom: none; }
.perm-desc { font-size: 12px; color: #909399; }
</style>
