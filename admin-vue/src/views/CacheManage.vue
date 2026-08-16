<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">缓存管理</h2>
      <div style="display:flex;gap:8px">
        <el-button size="small" :loading="loadingCache" @click="loadCacheInfo">刷新</el-button>
        <el-button size="small" type="danger" :disabled="!cacheConnected || flushingCache" :loading="flushingCache" @click="flushAll">清空全部缓存</el-button>
      </div>
    </div>

    <!-- 概览统计 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">连接状态</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:6px">
            <el-tag :type="cacheTagType" size="small">{{ cacheStatusText }}</el-tag>
            <span v-if="cacheInfo?.redis?.server_ver" style="font-size:13px;color:#333">v{{ cacheInfo.redis.server_ver }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">缓存条目</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ cacheInfo?.redis?.stats?.count ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">约 {{ formatSize(cacheInfo?.redis?.stats?.total_size) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">命中率</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:8px">
            <el-progress :percentage="hitRate" :stroke-width="8" style="flex:1" :format="() => hitRate + '%'" />
          </div>
          <div style="font-size:12px;color:#909399">H {{ cacheInfo?.redis?.keyspace_hits ?? 0 }} / M {{ cacheInfo?.redis?.keyspace_misses ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">运行信息</div>
          <div style="margin-top:6px;font-size:13px;color:#333">
            内存 <b>{{ cacheInfo?.redis?.memory_used || '-' }}</b>
          </div>
          <div style="font-size:12px;color:#909399">
            连接 {{ cacheInfo?.redis?.clients ?? '-' }} · 运行 {{ uptimeText }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <span>缓存 Key 明细</span>
          <div style="display:flex;gap:8px">
            <el-input v-model="keyFilter" placeholder="搜索 Key" size="small" style="width:160px" clearable />
            <el-input v-model="forgetPattern" placeholder="定向清空前缀，如 articles:list:*" size="small" style="width:220px" />
            <el-button size="small" type="warning" :disabled="!forgetPattern || !cacheConnected" @click="forgetByPattern">定向清空</el-button>
            <el-button size="small" type="danger" :disabled="!selectedKeys.length" @click="delSelected">删除所选 ({{ selectedKeys.length }})</el-button>
          </div>
        </div>
      </template>
      <div v-if="cacheInfo?.redis?.stats" style="font-size:13px;color:#555;margin-bottom:8px">
        Redis 地址 <code>{{ cacheInfo.redis.host }}:{{ cacheInfo.redis.port }}</code> · Key 前缀 <code>{{ cacheInfo.redis.prefix }}</code>
      </div>
      <el-table
        v-if="cacheInfo?.redis?.stats"
        :data="filteredKeys"
        size="small"
        max-height="420"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column prop="key" label="缓存 Key" min-width="240" show-overflow-tooltip />
        <el-table-column label="类型" width="80">
          <template #default="{row}">
            <el-tag size="small" :type="typeTagType(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="TTL" width="80" align="right">
          <template #default="{row}">{{ row.ttl < 0 ? '永久' : row.ttl + 's' }}</template>
        </el-table-column>
        <el-table-column label="大小" width="80" align="right">
          <template #default="{row}">{{ formatSize(row.size) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{row}">
            <el-button size="small" type="danger" text :loading="delBusy===row.key" @click="delKey(row.key)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else-if="!cacheInfo" style="color:#909399;font-size:13px">加载中...</div>
      <div v-else style="color:#909399;font-size:13px">—</div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const loadingCache = ref(false)
const flushingCache = ref(false)
const cacheInfo = ref(null)
const keyFilter = ref('')
const forgetPattern = ref('')
const selectedKeys = ref([])
const delBusy = ref('')

const cacheStatusText = computed(() => {
  const r = cacheInfo.value?.redis
  if (!r) return '未知'
  if (!r.enabled) return '未启用（REDIS_ENABLED=false）'
  if (!r.extension) return '扩展未安装（自动降级走 DB）'
  return r.connected ? '已连接' : '连接失败（自动降级走 DB）'
})
const cacheTagType = computed(() => {
  const r = cacheInfo.value?.redis
  if (!r) return 'info'
  if (!r.enabled) return 'info'
  if (!r.extension || !r.connected) return 'warning'
  return 'success'
})
const cacheConnected = computed(() => cacheInfo.value?.redis?.connected === true)
const hitRate = computed(() => {
  const v = cacheInfo.value?.redis?.hit_rate
  return v == null ? 0 : Math.round(v)
})
const uptimeText = computed(() => {
  const s = cacheInfo.value?.redis?.uptime || 0
  if (s <= 0) return '-'
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  if (d > 0) return d + '天' + h + '小时'
  return Math.floor(s / 3600) + '小时'
})
const filteredKeys = computed(() => {
  const q = keyFilter.value.trim().toLowerCase()
  const keys = cacheInfo.value?.redis?.stats?.keys || []
  return q ? keys.filter(x => x.key.toLowerCase().includes(q)) : keys
})

const formatSize = (b) => {
  if (b == null) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}
const typeTagType = (t) => {
  if (t === 'string') return 'primary'
  if (t === 'hash') return 'success'
  if (t === 'set' || t === 'zset') return 'warning'
  return 'info'
}

const loadCacheInfo = async () => {
  loadingCache.value = true
  try {
    const r = await api.get('/system_cache.php')
    if (r.data.code === 200) cacheInfo.value = r.data.data
  } catch (e) { /* ignore */ }
  loadingCache.value = false
}

const flushAll = async () => {
  try {
    await ElMessageBox.confirm('确定清空全部缓存（' + (cacheInfo.value?.redis?.stats?.count ?? 0) + ' 个 key）？清空后首屏数据将重新从数据库加载。', '清空缓存', { type: 'warning' })
  } catch (e) { return }
  flushingCache.value = true
  try {
    const r = await api.post('/system_cache.php', { action: 'flush' })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadCacheInfo() }
    else ElMessage.error(r.data.message || '清空失败')
  } catch (e) { ElMessage.error('清空失败') }
  flushingCache.value = false
}

const forgetByPattern = async () => {
  const pattern = forgetPattern.value.trim()
  if (!pattern) return
  try {
    await ElMessageBox.confirm('确定按前缀清空：' + pattern + ' ？', '定向清空', { type: 'warning' })
  } catch (e) { return }
  try {
    const r = await api.post('/system_cache.php', { action: 'forget', pattern })
    if (r.data.code === 200) { ElMessage.success(r.data.message); forgetPattern.value = ''; loadCacheInfo() }
    else ElMessage.error(r.data.message || '清空失败')
  } catch (e) { ElMessage.error('清空失败') }
}

const delKey = async (key) => {
  delBusy.value = key
  try {
    const r = await api.post('/system_cache.php', { action: 'del_key', key })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadCacheInfo() }
    else ElMessage.error(r.data.message || '删除失败')
  } catch (e) { ElMessage.error('删除失败') }
  delBusy.value = ''
}

const onSelectionChange = (rows) => { selectedKeys.value = rows.map(x => x.key) }

const delSelected = async () => {
  if (!selectedKeys.value.length) return
  try {
    await ElMessageBox.confirm('确定删除选中的 ' + selectedKeys.value.length + ' 个缓存 key？', '批量删除', { type: 'warning' })
  } catch (e) { return }
  for (const key of selectedKeys.value) {
    try { await api.post('/system_cache.php', { action: 'del_key', key }) } catch (e) { /* 继续 */ }
  }
  ElMessage.success('已删除所选缓存')
  loadCacheInfo()
}

onMounted(loadCacheInfo)
</script>
