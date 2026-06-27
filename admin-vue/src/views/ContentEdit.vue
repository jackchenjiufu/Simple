<template>
  <div>
    <el-button text @click="$router.back()" style="margin-bottom:16px">← 返回内容管理</el-button>
    <el-card shadow="never">
      <template #header>{{ isEdit ? '编辑内容' : '添加内容' }}</template>
      <el-form :model="form" label-width="80px" style="max-width:600px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="form.content" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="图片">
          <el-upload :auto-upload="false" :show-file-list="false" @change="handleUpload">
            <el-button size="small">选择图片</el-button>
          </el-upload>
          <el-image v-if="form.image_url" :src="form.image_url" style="width:100px;height:100px;margin-top:8px" fit="cover" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api'

const route = useRoute()
const router = useRouter()
const isEdit = ref(false)
const saving = ref(false)
const form = ref({ title: '', content: '', image_url: '' })

onMounted(async () => {
  if (route.query.id) {
    isEdit.value = true
    try {
      const r = await api.get('/admin_content.php')
      if (r.data.code === 200) {
        const item = r.data.data.find(i => i.id == route.query.id)
        if (item) form.value = { ...item }
      }
    } catch(e) {}
  }
})

const handleUpload = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => { form.value.image_url = e.target.result }
  reader.readAsDataURL(file.raw)
}

const save = async () => {
  saving.value = true
  try {
    if (isEdit.value) {
      await api.put('/admin_content.php', form.value)
    } else {
      await api.post('/admin_content.php', form.value)
    }
    ElMessage.success('保存成功')
    router.push('/content')
  } catch(e) { ElMessage.error('保存失败') }
  saving.value = false
}
</script>
