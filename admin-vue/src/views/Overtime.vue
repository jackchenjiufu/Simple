<template>
  <div>
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
              <div :style="{width: Math.min(parseFloat(u.total_hours||0) * 8, 60) + 'px', height:'8px', background:'linear-gradient(90deg,#3071f6,#5b8df9)', borderRadius:'4px'}"></div>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px;text-align:center;padding:20px">暂无数据</div>
        </el-card>
      </el-col>
    </el-row>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无加班记录">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="用户" width="120">
        <template #default="{row}">{{ row.nickname || row.username || '未知' }}</template>
      </el-table-column>
      <el-table-column prop="date" label="日期" width="110" />
      <el-table-column prop="hours" label="加班时长(h)" width="100" />
      <el-table-column prop="rate" label="时薪(元)" width="90" />
      <el-table-column prop="multiplier" label="倍数" width="70" />
      <el-table-column prop="salary" label="加班费" width="100">
        <template #default="{row}">{{ (row.salary||0).toFixed(2) }}</template>
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
            <el-form-item label="时薪(元)" required><el-input-number v-model="form.rate" :min="0" :step="5" style="width:100%" /></el-form-item>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const list = ref([]), loading = ref(true)
const showForm = ref(false), saving = ref(false), isEdit = ref(false)
const form = ref({ user_id: 0, date: '', hours: 1, rate: 30, multiplier: 1.5, type: 'overtime', note: '' })
const filterUser = ref(null), filterMonth = ref('')
const users = ref([])
const chartData = ref({ monthly: [], ranking: [] })

const autoSalary = computed(() => (form.value.hours || 0) * (form.value.rate || 0) * (form.value.multiplier || 1))

const summary = computed(() => {
  const rows = list.value
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
    const params = { month: filterMonth.value || new Date().toISOString().slice(0, 7) }
    if (filterUser.value) params.user_id = filterUser.value
    const [lr, cr] = await Promise.all([
      api.get('/admin_overtime.php', { params }),
      api.get('/admin_overtime.php', { params: { type: 'chart' } })
    ])
    if (lr.data.code === 200) list.value = lr.data.data || []
    if (cr.data.code === 200) chartData.value = cr.data.data || { monthly: [], ranking: [] }
  } catch (e) { /* ignore */ }
  loading.value = false
}

const loadUsers = async () => {
  try {
    const r = await api.get('/admin_users.php')
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

onMounted(() => { filterMonth.value = new Date().toISOString().slice(0, 7); load(); loadUsers() })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.header-controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
</style>
