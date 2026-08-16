<template>
  <div>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'

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
}
const loadAll = async () => {
  loading.value = true
  await Promise.all([loadSite(), loadCfg()])
  loading.value = false
}

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
  try {
    await ElMessageBox.confirm('修改密码后需重新登录，确认修改？', '修改密码', { type: 'warning' })
  } catch (e) { return }
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
  try {
    await ElMessageBox.confirm('确定清空全部缓存？', '清空缓存', { type: 'warning' })
  } catch (e) { return }
  flushing.value = true
  try {
    const r = await api.post('/admin_system_config.php', { action: 'flush' })
    if (r.data.code === 200) ElMessage.success(r.data.message)
    else ElMessage.error(r.data.message || '清空失败')
  } catch (e) { ElMessage.error('清空失败') }
  flushing.value = false
}

onMounted(loadAll)
</script>
