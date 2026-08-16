<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">API 管理</h2>
      <div style="display:flex;align-items:center;gap:8px">
        <el-tag :type="apiVersion === 'v2' ? 'success' : 'info'" size="small">{{ apiVersion === 'v2' ? 'v2 生效中' : 'v1 生效中' }}</el-tag>
        <el-tag type="primary" size="small">{{ v2Count }} 个 v2 接口</el-tag>
        <el-button size="small" :loading="loadingAll" @click="loadAll">刷新</el-button>
      </div>
    </div>

    <el-tabs v-model="tab">
      <!-- ═══════════ Tab1: 接口文档 ═══════════ -->
      <el-tab-pane label="接口文档" name="docs">
        <div style="font-size:12px;color:#909399;margin-bottom:10px">
          共 {{ total }} 个接口 · 每项带 HTTP 方法与 v2 就绪状态
        </div>
        <el-collapse v-model="activeGroups" style="margin-top:4px">
          <el-collapse-item v-for="g in groups" :key="g.group" :name="g.group">
            <template #title>
              <span style="font-weight:600">{{ g.group }}</span>
              <el-tag size="small" style="margin-left:8px">{{ g.count }}</el-tag>
            </template>
            <el-table :data="g.items" size="small" stripe :show-header="false">
              <el-table-column width="120">
                <template #default="{row}">
                  <el-tag v-for="m in row.methods" :key="m" :type="methodType(m)" size="small" style="margin:1px;font-weight:600;font-size:11px">{{ m }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column width="260">
                <template #default="{row}">
                  <code style="font-size:12px;color:#333">{{ row.path }}</code>
                </template>
              </el-table-column>
              <el-table-column min-width="240">
                <template #default="{row}">
                  <span style="font-size:13px;color:#666">{{ row.desc }}</span>
                </template>
              </el-table-column>
              <el-table-column width="130">
                <template #default="{row}">
                  <el-tag :type="row.exists ? 'success' : 'danger'" size="small">{{ row.exists ? '就绪' : '缺失' }}</el-tag>
                  <el-tag v-if="row.v2" type="primary" size="small" style="margin-left:4px">v2</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </el-tab-pane>

      <!-- ═══════════ Tab2: v2 版本切换与迁移 ═══════════ -->
      <el-tab-pane label="v2 版本与迁移" name="v2">
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>API 版本状态</template>
          <div style="font-size:13px;color:#555;line-height:2.2">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="color:#999;display:inline-block;width:90px">当前生效</span>
              <el-select v-model="apiVer" size="small" style="width:120px" :disabled="switchingVer" @change="onVersionChange">
                <el-option label="v1（无版本段）" value="v1" />
                <el-option label="v2（/api/v2/）" value="v2" />
              </el-select>
              <el-tag v-if="apiVer === 'v2'" type="success" size="small">生效中</el-tag>
              <span style="color:#909399;font-size:12px">App 端启动时自动跟随，无需发版</span>
            </div>
            <div style="font-size:12px;color:#b88230">
              Nginx 下 .htaccess 不生效：v2 接口需物理文件（server/api/v2/xxx.php）；未创建的 v2 接口在 App 端会 404。
            </div>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>v2 接口迁移</span>
              <el-input v-model="v2Filter" placeholder="搜索接口名" size="small" style="width:180px" clearable />
            </div>
          </template>
          <div style="font-size:13px;color:#555;margin-bottom:8px">
            v2 已创建 <b style="color:#2f6bf0">{{ v2Count }}</b> / 共 {{ v2Total }} 个接口
            <el-button size="small" type="primary" text style="margin-left:8px" @click="createAllV2" :loading="creatingAll">一键创建全部</el-button>
          </div>
          <el-table :data="filteredV2Apis" size="small" max-height="460">
            <el-table-column prop="file" label="接口文件" min-width="240" show-overflow-tooltip />
            <el-table-column label="v2 状态" width="90">
              <template #default="{row}">
                <el-tag :type="row.v2 ? 'success' : 'info'" size="small">{{ row.v2 ? '已创建' : '未创建' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{row}">
                <el-button v-if="!row.v2" size="small" type="primary" text :loading="v2Busy===row.file" @click="createV2(row.file)">创建 v2</el-button>
                <el-button v-else size="small" type="danger" text :loading="v2Busy===row.file" @click="deleteV2(row.file)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api, { switchApiVersion } from '@/api'

const tab = ref('docs')
const groups = ref([])
const total = ref(0)
const apiVersion = ref('v1')
const activeGroups = ref([])

// v2 迁移数据
const v2Apis = ref([])
const v2Filter = ref('')
const loadingAll = ref(false)
const v2Busy = ref('')
const creatingAll = ref(false)
const apiVer = ref('v1')
const loadedVer = ref('v1')
const switchingVer = ref(false)

const v2Total = computed(() => v2Apis.value.length)
const v2Count = computed(() => v2Apis.value.filter(x => x.v2).length)
const filteredV2Apis = computed(() => {
  const q = v2Filter.value.trim().toLowerCase()
  return q ? v2Apis.value.filter(x => x.file.toLowerCase().includes(q)) : v2Apis.value
})

const methodType = (m) => {
  if (m === 'GET') return 'success'
  if (m === 'POST') return 'primary'
  if (m === 'PUT') return 'warning'
  if (m === 'DELETE') return 'danger'
  return 'info'
}

const loadAll = async () => {
  loadingAll.value = true
  try {
    const settled = await Promise.allSettled([
      api.get('/admin_apis.php'),
      api.get('/admin_v2api.php'),
      api.get('/admin_api_version.php')
    ])
    const [ar, vr, ver] = settled.map(x => (x.status === 'fulfilled' ? x.value : null))
    if (ar?.data?.code === 200) {
      groups.value = ar.data.data || []
      total.value = ar.data.total || 0
      if (ar.data.api_version) apiVersion.value = ar.data.api_version
      activeGroups.value = groups.value.map(g => g.group)
    }
    if (vr?.data?.code === 200) v2Apis.value = vr.data.data.list || []
    if (ver?.data?.code === 200) {
      apiVer.value = ver.data.data.version || 'v1'
      loadedVer.value = apiVer.value
      apiVersion.value = apiVer.value
    }
  } catch (e) { /* ignore */ }
  loadingAll.value = false
}

const createV2 = async (file) => {
  v2Busy.value = file
  try {
    const r = await api.post('/admin_v2api.php', { action: 'create', file })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadAll() }
    else ElMessage.error(r.data.message || '创建失败')
  } catch (e) { ElMessage.error('创建失败') }
  v2Busy.value = ''
}

const createAllV2 = async () => {
  const pending = v2Apis.value.filter(x => !x.v2)
  if (!pending.length) { ElMessage.info('已全部创建'); return }
  try {
    await ElMessageBox.confirm(`为全部 ${pending.length} 个未创建接口生成 v2 转发文件？`, '一键创建 v2', { type: 'warning' })
  } catch (e) { return }
  creatingAll.value = true
  let ok = 0, fail = 0
  for (const p of pending) {
    try {
      const r = await api.post('/admin_v2api.php', { action: 'create', file: p.file })
      if (r.data.code === 200) ok++; else fail++
    } catch (e) { fail++ }
  }
  ElMessage.success(`创建完成：成功 ${ok}，失败 ${fail}`)
  creatingAll.value = false
  loadAll()
}

const deleteV2 = async (file) => {
  try {
    await ElMessageBox.confirm('确定删除 v2/' + file + '？删除后该接口将不再有 v2 版本。', '删除 v2 接口', { type: 'warning' })
  } catch (e) { return }
  v2Busy.value = file
  try {
    const r = await api.post('/admin_v2api.php', { action: 'delete', file })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadAll() }
    else ElMessage.error(r.data.message || '删除失败')
  } catch (e) { ElMessage.error('删除失败') }
  v2Busy.value = ''
}

const onVersionChange = async (target) => {
  if (switchingVer.value) { apiVer.value = loadedVer.value; return }
  if (target === loadedVer.value) { apiVer.value = loadedVer.value; return }
  try {
    await ElMessageBox.confirm('确定切换到 ' + target + '？切换后 App 端下次启动将自动跟随新版本。', '版本切换', { type: 'warning' })
  } catch (e) { apiVer.value = loadedVer.value; return }
  switchingVer.value = true
  try {
    const r = await switchApiVersion(target)
    if (r.data.code === 200) {
      ElMessage.success(r.data.message)
      loadedVer.value = target
      apiVer.value = target
      apiVersion.value = target
    } else {
      ElMessage.error(r.data.message || '切换失败')
      apiVer.value = loadedVer.value
    }
  } catch (e) { ElMessage.error('切换失败'); apiVer.value = loadedVer.value }
  switchingVer.value = false
}

onMounted(loadAll)
</script>