<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="header-row" style="margin-bottom:10px">
        <h2 style="margin:0;font-size:18px">启动页管理</h2>
        <span class="mc-mod" :class="form.enabled == 1 ? 'm-safe' : 'm-unsafe'">{{ form.enabled == 1 ? '已启用' : '已停用' }}</span>
      </div>

      <!-- 启屏配置列表卡片（后端 splash_config.php 为单条配置，id=1） -->
      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else class="mc-card">
          <div class="mc-card-top">
            <div class="mc-thumb" v-if="form.image_url || form.logo_url" @click="openImg(form.image_url || form.logo_url)">
              <img :src="form.image_url || form.logo_url" alt="" />
            </div>
            <div class="mc-thumb mc-thumb-empty" v-else>启屏图</div>
            <div class="mc-card-info">
              <div class="mc-title">{{ form.title || 'Simple' }}</div>
              <div class="mc-meta">{{ form.subtitle || '加载中...' }}</div>
              <div class="mc-data">延迟 {{ Number(form.delay_ms) || 300 }}ms · 背景 <span class="mc-color" :style="{ background: form.bg_color || '#ffffff' }"></span>{{ form.bg_color || '#ffffff' }}</div>
              <div class="mc-data" v-if="cfgId || updatedAt">配置ID #{{ cfgId || 1 }}<template v-if="updatedAt"> · 更新于 {{ updatedAt }}</template></div>
            </div>
          </div>
          <div class="mc-actions">
            <span class="mc-act pinned" @click="openEdit">编辑 / 上传</span>
            <span class="mc-act" :class="form.enabled == 1 ? 'warn' : 'ok'" @click="askToggle">{{ form.enabled == 1 ? '停用' : '启用' }}</span>
            <span class="mc-act danger" @click="askReset">重置默认</span>
          </div>
        </div>

        <!-- 启屏预览 -->
        <div v-if="!loading" class="mc-card">
          <div class="mc-title" style="margin-bottom:8px">预览</div>
          <div class="preview-box" :style="{ background: form.bg_color || '#ffffff' }">
            <img v-if="form.image_url" class="preview-bg" :src="form.image_url" style="object-fit:cover" />
            <img v-if="form.logo_url" class="preview-logo" :src="form.logo_url" style="object-fit:contain;position:relative" />
            <div v-else class="preview-logo preview-logo-text" style="position:relative">LOGO</div>
            <div class="preview-title" style="position:relative" :style="{ color: form.title_color || '#ffffff' }">{{ form.title || 'Simple' }}</div>
            <div class="preview-sub" style="position:relative" :style="{ color: form.subtitle_color || 'rgba(255,255,255,0.7)' }">{{ form.subtitle || '加载中...' }}</div>
          </div>
        </div>
      </div>

      <!-- 编辑 / 新增底部弹层（移动端） -->
      <div v-if="showEdit" class="mc-mask" @click.self="showEdit=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>启屏配置</span>
            <span class="mc-close" @click="showEdit=false">✕</span>
          </div>
          <div class="mc-sheet-scroll">
            <div class="mc-form-row">
              <label>应用名称</label>
              <input v-model="form.title" placeholder="Simple" />
            </div>
            <div class="mc-form-row">
              <label>底部文字</label>
              <input v-model="form.subtitle" placeholder="加载中..." />
            </div>
            <div class="mc-form-row">
              <label>延迟(ms)</label>
              <input v-model.number="form.delay_ms" type="number" min="100" max="5000" step="100" />
            </div>
            <div class="mc-form-row">
              <label>背景色</label>
              <div class="mc-color-row">
                <span v-for="c in presetColors" :key="c" class="mc-color-dot" :class="{ active: form.bg_color === c }" :style="{ background: c }" @click="form.bg_color = c"></span>
                <input type="color" v-model="form.bg_color" />
                <input type="text" v-model="form.bg_color" placeholder="#ffffff" />
              </div>
            </div>
            <div class="mc-form-row">
              <label>Logo</label>
              <div class="mc-up-row">
                <input v-model="form.logo_url" placeholder="https://... 或上传" />
                <div class="mc-upload-btn" @click="triggerLogoUpload">上传</div>
              </div>
            </div>
            <div class="mc-form-row">
              <label>启动图</label>
              <div class="mc-up-row">
                <input v-model="form.image_url" placeholder="全屏启动图 URL 或上传" />
                <div class="mc-upload-btn" @click="triggerSplashUpload">上传</div>
              </div>
            </div>
          </div>
          <div class="mc-actions" style="margin-top:14px">
            <span class="mc-act" @click="showEdit=false">取消</span>
            <span class="mc-act ok" :class="{ 'is-loading': saving }" @click="handleSave">{{ saving ? '保存中...' : '保存配置' }}</span>
          </div>
        </div>
      </div>
      <input ref="logoInput" type="file" accept="image/*" style="display:none" @change="onLogoFile" />
      <input ref="splashInput" type="file" accept="image/*" style="display:none" @change="onSplashFile" />

      <!-- 操作确认底部弹层（移动端） -->
      <div v-if="mConfirm" class="mc-mask" @click.self="mConfirm=null">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>{{ mConfirm.title || '操作确认' }}</span>
            <span class="mc-close" @click="mConfirm=null">✕</span>
          </div>
          <div class="mc-del-text">{{ mConfirm.message }}</div>
          <div class="mc-actions" style="margin-top:16px">
            <span class="mc-act" @click="mConfirm=null">取消</span>
            <span class="mc-act danger" @click="mDoConfirm">确认</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端（原有，保留） ==================== -->
    <template v-else>
    <h2 style="margin-bottom:20px">启动页管理</h2>
    <el-row :gutter="20">
      <el-col :span="14">
        <el-card shadow="never">
          <el-form :model="form" label-width="100px">
            <el-form-item label="启用">
              <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
            </el-form-item>
            <el-form-item label="应用名称">
              <el-input v-model="form.title" placeholder="Simple" />
            </el-form-item>
            <el-form-item label="底部文字">
              <el-input v-model="form.subtitle" placeholder="加载中..." />
            </el-form-item>
            <el-form-item label="Logo">
                          <div style="display:flex;align-items:center;gap:12px;width:100%">
                            <el-input v-model="form.logo_url" placeholder="https://... 或上传" />
                            <el-upload name="image" :action="uploadUrl" :headers="uploadHeaders" :data="uploadData" :on-success="handleUploadSuccess" :on-error="uploadError" :show-file-list="false" accept="image/*">
                              <el-button size="small">上传</el-button>
                            </el-upload>
                          </div>
                        </el-form-item>
                        <el-form-item label="启动图">
                          <div style="display:flex;align-items:center;gap:12px;width:100%">
                            <el-input v-model="form.image_url" placeholder="全屏启动图 https://...（App 端后续启用）" />
                            <el-upload name="image" :action="uploadUrl" :headers="uploadHeaders" :data="splashUploadData" :on-success="handleSplashUploadSuccess" :on-error="uploadError" :show-file-list="false" accept="image/*">
                              <el-button size="small">上传</el-button>
                            </el-upload>
                          </div>
                        </el-form-item>
            <el-form-item label="延迟(ms)">
              <el-input-number v-model="form.delay_ms" :min="100" :max="5000" :step="100" />
            </el-form-item>
            <el-form-item label="背景色">
              <el-color-picker v-model="form.bg_color" />
            </el-form-item>
            <el-form-item label="标题颜色">
              <el-color-picker v-model="form.title_color" />
            </el-form-item>
            <el-form-item label="副标题颜色">
              <el-color-picker v-model="form.subtitle_color" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSave" :loading="saving">保存配置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
      <el-col :span="10">
        <el-card shadow="never">
                  <template #header>预览</template>
                  <div class="preview-box" :style="{ background: form.bg_color }">
                    <img v-if="form.image_url" class="preview-bg" :src="form.image_url" style="object-fit:cover" />
                    <img v-if="form.logo_url" class="preview-logo" :src="form.logo_url" style="object-fit:contain;position:relative" />
                    <div v-else class="preview-logo preview-logo-text" style="position:relative">LOGO</div>
                    <div class="preview-title" style="position:relative">{{ form.title || 'Simple' }}</div>
                    <div class="preview-sub" style="position:relative">{{ form.subtitle || '加载中...' }}</div>
                  </div>
                </el-card>
      </el-col>
    </el-row>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getSplashConfig, saveSplashConfig } from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const saving = ref(false)
const loading = ref(true)
const form = reactive({
  enabled: 1, title: 'Simple', subtitle: '加载中...',
  logo_url: '', image_url: '', delay_ms: 300, bg_color: '#ffffff', title_color: '#ffffff', subtitle_color: 'rgba(255,255,255,0.7)'
})
const presetColors = ['#ffffff', '#1b44a6', '#0ea5e9', '#f5f6fa', '#000000']
const uploadUrl = "/doo/server/api/upload_image.php"
const uploadHeaders = {'X-Admin-Token': localStorage.getItem('admin_token') || ''}
const uploadData = { title: 'splash', author: 'admin' }
const splashUploadData = { title: 'splash-bg', author: 'admin' }
const uploadError = () => ElMessage.error('上传失败')
const handleUploadSuccess = (res) => {
  if (res.code === 200 && res.data?.url) form.logo_url = res.data.url
}
const handleSplashUploadSuccess = (res) => {
  if (res.code === 200 && res.data?.url) form.image_url = res.data.url
}

// 后端 splash_config.php：单条配置（id=1），字段 enabled/title/subtitle/logo_url/image_url/delay_ms/bg_color
const cfgId = ref('')
const updatedAt = ref('')
const load = async () => {
  loading.value = true
  try {
    const res = await getSplashConfig()
    if (res.data.code === 200 && res.data.data) {
      const d = res.data.data
      // 字段兜底：空值/字符串数字/异常时间一律回退默认
      Object.assign(form, {
        enabled: d.enabled == 1 ? 1 : 0,
        title: d.title || 'Simple',
        subtitle: d.subtitle || '加载中...',
        logo_url: d.logo_url || '',
        image_url: d.image_url || '',
        delay_ms: parseInt(d.delay_ms) || 300,
        bg_color: d.bg_color || '#ffffff'
      })
      cfgId.value = d.id || ''
      const u = d.updated_at || d.created_at
      updatedAt.value = (u && String(u) !== '0000-00-00 00:00:00') ? String(u).replace('T', ' ').slice(0, 19) : ''
    }
  } catch(e) { ElMessage.error('加载失败') }
  loading.value = false
}
onMounted(load)

const openImg = (url) => { if (url) window.open(url, '_blank') }

// 编辑 / 新增弹层（单配置，编辑即保存到 id=1）
const showEdit = ref(false)
const openEdit = () => { showEdit.value = true }

const handleSave = async () => {
  saving.value = true
  try {
    const res = await saveSplashConfig({ ...form, delay_ms: parseInt(form.delay_ms) || 300 })
    ElMessage.success(res.data.message || '保存成功')
    showEdit.value = false
    load()
  } catch(e) { ElMessage.error('保存失败') }
  saving.value = false
}

// ------------------ 移动端辅助 ------------------
const toggleEnabled = () => { form.enabled = form.enabled == 1 ? 0 : 1 }
const persistEnabled = async () => {
  try {
    const res = await saveSplashConfig({ enabled: form.enabled == 1 ? 1 : 0 })
    ElMessage.success(res.data.message || '已更新')
    load()
  } catch (e) { ElMessage.error('操作失败') }
}
const resetForm = async () => {
  Object.assign(form, { enabled: 1, title: 'Simple', subtitle: '加载中...', logo_url: '', image_url: '', delay_ms: 300, bg_color: '#ffffff', title_color: '#ffffff', subtitle_color: 'rgba(255,255,255,0.7)' })
  saving.value = true
  try {
    const res = await saveSplashConfig({ ...form, delay_ms: 300, enabled: 1 })
    ElMessage.success(res.data.message || '已重置为默认配置')
    load()
  } catch (e) { ElMessage.error('重置失败') }
  saving.value = false
}

// 移动端操作确认：底部弹层（mc-mask + mc-sheet）；桌面端不受影响
const mConfirm = ref(null)
const mAsk = (message, onOk, title = '操作确认') => { mConfirm.value = { title, message, onOk } }
const mDoConfirm = async () => {
  const c = mConfirm.value
  mConfirm.value = null
  if (c && typeof c.onOk === 'function') { try { await c.onOk() } catch (e) { /* 由调用方处理 */ } }
}
const askToggle = () => mAsk(form.enabled == 1 ? '停用后 App 启动时将不再展示此启动页，确认停用？' : '启用后 App 启动时将展示此启动页，确认启用？', async () => { toggleEnabled(); await persistEnabled() }, form.enabled == 1 ? '停用启动页' : '启用启动页')
const askReset = () => mAsk('将恢复默认配置（启用 / Simple / 白色背景 / 300ms 延迟），Logo 与启动图将被清空。确认重置？', resetForm, '重置配置')

// 移动端文件上传（本地 file input，复用同一上传接口）
const logoInput = ref(null), splashInput = ref(null)
const triggerLogoUpload = () => logoInput.value && logoInput.value.click()
const triggerSplashUpload = () => splashInput.value && splashInput.value.click()

const doUpload = async (file, title) => {
  const fd = new FormData()
  fd.append('image', file)
  fd.append('title', title)
  fd.append('author', 'admin')
  try {
    const r = await fetch(uploadUrl, { method: 'POST', headers: uploadHeaders, body: fd })
    const res = await r.json()
    if (res.code === 200 && res.data?.url) return res.data.url
    ElMessage.error(res.message || '上传失败')
  } catch (e) { ElMessage.error('上传失败') }
  return null
}

const onLogoFile = async (e) => {
  const f = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!f) return
  const url = await doUpload(f, 'splash')
  if (url) form.logo_url = url
}
const onSplashFile = async (e) => {
  const f = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!f) return
  const url = await doUpload(f, 'splash-bg')
  if (url) form.image_url = url
}
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.preview-box {
  width: 100%; height: 300px; border-radius: 12px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border: 2px dashed #ddd;
  overflow: hidden; position: relative;
}
.preview-bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.preview-logo { width: 64px; height: 64px; border-radius: 14px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.preview-logo-text { font-size: 12px; color: #bbb; font-weight: 600; }
.preview-title { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.preview-sub { font-size: 12px; color: #ccc; margin-top: 40px; }

/* 移动端样式微调（mc-* 主体样式来自全局 mobile-cards.css） */
/* 卡片 meta 中的背景色块 */
.mc-color { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid #e5e5e5; margin: 0 4px; vertical-align: -1px; }
/* 弹层：input + 上传按钮同行 */
.mc-up-row { display: flex; align-items: center; gap: 8px; }
.mc-up-row input { flex: 1; min-width: 0; }
.mc-upload-btn { flex: none; height: 40px; line-height: 40px; padding: 0 16px; background: #2f6bf0; color: #fff; border-radius: 9px; font-size: 14px; }
/* 弹层：背景色预设圆点 + 取色器 + 文本值 */
.mc-color-row { display: flex; align-items: center; gap: 8px; }
.mc-color-dot { width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent; box-sizing: border-box; flex: none; }
.mc-color-dot.active { border-color: #2f6bf0; }
.mc-color-row input[type="color"] { width: 44px; height: 38px; padding: 2px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; flex: none; }
.mc-color-row input[type="text"] { flex: 1; min-width: 0; }
/* 弹层：内容超高时内部滚动 */
.mc-sheet-scroll { max-height: 62vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
/* 确认文案 */
.mc-del-text { font-size: 14px; color: #555; line-height: 1.7; word-break: break-all; }
/* 保存中不可重复点击 */
.mc-act.is-loading { opacity: .6; pointer-events: none; }
</style>
