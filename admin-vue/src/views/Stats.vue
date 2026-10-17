<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <div style="flex:1;font-weight:700;font-size:16px;color:#1a1a2e;line-height:38px">数据统计</div>
        <div class="mc-fbtn" @click="loadAll">{{ loading ? '加载中...' : '刷新' }}</div>
      </div>

      <div class="mc-list">
        <!-- 核心指标 -->
        <div class="mc-sec">核心指标</div>
        <div class="mc-grid">
          <div v-for="s in cards" :key="s.label" class="mc-card mc-stat">
            <div class="mc-stat-icon" :style="{ background: s.grad }">
              <el-icon :size="18"><component :is="s.icon" /></el-icon>
            </div>
            <div class="mc-stat-info">
              <div class="mc-stat-value">{{ s.value }}</div>
              <div class="mc-stat-label">{{ s.label }}</div>
              <div v-if="s.sub" class="mc-stat-sub">{{ s.sub }}</div>
            </div>
          </div>
        </div>

        <!-- 注册趋势 -->
        <div class="mc-sec">注册趋势</div>
        <div class="mc-card">
          <div v-if="userGrowth.length" class="mc-bars">
            <div v-for="d in userGrowth" :key="d.date" class="mc-bar">
              <div class="mc-bar-val">{{ d.count }}</div>
              <div class="mc-bar-track">
                <div class="mc-bar-fill" :style="{ background: '#2f6bf0', height: Math.max(d.count * 40, 4) + 'px' }"></div>
              </div>
              <div class="mc-bar-label">{{ d.date.slice(5) }}</div>
            </div>
          </div>
          <div v-else class="mc-tip">暂无数据</div>
        </div>

        <!-- 图片分类分布 -->
        <div class="mc-sec">图片分类分布<em v-if="catData.total"> · 共 {{ catData.total }} 张 / 推荐 {{ catData.recommended_total }}</em></div>
        <div class="mc-card">
          <div v-if="catData.distribution.length" class="mc-cat">
            <div v-for="item in catData.distribution" :key="item.category" class="mc-cat-row">
              <div class="mc-cat-label">{{ item.category }}</div>
              <div class="mc-cat-count">{{ item.count }} 张<el-tag v-if="item.recommended > 0" size="small" type="success" style="margin-left:6px">{{ item.recommended }} 推荐</el-tag></div>
              <div class="mc-cat-progress"><div class="mc-cat-progress-fill" :style="{ width: catPct(item.count) + '%', background: item.recommended > 0 ? '#7c3aed' : '#2f6bf0' }"></div></div>
            </div>
          </div>
          <div v-else class="mc-tip">暂无图片</div>
        </div>

        <!-- 用户行为统计 -->
        <div class="mc-sec">用户行为统计</div>
        <div class="mc-card">
          <div class="mc-stat-value" style="font-size:22px">{{ (behStats.total || 0).toLocaleString() }}</div>
          <div class="mc-stat-sub" style="font-size:12px;color:#8a94a6;margin:2px 0 10px">行为总数</div>
          <div v-if="behStats.by_type.length" class="mc-cat">
            <div v-for="b in behStats.by_type" :key="b.type" class="mc-cat-row">
              <div class="mc-cat-label">{{ typeLabel(b.type) }}</div>
              <div class="mc-cat-count">{{ b.count.toLocaleString() }}</div>
              <div class="mc-cat-progress"><div class="mc-cat-progress-fill" :style="{ width: behPct(b.count) + '%', background: behColor(b.type) }"></div></div>
            </div>
          </div>
          <div v-else class="mc-tip">暂无行为数据</div>
        </div>

        <!-- 版本下载 -->
        <div class="mc-sec">版本下载量（近 7 日）</div>
        <div class="mc-card">
          <div v-if="downloadTrend.length" class="mc-bars">
            <div v-for="d in downloadTrend" :key="d.date" class="mc-bar">
              <div class="mc-bar-val">{{ d.count }}</div>
              <div class="mc-bar-track">
                <div class="mc-bar-fill" :style="{ background: '#0aa26b', height: Math.max(d.count * 40, 4) + 'px' }"></div>
              </div>
              <div class="mc-bar-label">{{ d.date.slice(5) }}</div>
            </div>
          </div>
          <div v-else class="mc-tip">暂无数据</div>
        </div>

        <!-- 版本包统计（APK / 热更新 / 最新版） -->
        <div class="mc-sec">版本发布概览</div>
        <div class="mc-grid">
          <div class="mc-card mc-stat">
            <div class="mc-stat-value">{{ versionStats.apk || 0 }}</div>
            <div class="mc-stat-label">APK 完整包</div>
          </div>
          <div class="mc-card mc-stat">
            <div class="mc-stat-value">{{ versionStats.wgt || 0 }}</div>
            <div class="mc-stat-label">WGT 热更新</div>
          </div>
          <div class="mc-card mc-stat">
            <div class="mc-stat-value" style="font-size:14px">{{ versionStats.latest || '-' }}</div>
            <div class="mc-stat-label">最新版本号</div>
          </div>
        </div>

        <!-- 最近动态（新用户注册） -->
        <div class="mc-sec">最近动态</div>
        <div class="mc-card">
          <div v-if="recentActs.length" class="mc-cat">
            <div v-for="(a, i) in recentActs" :key="i" class="mc-cat-row" style="padding:6px 0;border-bottom:1px solid #f5f5f5">
              <div style="font-size:13px;color:#333">{{ a.text }}</div>
              <div style="font-size:11px;color:#909399">{{ a.created_at }}</div>
            </div>
          </div>
          <div v-else class="mc-tip" style="padding:20px 0">暂无动态</div>
        </div>

      </div>
    </div>

    <!-- ==================== 桌面端（原有，保留） ==================== -->
    <template v-else>
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

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue"
import { User, Files, ChatDotSquare, Document, Warning, Picture, DataLine, Connection, Star, Clock } from '@element-plus/icons-vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()
const loading = ref(false)
const cards = ref([])
const userGrowth = ref([])
const catData = ref({ distribution: [], total: 0, recommended_total: 0 })
const behStats = ref({ by_type: [], trend: [], total: 0 })
const downloadTrend = ref([])
const versionStats = ref({ apk: 0, wgt: 0, latest: '-' })
const recentActs = ref([])

const catPct = (n) => Math.round((n || 0) / (Math.max(1, catData.value.total)) * 100)
const behTrendMax = computed(() => Math.max(1, ...(behStats.value.trend || []).map(t => t.count)))
const behPct = (n) => Math.min(100, Math.round((n || 0) / Math.max(1, behStats.value.total) * 100))
const behColor = (t) => ({ content_click: '#2f6bf0', page_view: '#0aa26b', page_stay: '#e6a23c', rec_view: '#7c3aed' }[t] || '#909399')
const typeLabel = (t) => ({ content_click: '内容点击', page_view: '页面浏览', page_stay: '页面停留', rec_view: '推荐曝光' }[t] || t)

const loadAll = async () => {
  loading.value = true
  try {
    const [sr, fr, vr, ar, dr, catR, behR] = await Promise.all([
      api.get('/admin_stats.php'),
      api.get('/admin_feedback.php', { params: { limit: 1 } }),
      api.get('/get_versions.php'),
      api.get('/admin_articles.php', { params: { limit: 1 } }),
      api.get('/admin_stats.php', { params: { type: 'version_downloads' } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_stats.php', { params: { type: 'category_dist' } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_stats.php', { params: { type: 'behavior_stats' } }).catch(() => ({ data: { code: 500 } }))
    ])

    if (sr.data.code === 200) {
      const d = sr.data.data
      cards.value = [
        { value: (d.total_users || 0).toLocaleString(), label: '用户总数', sub: `今日 +${d.today_users || 0}`, icon: User, grad: '#2563eb' },
        { value: (d.total_images ?? d.total_content ?? 0).toLocaleString(), label: '图片内容', sub: d.today_content ? `今日 +${d.today_content}` : '', icon: Picture, grad: '#7c3aed' },
        { value: d.recommended ?? '-', label: '推荐池', sub: `${d.total_follows || 0} 关注`, icon: Files, grad: '#0891b2' },
        { value: (d.total_articles || 0).toLocaleString(), label: '文章总数', icon: Document, grad: '#d97706' },
        { value: (d.total_comments || 0).toLocaleString(), label: '评论数', icon: ChatDotSquare, grad: '#059669' },
        { value: (d.total_reports || 0).toLocaleString(), label: '举报数', icon: Warning, grad: '#dc2626' },
        { value: (d.total_behaviors || 0).toLocaleString(), label: '行为数据', icon: DataLine, grad: '#0d9488' },
        { value: (d.total_likes || 0).toLocaleString(), label: '内容点赞', sub: 'Goo 生态', icon: Star, grad: '#eab308' },
        { value: (d.total_browse_history || 0).toLocaleString(), label: '浏览历史', sub: 'Goo 生态', icon: Clock, grad: '#f97316' },
        { value: fr.data?.total || 0, label: '反馈总数', sub: `${d.pending_feedback || 0} 待处理`, icon: Warning, grad: '#dc2626' },
        { value: (d.total_messages || 0).toLocaleString(), label: '私信数', icon: Connection, grad: '#64748b' }
      ]
      userGrowth.value = (d.user_growth || []).slice(-7)
      recentActs.value = d.recent_activities || []
    }

    if (dr.data.code === 200) downloadTrend.value = dr.data.data || []
    if (catR.data.code === 200) catData.value = catR.data.data || catData.value
    if (behR.data.code === 200) behStats.value = behR.data.data || behStats.value

    if (vr.data.code === 200) {
      const list = vr.data.data || []
      versionStats.value.apk = list.filter(v => v.type === 'apk').length
      versionStats.value.wgt = list.filter(v => v.type !== 'apk').length
      versionStats.value.latest = list[0]?.version || '-'
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}

// 自动刷新：60 秒一次，保证统计实时
let autoTimer = null
onMounted(() => { loadAll(); autoTimer = setInterval(loadAll, 60000) })
onUnmounted(() => { if (autoTimer) clearInterval(autoTimer) })
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

/* ================= 移动端统计卡片补充样式（配合全局 mc-*） ================= */
.mc-sec {
  font-size: 13px; font-weight: 600; color: #5a6475;
  margin: 16px 4px 8px;
}
.mc-sec em { font-style: normal; font-weight: 400; color: #a0a8b5; font-size: 12px; }
.mc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.mc-stat {
  margin-bottom: 0;
  display: flex; align-items: center; gap: 10px;
  cursor: default;
}
.mc-stat-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(30,50,120,.18);
}
.mc-stat-info { min-width: 0; }
.mc-stat-value { font-size: 18px; font-weight: 800; color: #1a1a2e; line-height: 1.2; }
.mc-stat-label { font-size: 12px; color: #98a1b5; margin-top: 2px; }
.mc-stat-sub { font-size: 10px; color: #b0b4bd; margin-top: 1px; }

.mc-bars {
  display: flex; align-items: flex-end; gap: 8px;
  height: 150px; padding: 0 4px;
}
.mc-bar {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: flex-end; height: 100%;
}
.mc-bar-val { font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600; }
.mc-bar-track {
  width: 70%; display: flex; align-items: flex-end;
  height: 110px; justify-content: center;
}
.mc-bar-fill { width: 100%; border-radius: 3px 3px 0 0; }
.mc-bar-label { font-size: 10px; color: #909399; margin-top: 6px; }

.mc-cat { display: flex; flex-direction: column; gap: 10px; }
.mc-cat-row { display: flex; flex-direction: column; gap: 3px; }
.mc-cat-label { font-size: 13px; color: #555; }
.mc-cat-count { font-size: 12px; font-weight: 600; color: #1b44a6; text-align: right; position: relative; }
.mc-cat-progress {
  height: 8px; background: #eef1f6; border-radius: 5px; overflow: hidden;
}
.mc-cat-progress-fill { height: 100%; border-radius: 5px; }

.mc-tbl { margin-bottom: 10px; cursor: default; }
.mc-tbl:last-child { margin-bottom: 0; }
.mc-tbl-name { font-size: 14px; font-weight: 600; color: #1a1a2e; }
.mc-tbl-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 6px; font-size: 12px; color: #98a1b5;
}
</style>
