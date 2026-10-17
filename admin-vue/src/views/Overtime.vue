<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view / 窄屏 <768px） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <input v-model="filterMonth" type="month" class="mc-search" @change="load" />
        <div class="mc-fbtn" @click="load">刷新</div>
        <div class="mc-fbtn" @click="openForm({})">新增加班</div>
      </div>
      <div class="mc-filters">
        <select v-model="filterUser" class="mc-select" @change="load">
          <option :value="null">全部用户</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nickname || u.username }}</option>
        </select>
      </div>

      <!-- 移动端：加班统计概览（补桌面端功能） -->
      <div class="mc-card">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">统</div>
          <div class="mc-card-info"><div class="mc-title">加班统计</div><div class="mc-meta">总计 / 月度趋势 / 排名</div></div>
        </div>
        <div class="mc-grid" style="grid-template-columns:repeat(4,1fr);gap:8px">
          <div class="mc-stat-cell" style="background:#eef4ff;border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:16px;font-weight:700;color:#3071f6">{{ summary.total_hours }}</div>
            <div style="font-size:10px;color:#909399;margin-top:2px">总时长(h)</div>
          </div>
          <div class="mc-stat-cell" style="background:#e8f7ef;border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:16px;font-weight:700;color:#67c23a">{{ summary.total_days }}</div>
            <div style="font-size:10px;color:#909399;margin-top:2px">天数</div>
          </div>
          <div class="mc-stat-cell" style="background:#fff3e8;border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:16px;font-weight:700;color:#e6a23c">¥{{ summary.total_salary }}</div>
            <div style="font-size:10px;color:#909399;margin-top:2px">加班费</div>
          </div>
          <div class="mc-stat-cell" style="background:#f3f4f6;border-radius:8px;padding:8px;text-align:center">
            <div style="font-size:16px;font-weight:700;color:#909399">{{ summary.comp_hours }}</div>
            <div style="font-size:10px;color:#909399;margin-top:2px">调休(h)</div>
          </div>
        </div>
      </div>

      <!-- 移动端：月度加班趋势（近12月） -->
      <div class="mc-card">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">月</div>
          <div class="mc-card-info"><div class="mc-title">月度加班趋势</div><div class="mc-meta">近 12 个月</div></div>
        </div>
        <div v-if="chartData.monthly.length" class="mc-bars" style="display:flex;align-items:flex-end;gap:6px;height:140px;padding:0 2px">
          <div v-for="m in chartData.monthly" :key="m.ym" style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
            <span style="font-size:10px;color:#666;margin-bottom:2px">{{ parseFloat(m.ot_hours || 0) > 0 ? m.ot_hours : '' }}</span>
            <div :style="{height: Math.max(parseFloat(m.ot_hours||0) * 7, parseFloat(m.comp_hours||0) > 0 ? 2 : 0) + 'px', width:'100%', background:'#3071f6', borderRadius:'3px 3px 0 0', opacity:0.75}"></div>
            <div v-if="parseFloat(m.comp_hours||0) > 0" :style="{height: Math.max(parseFloat(m.comp_hours||0) * 7, 2) + 'px', width:'100%', background:'#e6a23c', borderRadius:'3px 3px 0 0', marginTop:'2px', opacity:0.7}"></div>
            <span style="font-size:9px;color:#999;margin-top:4px;writing-mode:vertical-lr">{{ String(m.ym).slice(5) }}月</span>
          </div>
        </div>
        <div v-else class="mc-data" style="text-align:center;padding:14px">暂无数据</div>
        <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:#909399">
          <span><span style="display:inline-block;width:12px;height:12px;background:#3071f6;border-radius:2px;margin-right:4px;vertical-align:middle"></span>加班费</span>
          <span><span style="display:inline-block;width:12px;height:12px;background:#e6a23c;border-radius:2px;margin-right:4px;vertical-align:middle"></span>调休</span>
        </div>
      </div>

      <!-- 移动端：加班排名（本年） -->
      <div class="mc-card">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">排</div>
          <div class="mc-card-info"><div class="mc-title">加班排名</div><div class="mc-meta">本年度</div></div>
        </div>
        <div v-if="chartData.ranking.length">
          <div v-for="(u,i) in chartData.ranking.slice(0,8)" :key="u.user_id" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f5f5f5">
            <span style="width:18px;font-size:12px;font-weight:600;color:#909399;text-align:center">{{ i+1 }}</span>
            <span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ u.nickname || u.username || '未知' }}</span>
            <span style="font-size:12px;color:#3071f6;font-weight:600;width:44px;text-align:right">{{ parseFloat(u.total_hours||0).toFixed(1) }}h</span>
            <div :style="{width: Math.min(parseFloat(u.total_hours||0) * 8, 60) + 'px', height:'8px', background:'#2f6bf0', borderRadius:'3px'}"></div>
          </div>
        </div>
        <div v-else class="mc-data" style="text-align:center;padding:14px">暂无数据</div>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无加班记录</div>
        <div v-for="row in list" :key="row.id" class="mc-card">
          <div class="mc-card-top">
            <div class="mc-thumb">{{ (row.nickname || row.username || '?').slice(0, 1) }}</div>
            <div class="mc-card-info">
              <div class="mc-title">{{ row.nickname || row.username || '用户#' + row.user_id }}</div>
              <div class="mc-meta">{{ row.date }} · {{ parseFloat(row.hours || 0).toFixed(1) }} 小时</div>
              <div class="mc-data">时薪 ¥{{ parseFloat(row.rate || 0).toFixed(2) }} × {{ parseFloat(row.multiplier || 1).toFixed(1) }} = ¥{{ (parseFloat(row.salary || 0)).toFixed(2) }}</div>
            </div>
            <span class="mc-mod" :class="row.type === 'comp' ? 'm-pending' : 'm-safe'">{{ row.type === 'comp' ? '调休' : '加班费' }}</span>
          </div>
          <div class="mc-tags" v-if="row.note">
            <span class="mc-tag">{{ row.note }}</span>
          </div>
          <div v-if="row.created_at" class="mc-data" style="margin-top:8px;font-size:11px">创建于 {{ row.created_at }}</div>
          <div class="mc-actions">
            <span class="mc-act" @click.stop="openDetail(row)">查看详情</span>
            <span class="mc-act" @click.stop="openForm(row)">编辑</span>
            <span class="mc-act danger" @click.stop="del(row)">删除</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 移动端新增/编辑弹层 -->
      <div class="mc-mask" v-if="showForm" @click="showForm = false">
        <div class="mc-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>{{ isEdit ? '编辑加班记录' : '新增加班记录' }}</span>
            <span class="mc-close" @click="showForm = false">✕</span>
          </div>
          <div class="mc-form-row">
            <label>用户</label>
            <select v-model="form.user_id" :disabled="isEdit" class="mc-select">
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.nickname || u.username }}</option>
            </select>
          </div>
          <div class="mc-form-row">
            <label>日期</label>
            <input v-model="form.date" type="date" class="mc-search" />
          </div>
          <div class="mc-form-row">
            <label>时长(h)</label>
            <input v-model.number="form.hours" type="number" step="0.5" min="0.5" max="24" class="mc-search" />
          </div>
          <div class="mc-form-row">
            <label>时薪(元)</label>
            <input v-model.number="form.rate" type="number" step="5" min="0.01" class="mc-search" />
          </div>
          <div class="mc-form-row">
            <label>倍数</label>
            <input v-model.number="form.multiplier" type="number" step="0.5" min="1" max="3" class="mc-search" />
          </div>
          <div class="mc-form-row">
            <label>类型</label>
            <select v-model="form.type" class="mc-select">
              <option value="overtime">加班费</option>
              <option value="comp">调休</option>
            </select>
          </div>
          <div class="mc-form-row">
            <label>备注</label>
            <input v-model="form.note" class="mc-search" placeholder="例如：周末项目加班" />
          </div>
          <button class="mc-save" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>

      <!-- 移动端详情弹层 -->
      <div class="mc-mask" v-if="showDetail" @click="showDetail = false">
        <div class="mc-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>加班详情</span>
            <span class="mc-close" @click="showDetail = false">✕</span>
          </div>
          <div class="mc-form-row"><label>ID</label><span>{{ detailRow.id ?? '-' }}</span></div>
          <div class="mc-form-row"><label>用户</label><span>{{ detailRow.nickname || detailRow.username || '用户#' + detailRow.user_id }}</span></div>
          <div class="mc-form-row"><label>用户 ID</label><span>{{ detailRow.user_id ?? '-' }}</span></div>
          <div class="mc-form-row"><label>日期</label><span>{{ detailRow.date || '-' }}</span></div>
          <div class="mc-form-row"><label>时长 (小时)</label><span>{{ parseFloat(detailRow.hours || 0).toFixed(1) }}</span></div>
          <div class="mc-form-row"><label>时薪 (元)</label><span>¥{{ parseFloat(detailRow.rate || 0).toFixed(2) }}</span></div>
          <div class="mc-form-row"><label>倍数</label><span>{{ parseFloat(detailRow.multiplier || 1).toFixed(1) }}</span></div>
          <div class="mc-form-row"><label>加班费</label><span style="font-weight:700;color:#3071f6">¥{{ parseFloat(detailRow.salary || 0).toFixed(2) }}</span></div>
          <div class="mc-form-row">
            <label>类型</label>
            <span><span class="mc-mod" :class="detailRow.type === 'comp' ? 'm-pending' : 'm-safe'">{{ detailRow.type === 'comp' ? '调休' : '加班费' }}</span></span>
          </div>
          <div class="mc-form-row"><label>备注</label><span>{{ detailRow.note || '—' }}</span></div>
          <div class="mc-form-row"><label>创建时间</label><span>{{ detailRow.created_at || '—' }}</span></div>
          <button class="mc-save" @click="openForm(detailRow); showDetail = false">编辑该记录</button>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端（原有，保留表格） ==================== -->
    <template v-else>
    <div class="header-row">
      <h2 style="margin:0">加班管理</h2>
      <div class="header-controls">
        <el-select v-model="filterUser" placeholder="选择用户" clearable size="small" style="width:160px" @change="load">
          <el-option v-for="u in users" :key="u.id" :value="u.id" :label="(u.nickname||u.username)+' (ID:'+u.id+')'" />
        </el-select>
        <el-date-picker v-model="filterMonth" type="month" value-format="YYYY-MM" size="small" style="width:140px" @change="load" />
        <el-button size="small" @click="load">刷新</el-button>
        <el-button type="primary" size="small" :disabled="!filterUser" @click="openForm({})">新增加班</el-button>
      </div>
    </div>

    <!-- 总计卡片 -->
    <el-row :gutter="16" style="margin-top:12px">
      <el-col :span="6">
        <el-card shadow="never" :body-style="{padding:'12px 16px',textAlign:'center'}">
          <div style="font-size:24px;font-weight:700;color:#3071f6">{{ summary.total_hours }}</div>
          <div style="font-size:12px;color:#909399;margin-top:4px">总加班时长(h)</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" :body-style="{padding:'12px 16px',textAlign:'center'}">
          <div style="font-size:24px;font-weight:700;color:#67c23a">{{ summary.total_days }}</div>
          <div style="font-size:12px;color:#909399;margin-top:4px">加班天数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" :body-style="{padding:'12px 16px',textAlign:'center'}">
          <div style="font-size:24px;font-weight:700;color:#e6a23c">¥{{ summary.total_salary }}</div>
          <div style="font-size:12px;color:#909399;margin-top:4px">总加班费</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never" :body-style="{padding:'12px 16px',textAlign:'center'}">
          <div style="font-size:24px;font-weight:700;color:#909399">{{ summary.comp_hours }}</div>
          <div style="font-size:12px;color:#909399;margin-top:4px">调休小时</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区 -->
    <el-row :gutter="16" style="margin-top:16px">
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>月度加班趋势（近12月）</template>
          <div v-if="chartData.monthly.length" style="display:flex;align-items:flex-end;gap:6px;height:160px;padding:0 4px">
            <div v-for="m in chartData.monthly" :key="m.ym" style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
              <span style="font-size:10px;color:#666;margin-bottom:2px">{{ parseFloat(m.ot_hours || 0) > 0 ? m.ot_hours : '' }}</span>
              <div :style="{height: Math.max(parseFloat(m.ot_hours||0) * 8, parseFloat(m.comp_hours||0) > 0 ? 2 : 0) + 'px', width:'100%', background:'#3071f6', borderRadius:'3px 3px 0 0', opacity:0.75}"></div>
              <div v-if="parseFloat(m.comp_hours||0) > 0" :style="{height: Math.max(parseFloat(m.comp_hours||0) * 8, 2) + 'px', width:'100%', background:'#e6a23c', borderRadius:'3px 3px 0 0', marginTop:'2px', opacity:0.7}"></div>
              <span style="font-size:10px;color:#999;margin-top:4px;writing-mode:vertical-lr;font-size:9px">{{ m.ym.slice(5) }}月</span>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px;text-align:center;padding:20px">暂无数据</div>
          <div style="display:flex;gap:16px;margin-top:8px;font-size:12px;color:#909399;justify-content:center">
            <span><span style="display:inline-block;width:12px;height:12px;background:#3071f6;border-radius:2px;margin-right:4px;vertical-align:middle"></span>加班费</span>
            <span><span style="display:inline-block;width:12px;height:12px;background:#e6a23c;border-radius:2px;margin-right:4px;vertical-align:middle"></span>调休</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>用户加班排名（本年）</template>
          <div v-if="chartData.ranking.length">
            <div v-for="(u,i) in chartData.ranking.slice(0,8)" :key="u.user_id" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f5f5f5">
              <span style="width:18px;font-size:12px;font-weight:600;color:#909399;text-align:center">{{ i+1 }}</span>
              <span style="flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ u.nickname || u.username || '未知' }}</span>
              <span style="font-size:12px;color:#3071f6;font-weight:600;width:50px;text-align:right">{{ parseFloat(u.total_hours||0).toFixed(1) }}h</span>
              <div :style="{width: Math.min(parseFloat(u.total_hours||0) * 8, 60) + 'px', height:'8px', background:'#2f6bf0', borderRadius:'3px'}"></div>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px;text-align:center;padding:20px">暂无数据</div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="allData" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无加班记录">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="用户" width="120">
        <template #default="{row}">{{ row.nickname || row.username || '未知' }}</template>
      </el-table-column>
      <el-table-column prop="date" label="日期" width="110" />
      <el-table-column prop="hours" label="加班时长(h)" width="100" />
      <el-table-column prop="rate" label="时薪(元)" width="90" />
      <el-table-column prop="multiplier" label="倍数" width="70" />
      <el-table-column prop="salary" label="加班费" width="100">
        <template #default="{row}">{{ parseFloat(row.salary||0).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{row}">
          <el-tag :type="row.type==='comp'?'warning':'primary'" size="small">{{ row.type==='comp'?'调休':'加班费' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="note" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-popconfirm title="删除此加班记录？" @confirm="del(row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showForm" :title="isEdit?'编辑加班记录':'新增加班记录'" width="500px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="用户">
          <el-select v-model="form.user_id" :disabled="isEdit" style="width:100%">
            <el-option v-for="u in users" :key="u.id" :value="u.id" :label="(u.nickname||u.username)+' (ID:'+u.id+')'" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" required>
          <el-date-picker v-model="form.date" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="时长(h)" required><el-input-number v-model="form.hours" :min="0.5" :max="24" :step="0.5" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="时薪(元)" required><el-input-number v-model="form.rate" :min="0.01" :step="5" style="width:100%" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="倍数"><el-input-number v-model="form.multiplier" :min="1" :max="3" :step="0.5" style="width:100%" /></el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="overtime">加班费</el-radio>
            <el-radio value="comp">调休</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.note" placeholder="例如：周末项目加班" />
        </el-form-item>
        <el-form-item label="加班费">
          <span style="font-size:16px;font-weight:600;color:#3071f6">¥ {{ autoSalary.toFixed(2) }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const loading = ref(true)
// 全量数据（一次加载，后端不分页），移动端按页切片展示
const allData = ref([])
const currentPage = ref(1)
const pageSize = ref(12)
const list = computed(() => allData.value.slice(0, currentPage.value * pageSize.value))
const total = computed(() => allData.value.length)

const showForm = ref(false), saving = ref(false), isEdit = ref(false)
const showDetail = ref(false)
const detailRow = ref({})
const form = ref({ user_id: 0, date: '', hours: 1, rate: 30, multiplier: 1.5, type: 'overtime', note: '' })
const filterUser = ref(null), filterMonth = ref('')
const users = ref([])
const chartData = ref({ monthly: [], ranking: [] })

const autoSalary = computed(() => (form.value.hours || 0) * (form.value.rate || 0) * (form.value.multiplier || 1))

const summary = computed(() => {
  const rows = allData.value
  let totalHours = 0, totalSalary = 0, compHours = 0
  const daySet = new Set()
  for (const r of rows) {
    if (r.type === 'comp') {
      compHours += parseFloat(r.hours) || 0
    } else {
      totalHours += parseFloat(r.hours) || 0
      totalSalary += parseFloat(r.salary) || 0
      daySet.add(r.date)
    }
  }
  return {
    total_hours: totalHours.toFixed(1),
    total_days: daySet.size,
    total_salary: totalSalary.toFixed(2),
    comp_hours: compHours.toFixed(1)
  }
})

const load = async () => {
  loading.value = true
  try {
    const now = new Date(); const localMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); const params = { month: filterMonth.value || localMonth }
    if (filterUser.value) params.user_id = filterUser.value
    const [lr, cr] = await Promise.all([
      api.get('/admin_overtime.php', { params }),
      api.get('/admin_overtime.php', { params: { type: 'chart' } })
    ])
    if (lr.data.code === 200) { allData.value = lr.data.data || []; currentPage.value = 1 }
    if (cr.data.code === 200) chartData.value = cr.data.data || { monthly: [], ranking: [] }
  } catch (e) { /* ignore */ }
  loading.value = false
}

const loadUsers = async () => {
  try {
    const r = await api.get('/admin_users.php', { params: { limit: 100 } })
    if (r.data.code === 200) users.value = r.data.data || []
  } catch (e) { /* ignore */ }
}

const openForm = (row) => {
  isEdit.value = !!row.id
  if (row.id) {
    form.value = {
      id: row.id, user_id: row.user_id, date: row.date,
      hours: parseFloat(row.hours) || 1, rate: parseFloat(row.rate) || 30,
      multiplier: parseFloat(row.multiplier) || 1.5, type: row.type || 'overtime', note: row.note || ''
    }
  } else {
    form.value = { user_id: filterUser.value || 0, date: '', hours: 1, rate: 30, multiplier: 1.5, type: 'overtime', note: '' }
  }
  showForm.value = true
}

const openDetail = (row) => { detailRow.value = row || {}; showDetail.value = true }

const save = async () => {
  if (!form.value.user_id) { ElMessage.warning('请选择用户'); return }
  if (!form.value.date) { ElMessage.warning('请选择日期'); return }
  saving.value = true
  try {
    if (isEdit.value) {
      await api.put('/admin_overtime.php', form.value)
      ElMessage.success('已更新')
    } else {
      await api.post('/admin_overtime.php', form.value)
      ElMessage.success('已添加')
    }
    showForm.value = false
    load()
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}

const del = async (row) => {
  try {
    await api.delete('/admin_overtime.php', { data: { id: row.id } })
    ElMessage.success('已删除')
    load()
  } catch (e) { ElMessage.error('删除失败') }
}

// ===== 移动端上拉加载（数据已一次取回，客户端分页切片） =====
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  await new Promise(r => setTimeout(r, 250)) // 轻量延时避免快速连发
  currentPage.value += 1
  mLoadingMore.value = false
}
// 滚动到底部（距底40px）自动加载下一页（滚动容器 .admin-main）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}

onMounted(() => {
  const now = new Date(); filterMonth.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
  load(); loadUsers()
  document.addEventListener('scroll', onScroll, true)
})
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
