<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar" style="margin-top:12px">
        <input v-model="mSearch" class="mc-search" placeholder="搜索缓存 Key" @input="resetMobile" />
        <div class="mc-fbtn" :style="{opacity: loadingCache ? 0.5 : 1}" @click="loadCacheInfo">刷新</div>
      </div>
      <div class="mc-filters">
        <div class="mc-select" style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:12px;color:#333">连接状态</span>
          <span :style="{fontSize:'12px',fontWeight:600,color: cacheConnected ? '#00a862' : '#f59e0b'}">{{ cacheConnected ? '已连接' : '未连接' }}</span>
        </div>
        <div class="mc-select" style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:12px;color:#333">缓存条目</span>
          <span style="font-size:12px;font-weight:600;color:#333">{{ cacheInfo?.redis?.stats?.count ?? '-' }}</span>
        </div>
        <div class="mc-select" style="display:flex;flex-direction:column;gap:4px;align-items:stretch;justify-content:center">
          <span style="font-size:12px;color:#333;display:flex;justify-content:space-between"><span>命中率</span><b style="color:#2f6bf0">{{ hitRateText }}</b></span>
          <span style="font-size:12px;color:#333;display:flex;justify-content:space-between"><span>内存</span><b style="color:#333">{{ cacheInfo?.redis?.memory_used || '-' }}</b></span>
          <span style="font-size:12px;color:#333;display:flex;justify-content:space-between"><span>连接</span><b style="color:#333">{{ cacheInfo?.redis?.clients ?? '-' }}</b></span>
          <span style="font-size:12px;color:#333;display:flex;justify-content:space-between"><span>运行</span><b style="color:#333">{{ uptimeText }}</b></span>
        </div>
      </div>

      <!-- 移动端：缓存管理操作（清空/定向/批量） -->
      <div class="mc-card" style="margin:0 0 10px">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">管</div>
          <div class="mc-card-info">
            <div class="mc-title">缓存管理操作</div>
            <div class="mc-meta">清空全部 / 按前缀清空 / 批量删除所选</div>
          </div>
        </div>
        <div class="mc-form-row"><label>前缀</label><input v-model="forgetPattern" placeholder="输入 Key 前缀，定向清空" /></div>
        <div class="mc-actions">
          <span class="mc-act danger" :class="{ disabled: !cacheConnected || flushingCache }" @click="mAskFlush">清空全部</span>
          <span class="mc-act warn" :class="{ disabled: !cacheConnected || !forgetPattern }" @click="mAskForget">定向清空</span>
        </div>
        <div v-if="mSelCount" style="font-size:12px;color:#2f6bf0;margin-top:8px">已选 {{ mSelCount }} 个缓存 key</div>
        <div class="mc-actions" style="margin-top:6px">
          <span class="mc-act" :class="{ ok: !allSel }" @click="toggleSelAll">{{ allSel ? '取消全选' : '全选' }}</span>
          <span class="mc-act danger" :class="{ disabled: !mSelCount }" @click="mAskDelSelected">删除所选 ({{ mSelCount }})</span>
        </div>
      </div>

      <!-- 移动端：缓存管理确认弹层 -->
      <div v-if="mConfirm.show" class="mc-mask" @click.self="mConfirm.show=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>{{ mConfirm.title }}</span>
            <span class="mc-close" @click="mConfirm.show=false">✕</span>
          </div>
          <div class="mc-confirm-text">{{ mConfirm.text }}</div>
          <div class="mc-actions" style="margin-top:18px">
            <span class="mc-act" @click="mConfirm.show=false">取消</span>
            <span class="mc-act danger" @click="mConfirmOk">{{ mConfirm.okText || '确认' }}</span>
          </div>
        </div>
      </div>

      <div class="mc-list">
        <div v-if="loadingCache" class="mc-tip">加载中...</div>
        <div v-else-if="!cacheInfo?.redis?.stats" class="mc-tip">暂无可用的缓存连接</div>
        <div v-else-if="!mList.length" class="mc-tip">暂无缓存 Key</div>
        <div v-for="row in mList" :key="row.key" class="mc-card" @click="toggleSel(row.key)">
          <div class="mc-card-top">
            <span class="mc-sel" :class="{ on: mSel.has(row.key) }">✓</span>
            <div style="flex:1;min-width:0">
              <div class="mc-title mc-key">{{ row.key }}</div>
              <div class="mc-meta" style="margin-top:6px">
                <span class="mc-tag mc-type" :class="'t-' + row.type">{{ row.type }}</span>
                <span style="margin-left:6px">{{ row.ttl < 0 ? '永久' : row.ttl + 's' }}</span>
                <span style="margin-left:6px">大小 {{ formatSize(row.size) }}</span>
              </div>
            </div>
          </div>
          <div class="mc-actions">
            <span class="mc-act" @click.stop="openDetail(row)">详情</span>
            <span class="mc-act danger" :class="{ busy: delBusy === row.key }" @click="delKey(row.key)">
              {{ delBusy === row.key ? '删除中...' : '删除' }}
            </span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!mHasMore && mList.length">没有更多了</div>
        <div class="mc-more" v-else-if="mList.length">上拉加载更多</div>
      </div>

      <!-- 移动端：缓存 Key 详情底部弹层 -->
      <div v-if="mDetailSheet" class="mc-mask" @click.self="mDetailSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>缓存详情</span>
            <span class="mc-close" @click="mDetailSheet=false">✕</span>
          </div>
          <div class="mc-sheet-body">
            <div class="mc-detail-row">
              <span class="mc-detail-label">Key</span>
              <code class="mc-detail-val mc-key">{{ mDetail?.key || '-' }}</code>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">类型</span>
              <span class="mc-detail-val">
                <span class="mc-tag mc-type" :class="'t-' + (mDetail?.type || 'string')">{{ mDetail?.type || '-' }}</span>
              </span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">TTL</span>
              <span class="mc-detail-val">{{ mDetail?.ttl == null ? '-' : (mDetail.ttl < 0 ? '永久' : mDetail.ttl + 's') }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">大小</span>
              <span class="mc-detail-val">{{ formatSize(mDetail?.size) }}</span>
            </div>
            <div class="mc-detail-row" v-if="mDetail?.value != null">
              <span class="mc-detail-label">值</span>
              <pre class="mc-detail-val mc-val">{{ typeof mDetail.value === 'object' ? JSON.stringify(mDetail.value, null, 2) : String(mDetail.value) }}</pre>
            </div>
          </div>
          <button class="mc-save" @click="mDetailSheet=false">关闭</button>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

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
const hitRateText = computed(() => (hitRate.value ?? 0) + '%')
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

// ==================== 移动端卡片式：客户端分页 + 上拉加载 ====================
const mSearch = ref('')
const mPage = ref(0)
const mPageSize = ref(10)
const mList = ref([])
const mLoadingMore = ref(false)

// 移动端数据源：按搜索词过滤后的全部 key
const mAllKeys = computed(() => {
  const keys = cacheInfo.value?.redis?.stats?.keys || []
  const q = mSearch.value.trim().toLowerCase()
  return q ? keys.filter(x => x.key.toLowerCase().includes(q)) : keys
})
const mHasMore = computed(() => mList.value.length < mAllKeys.value.length)

// 移动端详情底部弹层
const mDetail = ref(null)
const mDetailSheet = ref(false)

const openDetail = (row) => {
  mDetail.value = row
  mDetailSheet.value = true
}

const resetMobile = () => {
  mPage.value = 0
  mList.value = []
  loadMoreMobile()
}
const loadMoreMobile = () => {
  if (mLoadingMore.value || !mHasMore.value) return
  mLoadingMore.value = true
  const start = mPage.value * mPageSize.value
  const chunk = mAllKeys.value.slice(start, start + mPageSize.value)
  mList.value = mList.value.concat(chunk)
  mPage.value += 1
  mLoadingMore.value = false
}
// 滚动到底部自动加载下一页（移动端滚动容器是外层 .admin-main）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMoreMobile()
  }
}
// cacheInfo 加载完成后自动填充首屏
watch(cacheInfo, () => {
  if (isMobile.value) resetMobile()
})
// 搜索词变化时回到第一页
watch(mSearch, () => { resetMobile() })

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

// ==================== 移动端：缓存管理（清空/定向/批量） ====================
const mSel = ref(new Set())
const mSelCount = computed(() => mSel.value.size)
const allSel = computed(() => mList.value.length > 0 && mSel.value.size === mList.value.length)
const toggleSel = (key) => {
  const s = new Set(mSel.value)
  s.has(key) ? s.delete(key) : s.add(key)
  mSel.value = s
}
const toggleSelAll = () => {
  const s = new Set()
  if (!allSel.value) mList.value.forEach(r => s.add(r.key))
  mSel.value = s
}
const mConfirm = ref({ show: false, title: '', text: '', okText: '确认', onOk: null })
const mAskFlush = () => {
  mConfirm.value = { show: true, title: '清空缓存', text: '确定清空全部缓存（' + (cacheInfo.value?.redis?.stats?.count ?? 0) + ' 个 key）？清空后首屏数据将重新从数据库加载。', onOk: async () => {
    flushingCache.value = true
    try {
      const r = await api.post('/system_cache.php', { action: 'flush' })
      if (r.data.code === 200) { ElMessage.success(r.data.message); loadCacheInfo() } else ElMessage.error(r.data.message || '清空失败')
    } catch (e) { ElMessage.error('清空失败') }
    flushingCache.value = false
  } }
}
const mAskForget = () => {
  const pattern = forgetPattern.value.trim()
  if (!pattern) return
  mConfirm.value = { show: true, title: '定向清空', text: '确定按前缀清空：' + pattern + ' ？', onOk: async () => {
    try {
      const r = await api.post('/system_cache.php', { action: 'forget', pattern })
      if (r.data.code === 200) { ElMessage.success(r.data.message); forgetPattern.value = ''; loadCacheInfo() } else ElMessage.error(r.data.message || '清空失败')
    } catch (e) { ElMessage.error('清空失败') }
  } }
}
const mAskDelSelected = () => {
  if (!mSel.value.size) return
  mConfirm.value = { show: true, title: '批量删除', text: '确定删除选中的 ' + mSel.value.size + ' 个缓存 key？', onOk: async () => {
    for (const key of mSel.value) {
      try { await api.post('/system_cache.php', { action: 'del_key', key }) } catch (e) { /* 继续 */ }
    }
    mSel.value = new Set()
    ElMessage.success('已删除所选缓存')
    loadCacheInfo()
  } }
}
const mConfirmOk = () => { const cb = mConfirm.value.onOk; mConfirm.value.show = false; cb && cb() }

onMounted(() => {
  loadCacheInfo()
  document.addEventListener('scroll', onScroll, true)
})
onUnmounted(() => {
  document.removeEventListener('scroll', onScroll, true)
})
</script>

<style scoped>
/* 移动端卡片：让缓存 Key 可换行显示（默认 mc-title 为单行省略） */
.mc-key {
  white-space: normal;
  word-break: break-all;
  line-height: 1.35;
}
.mc-type.t-string { background: #eef4ff; color: #2f6bf0; }
.mc-type.t-hash { background: #e8f7ef; color: #00a862; }
.mc-type.t-set, .mc-type.t-zset { background: #fff3e8; color: #f59e0b; }
.mc-type.t-list { background: #f3f4f6; color: #6b7280; }
.mc-act.busy { opacity: .6; }

/* 移动端底部弹层 */
.mc-sheet { max-height: 85vh; display: flex; flex-direction: column; }
.mc-sheet-body { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.mc-detail-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
.mc-detail-row:last-child { border-bottom: none; }
.mc-detail-label { width: 44px; flex-shrink: 0; color: #909399; }
.mc-detail-val { flex: 1; min-width: 0; color: #1a1a2e; word-break: break-all; line-height: 1.5; }
.mc-val { margin: 0; font-size: 12px; background: #f6f8fb; border-radius: 8px; padding: 8px; max-height: 200px; overflow-y: auto; }

/* 移动端缓存多选勾选框 + 确认弹层 + 表单行（补充局部未定义样式） */
.mc-sel {
  flex-shrink: 0;
  width: 22px; height: 22px;
  border: 1.5px solid #cbd5e1;
  border-radius: 6px;
  margin-right: 10px;
  margin-top: 2px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; color: transparent;
}
.mc-sel.on { background: #2f6bf0; border-color: #2f6bf0; color: #fff; }
.mc-confirm-text { font-size: 14px; color: #666; line-height: 1.6; word-break: break-all; }
.mc-form-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; }
.mc-form-row label { width: 56px; flex-shrink: 0; color: #666; }
.mc-form-row input { flex: 1; min-width: 0; border: 1px solid #e5e8f0; border-radius: 8px; padding: 8px 10px; font-size: 13px; }
</style>
