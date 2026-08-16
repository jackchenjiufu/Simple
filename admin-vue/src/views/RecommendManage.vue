<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">内容推荐管理</h2>
      <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <!-- 概览 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">图片内容</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ overview?.total ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">参与推荐 {{ overview?.recommended_on ?? '-' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">点击行为</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ overview?.behavior_count?.toLocaleString() ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">次 content_click</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">活跃用户</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ overview?.behavior_users ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">有行为记录</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">点击率 CTR</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#2f6bf0">{{ overview?.ctr ?? '-' }}%</div>
          <div style="font-size:12px;color:#909399">点击 / 曝光</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 算法信息 + 行为分布 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <span>推荐算法（融合版 v1.0）</span>
      </template>
      <el-row :gutter="16">
        <el-col :span="12">
          <div style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:100px">算法公式</span><code>{{ overview?.algorithm?.weights }}</code></div>
            <div><span style="color:#999;display:inline-block;width:100px">行为权重</span>{{ overview?.algorithm?.behavior_weights }}</div>
            <div><span style="color:#999;display:inline-block;width:100px">时间衰减</span>{{ overview?.algorithm?.decay_days }} 天半衰 · 分类打散 ≤ {{ overview?.algorithm?.mmr_limit }} 条</div>
          </div>
        </el-col>
        <el-col :span="12">
          <div style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:100px">内容点击</span>{{ overview?.behavior?.content_click?.toLocaleString() }}</div>
            <div><span style="color:#999;display:inline-block;width:100px">页面浏览</span>{{ overview?.behavior?.page_view?.toLocaleString() }} · 停留 {{ overview?.behavior?.page_stay?.toLocaleString() }}</div>
            <div><span style="color:#999;display:inline-block;width:100px">推荐曝光</span>{{ overview?.behavior?.rec_view?.toLocaleString() }} · 活跃用户 {{ overview?.behavior_users }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 算法参数手调 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>推荐算法参数（可手调，实时生效）</span>
          <div style="display:flex;gap:8px">
            <el-button size="small" text :loading="algoLoading" @click="loadAlgoConfig">重置为当前</el-button>
            <el-button size="small" type="primary" :loading="savingAlgo" @click="saveAlgoConfig">保存参数</el-button>
          </div>
        </div>
      </template>
      <el-form :model="algo" label-width="110px" size="small" style="max-width:860px">
        <el-divider content-position="left" style="margin:0 0 10px">融合权重（合计 ≈ 1）</el-divider>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="内容匹配 CB"><el-input-number v-model="algo.w_cb" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="UserCF"><el-input-number v-model="algo.w_cf" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="ItemCF"><el-input-number v-model="algo.w_itemcf" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="热度 Hot"><el-input-number v-model="algo.w_hot" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left" style="margin:0 0 10px">探索比例（按行为量动态取档）</el-divider>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="冷启动"><el-input-number v-model="algo.explore_cold" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="成长期"><el-input-number v-model="algo.explore_grow" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="成熟期"><el-input-number v-model="algo.explore_mature" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="每屏条数(0=不限)"><el-input-number v-model="algo.total_need" :min="0" :max="200" :step="10" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left" style="margin:0 0 10px">行为权重与衰减</el-divider>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="点击权重"><el-input-number v-model="algo.w_click" :min="0" :max="50" :step="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="停留上限"><el-input-number v-model="algo.w_stay_max" :min="1" :max="20" :step="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="浏览权重"><el-input-number v-model="algo.w_view" :min="0" :max="10" :step="0.5" :precision="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="衰减天数"><el-input-number v-model="algo.decay_days" :min="1" :max="180" :step="5" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <div style="font-size:12px;color:#909399;margin-top:4px">
          保存后推荐缓存自动清空，下一次请求立即按新参数出结果。当前公式：
          <code>{{ algoText }}</code>
        </div>
      </el-form>
    </el-card>

    <el-row :gutter="16">
      <!-- 热门 TOP10 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>热门图片 TOP10（按点击）</template>
          <el-table :data="overview?.hot_top || []" size="small" max-height="440">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip>
              <template #default="{row}">
                <div style="display:flex;align-items:center;gap:8px">
                  <el-image :src="row.image_url" style="width:36px;height:36px;border-radius:4px" fit="cover" />
                  <span>{{ row.title || '(无标题)' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="点击" width="70" align="right">
              <template #default="{row}">{{ row.click_cnt }}</template>
            </el-table-column>
            <el-table-column label="推荐" width="70">
              <template #default="{row}">
                <el-tag :type="row.recommended == 1 ? 'success' : 'info'" size="small">{{ row.recommended == 1 ? '在池' : '移出' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 推荐池管理 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>推荐池（图片内容）</span>
              <div style="display:flex;gap:8px">
                <el-input v-model="search" placeholder="搜索标题" size="small" style="width:140px" clearable @keyup.enter="loadContents" />
                <el-select v-model="source" placeholder="全部来源" size="small" style="width:110px" clearable @change="loadContents">
                  <el-option label="Doo App" value="doo" />
                  <el-option label="Goo 迁移" value="goo" />
                </el-select>
                <el-select v-model="category" placeholder="全部分类" size="small" style="width:130px" clearable @change="loadContents">
                  <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
                </el-select>
                <el-button size="small" @click="loadContents">查询</el-button>
              </div>
            </div>
          </template>
          <el-table :data="contents" size="small" max-height="440">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="图片" width="80">
              <template #default="{row}"><el-image :src="row.image_url" style="width:52px;height:52px;border-radius:4px" fit="cover" /></template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
            <el-table-column label="来源" width="90">
              <template #default="{row}">
                <el-tag :type="row.source === 'goo' ? 'warning' : 'primary'" size="small" effect="plain">{{ row.source === 'goo' ? 'Goo 迁移' : 'Doo' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分类" width="90" />
            <el-table-column label="AI 标签" min-width="130">
              <template #default="{row}">
                <div v-if="row.tags && row.tags !== ''" style="display:flex;flex-wrap:wrap;gap:3px">
                  <el-tag v-for="t in safeTags(row.tags)" :key="t" size="small" type="info" effect="plain" style="margin:1px 0">{{ t }}</el-tag>
                </div>
                <span v-else style="color:#c0c4cc;font-size:12px">—</span>
              </template>
            </el-table-column>
            <el-table-column label="AI 打标" width="85" align="center">
              <template #default="{row}">
                <el-button size="small" type="primary" link :loading="tagging === row.id" @click="tagOne(row)">AI 打标</el-button>
              </template>
            </el-table-column>
            <el-table-column label="点击" width="70" align="right">
              <template #default="{row}">{{ row.click_cnt }}</template>
            </el-table-column>
            <el-table-column label="参与推荐" width="90">
              <template #default="{row}">
                <el-switch :model-value="row.recommended == 1" :loading="toggling === row.id" @change="(v) => toggleRecommend(row, v)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 相似图片组（按类别） -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>相似图片组（按类别分组）</span>
          <span style="font-size:12px;color:#909399">共 {{ groups?.total_categories ?? '-' }} 类 · {{ groups?.total_items ?? '-' }} 张图片</span>
        </div>
      </template>
      <el-empty v-if="groups && (!groups.groups || !groups.groups.length)" description="暂无内容" />
      <div v-else style="display:flex;flex-direction:column;gap:12px">
        <el-card v-for="g in groups?.groups || []" :key="g.category" shadow="never" style="border:1px solid #f0f2f5">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
            <span style="font-weight:600;font-size:14px;color:#222a47">{{ g.category }}（{{ g.size }} 张）</span>
            <span>
              <el-tag size="small" type="success" style="margin-right:6px">推荐 {{ g.recommended_count }}</el-tag>
              <el-tag size="small" type="warning">点击 {{ g.click_total }}</el-tag>
            </span>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div v-for="it in g.items" :key="it.id" style="width:120px;text-align:center">
              <el-image :src="it.image_url" style="width:120px;height:120px;border-radius:8px" fit="cover" :preview-src-list="[it.image_url]" preview-teleported />
              <div style="font-size:12px;color:#666;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ it.title }}</div>
              <div style="font-size:11px;color:#999">点击 {{ it.click_cnt }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- 视觉指纹去重（独立功能：同源图识别 + 一键去重） -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>视觉指纹去重（pHash 同源图识别）</span>
          <span style="font-size:12px;color:#909399">指纹 {{ fp?.total_fingerprints ?? '-' }} · 同源组 {{ fp?.groups?.length ?? '-' }} · 未分组 {{ fp?.ungrouped ?? '-' }}</span>
        </div>
      </template>
      <el-empty v-if="fp && (!fp.groups || !fp.groups.length)" description="暂无同源图组（cron 指纹任务每小时增量，每天 4:20 SIFT 复核）" />
      <div v-else style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 12px;background:#f7f8fa;border-radius:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <el-checkbox v-model="selectAllFp" :indeterminate="fpIndeterminate" @change="onSelectAllFp">
              全选需去重组（{{ needDedupCount }} 组）
            </el-checkbox>
            <span style="font-size:12px;color:#909399">已选 {{ selectedGroups.length }} 组</span>
          </div>
          <div>
            <el-button size="small" type="primary" :disabled="!selectedGroups.length" :loading="batchDeduping" @click="dedupSelected">
              去重所选（{{ selectedGroups.length }}）
            </el-button>
            <el-button size="small" type="danger" :disabled="!needDedupCount" :loading="batchDeduping" @click="dedupAllGroups">
              全部一键去重（{{ needDedupCount }} 组）
            </el-button>
          </div>
        </div>
        <el-card v-for="g in fp?.groups || []" :key="'fp-'+g.group_id" shadow="never" style="border:1px solid #f0f2f5">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
            <span style="font-weight:600;font-size:14px;color:#222a47">
              <el-checkbox v-model="selectedGroups" :value="g.group_id" :disabled="g.recommended_count <= 1" style="margin-right:6px" />
              同源组 {{ g.group_id }}（{{ g.size }} 张）
            </span>
            <span>
              <el-tag v-if="g.recommended_count > 1" type="danger" size="small" style="margin-right:6px">{{ g.recommended_count }} 张在推荐池（需去重）</el-tag>
              <el-tag v-else type="success" size="small" style="margin-right:6px">已去重</el-tag>
              <el-button v-if="g.recommended_count > 1" size="small" type="danger" :loading="deduping === g.group_id" @click="dedupGroup(g.group_id)">一键去重</el-button>
            </span>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div v-for="it in g.items" :key="it.id" style="width:120px;text-align:center">
              <el-image :src="it.image_url" style="width:120px;height:120px;border-radius:8px" fit="cover" :preview-src-list="[it.image_url]" preview-teleported />
              <div style="font-size:12px;color:#666;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ it.title }}</div>
              <el-tag :type="it.recommended ? 'success' : 'info'" size="small" style="margin-top:2px">{{ it.recommended ? '推荐中' : '已移出' }}</el-tag>
            </div>
          </div>
          <el-divider v-if="g.pairs.length" style="margin:8px 0" />
          <div v-for="(p, pi) in g.pairs" :key="'p'+pi" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px">
            <span style="color:#555">{{ fpNameOf(g, p.a) }} ↔ {{ fpNameOf(g, p.b) }}</span>
            <span :style="{ color: p.similarity >= 90 ? '#e64340' : '#2f6bf0', fontWeight: 600 }">{{ p.similarity }}%</span>
          </div>
        </el-card>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const loading = ref(false)
const overview = ref(null)
const contents = ref([])
const categories = ref([])
const search = ref('')
const category = ref('')
const source = ref('')
const toggling = ref(0)
const groups = ref(null)
const fp = ref(null)
const deduping = ref(0)
const tagging = ref(0)
// 算法参数
const algo = ref({
  w_cb: 0.4, w_cf: 0.2, w_itemcf: 0.2, w_hot: 0.2,
  explore_cold: 0.5, explore_grow: 0.35, explore_mature: 0.2,
  total_need: 50, w_click: 10, w_stay_max: 5, w_view: 1, decay_days: 30
})
const algoLoading = ref(false)
const savingAlgo = ref(false)
const algoText = computed(() => {
  const a = algo.value
  return `CB ${Number(a.w_cb || 0).toFixed(2)} + UserCF ${Number(a.w_cf || 0).toFixed(2)} + ItemCF ${Number(a.w_itemcf || 0).toFixed(2)} + Hot ${Number(a.w_hot || 0).toFixed(2)}`
})

// 读取当前算法参数（服务器生效值）
const loadAlgoConfig = async () => {
  algoLoading.value = true
  try {
    const r = await api.get('/admin_recommend.php', { params: { action: 'algo_config' } })
    if (r.data.code === 200 && r.data.data?.algo) Object.assign(algo.value, r.data.data.algo)
  } catch (e) { /* ignore */ }
  algoLoading.value = false
}

// 保存算法参数
const saveAlgoConfig = async () => {
  savingAlgo.value = true
  try {
    const r = await api.post('/admin_recommend.php', { action: 'save_algo_config', ...algo.value })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadOverview() }
    else ElMessage.error(r.data.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  savingAlgo.value = false
}

// 解析 tags JSON（"[\"a\",\"b\"]" 或 "a,b"）
const safeTags = (raw) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : [] } catch (e) { return [] }
}

const tagOne = async (row) => {
  tagging.value = row.id
  try {
    const r = await api.post('/admin_recommend.php', { action: 'tag_one', id: row.id })
    if (r.data.code === 200) {
      row.category = r.data.data.category
      row.tags = JSON.stringify(r.data.data.tags)
      ElMessage.success(`已打标：${r.data.data.category}（${(r.data.data.tags || []).join('、')}）`)
    } else {
      ElMessage.error(r.data.message || '打标失败')
    }
  } catch (e) {
    ElMessage.error('请求失败')
  } finally {
    tagging.value = 0
    loadGroups()
  }
}

const loadGroups = async () => {
  try {
    const r = await api.get('/admin_recommend.php', { params: { action: 'groups' } })
    if (r.data.code === 200) groups.value = r.data.data
  } catch (e) { /* ignore */ }
}

const loadFingerprints = async () => {
  try {
    const r = await api.get('/admin_recommend.php', { params: { action: 'fingerprints' } })
    if (r.data.code === 200) fp.value = r.data.data
  } catch (e) { /* ignore */ }
}

const fpNameOf = (g, id) => {
  const it = (g.items || []).find(x => x.id === id)
  return it ? it.title : ('#' + id)
}

// 指纹组选择 + 批量/全部去重
const selectedGroups = ref([])
const selectAllFp = ref(false)
const batchDeduping = ref(false)
const needDedupCount = computed(() => (fp.value?.groups || []).filter(g => g.recommended_count > 1).length)
const fpIndeterminate = computed(() => selectedGroups.value.length > 0 && selectedGroups.value.length < needDedupCount.value)
const onSelectAllFp = (v) => {
  if (v) selectedGroups.value = (fp.value?.groups || []).filter(g => g.recommended_count > 1).map(g => g.group_id)
  else selectedGroups.value = []
}
const runDedup = async (payload, tip) => {
  batchDeduping.value = true
  try {
    const r = await api.post('/admin_recommend.php', { action: 'dedup', ...payload })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || '去重完成')
      selectedGroups.value = []
      selectAllFp.value = false
      await loadFingerprints()
      await loadOverview()
    } else {
      ElMessage.error(r.data.message || '去重失败')
    }
  } catch (e) { ElMessage.error('去重失败') }
  batchDeduping.value = false
}
const dedupSelected = async () => {
  if (!selectedGroups.value.length) return
  try {
    await ElMessageBox.confirm(`将对所选 ${selectedGroups.value.length} 组执行去重：每组保留点击最高的 1 张，其余同源图移出推荐池。确定？`, '去重所选组', { type: 'warning' })
  } catch (e) { return }
  await runDedup({ group_ids: selectedGroups.value })
}
const dedupAllGroups = async () => {
  try {
    await ElMessageBox.confirm(`将对全部 ${needDedupCount.value} 个需去重组执行去重：每组保留点击最高的 1 张，其余同源图移出推荐池。确定？`, '全部一键去重', { type: 'warning' })
  } catch (e) { return }
  await runDedup({ all: 1 })
}

const dedupGroup = async (gid) => {
  try {
    await ElMessageBox.confirm('去重规则：组内保留点击最高的 1 张，其余同源图移出推荐池。确定执行？', '一键去重', { type: 'warning' })
  } catch (e) { return }
  deduping.value = gid
  try {
    const r = await api.post('/admin_recommend.php', { action: 'dedup', group_id: gid })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || '去重完成')
      await loadFingerprints()
      await loadOverview()
    } else {
      ElMessage.error(r.data.message || '去重失败')
    }
  } catch (e) { ElMessage.error('去重失败') }
  deduping.value = 0
}

const loadOverview = async () => {
  try {
    const r = await api.get('/admin_recommend.php')
    if (r.data.code === 200) overview.value = r.data.data
  } catch (e) { /* ignore */ }
}

const loadContents = async () => {
  try {
    const r = await api.get('/admin_recommend.php', { params: { action: 'contents', search: search.value || undefined, category: category.value || undefined, source: source.value || undefined } })
    if (r.data.code === 200) {
      contents.value = r.data.data.items || []
      if (r.data.data.categories) categories.value = r.data.data.categories
    }
  } catch (e) { /* ignore */ }
}

const toggleRecommend = async (row, val) => {
  toggling.value = row.id
  try {
    const r = await api.post('/admin_recommend.php', { action: 'toggle', id: row.id, recommended: val ? 1 : 0 })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message)
      row.recommended = val ? 1 : 0
      loadOverview()
    } else {
      ElMessage.error(r.data.message || '操作失败')
    }
  } catch (e) { ElMessage.error('操作失败') }
  toggling.value = 0
}

const loadAll = async () => {
  loading.value = true
  await Promise.all([loadOverview(), loadContents(), loadGroups(), loadFingerprints(), loadAlgoConfig()])
  loading.value = false
}

onMounted(loadAll)
</script>
