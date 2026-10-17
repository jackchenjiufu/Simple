<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-tabs">
        <div class="mc-tab" :class="{ active: activeTab === 'roles' }" @click="switchTab('roles')">角色管理</div>
        <div class="mc-tab" :class="{ active: activeTab === 'users' }" @click="switchTab('users')">用户角色</div>
      </div>

      <div class="mc-toolbar" v-if="activeTab === 'roles'">
        <div class="mc-fbtn" @click="newRole()">新建角色</div>
      </div>

      <div class="mc-list">
        <!-- 角色卡片 -->
        <template v-if="activeTab === 'roles'">
          <div v-if="loading.roles" class="mc-tip">加载中...</div>
          <div v-else-if="!mobileList.length" class="mc-tip">暂无角色</div>
          <div v-for="row in mobileList" :key="row.id" class="mc-card">
            <div class="mc-title">{{ row.display_name || row.name }}</div>
            <div class="mc-meta" style="margin-top:4px">{{ row.description || '暂无描述' }}</div>
            <div class="mc-data" style="margin-top:6px">{{ (row.permissions || []).length }} 项权限 · {{ row.user_count || 0 }} 个用户</div>
            <div class="mc-actions">
              <span class="mc-act" @click.stop="editRole(row)">编辑</span>
              <span class="mc-act ok" @click.stop="openPermDialog(row)">分配权限</span>
              <span class="mc-act danger" @click.stop="mobileDeleteRole(row)">删除</span>
            </div>
          </div>
        </template>

        <!-- 用户角色卡片 -->
        <template v-else>
          <div v-if="loading.users" class="mc-tip">加载中...</div>
          <div v-else-if="!mobileList.length" class="mc-tip">暂无数据</div>
          <div v-for="row in mobileList" :key="row.id" class="mc-card">
            <div class="mc-title">{{ row.username || '未知' }}</div>
            <div class="mc-tags" style="margin-top:6px">
              <span v-for="r in (row.roles || [])" :key="r.id" class="mc-tag">{{ r.display_name || r.name }}</span>
              <span v-if="!row.roles?.length" class="mc-tag">无角色</span>
            </div>
            <div class="mc-actions" style="justify-content:space-between;align-items:center">
              <select v-model="row._newRole" class="mc-select" style="flex:1">
                <option value="">选择角色</option>
                <option v-for="r in roles" :key="r.id" :value="r.id">{{ r.display_name || r.name }}</option>
              </select>
              <span class="mc-act ok" @click.stop="assignRole(row)">分配</span>
            </div>
          </div>
        </template>

        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && mobileList.length">没有更多了</div>
        <div class="mc-more" v-else-if="mobileList.length">上拉加载更多</div>
      </div>

      <!-- 移动端：新建/编辑角色底部弹层 -->
      <div v-if="mRoleSheet" class="mc-mask" @click.self="mRoleSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>{{ showRoleDialog ? '编辑角色' : '新建角色' }}</span>
            <span class="mc-close" @click="mRoleSheet=false">✕</span>
          </div>
          <div class="mc-sheet-body">
            <div class="mc-form-row">
              <label>角色名（英文标识）</label>
              <input v-model="roleForm.name" placeholder="例如：editor" :disabled="showRoleDialog" />
            </div>
            <div class="mc-form-row">
              <label>显示名称</label>
              <input v-model="roleForm.display_name" placeholder="中文名称，例如：编辑" />
            </div>
            <div class="mc-form-row">
              <label>描述</label>
              <input v-model="roleForm.description" placeholder="角色说明" />
            </div>
            <div class="mc-form-row">
              <div class="mc-perm-head">
                <label>分配权限</label>
                <span v-if="allPerms.length" class="mc-perm-toggle" @click="toggleAllRolePerms">
                  {{ roleCheckedPerms.length === allPerms.length ? '清空' : '全选' }}
                </span>
              </div>
              <div v-if="allPerms.length" class="mc-perm-list">
                <label v-for="p in allPerms" :key="p.id" class="mc-perm-item">
                  <input type="checkbox" :value="p.id" v-model="roleCheckedPerms" />
                  <span class="mc-perm-info">
                    <span class="mc-perm-name">{{ p.name }}</span>
                    <span v-if="p.description" class="mc-perm-desc">{{ p.description }}</span>
                  </span>
                </label>
              </div>
              <div v-else class="mc-tip" style="padding:10px 0">权限列表为空</div>
            </div>
          </div>
          <button class="mc-save" @click="saveRole">{{ showRoleDialog ? '保存' : '创建' }}</button>
        </div>
      </div>

      <!-- 移动端：权限分配底部弹层 -->
      <div v-if="mPermSheet" class="mc-mask" @click.self="mPermSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>分配权限 · {{ permTarget?.display_name || permTarget?.name || '' }}</span>
            <span class="mc-close" @click="mPermSheet=false">✕</span>
          </div>
          <div class="mc-sheet-body">
            <div v-if="allPerms.length">
              <label v-for="p in allPerms" :key="p.id" class="mc-perm-item">
                <input type="checkbox" :value="p.id" v-model="permChecked" />
                <span class="mc-perm-info">
                  <span class="mc-perm-name">{{ p.name }}</span>
                  <span v-if="p.description" class="mc-perm-desc">{{ p.description }}</span>
                </span>
              </label>
            </div>
            <div v-else class="mc-tip" style="padding:20px 0">权限列表为空</div>
          </div>
          <button class="mc-save" @click="savePermDialog">保存权限</button>
        </div>
      </div>

      <!-- 移动端：删除角色确认底部弹层 -->
      <div v-if="mDelSheet" class="mc-mask" @click.self="mDelSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>删除角色</span>
            <span class="mc-close" @click="mDelSheet=false">✕</span>
          </div>
          <div style="font-size:14px;color:#555;line-height:1.6">确定删除角色「{{ mDelTarget?.display_name || mDelTarget?.name || '' }}」？该操作不可恢复。</div>
          <div class="mc-sheet-acts">
            <span class="mc-act" @click="mDelSheet=false">取消</span>
            <span class="mc-act danger" @click="confirmDeleteRole">确认删除</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
      <div class="header-row">
        <h2 style="margin:0">权限管理</h2>
        <el-button type="primary" size="small" @click="newRole()">新建角色</el-button>
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
    </template>

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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

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
// 移动端新建/编辑角色弹层的权限勾选（与后端 role_permissions 表对应）
const roleCheckedPerms = ref([])

// 移动端底部弹层状态
const mRoleSheet = ref(false)
const mPermSheet = ref(false)
const mDelSheet = ref(false)
const mDelTarget = ref(null)

// 移动端 client-side 分页（原生接口不分页，用切片模拟上拉加载）
const pageSize = 10
const roleVisible = ref(pageSize)
const userVisible = ref(pageSize)
const mLoadingMore = ref(false)

const mobileList = computed(() =>
  activeTab.value === 'roles'
    ? roles.value.slice(0, roleVisible.value)
    : userRoles.value.slice(0, userVisible.value)
)
const mobileTotal = computed(() =>
  activeTab.value === 'roles' ? roles.value.length : userRoles.value.length
)
const hasMore = computed(() => mobileList.value.length < mobileTotal.value)

const loadMore = () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  setTimeout(() => {
    if (activeTab.value === 'roles') roleVisible.value += pageSize
    else userVisible.value += pageSize
    mLoadingMore.value = false
  }, 150)
}

const switchTab = (t) => {
  if (activeTab.value === t) return
  activeTab.value = t
  roleVisible.value = pageSize
  userVisible.value = pageSize
}

// 滚动到底部自动加载（移动端滚动容器是 .admin-main）
const onScroll = () => {
  if (!isMobile.value) return
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}

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

const newRole = () => {
  roleForm.value = { id: null, name: '', display_name: '', description: '' }
  roleCheckedPerms.value = []
  showRoleDialog.value = false
  if (isMobile.value) mRoleSheet.value = true
  else roleDialogVisible.value = true
}

const editRole = (row) => {
  showRoleDialog.value = true
  roleForm.value = { id: row.id, name: row.name, display_name: row.display_name || '', description: row.description || '' }
  // 回显角色已有权限（_editPerms 由 loadRoles 从后端 permissions 数组映射）
  roleCheckedPerms.value = ((row._editPerms || (row.permissions || []).map(p => p.id)) || []).slice()
  if (isMobile.value) mRoleSheet.value = true
  else roleDialogVisible.value = true
}

// 移动端弹层：权限全选/清空
const toggleAllRolePerms = () => {
  roleCheckedPerms.value = roleCheckedPerms.value.length === allPerms.value.length
    ? []
    : allPerms.value.map(p => p.id)
}

const saveRole = async () => {
  if (!roleForm.value.name) { ElMessage.warning('请输入角色名'); return }
  try {
    // 创建：POST role_name + permissions；编辑：PUT role_id + permissions（后端同步写 role_permissions 表）
    if (showRoleDialog.value) {
      const r = await api.put('/admin_permissions.php', {
        role_id: roleForm.value.id, display_name: roleForm.value.display_name || '', description: roleForm.value.description || '',
        permissions: roleCheckedPerms.value
      })
      if (r.data.code === 200) { ElMessage.success('已更新'); roleDialogVisible.value = false; mRoleSheet.value = false; loadRoles() }
      else ElMessage.error(r.data.message || '更新失败')
    } else {
      const r = await api.post('/admin_permissions.php', {
        role_name: roleForm.value.name, display_name: roleForm.value.display_name || '', description: roleForm.value.description || '',
        permissions: roleCheckedPerms.value
      })
      if (r.data.code === 200) { ElMessage.success('已创建'); roleDialogVisible.value = false; mRoleSheet.value = false; loadRoles() }
      else ElMessage.error(r.data.message || '创建失败')
    }
  } catch (e) { ElMessage.error('操作失败') }
}

// 打开权限分配弹层（回显当前角色权限）
const openPermDialog = (row) => {
  permTarget.value = row
  permChecked.value = (row.permissions || []).map(p => p.id)
  if (isMobile.value) mPermSheet.value = true
  else permDialogVisible.value = true
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
      mPermSheet.value = false
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

// 移动端删除二次确认（底部弹层，替代居中的 ElMessageBox）
const mobileDeleteRole = (row) => {
  mDelTarget.value = row
  mDelSheet.value = true
}

const confirmDeleteRole = () => {
  const row = mDelTarget.value
  mDelSheet.value = false
  if (row) deleteRole(row.id)
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

onMounted(() => {
  loadRoles(); loadUsers()
  document.addEventListener('scroll', onScroll, true)
})
onUnmounted(() => {
  document.removeEventListener('scroll', onScroll, true)
})
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

/* 移动端底部弹层 */
.mc-sheet { max-height: 85vh; display: flex; flex-direction: column; }
.mc-sheet-body { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.mc-sheet-acts { display: flex; gap: 10px; margin-top: 16px; }
.mc-perm-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid #f2f4f7;
  font-size: 14px; color: #1a1a2e;
}
.mc-perm-item:last-child { border-bottom: none; }
.mc-perm-item input { width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; }
.mc-perm-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mc-perm-name { font-weight: 500; }
.mc-perm-desc { font-size: 12px; color: #909399; }
/* 角色弹层权限区：标题行 + 全选切换 */
.mc-perm-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.mc-perm-head label { margin: 0; }
.mc-perm-toggle { font-size: 12px; color: #2f6bf0; cursor: pointer; padding: 2px 0; }
.mc-perm-list { border-top: 1px solid #f2f4f7; }
</style>
