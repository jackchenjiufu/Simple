<template>
  <div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <h2 style="margin:0">数据统计</h2>
        <p style="color:#909399;font-size:13px;margin:4px 0 0">服务器全部数据总览</p>
      </div>
      <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <!-- 核心指标 -->
    <el-row :gutter="12">
      <el-col :span="3" v-for="s in cards" :key="s.label">
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: s.grad }">
            <el-icon :size="18"><component :is="s.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
            <div v-if="s.sub" class="stat-sub">{{ s.sub }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 注册趋势 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>近 7 日注册趋势</template>
          <div v-if="userGrowth.length" style="display:flex;align-items:flex-end;gap:8px;height:170px;padding:0 8px">
            <div v-for="d in userGrowth" :key="d.date" style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
              <span style="font-size:11px;color:#666;margin-bottom:4px;font-weight:600">{{ d.count }}</span>
              <div :style="{height: Math.max(d.count * 40, 6) + 'px', width:'70%', background:'#2f6bf0', borderRadius:'3px 3px 0 0'}"></div>
              <span style="font-size:11px;color:#909399;margin-top:6px">{{ d.date.slice(5) }}</span>
            </div>
          </div>
          <div v-else style="color:#909399;text-align:center;padding:40px">暂无数据</div>
        </el-card>
      </el-col>

      <!-- 图片分类分布 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>图片分类分布</span>
            <el-tag v-if="catData.total" size="small" style="margin-left:8px">共 {{ catData.total }} 张 · 推荐 {{ catData.recommended_total }}</el-tag>
          </template>
          <div v-if="catData.distribution.length" style="display:flex;flex-direction:column;gap:9px;padding:4px 0">
            <div v-for="item in catData.distribution" :key="item.category">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
                <span>{{ item.category }}</span>
                <span style="font-weight:600;color:#1b44a6">{{ item.count }} 张<el-tag v-if="item.recommended > 0" size="small" type="success" style="margin-left:6px">{{ item.recommended }} 推荐</el-tag></span>
              </div>
              <el-progress :percentage="catPct(item.count)" :stroke-width="9" :color="item.recommended > 0 ? '#7c3aed' : '#2f6bf0'" />
            </div>
          </div>
          <div v-else style="color:#909399;text-align:center;padding:40px">暂无图片</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 行为数据 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <span>用户行为统计</span>
            <el-tag size="small" style="margin-left:8px">总计 {{ behStats.total?.toLocaleString() }}</el-tag>
          </template>
          <div style="display:flex;flex-direction:column;gap:10px;padding:4px 0">
            <div v-for="b in behStats.by_type" :key="b.type" style="display:flex;align-items:center;gap:12px">
              <span style="width:110px;font-size:13px;color:#555;flex-shrink:0">{{ typeLabel(b.type) }}</span>
              <el-progress :percentage="behPct(b.count)" :stroke-width="9" :color="behColor(b.type)" style="flex:1" :format="() => b.count.toLocaleString()" />
            </div>
            <div v-if="!behStats.by_type.length" style="color:#909399;text-align:center;padding:20px">暂无行为数据</div>
          </div>
          <el-divider style="margin:12px 0" />
          <div style="display:flex;align-items:flex-end;gap:8px;height:90px;padding:0 8px">
            <div v-for="d in behStats.trend" :key="d.date" style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end" :title="d.date + '：' + d.count">
              <div :style="{height: Math.max(d.count / (behTrendMax||1) * 70, 3) + 'px', width:'65%', background:'#0aa26b', borderRadius:'3px 3px 0 0'}"></div>
              <span style="font-size:10px;color:#909399;margin-top:4px">{{ d.date.slice(5) }}</span>
            </div>
          </div>
          <div style="font-size:11px;color:#b4bccf;text-align:center;margin-top:4px">近 7 日行为趋势</div>
        </el-card>
      </el-col>

      <!-- 版本下载 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>近 7 日版本下载量</template>
          <div v-if="downloadTrend.length" style="display:flex;align-items:flex-end;gap:8px;height:170px;padding:0 8px">
            <div v-for="d in downloadTrend" :key="d.date" style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
              <span style="font-size:11px;color:#666;margin-bottom:4px;font-weight:600">{{ d.count }}</span>
              <div :style="{height: Math.max(d.count * 40, 6) + 'px', width:'70%', background:'#0aa26b', borderRadius:'3px 3px 0 0'}"></div>
              <span style="font-size:11px;color:#909399;margin-top:6px">{{ d.date.slice(5) }}</span>
            </div>
          </div>
          <div v-else style="color:#909399;text-align:center;padding:40px">暂无数据</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 表数据量 -->
      <el-col :span="24">
        <el-card shadow="never">
          <template #header>
            <span>数据库表数据量</span>
            <span style="margin-left:12px;font-size:12px;color:#909399">共 {{ tableStats.tables?.length || 0 }} 张表 · 总行数 {{ (tableStats.total_rows || 0).toLocaleString() }} · 总大小 {{ tableStats.total_mb || 0 }} MB</span>
          </template>
          <el-table :data="tableStats.tables || []" size="small" max-height="340" stripe>
            <el-table-column prop="name" label="表名" min-width="180" show-overflow-tooltip />
            <el-table-column label="行数" width="130" align="right">
              <template #default="{row}">{{ Number(row.row_count || row.rows || 0).toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="data_mb" label="数据(MB)" width="100" align="right" />
            <el-table-column prop="index_mb" label="索引(MB)" width="100" align="right" />
            <el-table-column prop="total_mb" label="合计(MB)" width="100" align="right">
              <template #default="{row}"><span style="font-weight:600;color:#1b44a6">{{ row.total_mb }}</span></template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { User, Files, ChatDotSquare, Document, Warning, Picture, DataLine, Connection, Star, Clock } from '@element-plus/icons-vue'
import api from '@/api'

const loading = ref(false)
const cards = ref([])
const userGrowth = ref([])
const catData = ref({ distribution: [], total: 0, recommended_total: 0 })
const behStats = ref({ by_type: [], trend: [], total: 0 })
const downloadTrend = ref([])
const tableStats = ref({ tables: [], total_rows: 0, total_mb: 0 })
const versionStats = ref({ apk: 0, wgt: 0, latest: '-' })

const catPct = (n) => Math.round((n || 0) / (Math.max(1, catData.value.total)) * 100)
const behTrendMax = computed(() => Math.max(1, ...(behStats.value.trend || []).map(t => t.count)))
const behPct = (n) => Math.min(100, Math.round((n || 0) / Math.max(1, behStats.value.total) * 100))
const behColor = (t) => ({ content_click: '#2f6bf0', page_view: '#0aa26b', page_stay: '#e6a23c', rec_view: '#7c3aed' }[t] || '#909399')
const typeLabel = (t) => ({ content_click: '内容点击', page_view: '页面浏览', page_stay: '页面停留', rec_view: '推荐曝光' }[t] || t)

const loadAll = async () => {
  loading.value = true
  try {
    const [sr, fr, vr, ar, dr, catR, behR, tblR] = await Promise.all([
      api.get('/admin_stats.php'),
      api.get('/admin_feedback.php', { params: { limit: 1 } }),
      api.get('/get_versions.php'),
      api.get('/admin_articles.php', { params: { limit: 1 } }),
      api.get('/admin_stats.php', { params: { type: 'version_downloads' } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_stats.php', { params: { type: 'category_dist' } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_stats.php', { params: { type: 'behavior_stats' } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_stats.php', { params: { type: 'table_stats' } }).catch(() => ({ data: { code: 500 } }))
    ])

    if (sr.data.code === 200) {
      const d = sr.data.data
      cards.value = [
        { value: (d.total_users || 0).toLocaleString(), label: '用户总数', sub: `今日 +${d.today_users || 0}`, icon: User, grad: '#2563eb' },
        { value: (d.total_images ?? d.total_content ?? 0).toLocaleString(), label: '图片内容', sub: d.today_content ? `今日 +${d.today_content}` : '', icon: Picture, grad: '#7c3aed' },
        { value: d.recommended ?? '-', label: '推荐池', sub: `${d.total_follows || 0} 关注`, icon: Files, grad: '#0891b2' },
        { value: (d.total_articles || 0).toLocaleString(), label: '文章总数', icon: Document, grad: '#d97706' },
        { value: (d.total_comments || 0).toLocaleString(), label: '评论数', icon: ChatDotSquare, grad: '#059669' },
        { value: (d.total_behaviors || 0).toLocaleString(), label: '行为数据', icon: DataLine, grad: '#0d9488' },
        { value: (d.total_likes || 0).toLocaleString(), label: '内容点赞', sub: 'Goo 生态', icon: Star, grad: '#eab308' },
        { value: (d.total_browse_history || 0).toLocaleString(), label: '浏览历史', sub: 'Goo 生态', icon: Clock, grad: '#f97316' },
        { value: fr.data?.total || 0, label: '反馈总数', sub: `${d.pending_feedback || 0} 待处理`, icon: Warning, grad: '#dc2626' },
        { value: (d.total_messages || 0).toLocaleString(), label: '私信数', icon: Connection, grad: '#64748b' }
      ]
      userGrowth.value = (d.user_growth || []).slice(-7)
    }

    if (dr.data.code === 200) downloadTrend.value = dr.data.data || []
    if (catR.data.code === 200) catData.value = catR.data.data || catData.value
    if (behR.data.code === 200) behStats.value = behR.data.data || behStats.value
    if (tblR.data.code === 200) tableStats.value = tblR.data.data || tableStats.value

    if (vr.data.code === 200) {
      const list = vr.data.data || []
      versionStats.value.apk = list.filter(v => v.type === 'apk').length
      versionStats.value.wgt = list.filter(v => v.type !== 'apk').length
      versionStats.value.latest = list[0]?.version || '-'
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}

onMounted(loadAll)
</script>

<style scoped>
.stat-card {
  background: #fff;
  border: 1px solid #eef0f6;
  border-radius: 12px;
  padding: 14px 12px;
  margin-bottom: 12px;
  display: flex; align-items: center; gap: 10px;
  transition: transform .2s, box-shadow .2s;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(20,30,80,.10); }
.stat-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(30,50,120,.18);
}
.stat-info { min-width: 0; }
.stat-value { font-size: 20px; font-weight: 800; color: #222a47; line-height: 1.2; }
.stat-label { font-size: 12px; color: #98a1b5; margin-top: 2px; }
.stat-sub { font-size: 11px; color: #b4bccf; margin-top: 1px; }
</style>