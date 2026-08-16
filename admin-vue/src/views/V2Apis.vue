<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">v2 接口</h2>
      <el-button size="small" :loading="loadingAll" @click="loadAll">刷新</el-button>
    </div>

    <!-- API 版本状态 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>API 版本状态</template>
      <div v-if="cacheInfo" style="font-size:13px;color:#555;line-height:2.2">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#999;display:inline-block;width:90px">当前生效</span>
          <el-select v-model="apiVer" size="small" style="width:120px" :disabled="switchingVer" @change="onVersionChange">
            <el-option label="v1（无版本段）" value="v1" />
            <el-option label="v2（/api/v2/）" value="v2" />
          </el-select>
          <el-tag v-if="apiVer === 'v2'" type="success" size="small">生效中</el-tag>
          <span style="color:#909399;font-size:12px">App 端启动时自动跟随，无需发版</span>
        </div>
        <div><span style="color:#999;display:inline-block;width:90px">配置版本</span>{{ cacheInfo.api.config_version }}</div>
        <div v-if="cacheInfo.api.server_software">
          <span style="color:#999;display:inline-block;width:90px">Web 服务器</span>{{ cacheInfo.api.server_software }}
        </div>
        <div>
          <span style="color:#999;display:inline-block;width:90px">路由模式</span>
          <el-tag size="small" :type="cacheInfo.api.routing_mode === 'apache-htaccess' ? 'success' : 'warning'">
            {{ cacheInfo.api.routing_mode === 'apache-htaccess' ? 'Apache 集中路由(.htaccess)' : 'Nginx 物理文件直服' }}
          </el-tag>
          <div v-if="cacheInfo.api.routing_mode !== 'apache-htaccess'" style="font-size:12px;color:#b88230;margin-top:4px">
            Nginx 下 .htaccess 不生效：v2 接口需物理文件（server/api/v2/xxx.php）即可用；不存在时不会自动回退 v1。
          </div>
        </div>
        <div>
          <span style="color:#999;display:inline-block;width:90px">v2 接口</span>
          <template v-if="cacheInfo.api.v2_files.length">
            <el-tag v-for="f in cacheInfo.api.v2_files" :key="f" size="small" style="margin:2px">{{ f }}</el-tag>
          </template>
          <span v-else style="color:#909399">暂无（server/api/v2/ 为空）</span>
        </div>
      </div>
      <div v-else style="color:#909399;font-size:13px">加载中...</div>
    </el-card>

    <!-- v2 接口迁移 -->
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>v2 接口迁移</span>
          <el-input v-model="v2Filter" placeholder="搜索接口名" size="small" style="width:180px" clearable />
        </div>
      </template>
      <div style="font-size:12px;color:#777;margin-bottom:10px;line-height:1.8">
        一键为 v1 接口创建 v2 版本（自动生成转发文件，指向 v1 实现）。创建后 App 端将
        <code>utils/config.js</code> 的 <code>apiVersion</code> 改为 2 即可整体切换到 v2 路径。
        <span style="color:#b88230">注意：切换前请确保 App 用到的接口都已创建 v2 版本（nginx 下未创建的会 404）。</span>
      </div>
      <div style="font-size:13px;color:#555;margin-bottom:8px">
        v2 已创建 <b style="color:#2f6bf0">{{ v2Count }}</b> / 共 {{ v2Total }} 个接口
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api, { switchApiVersion } from '@/api'

const cacheInfo = ref(null)
const v2Apis = ref([])
const v2Filter = ref('')
const loadingAll = ref(false)
const v2Busy = ref('')
const apiVer = ref('v1')
const loadedVer = ref('v1')
const switchingVer = ref(false)

const v2Total = computed(() => v2Apis.value.length)
const v2Count = computed(() => v2Apis.value.filter(x => x.v2).length)
const filteredV2Apis = computed(() => {
  const q = v2Filter.value.trim().toLowerCase()
  return q ? v2Apis.value.filter(x => x.file.toLowerCase().includes(q)) : v2Apis.value
})

const loadAll = async () => {
  loadingAll.value = true
  try {
    const settled = await Promise.allSettled([
      api.get('/system_cache.php'),
      api.get('/admin_v2api.php'),
      api.get('/admin_api_version.php')
    ])
    const [sr, ar, vr] = settled.map(x => (x.status === 'fulfilled' ? x.value : null))
    if (sr?.data?.code === 200) cacheInfo.value = sr.data.data
    if (ar?.data?.code === 200) v2Apis.value = ar.data.data.list || []
    if (vr?.data?.code === 200) {
      apiVer.value = vr.data.data.version || 'v1'
      loadedVer.value = apiVer.value
    }
  } catch (e) { /* ignore */ }
  loadingAll.value = false
}

const createV2 = async (file) => {
  v2Busy.value = file
  try {
    const r = await api.post('/admin_v2api.php', { action: 'create', file })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message)
      loadAll()
    } else {
      ElMessage.error(r.data.message || '创建失败')
    }
  } catch (e) { ElMessage.error('创建失败') }
  v2Busy.value = ''
}

const deleteV2 = async (file) => {
  try {
    await ElMessageBox.confirm('确定删除 v2/' + file + '？删除后该接口将不再有 v2 版本。', '删除 v2 接口', { type: 'warning' })
  } catch (e) { return }
  v2Busy.value = file
  try {
    const r = await api.post('/admin_v2api.php', { action: 'delete', file })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message)
      loadAll()
    } else {
      ElMessage.error(r.data.message || '删除失败')
    }
  } catch (e) { ElMessage.error('删除失败') }
  v2Busy.value = ''
}

// 注意：el-select v-model 会先于 @change 更新 apiVer，故用 loadedVer 记录服务器实际生效版本
const onVersionChange = async (target) => {
  if (switchingVer.value) { apiVer.value = loadedVer.value; return }
  if (target === loadedVer.value) { apiVer.value = loadedVer.value; return } // 选回当前版本，恢复显示
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
    } else {
      ElMessage.error(r.data.message || '切换失败')
      apiVer.value = loadedVer.value
    }
  } catch (e) { ElMessage.error('切换失败'); apiVer.value = loadedVer.value }
  switchingVer.value = false
}

onMounted(loadAll)
</script>
