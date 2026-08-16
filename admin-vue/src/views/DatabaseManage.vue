<template>
  <div>
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

    <!-- 表结构对话框 -->
    <el-dialog v-model="structureVisible" :title="'表结构：' + structureTable" width="70%" top="6vh">
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

    <!-- 表数据对话框 -->
    <el-dialog v-model="dataVisible" :title="'数据浏览：' + dataTable" width="85%" top="4vh">
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
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

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
    const isWrite = !/^(SELECT|SHOW|DESC|DESCRIBE|EXPLAIN|PRAGMA)/i.test(sqlText)
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

onMounted(loadOverview)
</script>
