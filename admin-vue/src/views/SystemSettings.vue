<template>
  <div>
    <h2 style="margin-bottom:16px;margin-top:0">系统维护</h2>

    <el-row :gutter="16">
      <!-- 左侧：维护操作 -->
      <el-col :span="12">
        <!-- 热搜抓取管理 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>热搜抓取管理</template>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="font-size:13px;color:#555">
              触发各平台热搜抓取，抓取成功后将自动整理并发布文章
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <el-button
                v-for="p in crawlerPlatforms"
                :key="p.key"
                size="small"
                :type="p.key === 'weibo' ? 'primary' : ''"
                :loading="crawlingKey === p.key"
                :disabled="crawlingKey !== null && crawlingKey !== p.key"
                @click="runCrawler(p.key)"
              >{{ p.label }}</el-button>
            </div>
            <div
              v-if="crawlResult"
              :style="{ color: crawlResult.ok ? '#67c23a' : '#f56c6c', fontSize: '13px' }"
            >
              <span>[{{ crawlResult.platformLabel }}]</span> {{ crawlResult.msg }}
              <template v-if="crawlResult.ok && crawlResult.count">
                —— 共 {{ crawlResult.count }} 条热搜
                <template v-if="crawlResult.articleId">，文章ID: {{ crawlResult.articleId }}</template>
              </template>
            </div>
          </div>
        </el-card>

        <!-- 数据库维护 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>数据库维护</template>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;color:#555">反馈表结构迁移（添加缺失列）</span>
              <el-button size="small" :loading="migrating" @click="runMigration">执行迁移</el-button>
            </div>
          </div>
        </el-card>

        <!-- AI 代理配置 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>AI 代理配置</span>
              <span style="font-size:12px;color:#909399">Chat（DeepSeek 兼容） + GLM 识图（GLM-4V 打标）</span>
            </div>
          </template>
          <el-form :model="aiConfig" label-width="80px" size="small">
            <el-divider content-position="left" style="margin:4px 0 12px">💬 Chat 对话（DeepSeek 兼容）</el-divider>
            <el-form-item label="接口地址">
              <el-input v-model="aiConfig.base_url" placeholder="https://api.deepseek.com/v1" />
            </el-form-item>
            <el-form-item label="模型">
              <el-input v-model="aiConfig.model" placeholder="deepseek-chat" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="aiConfig.api_key" type="password" show-password placeholder="sk-..." />
            </el-form-item>
            <el-divider content-position="left" style="margin:8px 0 12px">🖼 GLM 识图（AI 打标）</el-divider>
            <el-form-item label="接口地址">
              <el-input v-model="aiConfig.glm_base_url" placeholder="https://open.bigmodel.cn/api/paas/v4/" />
            </el-form-item>
            <el-form-item label="模型">
              <el-input v-model="aiConfig.glm_vision_model" placeholder="glm-4v-flash" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="aiConfig.glm_api_key" type="password" show-password placeholder="GLM API Key（用于图片自动打标）" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingAi" @click="saveAiConfig">保存配置</el-button>
              <el-button :loading="testingAi" @click="testAiConfig('chat')" style="margin-left:8px">测试 Chat</el-button>
              <el-button :loading="testingAiGlm" @click="testAiConfig('vision')" style="margin-left:8px">测试 GLM 识图</el-button>
            </el-form-item>
          </el-form>
          <div v-if="aiResult" :style="{color:aiResult.ok?'#67c23a':'#f56c6c',fontSize:'13px',marginTop:'8px'}">
            {{ aiResult.msg }}
            <span v-if="aiResult.glm_reply" style="color:#555">—— 识别结果：{{ aiResult.glm_reply }}</span>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：服务器信息 -->
      <el-col :span="12">
        <!-- 服务器监控概览 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>服务器监控概览</span>
              <el-button size="small" text :loading="loadingSys" @click="loadSysInfo">刷新</el-button>
            </div>
          </template>
          <div v-if="sysInfo" style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:90px">服务器软件</span>{{ sysInfo.server_software }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">PHP 版本</span>{{ sysInfo.php_version }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">服务器时间</span>{{ sysInfo.server_time }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">时区</span>{{ sysInfo.timezone }}</div>
            <div v-if="memPercent != null" style="display:flex;align-items:center;gap:8px">
              <span style="color:#999;display:inline-block;width:90px">内存使用</span>
              <el-progress
                :percentage="memPercent"
                :stroke-width="8"
                style="flex:1"
                :format="() => sysInfo.memory_usage?.current + ' / ' + sysInfo.memory_usage?.peak"
              />
            </div>
            <div v-else><span style="color:#999;display:inline-block;width:90px">内存使用</span>{{ sysInfo.memory_usage?.current }} / 峰值 {{ sysInfo.memory_usage?.peak }}</div>
            <div v-if="diskPercent != null" style="display:flex;align-items:center;gap:8px">
              <span style="color:#999;display:inline-block;width:90px">磁盘占用</span>
              <el-progress
                :percentage="diskPercent"
                :stroke-width="8"
                :status="diskPercent > 85 ? 'exception' : (diskPercent > 60 ? 'warning' : '')"
                style="flex:1"
                :format="() => (sysInfo.disk_space?.used || '') + ' / ' + (sysInfo.disk_space?.total || '')"
              />
            </div>
            <div v-else><span style="color:#999;display:inline-block;width:90px">磁盘</span>
              <span v-if="sysInfo.disk_space && typeof sysInfo.disk_space==='object'">
                {{ sysInfo.disk_space.used }} / {{ sysInfo.disk_space.total }} ({{ sysInfo.disk_space.usage_percent }})
              </span>
              <span v-else>{{ typeof sysInfo.disk_space === 'string' ? sysInfo.disk_space : '未知' }}</span>
            </div>
            <div><span style="color:#999;display:inline-block;width:90px">CPU 负载</span>
              <span v-if="sysInfo.cpu_load">1min: {{ sysInfo.cpu_load['1min'] }} / 5min: {{ sysInfo.cpu_load['5min'] }} / 15min: {{ sysInfo.cpu_load['15min'] }}</span>
              <span v-else>N/A</span>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px">加载中...</div>
        </el-card>

        <!-- 数据库信息 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>数据库信息</template>
          <div v-if="dbInfo" style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:90px">数据库版本</span>{{ dbInfo.database_version }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">连接数</span>{{ dbInfo.connections }} <span style="color:#999">/ 查询总数 {{ dbInfo.queries }}</span></div>
            <div><span style="color:#999;display:inline-block;width:90px">数据表</span>{{ dbInfo.tables?.count }} 张 <span style="color:#999">/ 总数据量 {{ dbDataTotal }} / 总行数 {{ dbRowsTotal.toLocaleString() }}</span></div>
            <el-table
              v-if="dbInfo.tables?.details?.length"
              :data="dbInfo.tables.details"
              size="small"
              max-height="260"
              style="margin-top:8px"
            >
              <el-table-column prop="name" label="表名" min-width="140" show-overflow-tooltip />
              <el-table-column prop="rows" label="行数" width="90" align="right" />
              <el-table-column prop="data_size" label="数据大小" width="100" align="right" />
              <el-table-column prop="index_size" label="索引大小" width="100" align="right" />
            </el-table>
          </div>
          <div v-else style="color:#909399;font-size:13px">加载中...</div>
        </el-card>

        <!-- 最近公告 -->
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>最近公告</span>
              <el-button size="small" text :loading="loadingAnn" @click="loadAnnouncements">刷新</el-button>
            </div>
          </template>
          <div v-if="announcements.length" style="display:flex;flex-direction:column;gap:10px">
            <div v-for="a in announcements.slice(0, 5)" :key="a.id">
              <div style="display:flex;justify-content:space-between;align-items:baseline">
                <span style="font-size:13px;font-weight:600;color:#333">{{ a.title }}</span>
                <span style="font-size:12px;color:#999;flex-shrink:0;margin-left:8px">{{ a.created_at }}</span>
              </div>
              <div style="font-size:12px;color:#777;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                {{ (a.content || '').replace(/\s+/g, ' ').slice(0, 60) }}
              </div>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px">暂无公告</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

const migrating = ref(false)
const crawlingKey = ref(null)
const crawlResult = ref(null)
const loadingSys = ref(false)
const loadingAnn = ref(false)
const savingAi = ref(false)
const testingAi = ref(false)
const testingAiGlm = ref(false)
const sysInfo = ref(null)
const dbInfo = ref(null)
const aiConfig = ref({ base_url: '', model: '', api_key: '', glm_base_url: '', glm_vision_model: '', glm_api_key: '' })
const aiResult = ref(null)
const announcements = ref([])

// 热搜抓取平台（后端为按平台拆分的独立接口，无 type 参数）
const crawlerPlatforms = [
  { key: 'weibo', file: 'crawl_hotsearch.php', label: '微博' },
  { key: 'douyin', file: 'crawl_douyin_hotsearch.php', label: '抖音' },
  { key: 'toutiao', file: 'crawl_toutiao_hotsearch.php', label: '头条' },
  { key: 'zhihu', file: 'crawl_zhihu_hotsearch.php', label: '知乎' },
  { key: 'rednote', file: 'crawl_rednote_hotsearch.php', label: '小红书' },
  { key: 'hackernews', file: 'crawl_hackernews_hotsearch.php', label: 'HackerNews' },
  { key: 'intl', file: 'crawl_intl_news.php', label: '国际新闻' }
]

// 数值解析（后端返回 "xx MB" / "xx%" 字符串）
const parseMB = (s) => {
  const m = String(s || '').match(/^([\d.]+)\s*(KB|MB|GB)?/i)
  if (!m) return null
  const n = parseFloat(m[1])
  if (isNaN(n)) return null
  const unit = (m[2] || 'MB').toUpperCase()
  return unit === 'GB' ? n * 1024 : unit === 'KB' ? n / 1024 : n
}
const parsePercent = (s) => {
  const n = parseFloat(String(s || ''))
  return isNaN(n) ? null : Math.min(100, Math.max(0, n))
}

// 进度条数值
const memPercent = computed(() => {
  const cur = parseMB(sysInfo.value?.memory_usage?.current)
  const peak = parseMB(sysInfo.value?.memory_usage?.peak)
  if (cur == null || peak == null || peak <= 0) return null
  return Math.min(100, Math.round((cur / peak) * 100))
})
const diskPercent = computed(() => parsePercent(sysInfo.value?.disk_space?.usage_percent))

// 数据库统计
const dbDataTotal = computed(() => {
  const details = dbInfo.value?.tables?.details || []
  let mb = 0
  details.forEach(t => {
    const v = parseMB(t.data_size)
    if (v != null) mb += v
  })
  return mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb.toFixed(2) + ' MB'
})
const dbRowsTotal = computed(() =>
  (dbInfo.value?.tables?.details || []).reduce((sum, t) => sum + (Number(t.rows) || 0), 0)
)

// 加载系统信息 & AI 配置
const loadSysInfo = async () => {
  loadingSys.value = true
  try {
    const [mr, ac] = await Promise.all([
      api.get('/system_monitor.php', { params: { type: 'overview' } }),
      api.post('/ai_proxy.php', { action: 'get_config' })
    ])
    if (mr.data.code === 200) {
      sysInfo.value = mr.data.data.server_status
      dbInfo.value = mr.data.data.database_status
    }
    if (ac.data.code === 200) {
      aiConfig.value = ac.data.data || aiConfig.value
    }
  } catch (e) { /* ignore */ }
  loadingSys.value = false
}

// 加载最近公告（最新 5 条）
const loadAnnouncements = async () => {
  loadingAnn.value = true
  try {
    const r = await api.post('/announcements.php', { action: 'get_announcements' })
    if (r.data.code === 200) announcements.value = r.data.data || []
  } catch (e) { /* ignore */ }
  loadingAnn.value = false
}

// 数据库迁移（走统一 session 鉴权）
const runMigration = async () => {
  migrating.value = true
  try {
    const r = await api.get('/migrate_feedback.php')
    if (r.data.code === 200) ElMessage.success(r.data.message + '：' + (r.data.data?.actions?.join('；') || ''))
    else ElMessage.error(r.data.message || '迁移失败')
  } catch (e) { ElMessage.error('迁移请求失败') }
  migrating.value = false
}

// 运行指定平台热搜抓取（失败时如实提示）
const runCrawler = async (key) => {
  const p = crawlerPlatforms.find(x => x.key === key)
  if (!p || crawlingKey.value) return
  crawlingKey.value = key
  crawlResult.value = null
  try {
    const r = await api.get('/' + p.file, { params: { token: localStorage.getItem('admin_token') || '' } })
    if (r.data.code === 200) {
      crawlResult.value = {
        ok: true,
        platformLabel: p.label,
        msg: r.data.message || '抓取成功',
        articleId: r.data.data?.article_id,
        count: r.data.data?.hotsearch_count
      }
    } else {
      crawlResult.value = { ok: false, platformLabel: p.label, msg: r.data.message || '触发失败' }
    }
  } catch (e) {
    crawlResult.value = {
      ok: false,
      platformLabel: p.label,
      msg: '触发失败：' + (e.response?.data?.message || e.message || '请查看后台日志')
    }
  }
  crawlingKey.value = null
}

// 保存 AI 配置
const saveAiConfig = async () => {
  savingAi.value = true
  try {
    const r = await api.post('/ai_proxy.php', {
      action: 'save_config',
      base_url: aiConfig.value.base_url,
      model: aiConfig.value.model,
      api_key: aiConfig.value.api_key,
      glm_base_url: aiConfig.value.glm_base_url,
      glm_vision_model: aiConfig.value.glm_vision_model,
      glm_api_key: aiConfig.value.glm_api_key
    })
    if (r.data.code === 200) { ElMessage.success('已保存'); aiResult.value = null }
    else ElMessage.error(r.data.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  savingAi.value = false
}

// 测试 AI 连接（掩码 key 不发送，让后端用已保存的配置）
const testAiConfig = async (mode = 'chat') => {
  if (mode === 'vision') testingAiGlm.value = true; else testingAi.value = true
  aiResult.value = null
  try {
    const payload = {
      action: 'test',
      mode,
      base_url: aiConfig.value.base_url,
      model: aiConfig.value.model,
      glm_base_url: aiConfig.value.glm_base_url,
      glm_vision_model: aiConfig.value.glm_vision_model
    }
    if (aiConfig.value.api_key && !String(aiConfig.value.api_key).includes('****')) {
      payload.api_key = aiConfig.value.api_key
    }
    if (aiConfig.value.glm_api_key && !String(aiConfig.value.glm_api_key).includes('****')) {
      payload.glm_api_key = aiConfig.value.glm_api_key
    }
    const r = await api.post('/ai_proxy.php', payload)
    aiResult.value = {
      ok: r.data.code === 200,
      msg: r.data.message || '连接失败',
      glm_reply: r.data.data?.glm_reply
    }
  } catch (e) { aiResult.value = { ok: false, msg: '网络错误' } }
  if (mode === 'vision') testingAiGlm.value = false; else testingAi.value = false
}

onMounted(() => {
  loadSysInfo()
  loadAnnouncements()
})
</script>