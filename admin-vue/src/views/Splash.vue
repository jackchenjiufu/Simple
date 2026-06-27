<template>
  <div>
    <h2 style="margin-bottom:20px">启动页管理</h2>
    <el-row :gutter="20">
      <el-col :span="14">
        <el-card shadow="never">
          <el-form :model="form" label-width="100px">
            <el-form-item label="启用">
              <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
            </el-form-item>
            <el-form-item label="应用名称">
              <el-input v-model="form.title" placeholder="Simple Server" />
            </el-form-item>
            <el-form-item label="底部文字">
              <el-input v-model="form.subtitle" placeholder="加载中..." />
            </el-form-item>
            <el-form-item label="Logo URL">
              <el-input v-model="form.logo_url" placeholder="https://..." />
            </el-form-item>
            <el-form-item label="延迟(ms)">
              <el-input-number v-model="form.delay_ms" :min="100" :max="5000" :step="100" />
            </el-form-item>
            <el-form-item label="背景色">
              <el-color-picker v-model="form.bg_color" />
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
            <div class="preview-logo">🖼</div>
            <div class="preview-title">{{ form.title || 'Simple Server' }}</div>
            <div class="preview-sub">{{ form.subtitle || '加载中...' }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getSplashConfig, saveSplashConfig } from '@/api'

const saving = ref(false)
const form = reactive({
  enabled: 1, title: 'Simple Server', subtitle: '加载中...',
  logo_url: '', delay_ms: 300, bg_color: '#ffffff'
})

onMounted(async () => {
  try {
    const res = await getSplashConfig()
    if (res.data.code === 200 && res.data.data) {
      Object.assign(form, res.data.data)
    }
  } catch(e) { ElMessage.error('加载失败') }
})

const handleSave = async () => {
  saving.value = true
  try {
    const res = await saveSplashConfig(form)
    ElMessage.success(res.data.message || '保存成功')
  } catch(e) { ElMessage.error('保存失败') }
  saving.value = false
}
</script>

<style scoped>
.preview-box {
  width: 100%; height: 300px; border-radius: 12px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border: 2px dashed #ddd;
}
.preview-logo { width: 64px; height: 64px; border-radius: 14px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 12px; }
.preview-title { font-size: 18px; font-weight: 700; color: #1a1a2e; }
.preview-sub { font-size: 12px; color: #ccc; margin-top: 40px; }
</style>
