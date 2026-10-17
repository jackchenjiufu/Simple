<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <!-- 热搜抓取管理 -->
      <div class="mc-card">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">热</div>
          <div class="mc-card-info">
            <div class="mc-title">热搜抓取管理</div>
            <div class="mc-meta">触发各平台热搜抓取，成功后自动整理并发布文章</div>
          </div>
        </div>
        <div class="mc-tags">
          <span
            v-for="p in crawlerPlatforms"
            :key="p.key"
            class="mc-tag"
            :class="{ act: p.key === 'weibo' }"
            @click="runCrawler(p.key)"
          >{{ p.label }}</span>
        </div>
        <div
          v-if="crawlResult"
          class="mc-data"
          :style="{ color: crawlResult.ok ? '#67c23a' : '#f56c6c' }"
        >
          [{{ crawlResult.platformLabel }}] {{ crawlResult.msg }}
          <template v-if="crawlResult.ok && crawlResult.count">—— 共 {{ crawlResult.count }} 条热搜</template>
        </div>
      </div>

      <!-- AI 代理配置 -->
      <div class="mc-card">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">AI</div>
          <div class="mc-card-info">
            <div class="mc-title">AI 代理配置</div>
            <div class="mc-meta">Chat（DeepSeek 兼容）+ GLM 识图（GLM-4V 打标）</div>
          </div>
        </div>
        <div class="mc-form-row"><label>Chat 接口</label><input v-model="aiConfig.base_url" placeholder="https://api.deepseek.com/v1" /></div>
        <div class="mc-form-row"><label>Chat 模型</label><input v-model="aiConfig.model" placeholder="deepseek-chat" /></div>
        <div class="mc-form-row"><label>API Key</label><input v-model="aiConfig.api_key" type="text" placeholder="sk-..." /></div>
        <div class="mc-form-row"><label>GLM 接口</label><input v-model="aiConfig.glm_base_url" placeholder="https://open.bigmodel.cn/api/paas/v4/" /></div>
        <div class="mc-form-row"><label>GLM 模型</label><input v-model="aiConfig.glm_vision_model" placeholder="glm-4v-flash" /></div>
        <div class="mc-form-row"><label>GLM Key</label><input v-model="aiConfig.glm_api_key" type="text" placeholder="GLM API Key（用于图片自动打标）" /></div>
        <div class="mc-actions">
          <span class="mc-act ok" @click="saveAiConfig">保存配置</span>
          <span class="mc-act" @click="testAiConfig('chat')">测试 Chat</span>
          <span class="mc-act" @click="testAiConfig('vision')">测试 GLM 识图</span>
        </div>
        <div v-if="aiResult" class="mc-data" :style="{ color: aiResult.ok ? '#67c23a' : '#f56c6c' }">
          {{ aiResult.msg }}
          <span v-if="aiResult.glm_reply" style="color:#555">—— 识别结果：{{ aiResult.glm_reply }}</span>
        </div>
      </div>

      <!-- 服务器监控概览 -->
      <div class="mc-card" v-if="sysInfo">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">服</div>
          <div class="mc-card-info">
            <div class="mc-title">服务器监控概览</div>
            <div class="mc-meta">服务器软件 {{ sysInfo.server_software }} · PHP {{ sysInfo.php_version }}</div>
          </div>
          <span class="mc-act" @click="loadSysInfo">刷新</span>
        </div>
        <div class="mc-form-row"><label>服务器时间</label><span>{{ sysInfo.server_time || '—' }}</span></div>
        <div class="mc-form-row"><label>时区</label><span>{{ sysInfo.timezone || '—' }}</span></div>
        <div class="mc-form-row"><label>内存使用</label><span>{{ memText }}</span></div>
        <div class="mc-form-row"><label>磁盘占用</label><span>{{ diskText }}</span></div>
        <div class="mc-form-row"><label>CPU 负载</label><span>{{ cpuText }}</span></div>
      </div>

      <!-- API 响应时间监控 -->
      <div class="mc-card" v-if="apiTimes && apiTimes.length">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">速</div>
          <div class="mc-card-info">
            <div class="mc-title">API 响应时间监控</div>
            <div class="mc-meta">核心接口单次模拟请求耗时（毫秒）</div>
          </div>
          <span class="mc-act" @click="loadSysInfo">刷新</span>
        </div>
        <div class="mc-cat">
          <div v-for="a in apiTimes" :key="a.api" class="mc-cat-row">
            <div class="mc-cat-head">
              <span class="mc-cat-name">{{ (a.api || '').replace('/api/','') || '未知接口' }}</span>
              <span class="mc-cat-ms" :style="{ color: (a.status === 'OK' ? '#00a862' : '#ef4444') }">
                {{ a.status === 'OK' ? (Number(a.response_time_ms)||0).toFixed(1)+' ms' : '错误' }}
              </span>
            </div>
            <div class="mc-cat-progress">
              <div class="mc-cat-progress-fill" :style="{ width: Math.min(100, Number(a.response_time_ms||0)) + '%', background: a.status === 'OK' ? '#0aa26b' : '#ef4444' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近公告 -->
      <div class="mc-card">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">公</div>
          <div class="mc-card-info">
            <div class="mc-title">最近公告</div>
            <div class="mc-meta">最新 5 条系统公告</div>
          </div>
          <span class="mc-act" @click="loadAnnouncements">刷新</span>
        </div>
        <div v-if="announcements.length" class="mc-list">
          <div v-for="a in announcements.slice(0, 5)" :key="a.id" class="mc-card mc-sub">
            <div class="mc-card-info">
              <div class="mc-title">{{ a.title || '无标题' }}</div>
              <div class="mc-data">{{ a.created_at || '—' }}</div>
              <div class="mc-meta">{{ (a.content || '').replace(/\s+/g, ' ').slice(0, 60) || '暂无内容' }}</div>
            </div>
          </div>
        </div>
        <div v-else class="mc-data">暂无公告</div>
      </div>

      <!-- 数据库维护（迁移） -->
      <div class="mc-card">
        <div class="mc-card-top">
          <div class="mc-thumb mc-thumb-empty">库</div>
          <div class="mc-card-info">
            <div class="mc-title">数据库维护</div>
            <div class="mc-meta">反馈表结构迁移（自动添加缺失列）</div>
          </div>
        </div>
        <div class="mc-actions">
          <span class="mc-act pinned" :class="{ disabled: migrating }" @click="runMigration">执行迁移</span>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端（原有，保留） ==================== -->
    <template v-else>
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
              <el-input v-model="aiConfig.api_key" type="text" placeholder="sk-..." />
            </el-form-item>
            <el-divider content-position="left" style="margin:8px 0 12px">🖼 GLM 识图（AI 打标）</el-divider>
            <el-form-item label="接口地址">
              <el-input v-model="aiConfig.glm_base_url" placeholder="https://open.bigmodel.cn/api/paas/v4/" />
            </el-form-item>
            <el-form-item label="模型">
              <el-input v-model="aiConfig.glm_vision_model" placeholder="glm-4v-flash" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="aiConfig.glm_api_key" type="text" placeholder="GLM API Key（用于图片自动打标）" />
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const migrating = ref(false)
const crawlingKey = ref(null)
const crawlResult = ref(null)
const loadingSys = ref(false)
const loadingAnn = ref(false)
const savingAi = ref(false)
const testingAi = ref(false)
const testingAiGlm = ref(false)
const sysInfo = ref(null)
const apiTimes = ref([])
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

// 进度条数值（桌面端）
const memPercent = computed(() => {
  const cur = parseMB(sysInfo.value?.memory_usage?.current)
  const peak = parseMB(sysInfo.value?.memory_usage?.peak)
  if (cur == null || peak == null || peak <= 0) return null
  return Math.min(100, Math.round((cur / peak) * 100))
})
const diskPercent = computed(() => parsePercent(sysInfo.value?.disk_space?.usage_percent))

// 移动端展示文本
const memText = computed(() =>
  sysInfo.value?.memory_usage ? (sysInfo.value.memory_usage.current + ' / 峰值 ' + sysInfo.value.memory_usage.peak) : '—'
)
const diskText = computed(() => {
  const d = sysInfo.value?.disk_space
  if (!d) return '—'
  if (typeof d === 'object') return `已用 ${d.used} / 共 ${d.total}，剩余 ${d.free ?? '—'}（${d.usage_percent}）`
  if (typeof d === 'string') return d
  return '未知'
})
const cpuText = computed(() => {
  const c = sysInfo.value?.cpu_load
  if (!c) return 'N/A'
  return '1min ' + c['1min'] + ' / 5min ' + c['5min'] + ' / 15min ' + c['15min']
})

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
      apiTimes.value = mr.data.data.api_response_times || []
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

<style scoped>
/* ===== 移动端卡片样式修正（仅作用于本页 isMobile 分支，沿用全局 .mc-* 类名） ===== */
/* 文本缩略图：小尺寸 + 品牌蓝底（原 .mc-thumb 默认 64px 灰底对纯文字卡过大） */
.mc-thumb.mc-thumb-empty {
  width: 40px;
  height: 40px;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  background: #3370ff;
  border-radius: 10px;
}
/* 卡片头部垂直居中，标题/描述间距紧凑统一 */
.mc-card-top { align-items: center; }
.mc-card-info .mc-meta { margin-top: 3px; }
/* 表单类卡片去掉点击缩放/手型（避免输入时整卡跳动） */
.mc-card { cursor: default; }
.mc-card:active { transform: none; }

/* 服务器监控：值文本加深，行距统一 */
.mc-form-row span { font-size: 13px; color: #333; }

/* API 响应时间：进度条样式（.mc-cat* 原定义在其他页面 scoped，此处补齐） */
.mc-cat { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.mc-cat-row { display: flex; flex-direction: column; gap: 4px; }
.mc-cat-head { display: flex; justify-content: space-between; align-items: center; }
.mc-cat-name {
  font-size: 12px; color: #555; font-family: monospace;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.mc-cat-ms { font-size: 12px; font-weight: 600; flex-shrink: 0; margin-left: 8px; }
.mc-cat-progress { height: 8px; background: #eef1f6; border-radius: 5px; overflow: hidden; }
.mc-cat-progress-fill { height: 100%; border-radius: 5px; }

/* 卡片内嵌子卡（最近公告）：去阴影、浅底区分、内边距统一 */
.mc-card.mc-sub {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: #f7f8fa;
  box-shadow: none;
  border-radius: 10px;
  cursor: default;
}
.mc-card.mc-sub:active { transform: none; }
.mc-card.mc-sub .mc-title { font-size: 14px; }
/* 子卡列表位于父卡内，不再叠加全局 .mc-list 的 12px 左右外边距 */
.mc-list { padding: 2px 0 0; }
</style>
