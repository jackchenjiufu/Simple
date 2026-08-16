<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">{{ isEdit ? '编辑文章' : '写文章' }}</h2>
      <el-button size="small" @click="goBack">返回列表</el-button>
    </div>

    <el-form :model="form" label-width="60px" style="margin-top:12px;max-width:760px" v-loading="loading">
      <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
      <el-form-item label="作者">
        <el-select v-model="form.author" filterable remote :remote-method="searchAuthors" :loading="authorLoading" placeholder="搜索并选择作者" style="width:100%">
          <el-option v-for="u in authorOptions" :key="u.username" :value="u.username" :label="u.nickname ? `${u.username}（${u.nickname}）` : u.username" />
        </el-select>
      </el-form-item>
      <el-form-item label="分类">
        <el-select v-model="form.category" placeholder="选择分类" style="width:100%">
          <el-option v-for="c in CATEGORY_OPTIONS" :key="c.value" :value="c.value" :label="c.label" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width:100%">
          <el-option value="draft" label="草稿" />
          <el-option value="published" label="已发布" />
        </el-select>
      </el-form-item>
      <el-form-item label="内容"><el-input v-model="form.content" type="textarea" :rows="12" /></el-form-item>
      <el-form-item>
        <el-button @click="goBack">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/api'
import { CATEGORY_OPTIONS } from '@/constants/articleCategories'

const route = useRoute()
const router = useRouter()

const id = ref(route.params.id)
const isEdit = computed(() => !!id.value)
const loading = ref(false), saving = ref(false)
// 新建默认"已发布"，可直接保存发布
const form = ref({ title: '', author: '', category: '', content: '', status: 'published' })
const authorOptions = ref([])
const authorLoading = ref(false)

// 拉取作者候选列表（无关键词：前 200 个）
const loadAuthors = async (kw = '') => {
  authorLoading.value = true
  try {
    const r = await api.get('/article_authors.php', { params: { search: kw || undefined } })
    if (r.data.code === 200) authorOptions.value = r.data.data || []
  } catch (e) { /* ignore */ }
  authorLoading.value = false
}

// 远程搜索作者
const searchAuthors = (kw) => {
  if (!kw) { loadAuthors(''); return }
  loadAuthors(kw.trim())
}

const goBack = () => router.push('/article')

// 后端无按 id 查询接口，通过列表分页找到对应行
const loadArticleById = async (targetId) => {
  loading.value = true
  try {
    let page = 1
    const limit = 100
    while (true) {
      const r = await api.get('/admin_articles.php', { params: { page, limit } })
      if (r.data.code !== 200) break
      const row = (r.data.data || []).find(a => String(a.id) === String(targetId))
      if (row) return row
      const total = r.data.total || 0
      if (page * limit >= total) break
      page++
    }
    return null
  } catch (e) {
    return null
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (!form.value.title) { ElMessage.warning('请输入标题'); return }
  saving.value = true
  try {
    if (isEdit) {
      await api.put('/admin_articles.php', { ...form.value, id: id.value })
      ElMessage.success('已更新')
    } else {
      await api.post('/admin_articles.php', form.value)
      ElMessage.success('已创建')
    }
    router.push('/article')
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}

const loadArticle = async () => {
  loading.value = true
  try {
    form.value = { title: '', author: '', category: '', content: '', status: 'published' }
    if (!id.value) return
    const row = await loadArticleById(id.value)
    if (!row) {
      ElMessage.error('未找到该文章')
      goBack()
      return
    }
    // 兼容旧数据 status='publish' → 统一为 'published'
    const status = row.status === 'publish' ? 'published' : (row.status || 'draft')
    const cat = (row.tags || '').split(',')[0] || (row.category && row.category !== 'article' ? row.category : '')
    form.value = { title: row.title || '', author: row.author || '', category: cat, content: row.content || '', status }
    // 当前作者不在候选列表时补一条，保证下拉显示
    if (form.value.author && !authorOptions.value.some(u => u.username === form.value.author)) {
      authorOptions.value = [{ username: form.value.author, nickname: '' }, ...authorOptions.value]
    }
  } finally {
    loading.value = false
  }
}

// 路由复用组件时（/article-edit/5 → /article-edit/6）重新加载，避免编辑错文章
watch(() => route.params.id, (newId) => {
  id.value = newId
  loadArticle()
})

onMounted(async () => {
  loadAuthors()
  await loadArticle()
})
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
</style>
