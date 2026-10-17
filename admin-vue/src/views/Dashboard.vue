<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar" style="display:block;margin:12px 12px 6px">
        <div style="font-weight:700;font-size:17px;color:#1a1a2e">{{ greeting }}，{{ adminName }}</div>
        <div style="font-size:12px;color:#909399;margin-top:2px">{{ today }} · DOO 后台总览</div>
      </div>

      <div class="mc-list" style="padding-top:0">
        <!-- 统计卡（两列数字卡） -->
        <div class="mc-grid">
          <div
            v-for="s in visibleStatItems"
            :key="s.label"
            class="mc-card mc-stat"
            :class="{ 'is-link': !!s.path }"
            @click="s.path && router.push(s.path)"
          >
            <div class="mc-stat-icon" :style="{ background: s.grad }">
              <el-icon :size="18"><component :is="s.icon" /></el-icon>
            </div>
            <div class="mc-stat-info">
              <div class="mc-stat-value">{{ s.value }}</div>
              <div class="mc-stat-label">
                {{ s.label }}
                <el-badge v-if="s.badge" :value="s.badge" :hidden="!s.badge" class="stat-badge" />
              </div>
            </div>
          </div>
        </div>

        <template v-if="!isEditor">
          <!-- 近 7 日注册趋势 -->
          <div class="mc-sec">近 7 日注册趋势</div>
          <div class="mc-card">
            <div v-if="userGrowth.length" class="mc-bars">
              <div v-for="d in userGrowth" :key="d.date" class="mc-bar">
                <div class="mc-bar-val">{{ d.count }}</div>
                <div class="mc-bar-track"><div class="mc-bar-fill" :style="{ background: '#2f6bf0', height: Math.max((Number(d.count) || 0) * 40, 4) + 'px' }"></div></div>
                <div class="mc-bar-label">{{ (d.date || '').slice(5) }}</div>
              </div>
            </div>
            <div v-else class="mc-tip">暂无数据</div>
          </div>

          <!-- 近 7 日版本下载量 -->
          <div class="mc-sec">近 7 日版本下载量</div>
          <div class="mc-card">
            <div v-if="versionDownloads.length" class="mc-bars">
              <div v-for="d in versionDownloads" :key="d.date" class="mc-bar">
                <div class="mc-bar-val">{{ d.count }}</div>
                <div class="mc-bar-track"><div class="mc-bar-fill" :style="{ background: '#0aa26b', height: Math.max((Number(d.count) || 0) * 40, 4) + 'px' }"></div></div>
                <div class="mc-bar-label">{{ (d.date || '').slice(5) }}</div>
              </div>
            </div>
            <div v-else class="mc-tip">暂无数据</div>
          </div>

          <!-- 图片分类分布 -->
          <div class="mc-sec">图片分类分布（内容）</div>
          <div class="mc-card">
            <div v-if="categoryDist.length" class="mc-cat">
              <div v-for="c in categoryDist" :key="c.category" class="mc-cat-row">
                <div class="mc-cat-label">{{ c.category }}</div>
                <div class="mc-cat-count">
                  {{ Number(c.count) || 0 }} 张<span v-if="(Number(c.recommended) || 0) > 0" style="color:#7c3aed"> · 推荐 {{ Number(c.recommended) || 0 }}</span>
                </div>
                <div class="mc-cat-progress"><div class="mc-cat-progress-fill" :style="{ width: Math.round((Number(c.count) || 0) / categoryDistMax * 100) + '%', background: '#7c3aed' }"></div></div>
              </div>
            </div>
            <div v-else class="mc-tip">暂无图片数据</div>
          </div>

          <!-- 服务器状态 -->
          <div class="mc-sec">服务器状态</div>
          <div class="mc-card">
            <div v-if="serverInfo" class="mc-svr">
              <div class="mc-svr-row"><span class="mc-svr-label">PHP</span><span class="mc-svr-val">{{ serverInfo.php_version }}</span></div>
              <div class="mc-svr-row"><span class="mc-svr-label">数据库</span><span class="mc-svr-val">{{ serverInfo.db_version || 'MySQL' }}</span></div>
              <div class="mc-svr-row"><span class="mc-svr-label">连接数</span><span class="mc-svr-val">{{ serverInfo.db_connections || '-' }}</span></div>
              <div class="mc-svr-row"><span class="mc-svr-label">内存</span><span class="mc-svr-val">{{ serverInfo.memory_current }}</span></div>
              <div class="mc-svr-row"><span class="mc-svr-label">磁盘</span><span class="mc-svr-val">{{ serverInfo.disk_usage }}</span></div>
              <div class="mc-svr-row"><span class="mc-svr-label">数据表</span><span class="mc-svr-val">{{ serverInfo.table_count }} 张</span></div>
            </div>
            <div v-else class="mc-tip">加载中...</div>
          </div>

          <!-- 最近动态 -->
          <div class="mc-sec">最近动态</div>
          <div v-if="recentLogs.length" class="mc-card">
            <div v-for="log in recentLogs.slice(0, 8)" :key="log.id" class="mc-log">
              <span class="mc-mod" :class="log.type === 'admin' ? 'm-unsafe' : (log.type === 'login' ? 'm-pending' : 'm-safe')">{{ log.type }}</span>
              <div class="mc-log-main">
                <div class="mc-log-msg">{{ log.message || log.action || '-' }}</div>
                <div class="mc-log-time">{{ log.created_at?.substring(0, 16) }}</div>
              </div>
            </div>
          </div>
          <div v-else class="mc-card"><div class="mc-tip" style="padding:16px 0">暂无动态</div></div>

          <!-- 快速入口 -->
          <div class="mc-sec">快速入口</div>
          <div class="mc-quick">
            <span class="mc-act pinned" @click="$router.push('/users')">用户管理</span>
            <span class="mc-act pinned" @click="$router.push('/feedback')">反馈管理</span>
            <span class="mc-act pinned" @click="$router.push('/logs')">系统日志</span>
            <span class="mc-act pinned" @click="$router.push('/carousel')">轮播管理</span>
            <span class="mc-act pinned" @click="$router.push('/version')">版本管理</span>
            <span class="mc-act pinned" @click="$router.push('/permissions')">权限管理</span>
          </div>
        </template>
      </div>
    </div>

    <!-- ==================== 桌面端（原有，保留） ==================== -->
    <template v-else>
      <!-- 页面问候（克制排版，无装饰） -->
      <div class="page-greeting">
        <h2 class="greet-title">{{ greeting }}，{{ adminName }}</h2>
        <p class="greet-sub">{{ today }} · DOO 后台总览</p>
      </div>

      <!-- 顶部统计卡片 -->
      <el-row :gutter="16">
        <el-col :span="4" v-for="s in visibleStatItems" :key="s.label" class="stat-col">
          <div class="stat-card" :class="{ 'is-link': !!s.path }" @click="s.path && router.push(s.path)">
            <div class="stat-icon" :style="{ background: s.grad }">
              <el-icon :size="20"><component :is="s.icon" /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-label">
                {{ s.label }}
                <el-badge v-if="s.badge" :value="s.badge" :hidden="!s.badge" class="stat-badge" />
                <el-icon v-if="s.path" class="go-icon"><Right /></el-icon>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <!-- 左列：趋势 + 最近动态（editor 不显示） -->
        <el-col :span="16" v-if="!isEditor">
          <!-- 7日注册趋势 -->
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="card-head"><span class="head-dot" style="background:#3071f6"></span>近 7 日注册趋势</div>
            </template>
            <div v-if="userGrowth.length" class="chart-wrap">
              <el-tooltip v-for="d in userGrowth" :key="d.date" :content="d.date + '：' + d.count + ' 人'" placement="top">
                <div class="bar-col">
                  <span class="bar-num">{{ Number(d.count) || 0 }}</span>
                  <div class="bar" :style="{ height: Math.max((Number(d.count) || 0) * 30, 4) + 'px' }"></div>
                  <span class="bar-date">{{ (d.date || '').slice(5) }}</span>
                </div>
              </el-tooltip>
            </div>
            <div v-else class="empty-tip">暂无数据</div>
          </el-card>

          <!-- 7日版本下载量 -->
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="card-head"><span class="head-dot" style="background:#00a862"></span>近 7 日版本下载量</div>
            </template>
            <div v-if="versionDownloads.length" class="chart-wrap">
              <el-tooltip v-for="d in versionDownloads" :key="d.date" :content="d.date + '：' + d.count + ' 次'" placement="top">
                <div class="bar-col">
                  <span class="bar-num">{{ Number(d.count) || 0 }}</span>
                  <div class="bar bar-green" :style="{ height: Math.max((Number(d.count) || 0) * 30, 4) + 'px' }"></div>
                  <span class="bar-date">{{ (d.date || '').slice(5) }}</span>
                </div>
              </el-tooltip>
            </div>
            <div v-else class="empty-tip">暂无数据</div>
          </el-card>

          <!-- 图片分类分布 -->
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div class="card-head"><span class="head-dot" style="background:#7c3aed"></span>图片分类分布（内容）</div>
                <el-button size="small" text @click="loadCategoryDist">刷新</el-button>
              </div>
            </template>
            <div v-if="categoryDist.length" style="display:flex;flex-direction:column;gap:10px;padding:4px 0">
              <div v-for="c in categoryDist" :key="c.category">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
                  <span>{{ c.category }}</span>
                  <span style="font-weight:600;color:#6d28d9">
                    {{ Number(c.count) || 0 }} 张
                    <el-tag v-if="(Number(c.recommended) || 0) > 0" size="small" type="success" style="margin-left:6px">推荐 {{ Number(c.recommended) || 0 }}</el-tag>
                  </span>
                </div>
                <el-progress :percentage="Math.round((Number(c.count) || 0) / categoryDistMax * 100)" :stroke-width="8" color="#7c3aed" />
              </div>
            </div>
            <div v-else class="empty-tip">暂无图片数据</div>
          </el-card>

          <!-- 最近动态 -->
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="card-head"><span class="head-dot" style="background:#8b5cf6"></span>最近动态</div>
            </template>
            <div v-if="recentLogs.length">
              <div v-for="log in recentLogs.slice(0,8)" :key="log.id" class="log-row">
                <el-tag :type="log.type==='admin'?'danger':log.type==='login'?'warning':'info'" size="small" effect="light" round>{{ log.type }}</el-tag>
                <span class="log-time">{{ log.created_at?.substring(0,16) }}</span>
                <span class="log-msg">{{ log.message || log.action || '-' }}</span>
              </div>
            </div>
            <div v-else class="empty-tip">暂无动态</div>
          </el-card>
        </el-col>

        <!-- 右列：服务器状态 + 快速入口（editor 不显示） -->
        <el-col :span="8" v-if="!isEditor">
          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="card-head"><span class="head-dot" style="background:#06b6d4"></span>服务器状态</div>
            </template>
            <div v-if="serverInfo" class="server-list">
              <div class="server-row"><span class="sv-label">PHP</span><span class="sv-val">{{ serverInfo.php_version }}</span></div>
              <div class="server-row"><span class="sv-label">数据库</span><span class="sv-val">{{ serverInfo.db_version || 'MySQL' }}</span></div>
              <div class="server-row"><span class="sv-label">连接数</span><span class="sv-val">{{ serverInfo.db_connections || '-' }}</span></div>
              <div class="server-row"><span class="sv-label">内存</span><span class="sv-val">{{ serverInfo.memory_current }}</span></div>
              <div class="server-row"><span class="sv-label">磁盘</span><span class="sv-val">{{ serverInfo.disk_usage }}</span></div>
              <div class="server-row"><span class="sv-label">数据表</span><span class="sv-val">{{ serverInfo.table_count }} 张</span></div>
            </div>
            <div v-else class="empty-tip">加载中...</div>
          </el-card>

          <el-card shadow="never" class="panel-card">
            <template #header>
              <div class="card-head"><span class="head-dot" style="background:#f59e0b"></span>快速入口</div>
            </template>
            <div class="quick-actions">
              <el-button size="small" round @click="$router.push('/users')">用户管理</el-button>
              <el-button size="small" round @click="$router.push('/feedback')">反馈管理</el-button>
              <el-button size="small" round @click="$router.push('/logs')">系统日志</el-button>
              <el-button size="small" round @click="$router.push('/carousel')">轮播管理</el-button>
              <el-button size="small" round @click="$router.push('/version')">版本管理</el-button>
              <el-button size="small" round @click="$router.push('/permissions')">权限管理</el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  User, TrendCharts, Document, Files, ChatDotRound, Warning, Right, Picture
} from '@element-plus/icons-vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()
const router = useRouter()

const adminInfo = JSON.parse(localStorage.getItem('adminInfo') || '{}')
const adminName = adminInfo.nickname || adminInfo.username || '管理员'
// 当前用户角色（向后兼容：旧 adminInfo 无 role 字段时默认 admin）
const adminRole = computed(() => adminInfo.role || 'admin')

// 欢迎横幅问候语与日期
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})
const today = computed(() => {
  const d = new Date()
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 · 星期${w}`
})

const statItems = ref([])
const recentLogs = ref([])
const userGrowth = ref([])
const versionDownloads = ref([])
const serverInfo = ref(null)
const categoryDist = ref([])
const categoryDistMax = computed(() => Math.max(1, ...categoryDist.value.map(c => Number(c.count) || 0)))

// 图片分类分布（后台内容按类别统计）
const loadCategoryDist = async () => {
  try {
    const r = await api.get('/admin_stats.php', { params: { type: 'category_dist' } })
    if (r.data.code === 200) categoryDist.value = (r.data.data?.distribution || []).slice(0, 8)
  } catch (e) { /* ignore */ }
}

// editor 只显示文章相关统计
const visibleStatItems = computed(() => {
  if (adminRole.value === 'editor') {
    return statItems.value.filter(s => s.articleOnly)
  }
  return statItems.value
})
const isEditor = computed(() => adminRole.value === 'editor')

onMounted(async () => {
  try {
    // 统计数据（各接口独立降级：无权限 403 不影响其他区块）
    const [sr, fl, lr, mr, vdr] = await Promise.all([
      api.get('/admin_stats.php').catch(() => ({ data: { code: 500 } })),
      api.get('/admin_feedback.php', { params: { status: 0, limit: 1 } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_logs.php', { params: { limit: 10 } }).catch(() => ({ data: { code: 500 } })),
      api.get('/system_monitor.php', { params: { type: 'overview' } }).catch(() => ({ data: { code: 500 } })),
      api.get('/admin_stats.php', { params: { type: 'version_downloads' } }).catch(() => ({ data: { code: 500 } }))
    ])

    if (sr.data.code === 200) {
      const s = sr.data.data
      statItems.value = [
        { label: '用户总数', value: s.total_users || 0, icon: User, path: '/users', color: '#2563eb', grad: '#2563eb' },
        { label: '今日新增', value: s.today_users || 0, icon: TrendCharts, path: '/users', color: '#059669', grad: '#059669' },
        { label: '文章总数', value: s.total_articles || 0, articleOnly: true, icon: Document, path: '/article', color: '#d97706', grad: '#d97706' },
        { label: '图片内容', value: s.total_images || s.total_content || 0, icon: Picture, path: '/recommend', color: '#7c3aed', grad: '#7c3aed' },
        { label: '推荐池', value: s.recommended ?? '-', icon: Files, path: '/recommend', color: '#0891b2', grad: '#0891b2' },
        { label: '消息总数', value: s.total_messages || 0, icon: ChatDotRound, path: '/comments', color: '#0d9488', grad: '#0d9488' },
        { label: '待处理反馈', value: fl.data?.total || 0, badge: fl.data?.total || 0, icon: Warning, path: '/feedback', color: '#dc2626', grad: '#dc2626' }
      ]
      userGrowth.value = (s.user_growth || []).slice(-7)
    }

    if (lr.data.code === 200) recentLogs.value = lr.data.data || []
    if (vdr.data.code === 200) versionDownloads.value = vdr.data.data || []
    loadCategoryDist()

    // 服务器状态
    if (mr.data.code === 200) {
      const d = mr.data.data
      const ss = d.server_status || {}
      const ds = d.database_status || {}
      const disk = ss.disk_space
      serverInfo.value = {
        php_version: ss.php_version || '-',
        db_version: ds.database_version || '-',
        db_connections: ds.connections || '-',
        memory_current: ss.memory_usage?.current || '-',
        disk_usage: typeof disk === 'object' ? `${disk.usage_percent} 已用` : (disk || '未知'),
        table_count: ds.tables?.count || '-'
      }
    }
  } catch (e) { /* ignore */ }
})
</script>

<style scoped>
/* 页面问候 */
.page-greeting { margin-bottom: 20px; }
.greet-title { font-size: 21px; font-weight: 700; color: #1d2438; margin: 0; letter-spacing: .2px; }
.greet-sub { font-size: 13px; color: #98a1b5; margin: 6px 0 0; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* 统计卡 */
.stat-col { animation: fadeUp .5s ease both; }
.stat-col:nth-child(2) { animation-delay: .05s; }
.stat-col:nth-child(3) { animation-delay: .10s; }
.stat-col:nth-child(4) { animation-delay: .15s; }
.stat-col:nth-child(5) { animation-delay: .20s; }
.stat-col:nth-child(6) { animation-delay: .25s; }
.stat-col:nth-child(7) { animation-delay: .30s; }
.stat-card {
  background: #fff;
  border: 1px solid #eceff7;
  border-radius: 12px;
  padding: 15px 14px;
  margin-bottom: 16px;
  display: flex; align-items: center; gap: 12px;
  transition: box-shadow .18s ease, border-color .18s ease;
}
.stat-card:hover { border-color: #dfe6f7; box-shadow: 0 6px 16px rgba(16,24,60,.06); }
.stat-card.is-link { cursor: pointer; }
.stat-card.is-link:hover .stat-icon { opacity: .85; }
.stat-card.is-link:active { transform: scale(.98); }
.stat-card:not(.is-link):active { transform: translateY(-1px); }
.stat-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  color: #fff; display: flex; align-items: center; justify-content: center;
  transition: opacity .18s ease;
}
.stat-info { min-width: 0; }
.stat-value { font-size: 22px; font-weight: 800; color: #222a47; line-height: 1.2; }
.stat-label { font-size: 12px; color: #98a1b5; margin-top: 2px; white-space: nowrap; display: flex; align-items: center; }
.stat-badge { margin-left: 4px; }
.go-icon { font-size: 13px; color: #98a1b5; opacity: 0; transform: translateX(-4px); transition: all .2s ease; margin-left: 4px; }
.stat-card.is-link:hover .go-icon { opacity: 1; transform: translateX(0); color: var(--brand); }

/* 面板卡 */
.panel-card { margin-bottom: 16px; }
.card-head { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #2b3350; }
.head-dot { width: 8px; height: 8px; border-radius: 3px; display: inline-block; }

/* 趋势图 */
.chart-wrap { display: flex; align-items: flex-end; gap: 12px; height: 150px; padding: 4px 8px; }
.bar-col {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
  height: 100%; gap: 4px; cursor: default;
}
.bar-num { font-size: 11px; color: #666; font-weight: 600; }
.bar {
  width: 100%; max-width: 34px;
  background: #2f6bf0;
  border-radius: 3px 3px 0 0;
  transition: opacity .18s;
}
.bar-col:hover .bar { opacity: .8; }
.bar-green { background: #0aa26b; }
.bar-date { font-size: 11px; color: #98a1b5; }

/* 最近动态 */
.log-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 0; font-size: 13px; color: #555; border-bottom: 1px solid #f5f6fa;
}
.log-row:last-child { border-bottom: none; }
.log-time { color: #98a1b5; flex-shrink: 0; font-size: 12px; }
.log-msg { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 服务器状态 */
.server-list { font-size: 13px; }
.server-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #f0f2f8; }
.server-row:last-child { border-bottom: none; }
.sv-label { color: #98a1b5; }
.sv-val { color: #333c56; font-weight: 500; }

/* 快速入口 */
.quick-actions { display: flex; flex-wrap: wrap; gap: 10px; }

.empty-tip { color: #98a1b5; font-size: 13px; text-align: center; padding: 20px; }

/* ================= 移动端补充样式（配合全局 mc-*） ================= */
.mc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.mc-stat { margin-bottom: 0; display: flex; align-items: center; gap: 10px; cursor: pointer; }
.mc-stat-icon {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  color: #fff; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(30,50,120,.18);
}
.mc-stat-info { min-width: 0; }
.mc-stat-value { font-size: 18px; font-weight: 800; color: #1a1a2e; line-height: 1.2; }
.mc-stat-label { font-size: 12px; color: #98a1b5; margin-top: 2px; display: flex; align-items: center; white-space: nowrap; }

.mc-sec { font-size: 13px; font-weight: 600; color: #5a6475; margin: 16px 4px 8px; }

.mc-bars { display: flex; align-items: flex-end; gap: 8px; height: 150px; padding: 0 4px; }
.mc-bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.mc-bar-val { font-size: 11px; color: #666; margin-bottom: 4px; font-weight: 600; }
.mc-bar-track { width: 70%; display: flex; align-items: flex-end; height: 110px; justify-content: center; }
.mc-bar-fill { width: 100%; border-radius: 3px 3px 0 0; }
.mc-bar-label { font-size: 10px; color: #909399; margin-top: 6px; }

.mc-cat { display: flex; flex-direction: column; gap: 10px; }
.mc-cat-row { display: flex; flex-direction: column; gap: 3px; }
.mc-cat-label { font-size: 13px; color: #555; }
.mc-cat-count { font-size: 12px; font-weight: 600; color: #1b44a6; text-align: right; }
.mc-cat-progress { height: 8px; background: #eef1f6; border-radius: 5px; overflow: hidden; }
.mc-cat-progress-fill { height: 100%; border-radius: 5px; }

.mc-svr { font-size: 13px; }
.mc-svr-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #f0f2f8; }
.mc-svr-row:last-child { border-bottom: none; }
.mc-svr-label { color: #98a1b5; }
.mc-svr-val { color: #333c56; font-weight: 500; }

.mc-log { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f5f6fa; }
.mc-log:last-child { border-bottom: none; }
.mc-log-main { flex: 1; min-width: 0; }
.mc-log-msg { font-size: 13px; color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mc-log-time { font-size: 12px; color: #98a1b5; margin-top: 2px; }

.mc-quick { display: flex; flex-wrap: wrap; gap: 8px; }

/* 移动端适配：统计卡两列、趋势图横向滚动、面板贴边 */
@media (max-width: 767px) {
  .page-greeting { margin-bottom: 14px; }
  .greet-title { font-size: 18px; }
  .stat-col { width: 48% !important; margin-right: 4%; display: inline-block; vertical-align: top; }
  .stat-col:nth-child(2n) { margin-right: 0; }
  .stat-card { padding: 12px 12px; gap: 10px; }
  .stat-value { font-size: 19px; }
  .stat-icon { width: 34px; height: 34px; }
  .chart-wrap { overflow-x: auto; }
  .bar-col { flex: 0 0 40px; }
  .quick-actions { gap: 8px; }
}
</style>
