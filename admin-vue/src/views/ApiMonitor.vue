<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <div class="mc-search" style="pointer-events:none;opacity:.8">接口监控</div>
        <div class="mc-fbtn" @click="load">{{ refreshing ? '测试中...' : '立即测试' }}</div>
      </div>
      <div class="mc-filters">
        <div class="mc-stat" style="flex:1">
          <span :class="['dot', okAll ? 'dot-ok' : 'dot-bad']"></span>
          正常 {{ data.ok_count ?? '-' }}/{{ data.total_count ?? '-' }} · 总耗时 {{ data.total_ms ?? '-' }}ms
        </div>
      </div>
      <div class="mc-tip" style="padding:8px 4px 0;color:#909399;font-size:12px">
        每 {{ autoSec }}s 自动刷新 · 最近探测 {{ data.probed_at || '-' }}
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">测试中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无数据</div>
        <div v-for="(r, i) in list" :key="i" class="mc-card">
          <div class="mc-card-top">
            <div class="mc-title" style="flex:1">{{ r.name }}</div>
            <span class="mc-mod" :class="statusMod(r.status)">{{ statusLabel(r.status) }}</span>
          </div>
          <div class="mc-data" style="margin-top:6px">
            响应 <b :style="{ color: timeColor(r.time_ms) }">{{ r.time_ms }}ms</b>
            <span style="color:#b3b6bf"> · HTTP {{ r.http || '-' }}</span>
            <span style="color:#b3b6bf"> · 返回 {{ fmtSize(r.size) }}</span>
          </div>
          <div class="rt-bar rt-bar-lg" style="margin-top:8px"><div class="rt-fill" :style="{ width: barWidth(r.time_ms) + '%', background: barColor(r.time_ms) }"></div></div>
          <div class="mc-meta" style="margin-top:4px;color:#b3b6bf;font-size:12px">
            {{ r.method }} {{ shortUrl(r.url) }} · {{ r.time }}
          </div>
          <div v-if="r.error" class="mc-data" style="margin-top:4px;color:#e5484d;word-break:break-all">{{ r.error }}</div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格 ==================== -->
    <template v-else>
      <div class="header-row">
        <h2 style="margin:0">接口监控 · API 响应时间</h2>
        <div class="header-controls">
          <span v-if="data.probed_at" style="color:#909399;font-size:12px;margin-right:8px">最近 {{ data.probed_at }}</span>
          <el-switch v-model="auto" active-text="自动刷新" size="small" style="margin-right:12px" />
          <el-button type="primary" size="small" :loading="refreshing" @click="load">立即测试</el-button>
        </div>
      </div>

      <el-row :gutter="16" style="margin-top:12px">
        <el-col :span="8">
          <el-card shadow="never" body-style="padding:14px 18px">
            <div style="color:#909399;font-size:13px">接口总数</div>
            <div style="font-size:26px;font-weight:700">{{ data.total_count ?? '-' }}</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" body-style="padding:14px 18px">
            <div style="color:#909399;font-size:13px">正常 / 异常</div>
            <div style="font-size:26px;font-weight:700">
              <span style="color:#2ecc71">{{ data.ok_count ?? '-' }}</span>
              <span style="color:#c0c4cc"> / {{ (data.total_count ?? 0) - (data.ok_count ?? 0) }}</span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card shadow="never" body-style="padding:14px 18px">
            <div style="color:#909399;font-size:13px">一轮总耗时</div>
            <div style="font-size:26px;font-weight:700">{{ data.total_ms ?? '-' }}<span style="font-size:14px;color:#909399"> ms</span></div>
          </el-card>
        </el-col>
      </el-row>

      <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:16px" empty-text="暂无数据" :default-sort="{ prop: 'time_ms', order: 'descending' }">
        <el-table-column type="index" label="#" width="50" />
        <el-table-column prop="name" label="接口" min-width="120" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status==='ok'?'success':row.status==='warn'?'warning':row.status==='err'?'danger':'info'" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="time_ms" label="响应时间" width="230" sortable>
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <div class="rt-bar"><div class="rt-fill" :style="{ width: barWidth(row.time_ms) + '%', background: barColor(row.time_ms) }"></div></div>
              <b :style="{ color: timeColor(row.time_ms) }">{{ row.time_ms }} ms</b>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="http" label="HTTP" width="80">
          <template #default="{ row }">{{ row.http || '-' }}</template>
        </el-table-column>
        <el-table-column prop="size" label="返回大小" width="110">
          <template #default="{ row }">{{ fmtSize(row.size) }}</template>
        </el-table-column>
        <el-table-column prop="method" label="方法" width="80" />
        <el-table-column prop="url" label="端点" min-width="260" show-overflow-tooltip />
        <el-table-column prop="time" label="探测时间" width="90" />
        <el-table-column v-if="hasError" label="错误" min-width="180">
          <template #default="{ row }">{{ row.error || '' }}</template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()
const list = ref([])
const loading = ref(false)
const refreshing = ref(false)
const auto = ref(true)
const autoSec = 30
const data = ref({})
let timer = null

const hasError = computed(() => list.value.some(r => r.error))

const load = async () => {
  if (refreshing.value) return
  refreshing.value = true
  loading.value = true
  try {
    const r = await api.get('/admin_api_monitor.php')
    if (r.data.code === 200) {
      data.value = r.data.data || {}
      list.value = (r.data.data?.interfaces || []).slice().sort((a, b) => b.time_ms - a.time_ms)
    }
  } catch (e) {
    ElMessage.error('监控接口请求失败')
  }
  loading.value = false
  refreshing.value = false
}

const okAll = computed(() => (data.value.ok_count ?? 0) === (data.value.total_count ?? 0))
const statusLabel = (s) => ({ ok: '正常', warn: '偏慢', err: '异常', timeout: '超时' }[s] || s || '-')
const statusMod = (s) => ({ ok: 'm-safe', warn: 'm-warn', err: 'm-unsafe', timeout: 'm-unsafe' }[s] || 'm-safe')
const timeColor = (ms) => {
  const t = Number(ms)
  if (t > 2000) return '#e5484d'
  if (t > 500) return '#f59e0b'
  return '#10b981'
}
// 进度条：以 2000ms 为满度（>2s 满格变红）
const BAR_MAX = 2000
const barWidth = (ms) => Math.min(100, Math.max(0, (Number(ms) / BAR_MAX) * 100))
const barColor = (ms) => {
  const t = Number(ms)
  if (t > 2000) return 'linear-gradient(90deg,#f59e0b,#e5484d)'
  if (t > 500) return 'linear-gradient(90deg,#ffd666,#f59e0b)'
  if (t > 150) return 'linear-gradient(90deg,#a8e063,#56ab2f)'
  return 'linear-gradient(90deg,#9be0c3,#10b981)'
}
const fmtSize = (n) => {
  if (n == null) return '-'
  if (n > 1048576) return (n / 1048576).toFixed(1) + ' MB'
  if (n > 1024) return (n / 1024).toFixed(1) + ' KB'
  return n + ' B'
}
const shortUrl = (u = '') => u.replace(/^.*\/api\/v2\//, '')

onMounted(() => {
  load()
  if (auto.value) timer = setInterval(load, autoSec * 1000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.header-controls { display: flex; align-items: center; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.dot-ok { background: #2ecc71; }
.dot-bad { background: #e5484d; }
.mc-stat { font-size: 13px; color: #333; display: flex; align-items: center; }
.m-warn { background: #fdf6ec; color: #e6a23c; }
.m-unsafe { background: #fef0f0; color: #f56c6c; }
.rt-bar { flex: 1; min-width: 60px; height: 8px; border-radius: 6px; background: #eef0f4; overflow: hidden; position: relative; }
.rt-bar-lg { height: 10px; }
.rt-fill { height: 100%; border-radius: 6px; transition: width .35s ease; }
</style>
