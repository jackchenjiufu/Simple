<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-card" style="margin:12px">
        <div class="mc-card-top">
          <div class="mc-thumb">库</div>
          <div class="mc-card-info">
            <div class="mc-title">数据库管理</div>
            <div class="mc-meta">{{ dbInfo?.database || '-' }} · MySQL {{ dbInfo?.version || '' }}</div>
            <div class="mc-data">{{ dbInfo?.table_count ?? 0 }} 张表 · 数据 {{ formatSize(dbInfo?.total_data) }} · 索引 {{ formatSize(dbInfo?.total_index) }}</div>
          </div>
        </div>
      </div>

      <!-- SQL 执行入口（移动端补上桌面端缺失功能） -->
      <div class="mc-card" style="margin:12px;border:1px solid #e6edf8;background:linear-gradient(180deg,#f8fbff,#fff)">
        <div class="mc-card-top">
          <div class="mc-thumb" style="background:#eef4ff;color:#2f6bf0">SQL</div>
          <div class="mc-card-info" @click="sqlSheet=true">
            <div class="mc-title">SQL 执行</div>
            <div class="mc-meta">执行 SELECT / UPDATE / INSERT / DELETE 等语句</div>
            <div class="mc-data">写操作需确认并记入日志</div>
          </div>
          <span class="mc-act" style="flex:none;align-self:center" @click="sqlSheet=true">打开 ›</span>
        </div>
      </div>

      <div class="mc-toolbar">
        <input v-model="mobileFilter" class="mc-search" placeholder="搜索表名"
               @keyup.enter="resetMobile" />
        <div class="mc-fbtn" @click="resetMobile">搜索</div>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!mobileList.length" class="mc-tip">暂无数据</div>
        <div v-for="row in mobileList" :key="row.name" class="mc-card" @click="openStructure(row)">
          <div class="mc-card-top">
            <div class="mc-thumb">{{ row.name ? row.name[0].toUpperCase() : '?' }}</div>
            <div class="mc-card-info">
              <div class="mc-title"><code style="font-size:13px">{{ row.name }}</code></div>
              <div class="mc-meta">引擎 {{ row.engine || '-' }} · {{ row.collation || '' }}</div>
              <div class="mc-data">{{ Number(row.rows).toLocaleString() }} 行 · 数据 {{ formatSize(row.data_size) }} · 索引 {{ formatSize(row.index_size) }}</div>
            </div>
          </div>
          <div class="mc-actions">
            <span class="mc-act" @click.stop="openStructure(row)">结构</span>
            <span class="mc-act" @click.stop="openData(row)">数据</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && mobileList.length">没有更多了</div>
        <div class="mc-more" v-else-if="mobileList.length">上拉加载更多</div>
      </div>

      <!-- 表结构底部弹层（移动端） -->
      <div v-if="structureVisible" class="mc-mask" @click.self="structureVisible=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>表结构：{{ structureTable }}</span>
            <span class="mc-close" @click="structureVisible=false">✕</span>
          </div>
          <div class="mc-sheet-scroll">
            <div v-if="structure && structure.create_sql" style="margin-bottom:10px">
              <div style="font-size:13px;color:#555;margin-bottom:6px">CREATE TABLE 语句</div>
              <pre style="background:#f6f8fb;padding:10px;border-radius:6px;font-size:12px;max-height:150px;overflow:auto;margin:0;white-space:pre-wrap">{{ structure.create_sql }}</pre>
            </div>
            <div v-if="!structure" class="mc-tip">加载中...</div>
            <div v-else-if="!structure.columns || !structure.columns.length" class="mc-tip">暂无字段</div>
            <template v-else>
              <div v-for="(c,i) in structure.columns" :key="i" class="mc-card" style="margin-bottom:8px;padding:10px 12px">
                <div class="mc-card-top">
                  <div class="mc-card-info">
                    <div class="mc-title" style="font-family:monospace;font-size:14px">{{ c.Field || '-' }}</div>
                    <div class="mc-meta"><code>{{ c.Type || '-' }}</code><span v-if="c.Null === 'NO'"> · 非空</span></div>
                  </div>
                  <span v-if="c.Key" class="mc-mod m-pending">{{ c.Key }}</span>
                </div>
                <div class="mc-data" v-if="c.Comment">{{ c.Comment }}</div>
                <div class="mc-data">默认值：{{ c.Default ?? '-' }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 表数据底部弹层（移动端） -->
      <div v-if="dataVisible" class="mc-mask" @click.self="dataVisible=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>数据浏览：{{ dataTable }}</span>
            <span class="mc-close" @click="dataVisible=false">✕</span>
          </div>
          <div class="mc-sheet-scroll">
            <div v-if="dataLoading && !dataRows.length" class="mc-tip">加载中...</div>
            <div v-else-if="!dataRows.length" class="mc-tip">暂无数据</div>
            <div v-for="(row,i) in dataRows" :key="i" class="mc-card" style="margin-bottom:8px;padding:10px 12px">
              <div v-for="c in dataColumns" :key="c" class="mc-data" style="margin-top:3px;display:flex;gap:8px">
                <span style="color:#909399;flex-shrink:0;min-width:70px">{{ c }}</span>
                <span style="color:#333;word-break:break-all;flex:1">{{ fmtCell(row[c]) }}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
            <span class="mc-act" style="flex:1" :class="{disabled: dataPage<=1}" @click="prevDataPage">上一页</span>
            <span style="font-size:12px;color:#909399;text-align:center">{{ Number(dataTotal || 0).toLocaleString() }} 条</span>
            <span class="mc-act" style="flex:1" :class="{disabled: dataPage*dataLimit>=Number(dataTotal||0)}" @click="nextDataPage">下一页</span>
          </div>
        </div>
      </div>

      <!-- SQL 执行底部弹层（移动端） -->
      <div v-if="sqlSheet" class="mc-mask" @click.self="sqlSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>SQL 执行</span>
            <span class="mc-close" @click="sqlSheet=false">✕</span>
          </div>
          <div class="mc-sheet-scroll">
            <div style="font-size:12px;color:#909399;margin-bottom:8px">写操作（INSERT/UPDATE/DELETE/ALTER/DROP 等）需确认并记入日志</div>
            <textarea v-model="sql" rows="3" placeholder="输入 SQL，如 SELECT * FROM users LIMIT 10"
                      style="width:100%;box-sizing:border-box;font-family:monospace;font-size:13px;padding:10px;border:1px solid #e5e8f0;border-radius:8px;resize:vertical"></textarea>
            <div class="mc-actions" style="margin-top:10px">
              <span class="mc-act pinned" :class="{disabled: sqlRunning}" @click="runSqlMobile">执行</span>
            </div>
            <div v-if="sqlResult" style="margin-top:12px">
              <div style="font-size:12px;color:#909399;margin-bottom:6px">
                {{ sqlResult.msg }} <span v-if="sqlResult.data?.affected != null">（影响 {{ sqlResult.data.affected }} 行）</span>
              </div>
              <div v-if="sqlResult.data?.rows && sqlResult.data.rows.length" style="overflow:auto;border:1px solid #eef0f5;border-radius:8px">
                <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:max-content">
                  <thead>
                    <tr>
                      <th v-for="c in sqlResult.data.columns" :key="c" style="background:#f7f8fa;padding:6px 8px;border-bottom:1px solid #e5e8f0;white-space:nowrap;color:#555;text-align:left">{{ c }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r,i) in sqlResult.data.rows" :key="i">
                      <td v-for="c in sqlResult.data.columns" :key="c" style="padding:6px 8px;border-bottom:1px solid #f0f2f6;word-break:break-all;max-width:180px">{{ fmtCell(r[c]) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else-if="sqlResult.data?.rows" style="color:#909399;font-size:13px">（无数据）</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SQL 写操作确认（移动端底部弹出） -->
      <div v-if="sqlConfirm.show" class="mc-mask" @click.self="sqlConfirm.show=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>危险操作确认</span>
            <span class="mc-close" @click="sqlConfirm.show=false">✕</span>
          </div>
          <div class="mc-confirm-text" style="font-size:14px;color:#666;line-height:1.6">执行写操作将修改数据库并记录日志，确认执行？</div>
          <div class="mc-actions" style="margin-top:18px">
            <span class="mc-act" @click="sqlConfirm.show=false">取消</span>
            <span class="mc-act danger" :class="{disabled: sqlRunning}" @click="doRunSql">确认执行</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">数据库管理</h2>
      <el-button size="small" :loading="loading" @click="loadOverview">刷新</el-button>
    </div>

    <!-- 概览 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">数据库</div>
          <div style="margin-top:6px;font-size:15px;font-weight:600;color:#222a47">{{ dbInfo?.database || '-' }}</div>
          <div style="font-size:12px;color:#909399">MySQL {{ dbInfo?.version || '' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">数据表</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ dbInfo?.table_count ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">张表</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">数据大小</div>
          <div style="margin-top:6px;font-size:15px;font-weight:600;color:#222a47">{{ formatSize(dbInfo?.total_data) }}</div>
          <div style="font-size:12px;color:#909399">索引 {{ formatSize(dbInfo?.total_index) }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">SQL 执行</div>
          <div style="margin-top:6px;font-size:13px;color:#555">
            只读语句直接执行；<span style="color:#b88230">写语句需确认并记入日志</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- SQL 执行 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>SQL 执行</span>
          <el-button size="small" type="primary" :loading="sqlRunning" @click="runSql">执行</el-button>
        </div>
      </template>
      <el-input
        v-model="sql"
        type="textarea"
        :rows="3"
        placeholder="输入 SQL，如 SELECT * FROM users LIMIT 10；写操作（INSERT/UPDATE/DELETE/ALTER 等）需在弹窗中确认"
        style="font-family:monospace;font-size:13px"
      />
      <div v-if="sqlResult" style="margin-top:12px">
        <div style="font-size:12px;color:#909399;margin-bottom:6px">
          {{ sqlResult.msg }} <span v-if="sqlResult.data?.affected != null">（影响 {{ sqlResult.data.affected }} 行）</span>
        </div>
        <el-table v-if="sqlResult.data?.rows?.length" :data="sqlResult.data.rows" size="small" max-height="300" border>
          <el-table-column v-for="c in sqlResult.data.columns" :key="c" :prop="c" :label="c" min-width="120" show-overflow-tooltip />
        </el-table>
        <div v-else-if="sqlResult.data?.rows" style="color:#909399;font-size:13px">（无数据）</div>
      </div>
    </el-card>

    <!-- 表列表 -->
    <el-card shadow="never">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>数据表（{{ filteredTables.length }} / {{ tables.length }}）</span>
          <el-input v-model="tableFilter" placeholder="搜索表名" size="small" style="width:180px" clearable />
        </div>
      </template>
      <el-table :data="filteredTables" size="small" max-height="460">
        <el-table-column prop="name" label="表名" min-width="160" show-overflow-tooltip>
          <template #default="{row}">
            <code style="font-size:12px">{{ row.name }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="engine" label="引擎" width="80" />
        <el-table-column prop="rows" label="行数" width="90" align="right">
          <template #default="{row}">{{ Number(row.rows).toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="数据大小" width="100" align="right">
          <template #default="{row}">{{ formatSize(row.data_size) }}</template>
        </el-table-column>
        <el-table-column label="索引" width="90" align="right">
          <template #default="{row}">{{ formatSize(row.index_size) }}</template>
        </el-table-column>
        <el-table-column prop="collation" label="字符集" width="120" />
        <el-table-column label="操作" width="140">
          <template #default="{row}">
            <el-button size="small" text type="primary" @click="openStructure(row)">结构</el-button>
            <el-button size="small" text type="primary" @click="openData(row)">数据</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    </template>

    <!-- 表结构对话框（桌面端专用；移动端在 isMobile 分支内用 mc-sheet 底部弹层） -->
    <el-dialog v-if="!isMobile" v-model="structureVisible" :title="'表结构：' + structureTable" width="70%" top="6vh">
      <div v-if="structure" style="margin-bottom:12px">
        <div style="font-size:13px;color:#555;margin-bottom:6px">CREATE TABLE 语句</div>
        <pre style="background:#f6f8fb;padding:10px;border-radius:6px;font-size:12px;max-height:200px;overflow:auto;margin:0;white-space:pre-wrap">{{ structure.create_sql }}</pre>
      </div>
      <el-table v-if="structure && structure.columns && structure.columns.length" :data="structure.columns" size="small" max-height="360" :key="'struct-' + structureTable">
        <el-table-column prop="Field" label="字段" min-width="140" />
        <el-table-column prop="Type" label="类型" min-width="140" />
        <el-table-column prop="Null" label="NULL" width="60" />
        <el-table-column prop="Key" label="键" width="70" />
        <el-table-column prop="Default" label="默认值" min-width="100" />
        <el-table-column prop="Extra" label="额外" min-width="100" />
        <el-table-column prop="Comment" label="注释" min-width="140" show-overflow-tooltip />
      </el-table>
    </el-dialog>

    <!-- 表数据对话框（桌面端专用；移动端在 isMobile 分支内用 mc-sheet 底部弹层） -->
    <el-dialog v-if="!isMobile" v-model="dataVisible" :title="'数据浏览：' + dataTable" width="85%" top="4vh">
      <div style="margin-bottom:10px;font-size:13px;color:#555">
        共 {{ dataTotal.toLocaleString() }} 行
      </div>
      <el-table :data="dataRows" size="small" max-height="500" border :key="'data-' + dataTable" v-loading="dataLoading">
        <el-table-column v-for="c in dataColumns" :key="c" :prop="c" :label="c" min-width="110" show-overflow-tooltip />
      </el-table>
      <div style="margin-top:12px;display:flex;justify-content:flex-end">
        <el-pagination
          v-model:current-page="dataPage"
          :page-size="dataLimit"
          :total="dataTotal"
          layout="prev, pager, next"
          background
          small
          @current-change="loadData"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const loading = ref(false)
const dbInfo = ref(null)
const tables = ref([])
const tableFilter = ref('')

const sql = ref('')
const sqlRunning = ref(false)
const sqlResult = ref(null)

const structureVisible = ref(false)
const structureTable = ref('')
const structure = ref(null)

const dataVisible = ref(false)
const dataTable = ref('')
const dataColumns = ref([])
const dataRows = ref([])
const dataTotal = ref(0)
const dataPage = ref(1)
const dataLimit = 50
const dataLoading = ref(false)

const filteredTables = computed(() => {
  const q = tableFilter.value.trim().toLowerCase()
  return q ? tables.value.filter(t => t.name.toLowerCase().includes(q)) : tables.value
})

const formatSize = (b) => {
  if (b == null) return '-'
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}

const loadOverview = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_database.php')
    if (r.data.code === 200) {
      dbInfo.value = r.data.data
      tables.value = r.data.data.tables || []
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}

const runSql = async () => {
  const sqlText = sql.value.trim()
  if (!sqlText) { ElMessage.warning('请输入 SQL'); return }
  sqlRunning.value = true
  sqlResult.value = null
  try {
    const isWrite = !/^(SELECT|SHOW|DESC|DESCRIBE|EXPLAIN|PRAGMA)\b/i.test(sqlText)
    if (isWrite) {
      try {
        await ElMessageBox.confirm('执行写操作（INSERT/UPDATE/DELETE/ALTER/DROP 等）将修改数据库并记录日志，确认执行？', '危险操作确认', { type: 'warning' })
      } catch (e) { return }
    }
    const r = await api.post('/admin_database.php', { action: 'query', sql: sqlText, confirm: isWrite ? '1' : '0' })
    if (r.data.code === 200) {
      sqlResult.value = { msg: r.data.message, data: r.data.data }
      if (!isWrite) loadOverview()
    } else {
      sqlResult.value = { msg: r.data.message || '执行失败', data: null }
    }
  } catch (e) { ElMessage.error('执行失败') }
  sqlRunning.value = false
}

// ==================== 移动端 SQL 执行（补桌面端功能） ====================
const sqlSheet = ref(false)
const sqlConfirm = ref({ show: false })
const runSqlMobile = () => {
  const sqlText = sql.value.trim()
  if (!sqlText) { ElMessage.warning('请输入 SQL'); return }
  const isWrite = !/^(SELECT|SHOW|DESC|DESCRIBE|EXPLAIN|PRAGMA)\b/i.test(sqlText)
  if (isWrite) { sqlConfirm.value = { show: true }; return }
  doRunSql()
}
const doRunSql = async () => {
  const sqlText = sql.value.trim()
  if (!sqlText) { ElMessage.warning('请输入 SQL'); return }
  const isWrite = !/^(SELECT|SHOW|DESC|DESCRIBE|EXPLAIN|PRAGMA)\b/i.test(sqlText)
  sqlConfirm.value = { show: false }
  sqlRunning.value = true
  sqlResult.value = null
  try {
    const r = await api.post('/admin_database.php', { action: 'query', sql: sqlText, confirm: isWrite ? '1' : '0' })
    if (r.data.code === 200) {
      sqlResult.value = { msg: r.data.message, data: r.data.data }
      if (!isWrite) loadOverview()
    } else {
      sqlResult.value = { msg: r.data.message || '执行失败', data: null }
    }
  } catch (e) { ElMessage.error('执行失败') }
  sqlRunning.value = false
}

const openStructure = async (row) => {
  structureTable.value = row.name
  structureVisible.value = true
  structure.value = null
  try {
    const r = await api.get('/admin_database.php', { params: { action: 'structure', table: row.name } })
    if (r.data.code === 200) structure.value = r.data.data
    else ElMessage.error(r.data.message || '结构加载失败')
  } catch (e) { ElMessage.error('结构加载失败') }
}

const openData = (row) => {
  dataTable.value = row.name
  dataColumns.value = []
  dataRows.value = []
  dataTotal.value = 0
  dataPage.value = 1
  dataVisible.value = true
  loadData()
}

const loadData = async () => {
  dataLoading.value = true
  try {
    const r = await api.get('/admin_database.php', { params: { action: 'data', table: dataTable.value, page: dataPage.value, limit: dataLimit } })
    if (r.data.code === 200) {
      dataColumns.value = r.data.data.columns || []
      dataRows.value = r.data.data.rows || []
      dataTotal.value = r.data.data.total || 0
    } else {
      ElMessage.error(r.data.message || '数据加载失败')
    }
  } catch (e) { ElMessage.error('数据加载失败') }
  dataLoading.value = false
}

// 移动端数据弹层分页
const prevDataPage = () => { if (dataPage.value <= 1) return; dataPage.value -= 1; loadData() }
const nextDataPage = () => { if (dataPage.value * dataLimit >= Number(dataTotal.value || 0)) return; dataPage.value += 1; loadData() }

// 单元格兜底：null/undefined/空串 → '-'; 对象/数组 → JSON 字符串
const fmtCell = (v) => {
  if (v === null || v === undefined || v === '') return '-'
  if (typeof v === 'object') { try { return JSON.stringify(v) } catch (e) { return String(v) } }
  return String(v)
}

// ==================== 移动端：客户端分页 + 上拉加载 ====================
const mobileFilter = ref('')
const mobilePageSize = 20
const mobileCount = ref(mobilePageSize)

const mTables = computed(() => {
  const q = mobileFilter.value.trim().toLowerCase()
  return q ? tables.value.filter(t => (t.name || '').toLowerCase().includes(q)) : tables.value
})
const mobileList = computed(() => mTables.value.slice(0, mobileCount.value))
const hasMore = computed(() => mobileList.value.length < mTables.value.length)
const mLoadingMore = ref(false)

const resetMobile = () => { mobileCount.value = mobilePageSize }

const loadMore = () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  // 数据已在本地，做短暂延迟以呈现“加载中”并避免连触
  setTimeout(() => {
    mobileCount.value += mobilePageSize
    mLoadingMore.value = false
  }, 250)
}

const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}
onMounted(() => { loadOverview(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })
</script>

<style scoped>
/* 移动端底部弹层：内容超高时内部滚动 */
.mc-sheet-scroll { max-height: 62vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
/* 移动端分页不可用态 */
.mc-act.disabled { opacity: .45; pointer-events: none; }
</style>
