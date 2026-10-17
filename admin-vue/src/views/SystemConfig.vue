<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar" style="margin:12px 12px 10px">
        <div class="mc-fbtn" @click="loadAll">刷新</div>
      </div>

      <!-- 站点信息 -->
      <div class="mc-list">
        <div class="mc-card" style="cursor:default">
          <div class="mc-title">站点信息</div>
          <div class="mc-form-row"><label>站点名称</label><input v-model="site.site_name" placeholder="DOO" /></div>
          <div class="mc-form-row"><label>站点描述</label><input v-model="site.site_desc" placeholder="一句话描述" /></div>
          <div class="mc-form-row"><label>Logo 地址</label><input v-model="site.logo_url" placeholder="https://... 或 /static/..." /></div>
          <div class="mc-actions">
            <span class="mc-act ok" @click="saveSite">保存站点信息</span>
          </div>
        </div>
      </div>

      <!-- 安全设置 -->
      <div class="mc-list">
        <div class="mc-card" style="cursor:default">
          <div class="mc-title">安全设置</div>
          <div class="mc-form-row"><label>旧密码</label><input v-model="pwd.old_password" type="password" placeholder="当前登录密码" /></div>
          <div class="mc-form-row"><label>新密码</label><input v-model="pwd.new_password" type="password" placeholder="至少 6 位" /></div>
          <div class="mc-form-row"><label>确认新密码</label><input v-model="pwd.confirm" type="password" placeholder="再次输入" /></div>
          <div class="mc-actions">
            <span class="mc-act warn" @click="changePassword">修改密码</span>
          </div>
        </div>
      </div>

      <!-- 数据维护 -->
      <div class="mc-list">
        <div class="mc-card" style="cursor:default">
          <div class="mc-card-top">
            <div class="mc-thumb mc-thumb-empty">库</div>
            <div class="mc-card-info">
              <div class="mc-title">数据维护</div>
              <div class="mc-meta">清空全部缓存（Redis doo:*，首屏重新加载）</div>
            </div>
          </div>
          <div class="mc-actions">
            <span class="mc-act danger" @click="flushCache">清空缓存</span>
          </div>
        </div>
      </div>

      <!-- 系统配置（只读）分组卡片 -->
      <div class="mc-list">
        <div class="mc-card" style="cursor:default">
          <div class="mc-title" style="padding-bottom:8px">系统配置（只读）</div>
          <div v-if="loading && !cfg" class="mc-tip" style="padding:20px 0">加载中...</div>
          <div v-else-if="!cfgItems.length" class="mc-tip" style="padding:20px 0">暂无配置</div>
          <template v-else>
            <div v-for="it in cfgItems" :key="it.key" class="mc-cfg-row">
              <div class="mc-cfg-label">{{ it.label }}</div>
              <div class="mc-cfg-val">
                <template v-if="it.tags && it.tags.length">
                  <span v-for="t in it.tags" :key="t" class="mc-tag" style="margin:2px 4px 2px 0">{{ t }}</span>
                </template>
                <template v-else>{{ it.value }}</template>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 通用操作确认弹层（移动端替代 ElMessageBox 居中弹窗） -->
      <div class="mc-mask" v-if="confirmSheet.show" @click="sheetCancel">
        <div class="mc-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>{{ confirmSheet.title }}</span>
            <span class="mc-close" @click="sheetCancel">✕</span>
          </div>
          <div class="mc-confirm-text">{{ confirmSheet.text }}</div>
          <div class="mc-actions" style="margin-top:18px">
            <span class="mc-act" @click="sheetCancel">取消</span>
            <span class="mc-act" :class="confirmSheet.danger ? 'danger' : 'ok'" @click="sheetOk">确定</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">系统设置</h2>
      <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <el-row :gutter="16">
      <el-col :span="12">
        <!-- 站点信息 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>站点信息</template>
          <el-form :model="site" label-width="80px" size="small">
            <el-form-item label="站点名称">
              <el-input v-model="site.site_name" placeholder="DOO" />
            </el-form-item>
            <el-form-item label="站点描述">
              <el-input v-model="site.site_desc" type="textarea" :rows="2" placeholder="一句话描述" />
            </el-form-item>
            <el-form-item label="Logo 地址">
              <el-input v-model="site.logo_url" placeholder="https://... 或 /static/..." />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="savingSite" @click="saveSite">保存站点信息</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 安全设置 -->
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>安全设置</template>
          <el-form :model="pwd" label-width="80px" size="small">
            <el-form-item label="旧密码">
              <el-input v-model="pwd.old_password" type="password" show-password placeholder="当前登录密码" />
            </el-form-item>
            <el-form-item label="新密码">
              <el-input v-model="pwd.new_password" type="password" show-password placeholder="至少 6 位" />
            </el-form-item>
            <el-form-item label="确认新密码">
              <el-input v-model="pwd.confirm" type="password" show-password placeholder="再次输入" />
            </el-form-item>
            <el-form-item>
              <el-button type="warning" :loading="savingPwd" @click="changePassword">修改密码</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 数据维护 -->
        <el-card shadow="never">
          <template #header>数据维护</template>
          <div style="display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:13px;color:#555">清空全部缓存（Redis doo:*，首屏重新加载）</span>
              <el-button size="small" type="danger" :loading="flushing" @click="flushCache">清空缓存</el-button>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <!-- 系统配置展示 -->
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>系统配置（只读）</span>
              <el-button size="small" text :loading="loading" @click="loadAll">刷新</el-button>
            </div>
          </template>
          <div v-if="cfg" style="font-size:13px;color:#555;line-height:2.4">
            <div><span style="color:#999;display:inline-block;width:110px">API 版本</span>{{ cfg.api_version }}</div>
            <div><span style="color:#999;display:inline-block;width:110px">下载地址</span>{{ cfg.download_base_url || '自动' }}</div>
            <div><span style="color:#999;display:inline-block;width:110px">CORS 白名单</span>
              <el-tag v-for="o in cfg.cors_origins" :key="o" size="small" style="margin:1px">{{ o }}</el-tag>
            </div>
            <div><span style="color:#999;display:inline-block;width:110px">上传限制</span>{{ (cfg.upload_max_size / 1024 / 1024).toFixed(0) }} MB（{{ cfg.upload_types.join(', ') }}）</div>
            <div><span style="color:#999;display:inline-block;width:110px">SMTP 邮件</span>
              <el-tag :type="cfg.smtp_enabled ? 'success' : 'info'" size="small">{{ cfg.smtp_enabled ? '启用' : '停用' }}</el-tag>
              <span v-if="cfg.smtp_from" style="margin-left:6px;color:#909399">{{ cfg.smtp_from }}</span>
            </div>
            <div><span style="color:#999;display:inline-block;width:110px">Redis</span>
              <el-tag :type="cfg.redis?.enabled ? 'success' : 'info'" size="small">{{ cfg.redis?.enabled ? '启用' : '停用' }}</el-tag>
              <span style="margin-left:6px;color:#909399">{{ cfg.redis?.host }}:{{ cfg.redis?.port }}</span>
            </div>
            <div><span style="color:#999;display:inline-block;width:110px">AI 模型</span>{{ cfg.ai_model }}</div>
            <div><span style="color:#999;display:inline-block;width:110px">Web 服务器</span>{{ cfg.server_software }}</div>
            <div><span style="color:#999;display:inline-block;width:110px">PHP 版本</span>{{ cfg.php_version }}</div>
          </div>
          <div v-else style="color:#909399;font-size:13px">加载中...</div>
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

const loading = ref(false)
const site = ref({ site_name: 'DOO', site_desc: '', logo_url: '' })
const cfg = ref(null)
const pwd = ref({ old_password: '', new_password: '', confirm: '' })
const savingSite = ref(false)
const savingPwd = ref(false)
const flushing = ref(false)

const loadSite = async () => {
  try {
    const r = await api.get('/admin_system_config.php')
    if (r.data.code === 200) site.value = r.data.data
  } catch (e) { /* ignore */ }
}
const loadCfg = async () => {
  try {
    const r = await api.get('/admin_system_config.php', { params: { action: 'config' } })
    if (r.data.code === 200) cfg.value = r.data.data
  } catch (e) { /* ignore */ }
  // 真实生效的 API 版本（api_settings 表，v1/v2 切换）——覆盖旧 config 里的静态版本号
  try {
    const ar = await api.get('/admin_api_version.php')
    const av = ar.data?.data?.version || ''
    if (av) cfg.value = { ...(cfg.value || {}), api_version: av === 'v2' ? 'v2（生效中）' : av === 'v1' ? 'v1（生效中）' : cfg.value?.api_version }
  } catch (e) { /* ignore */ }
}
const loadAll = async () => {
  loading.value = true
  await Promise.all([loadSite(), loadCfg()])
  loading.value = false
}

// ===== 通用确认：移动端用底部弹出 mc-sheet，桌面端沿用 ElMessageBox =====
const confirmSheet = ref({ show: false, title: '', text: '', danger: false, onOk: null })
const askConfirm = (title, text, danger = false) => new Promise(resolve => {
  if (isMobile.value) {
    confirmSheet.value = { show: true, title, text, danger: !!danger, onOk: resolve }
  } else {
    ElMessageBox.confirm(text, title, { type: danger ? 'warning' : 'info' })
      .then(() => resolve(true)).catch(() => resolve(false))
  }
})
const sheetOk = () => { const cb = confirmSheet.value.onOk; confirmSheet.value.show = false; cb && cb(true) }
const sheetCancel = () => { confirmSheet.value.onOk = null; confirmSheet.value.show = false }

// ===== 移动端：把只读配置映射成卡片列表 + 上拉分页 =====
const cfgItems = computed(() => {
  if (!cfg.value) return []
  const c = cfg.value
  const sizeMB = c.upload_max_size ? (c.upload_max_size / 1024 / 1024).toFixed(0) : ''
  return [
    { key: 'api_version', icon: 'V', label: 'API 版本', value: c.api_version || '-', desc: '后端接口版本号' },
    { key: 'download', icon: '↓', label: '下载地址', value: c.download_base_url || '自动', desc: '客户端下载基础地址' },
    { key: 'cors', icon: '网', label: 'CORS 白名单', value: '', desc: '允许跨域来源', tags: (c.cors_origins || []).map(String) },
    { key: 'upload', icon: '↑', label: '上传限制', value: sizeMB ? sizeMB + ' MB' : '-', desc: '单文件大小 · ' + ((c.upload_types || []).join(', ') || '-') },
    { key: 'smtp', icon: '邮', label: 'SMTP 邮件', value: (c.smtp_enabled ? '启用' : '停用') + (c.smtp_from ? ' · ' + c.smtp_from : ''), desc: '邮件发送服务' },
    { key: 'redis', icon: '缓', label: 'Redis', value: (c.redis?.enabled ? '启用' : '停用') + (c.redis?.host ? ' · ' + c.redis.host + (c.redis?.port ? ':' + c.redis.port : '') : ''), desc: '缓存存储' },
    { key: 'ai', icon: 'AI', label: 'AI 模型', value: c.ai_model || '-', desc: '当前智能模型' },
    { key: 'server', icon: '服', label: 'Web 服务器', value: c.server_software || '-', desc: '运行环境' },
    { key: 'php', icon: 'P', label: 'PHP 版本', value: c.php_version || '-', desc: '运行环境' },
  ]
})

const saveSite = async () => {
  if (!site.value.site_name.trim()) { ElMessage.warning('站点名称不能为空'); return }
  savingSite.value = true
  try {
    const r = await api.post('/admin_system_config.php', { action: 'site', ...site.value })
    if (r.data.code === 200) ElMessage.success(r.data.message)
    else ElMessage.error(r.data.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  savingSite.value = false
}

const changePassword = async () => {
  if (!pwd.value.old_password || !pwd.value.new_password) { ElMessage.warning('请填写完整'); return }
  if (pwd.value.new_password !== pwd.value.confirm) { ElMessage.warning('两次新密码不一致'); return }
  if (pwd.value.new_password.length < 6) { ElMessage.warning('新密码至少 6 位'); return }
  // 移动端走底部弹出 sheet，桌面端走 ElMessageBox
  const ok = await askConfirm('修改密码', '修改密码后需重新登录，确认修改？', true)
  if (!ok) return
  savingPwd.value = true
  try {
    const r = await api.post('/admin_system_config.php', { action: 'password', old_password: pwd.value.old_password, new_password: pwd.value.new_password })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message)
      pwd.value = { old_password: '', new_password: '', confirm: '' }
    } else {
      ElMessage.error(r.data.message || '修改失败')
    }
  } catch (e) { ElMessage.error('修改失败') }
  savingPwd.value = false
}

const flushCache = async () => {
  // 移动端走底部弹出 sheet，桌面端走 ElMessageBox
  const ok = await askConfirm('清空缓存', '确定清空全部缓存？清空后客户端首屏将重新加载数据。', true)
  if (!ok) return
  flushing.value = true
  try {
    const r = await api.post('/admin_system_config.php', { action: 'flush' })
    if (r.data.code === 200) ElMessage.success(r.data.message)
    else ElMessage.error(r.data.message || '清空失败')
  } catch (e) { ElMessage.error('清空失败') }
  flushing.value = false
}

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
/* 移动端：只读系统配置分组键值行 */
.mc-cfg-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #f2f4f7;
  font-size: 13px;
}
.mc-cfg-row:last-child { border-bottom: none; }
.mc-cfg-label { color: #666; flex-shrink: 0; }
.mc-cfg-val { color: #1a1a2e; font-weight: 500; text-align: right; min-width: 0; word-break: break-all; }

/* 移动端确认弹层文本（主体样式沿用全局 mobile-cards.css 的 mc-*） */
.mc-confirm-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  word-break: break-all;
}
</style>
