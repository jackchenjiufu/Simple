<template>
  <div>
    <h2 style="margin-bottom:4px">数据统计</h2>
    <p style="color:#909399;font-size:13px;margin:0 0 16px">系统整体数据概览</p>

    <!-- 核心指标 -->
    <el-row :gutter="16">
      <el-col :span="4" v-for="s in cards" :key="s.label">
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: s.grad }">
            <el-icon :size="20"><component :is="s.icon" /></el-icon>
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
          <div v-if="userGrowth.length" style="display:flex;align-items:flex-end;gap:8px;height:180px;padding:0 8px">
            <div v-for="d in userGrowth" :key="d.date" style="flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end">
              <span style="font-size:11px;color:#666;margin-bottom:4px;font-weight:600">{{ d.count }}</span>
              <div :style="{height: Math.max(d.count * 40, 6) + 'px', width:'70%', background:'#2f6bf0', borderRadius:'3px 3px 0 0'}"></div>
              <span style="font-size:11px;color:#909399;margin-top:6px;writing-mode:horizontal-tb">{{ d.date.slice(5) }}</span>
            </div>
          </div>
          <div v-else style="color:#909399;text-align:center;padding:40px">暂无数据</div>
        </el-card>
      </el-col>

      <!-- 分布概览 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>数据分布</template>
          <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0">
            <div v-for="item in distItems" :key="item.label">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                <span>{{ item.label }}</span>
                <span style="font-weight:600;color:#1b44a6">{{ item.value }}（{{ item.pct }}%）</span>
              </div>
              <el-progress :percentage="item.pct" :color="item.color" :stroke-width="10" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top:16px">
      <!-- 7日版本下载量 -->
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>近 7 日版本下载量</template>
          <div v-if="downloadTrend.length" style="display:flex;align-items:flex-end;gap:8px;height:180px;padding:0 8px">
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
      <!-- 反馈统计 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>反馈统计</template>
          <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>待处理</span>
              <span style="font-weight:600;color:#e6a23c">{{ feedbackStats.pending }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>已回复</span>
              <span style="font-weight:600;color:#67c23a">{{ feedbackStats.replied }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>总计</span>
              <span style="font-weight:600;color:#1b44a6">{{ feedbackStats.total }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 版本统计 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>版本发布</template>
          <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>APK 版本</span>
              <span style="font-weight:600;color:#1b44a6">{{ versionStats.apk }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>WGT 热更新</span>
              <span style="font-weight:600;color:#67c23a">{{ versionStats.wgt }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>最新版本</span>
              <span style="font-weight:600;color:#1b44a6">v{{ versionStats.latest }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 系统信息 -->
      <el-col :span="8">
        <el-card shadow="never">
          <template #header>今日概览</template>
          <div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>今日新增用户</span>
              <span style="font-weight:600;color:#1b44a6">{{ todayStats.newUsers }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>今日新增内容</span>
              <span style="font-weight:600;color:#1b44a6">{{ todayStats.newContent }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>累计用户</span>
              <span style="font-weight:600;color:#1b44a6">{{ todayStats.totalUsers }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { User, Files, ChatDotRound, Document, Warning } from '@element-plus/icons-vue'
import api from '@/api'

const cards = ref([]), userGrowth = ref([]), distItems = ref([]), downloadTrend = ref([])
const feedbackStats = ref({ pending: 0, replied: 0, total: 0 })
const versionStats = ref({ apk: 0, wgt: 0, latest: '-' })
const todayStats = ref({ newUsers: 0, newContent: 0, totalUsers: 0 })

onMounted(async () => {
  try {
    const [sr, fr, vr, ar, mr, dr] = await Promise.all([
      api.get('/admin_stats.php'),
      api.get('/admin_feedback.php', { params: { limit: 1 } }),
      api.get('/get_versions.php'),
      api.get('/admin_articles.php', { params: { limit: 1 } }),
      api.get('/system_monitor.php', { params: { type: 'overview' } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_stats.php', { params: { type: 'version_downloads' } }).catch(() => ({ data: { code: 500 } }))
    ])

    // 核心指标
    if (sr.data.code === 200) {
      const d = sr.data.data
      cards.value = [
        { value: d.total_users || 0, label: '用户总数', sub: `今日 +${d.today_users || 0}`, icon: User, grad: '#2563eb' },
        { value: d.total_content || 0, label: '内容总数', sub: d.user_growth?.length ? `近7日 +${d.user_growth.reduce((a,b)=>a+parseInt(b.count||0),0)}` : '', icon: Files, grad: '#7c3aed' },
        { value: d.total_messages || 0, label: '私信总数', icon: ChatDotRound, grad: '#0891b2' },
        { value: ar.data?.total || 0, label: '文章总数', icon: Document, grad: '#d97706' },
        { value: fr.data?.total || 0, label: '反馈总数', icon: Warning, grad: '#dc2626' },
      ]

      // 注册趋势
      userGrowth.value = (d.user_growth || []).slice(-7)

      // 数据分布（按总量真实占比）
      const total = (d.total_users||0) + (d.total_content||0) + (d.total_messages||0) + (ar.data?.total||0) || 1
      const pctOf = (v) => Math.round((v||0) / total * 100)
      distItems.value = [
        { label: '用户量', value: d.total_users || 0, pct: pctOf(d.total_users), color: '#3071f6' },
        { label: '文章量', value: ar.data?.total || 0, pct: pctOf(ar.data?.total), color: '#00a862' },
        { label: '内容量', value: d.total_content || 0, pct: pctOf(d.total_content), color: '#67c23a' },
        { label: '私信量', value: d.total_messages || 0, pct: pctOf(d.total_messages), color: '#7c5cfc' },
      ]

      todayStats.value = {
        newUsers: d.today_users || 0,
        newContent: 0,
        totalUsers: d.total_users || 0
      }
    }

    // 反馈统计
    if (fr.data.code === 200) {
      feedbackStats.value.total = fr.data.total || 0
      const r2 = await api.get('/admin_feedback.php', { params: { status: 0, limit: 1 } }).catch(() => ({ data: { total: 0 } }))
      const r3 = await api.get('/admin_feedback.php', { params: { status: 2, limit: 1 } }).catch(() => ({ data: { total: 0 } }))
      feedbackStats.value.pending = r2.data?.total || 0
      feedbackStats.value.replied = r3.data?.total || 0
    }

    // 版本统计
    if (vr.data.code === 200) {
      const list = vr.data.data || []
      versionStats.value.apk = list.filter(v => v.update_type === 'apk').length
      versionStats.value.wgt = list.filter(v => v.update_type !== 'apk').length
      versionStats.value.latest = list[0]?.version || '-'
    }

    // 近 7 日版本下载量
    if (dr.data.code === 200) downloadTrend.value = dr.data.data || []

  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
.stat-card {
  background: #fff;
  border: 1px solid #eef0f6;
  border-radius: 12px;
  padding: 16px 14px;
  margin-bottom: 16px;
  display: flex; align-items: center; gap: 12px;
  transition: transform .2s, box-shadow .2s;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(20,30,80,.10); }
.stat-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(30,50,120,.18);
}
.stat-info { min-width: 0; }
.stat-value { font-size: 22px; font-weight: 800; color: #222a47; line-height: 1.2; }
.stat-label { font-size: 12px; color: #98a1b5; margin-top: 2px; }
.stat-sub { font-size: 11px; color: #b4bccf; margin-top: 1px; }
</style>
