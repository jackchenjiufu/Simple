<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">权限管理</h2>
      <el-button type="primary" size="small" @click="showRoleDialog=false;roleForm={name:'',description:''};roleDialogVisible=true">新建角色</el-button>
    </div>

    <el-tabs v-model="activeTab" style="margin-top:12px">
      <!-- 角色管理 -->
      <el-tab-pane label="角色管理" name="roles">
        <el-table :data="roles" stripe v-loading="loading.roles" empty-text="暂无角色">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="name" label="角色名称" width="120" />
          <el-table-column prop="description" label="描述" min-width="200" />
          <el-table-column label="权限" min-width="250">
            <template #default="{row}">
              <el-popover placement="bottom" :width="320" trigger="click">
                <template #reference>
                  <el-tag v-for="p in (row.permissions||[]).slice(0,3)" :key="p" size="small" style="margin:2px">{{ p }}</el-tag>
                  <el-tag v-if="(row.permissions||[]).length>3" size="small" type="info">+{{ row.permissions.length-3 }}</el-tag>
                  <span v-if="!row.permissions?.length" style="color:#999">未分配</span>
                </template>
                <div style="margin-bottom:8px;font-weight:600">编辑权限</div>
                <el-checkbox-group v-model="row._editPerms">
                  <el-checkbox v-for="p in allPerms" :key="p.id" :value="p.name" style="display:flex;margin:4px 0">{{ p.name }}</el-checkbox>
                </el-checkbox-group>
                <el-button size="small" type="primary" style="margin-top:8px;width:100%" @click="saveRolePerms(row)">保存</el-button>
              </el-popover>
            </template>
          </el-table-column>
          <el-table-column label="用户数" width="80">
            <template #default="{row}">{{ row.user_count || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{row}">
              <el-button size="small" @click="editRole(row)">编辑</el-button>
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
          <el-table-column prop="user_id" label="ID" width="60" />
          <el-table-column label="用户名">
            <template #default="{row}">{{ row.username || '未知' }}</template>
          </el-table-column>
          <el-table-column label="当前角色">
            <template #default="{row}">
              <el-tag v-for="r in (row.roles||[])" :key="r.id" size="small" style="margin:2px">{{ r.name }}</el-tag>
              <span v-if="!row.roles?.length" style="color:#999">无角色</span>
            </template>
          </el-table-column>
          <el-table-column label="分配角色" width="250">
            <template #default="{row}">
              <el-select v-model="row._newRole" placeholder="选择角色" size="small" style="width:130px">
                <el-option v-for="r in roles" :key="r.id" :value="r.id" :label="r.name" />
              </el-select>
              <el-button size="small" type="primary" @click="assignRole(row)" style="margin-left:4px">分配</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 角色编辑弹窗 -->
    <el-dialog v-model="roleDialogVisible" :title="showRoleDialog?'编辑角色':'新建角色'" width="420px">
      <el-form :model="roleForm" label-width="80px">
        <el-form-item label="角色名" required>
          <el-input v-model="roleForm.name" placeholder="例如：editor" />
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
const roleForm = ref({ id: null, name: '', description: '' })

const loadRoles = async () => {
  loading.roles = true
  try {
    const [rr, pr] = await Promise.all([
      api.get('/admin_permissions.php', { params: { type: 'roles' } }),
      api.get('/admin_permissions.php', { params: { type: 'permissions' } })
    ])
    if (rr.data.code === 200) {
      roles.value = (rr.data.data || []).map(r => ({ ...r, _editPerms: [...(r.permissions||[])] }))
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
  } catch (e) { ElMessage.error('加载失败') }
  loading.users = false
}

const editRole = (row) => {
  showRoleDialog.value = true
  roleForm.value = { id: row.id, name: row.name, description: row.description || '' }
  roleDialogVisible.value = true
}

const saveRole = async () => {
  if (!roleForm.value.name) { ElMessage.warning('请输入角色名'); return }
  try {
    const r = await api.post('/admin_permissions.php', {
      action: showRoleDialog.value ? 'update_role' : 'create_role',
      ...roleForm.value
    })
    if (r.data.code === 200) {
      ElMessage.success(showRoleDialog.value ? '已更新' : '已创建')
      roleDialogVisible.value = false
      loadRoles()
    } else { ElMessage.error(r.data.message) }
  } catch (e) { ElMessage.error('操作失败') }
}

const saveRolePerms = async (row) => {
  try {
    const r = await api.put('/admin_permissions.php', { role_id: row.id, permissions: row._editPerms })
    if (r.data.code === 200) {
      ElMessage.success('权限已更新')
      loadRoles()
    } else { ElMessage.error(r.data.message) }
  } catch (e) { ElMessage.error('保存失败') }
}

const deleteRole = async (id) => {
  try {
    const r = await api.delete('/admin_permissions.php', { params: { role_id: id } })
    if (r.data.code === 200) { ElMessage.success('已删除'); loadRoles() }
    else ElMessage.error(r.data.message)
  } catch (e) { ElMessage.error('删除失败') }
}

const assignRole = async (row) => {
  if (!row._newRole) { ElMessage.warning('请选择角色'); return }
  try {
    const r = await api.post('/admin_permissions.php', {
      action: 'assign_role', user_id: row.user_id, role_id: row._newRole
    })
    if (r.data.code === 200) { ElMessage.success('已分配'); loadUsers() }
    else ElMessage.error(r.data.message)
  } catch (e) { ElMessage.error('分配失败') }
}

onMounted(() => { loadRoles(); loadUsers() })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
</style>
