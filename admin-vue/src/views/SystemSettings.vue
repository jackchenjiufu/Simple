<template>
  <div>
    <h2 style="margin-bottom:16px;margin-top:0">系统维护</h2>

    <el-row :gutter="16">
      <!-- 左侧：维护操作 -->
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>数据库维护</template>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;color:#555">反馈表结构迁移（添加缺失列）</span>
              <el-button size="small" :loading="migrating" @click="runMigration">执行迁移</el-button>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;color:#555">运行爬虫：抖音热榜 → 自动发文</span>
              <el-button size="small" :loading="crawling" @click="runCrawler">执行</el-button>
            </div>
          </div>
        </el-card>

        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>AI 代理配置</template>
          <el-form :model="aiConfig" label-width="80px" size="small">
            <el-form-item label="接口地址">
              <el-input v-model="aiConfig.base_url" placeholder="http://192.168.1.10:8080" />
            </el-form-item>
            <el-form-item label="模型">
              <el-input v-model="aiConfig.model" placeholder="deepseek-chat" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input v-model="aiConfig.api_key" type="password" show-password placeholder="sk-..." />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingAi" @click="saveAiConfig">保存配置</el-button>
              <el-button :loading="testingAi" @click="testAiConfig" style="margin-left:8px">测试连接</el-button>
            </el-form-item>
          </el-form>
          <div v-if="aiResult" :style="{color:aiResult.ok?'#67c23a':'#f56c6c',fontSize:'13px',marginTop:'8px'}">
            {{ aiResult.msg }}
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：服务器信息 -->
      <el-col :span="12">
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>服务器信息</template>
          <div v-if="sysInfo" style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:90px">服务器软件</span>{{ sysInfo.server_software }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">PHP 版本</span>{{ sysInfo.php_version }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">服务器时间</span>{{ sysInfo.server_time }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">时区</span>{{ sysInfo.timezone }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">内存使用</span>{{ sysInfo.memory_usage?.current }} / 峰值 {{ sysInfo.memory_usage?.peak }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">磁盘</span>
              <span v-if="sysInfo.disk_space && typeof sysInfo.disk_space==='object'">
                {{ sysInfo.disk_space.used }} / {{ sysInfo.disk_space.total }} ({{ sysInfo.disk_space.usage_percent }})
              </span>
              <span v-else>{{ typeof sysInfo.disk_space === 'string' ? sysInfo.disk_space : '未知' }}</span>
            </div>
            <div><span style="color:#999;display:inline-block;width:90px">CPU 负载</span>
              <span v-if="sysInfo.cpu_load">1min: {{ sysInfo.cpu_load['1min'] }} / 5min: {{ sysInfo.cpu_load['5min'] }}</span>
              <span v-else>N/A</span>
            </div>
          </div>
          <div v-else style="color:#909399;font-size:13px">
            加载中...
            <el-button size="small" @click="loadSysInfo" style="margin-left:8px">刷新</el-button>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>数据库状态</template>
          <div v-if="dbInfo" style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:90px">版本</span>{{ dbInfo.database_version }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">连接数</span>{{ dbInfo.connections }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">查询总数</span>{{ dbInfo.queries }}</div>
            <div><span style="color:#999;display:inline-block;width:90px">数据表</span>{{ dbInfo.tables?.count }} 张</div>
          </div>
          <div v-else style="color:#909399;font-size:13px">加载中...</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const migrating = ref(false)
const crawling = ref(false)
const savingAi = ref(false)
const testingAi = ref(false)
const sysInfo = ref(null)
const dbInfo = ref(null)
const aiConfig = ref({ base_url: '', model: '', api_key: '' })
const aiResult = ref(null)

// 加载系统信息 & AI 配置
const loadSysInfo = async () => {
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
}

// 数据库迁移
const runMigration = async () => {
  migrating.value = true
  try {
    const r = await api.get('/migrate_feedback.php', { params: { token: 'doo_admin_2024' } })
    if (r.data.code === 200) ElMessage.success(r.data.message + '：' + (r.data.data?.actions?.join('；') || ''))
    else ElMessage.error(r.data.message || '迁移失败')
  } catch (e) { ElMessage.error('迁移请求失败') }
  migrating.value = false
}

// 运行爬虫
const runCrawler = async () => {
  crawling.value = true
  try {
    const r = await api.get('/crawl_hotsearch.php', { params: { token: 'doo_admin_2024' } }).catch(() => null)
    if (r && r.data) ElMessage.success('爬虫已触发')
    else ElMessage.success('爬虫请求已发送')
  } catch (e) { ElMessage.error('触发失败') }
  crawling.value = false
}

// 保存 AI 配置
const saveAiConfig = async () => {
  savingAi.value = true
  try {
    const r = await api.post('/ai_proxy.php', {
      action: 'save_config',
      base_url: aiConfig.value.base_url,
      model: aiConfig.value.model,
      api_key: aiConfig.value.api_key
    })
    if (r.data.code === 200) { ElMessage.success('已保存'); aiResult.value = null }
    else ElMessage.error(r.data.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  savingAi.value = false
}

// 测试 AI 连接
const testAiConfig = async () => {
  testingAi.value = true; aiResult.value = null
  try {
    const r = await api.post('/ai_proxy.php', {
      action: 'test',
      base_url: aiConfig.value.base_url,
      model: aiConfig.value.model,
      api_key: aiConfig.value.api_key
    })
    aiResult.value = { ok: r.data.code === 200, msg: r.data.message || '连接失败' }
  } catch (e) { aiResult.value = { ok: false, msg: '网络错误' } }
  testingAi.value = false
}

onMounted(loadSysInfo)
</script>
