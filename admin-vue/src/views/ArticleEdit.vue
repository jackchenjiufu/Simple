<template>
  <div>
    <!-- ==================== 移动端全宽表单（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar" style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:700;font-size:16px;color:#1a1a2e;line-height:38px">{{ isEdit ? '编辑文章' : '写文章' }}</div>
        <div class="mc-fbtn" @click="goBack">返回</div>
      </div>

      <div class="mc-list" style="padding-top:0">
        <div class="mc-card" style="cursor:default">
          <div class="mc-form-row"><label>标题</label><input v-model="form.title" placeholder="请输入标题" /></div>
          <div class="mc-form-row"><label>作者</label>
            <div class="mc-author-box">
              <input v-model="authorInput" placeholder="输入关键词搜索作者" @input="onAuthorInput" @focus="onAuthorFocus" @blur="onAuthorBlur" />
              <div v-show="showAuthorList" class="mc-author-suggest">
                <div v-if="authorLoading" class="mc-author-empty">搜索中…</div>
                <div v-else-if="!authorOptions.length" class="mc-author-empty">无匹配作者</div>
                <div v-for="u in authorOptions" :key="u.username" class="mc-author-item" @mousedown.prevent="pickAuthor(u)">{{ u.nickname ? u.username + '（' + u.nickname + '）' : u.username }}</div>
              </div>
            </div>
          </div>
          <div class="mc-form-row"><label>分类</label>
            <select v-model="form.category" class="mc-select">
              <option :value="''" disabled>请选择分类</option>
              <option v-for="c in CATEGORY_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div class="mc-form-row"><label>状态</label>
            <select v-model="form.status" class="mc-select">
              <option value="draft">草稿</option>
              <option value="published">已发布</option>
            </select>
          </div>
          <div class="mc-form-row"><label>内容</label>
            <textarea v-model="form.content" class="mc-textarea" rows="12" placeholder="正文内容"></textarea>
          </div>
          <div class="mc-actions">
            <span class="mc-act" @click="goBack">取消</span>
            <span class="mc-act ok" @click="save">{{ saving ? '保存中...' : '保存' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端（原有，保留） ==================== -->
    <template v-else>
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import { CATEGORY_OPTIONS } from '@/constants/articleCategories'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()
const route = useRoute()
const router = useRouter()

const id = ref(route.params.id)
const isEdit = computed(() => !!id.value)
const loading = ref(false), saving = ref(false)
// 新建默认"已发布"，可直接保存发布
const form = ref({ title: '', author: '', category: '', content: '', status: 'published' })
const authorOptions = ref([])
const authorLoading = ref(false)
// 移动端作者远程搜索输入框状态
const authorInput = ref('')
const showAuthorList = ref(false)

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

// ---- 移动端作者远程搜索（方案B：text input + 匹配建议列表）----
// 输入触发远程搜索
const onAuthorInput = () => {
  showAuthorList.value = true
  searchAuthors(authorInput.value)
}
const onAuthorFocus = () => { showAuthorList.value = true }
const onAuthorBlur = () => { setTimeout(() => { showAuthorList.value = false }, 120) }
const pickAuthor = (u) => {
  form.value.author = u.username
  authorInput.value = u.nickname ? u.username + '（' + u.nickname + '）' : u.username
  showAuthorList.value = false
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
    authorInput.value = ''
    showAuthorList.value = false
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
    // 输入框展示当前作者
    const curAuthor = authorOptions.value.find(u => u.username === form.value.author)
    authorInput.value = curAuthor ? (curAuthor.nickname ? `${curAuthor.username}（${curAuthor.nickname}）` : curAuthor.username) : (form.value.author || '')
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

/* 移动端全宽表单内的大文本框 */
.mc-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  font-family: inherit;
  outline: none;
  resize: vertical;
  background: #fff;
}
.mc-textarea:focus { border-color: #2f6bf0; }

/* 移动端作者远程搜索组合框 */
.mc-author-box { position: relative; width: 100%; }
.mc-author-suggest {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 30;
  margin-top: 4px; background: #fff; border-radius: 9px;
  border: 1px solid #eef0f4; box-shadow: 0 4px 14px rgba(0,0,0,.1);
  max-height: 220px; overflow-y: auto; box-sizing: border-box;
}
.mc-author-item {
  padding: 11px 12px; font-size: 14px; color: #1a1a2e; cursor: pointer;
  border-bottom: 1px solid #f5f6fa;
}
.mc-author-item:last-child { border-bottom: none; }
.mc-author-item:active { background: #f0f4ff; }
.mc-author-empty { padding: 12px; font-size: 13px; color: #999; text-align: center; }

/* 移动端表单适配：窄屏 label 顶部对齐、控件占满、按钮全宽贴边 */
@media (max-width: 767px) {
  .form-actions :deep(.el-form-item__content) { display: flex; }
  :deep(.el-form) {
    padding: 8px;
    box-sizing: border-box;
  }
  :deep(.el-form-item) {
    display: block;
    margin-bottom: 16px;
  }
  :deep(.el-form-item__label) {
    float: none;
    width: auto !important;
    display: block;
    text-align: left;
    padding: 0 0 6px;
    line-height: 1.4;
  }
  :deep(.el-form-item__content) {
    margin-left: 0 !important;
    width: 100%;
  }
  :deep(.el-form-item__content .el-input),
  :deep(.el-form-item__content .el-select),
  :deep(.el-form-item__content .el-textarea) {
    width: 100% !important;
  }
  :deep(.el-form-item__content .el-button) {
    flex: 1;
    margin-left: 0;
  }
}
</style>
