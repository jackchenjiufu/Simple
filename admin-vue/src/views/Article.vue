<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <div class="mc-fbtn" @click="router.push('/article-edit')">写文章</div>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无文章</div>
        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-card-top">
            <div class="mc-thumb" v-if="row.cover">
              <img :src="row.cover" alt="" />
            </div>
            <div class="mc-thumb mc-thumb-empty" v-else>{{ row.title ? row.title.charAt(0) : '文' }}</div>
            <div class="mc-card-info">
              <div class="mc-title">{{ row.title || '(无标题)' }}</div>
              <div class="mc-meta">
                <img v-if="row.author_avatar" class="mc-meta-avatar" :src="row.author_avatar" alt="" />
                {{ row.author || '未知作者' }} · {{ catLabel(row) }}
              </div>
              <div class="mc-data">{{ fmtTime(row.created_at) }}</div>
            </div>
            <span class="mc-mod" :class="isPublished(row) ? 'm-safe' : 'm-draft'">{{ isPublished(row) ? '已发布' : '草稿' }}</span>
          </div>
          <div class="mc-tags">
            <span v-if="row.top == 1" class="mc-tag" style="background:#eef4ff;color:#2f6bf0">置顶</span>
            <span v-if="row.comments !== undefined && Number(row.comments) > 0" class="mc-tag">评论 {{ row.comments }}</span>
            <span v-for="t in tagList(row)" :key="t" class="mc-tag">{{ t }}</span>
          </div>
          <div v-if="row.excerpt || row.content" class="mc-excerpt">{{ row.excerpt || stripHtml(row.content) }}</div>
          <div class="mc-actions">
            <span class="mc-act pinned" @click.stop="openDetail(row)">详情</span>
            <span class="mc-act" :class="row.top == 1 ? 'ok' : 'pinned'" @click.stop="toggleTop(row)">{{ row.top == 1 ? '取消置顶' : '置顶' }}</span>
            <span class="mc-act" @click.stop="router.push('/article-edit/' + row.id)">编辑</span>
            <span class="mc-act danger" @click.stop="del(row)">删除</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 详情弹层 -->
      <div class="mc-mask" v-if="detail" @click.self="detail=null">
        <div class="mc-sheet mc-detail">
          <div class="mc-sheet-head">
            <span>文章详情</span>
            <span class="mc-close" @click="detail=null">✕</span>
          </div>
          <div class="mc-det-cover" v-if="detail.cover"><img :src="detail.cover" alt="" /></div>
          <div class="mc-det-cover mc-det-cover-empty" v-else>{{ (detail.title || '文').charAt(0) }}</div>
          <div class="mc-detail-title">{{ detail.title || '(无标题)' }}</div>
          <div class="mc-mod-line">
            <span class="mc-mod" :class="isPublished(detail) ? 'm-safe' : 'm-draft'">{{ isPublished(detail) ? '已发布' : '草稿' }}</span>
            <span v-if="detail.top == 1" class="mc-mod" style="background:#eef4ff;color:#2f6bf0">置顶</span>
          </div>
          <div class="mc-det-row"><label>ID</label><span>{{ detail.id ?? '-' }}</span></div>
          <div class="mc-det-row"><label>作者</label><span>{{ detail.author || '未知作者' }}（ID:{{ detail.user_id ?? '-' }}）</span></div>
          <div class="mc-det-row"><label>分类</label><span>{{ catLabel(detail) || '-' }}</span></div>
          <div class="mc-det-row"><label>标签</label><span>{{ tagList(detail).join(' / ') || '-' }}</span></div>
          <div class="mc-det-row"><label>状态</label><span>{{ isPublished(detail) ? '已发布' : '草稿' }}</span></div>
          <div class="mc-det-row"><label>置顶</label><span>{{ detail.top == 1 ? '已置顶' : '未置顶' }}</span></div>
          <div class="mc-det-row"><label>评论数</label><span>{{ detail.comments != null ? detail.comments : '-' }}</span></div>
          <div class="mc-det-row"><label>发布时间</label><span>{{ fmtTime(detail.created_at) || '-' }}</span></div>
          <div class="mc-det-row" v-if="detail.updated_at"><label>更新时间</label><span>{{ fmtTime(detail.updated_at) || '-' }}</span></div>
          <div class="mc-det-block" v-if="detail.excerpt">
            <label>摘要</label>
            <div class="mc-det-text">{{ detail.excerpt }}</div>
          </div>
          <div class="mc-det-block" v-if="detail.content">
            <label>正文</label>
            <div class="mc-det-text mc-det-content">{{ stripHtml(detail.content) }}</div>
          </div>
          <div class="mc-det-block" v-if="!detail.excerpt && !detail.content">
            <label>正文</label>
            <div class="mc-det-text">(无内容)</div>
          </div>
          <div class="mc-actions" style="margin-top:14px;border:none;padding:0">
            <span class="mc-act" :class="detail.top == 1 ? 'ok' : 'pinned'" @click="toggleTop(detail); detail=null">{{ detail.top == 1 ? '取消置顶' : '置顶' }}</span>
            <span class="mc-act" @click="router.push('/article-edit/' + detail.id)">编辑</span>
            <span class="mc-act danger" @click="del(detail); detail=null">删除</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
    <div class="header-row">
      <h2 style="margin:0">文章管理</h2>
      <el-button type="primary" size="small" @click="router.push('/article-edit')">写文章</el-button>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无文章">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip>
        <template #default="{row}"><span class="art-title">{{ row.title }}</span></template>
      </el-table-column>
      <el-table-column prop="author" label="作者" width="100" />
      <el-table-column label="分类" width="100">
        <template #default="{row}"><el-tag size="small" effect="plain">{{ catLabel(row) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{row}">
          <el-tag :type="isPublished(row) ? 'success' : 'info'" effect="light" round size="small">{{ isPublished(row) ? '已发布' : '草稿' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="router.push('/article-edit/' + row.id)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="del(row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-row" v-if="total>0">
      <el-pagination
        v-model:current-page="currentPage" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" small @current-change="load"
      />
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { catLabelOf } from '@/constants/articleCategories'
import { useMobile } from '@/composables/useMobile'

const router = useRouter()
const { isMobile } = useMobile()

const list = ref([]), loading = ref(true)
const detail = ref(null)
const total = ref(0), currentPage = ref(1), pageSize = ref(10)

// 已发布：兼容新值 published 与旧数据 publish
const isPublished = (row) => row.status === 'published' || row.status === 'publish'

// 标签解析：兼容逗号分隔字符串与 JSON 数组字符串（后端入库格式不同）
const parseTags = (row) => {
  const raw = row.tags
  if (raw == null || raw === '') return []
  const s = String(raw).trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) return arr.map(x => String(x).trim()).filter(Boolean)
    } catch (e) { /* 非 JSON 数组，走逗号拆分 */ }
  }
  return s.split(',').map(x => String(x).trim()).filter(Boolean)
}

// 分类展示：取 tags 首项（get_articles.php 的"首标签即分类"体系），兜底 category 字段
const catLabel = (row) => catLabelOf(parseTags(row)[0] || row.category || '')

// 标签列表：tags 首项为分类，拆分后去掉首项，避免与分类重复
const tagList = (row) => parseTags(row).slice(1)

// 去掉 HTML 标签，截断为摘录（长文本可滚动展示）
const stripHtml = (html) => {
  if (!html) return ''
  const text = String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text
}

// 时间展示：截断到分钟
const fmtTime = (t) => (t || '').substring(0, 16) || ''

// 打开详情弹层
const openDetail = (row) => { detail.value = row }

// 置顶/取消置顶（admin_articles.php PUT top）
const toggleTop = async (row) => {
  const target = row.top == 1 ? 0 : 1
  try {
    await api.put('/admin_articles.php', { id: row.id, top: target })
    ElMessage.success(target ? '已置顶' : '已取消置顶')
    load()
  } catch (e) { ElMessage.error('操作失败') }
}

const buildParams = () => {
  return { page: currentPage.value, limit: pageSize.value }
}

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_articles.php', { params: buildParams() })
    if (r.data.code === 200) {
      list.value = r.data.data || []
      total.value = r.data.total || 0
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}

const del = async (row) => {
  try {
    await api.delete('/admin_articles.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    if (list.value.length <= 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) { ElMessage.error('删除失败') }
}

// 移动端加载状态
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  currentPage.value += 1
  try {
    const r = await api.get('/admin_articles.php', { params: buildParams() })
    if (r.data.code === 200) {
      const more = r.data.data || []
      list.value = list.value.concat(more)
      total.value = r.data.total || 0
    } else {
      currentPage.value -= 1 // 失败回退页码
    }
  } catch (e) { currentPage.value -= 1 }
  mLoadingMore.value = false
}
// 滚动到底部自动加载（移动端滚动容器是 .admin-main，绑定 document 捕获其滚动）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}
onMounted(() => { load(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
.art-title { font-weight: 600; color: #2b3350; }
/* 首字头像 */
.mc-thumb-empty { font-size: 22px; font-weight: 600; color: #fff; background: #3370ff; }
/* 文章状态：已发布(绿) / 草稿(灰) */
.mc-mod.m-draft { background: #f0f2f5; color: #909399; }
/* 作者小头像 */
.mc-meta-avatar { width: 16px; height: 16px; border-radius: 50%; vertical-align: middle; margin-right: 3px; object-fit: cover; }
/* 卡片摘录 */
.mc-excerpt { margin-top: 8px; font-size: 12px; color: #6b7280; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* 详情弹层 */
.mc-detail { max-height: 82vh; overflow-y: auto; }
.mc-det-cover { display: flex; justify-content: center; align-items: center; margin-bottom: 10px; }
/* 无封面时的占位（首字头像） */
.mc-det-cover-empty { height: 120px; font-size: 40px; font-weight: 600; color: #3370ff; background: #eef1f8; border-radius: 10px; }
/* 正文滚动区略高于摘要 */
.mc-det-content { max-height: 260px; }
.mc-det-cover img { width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; }
.mc-detail-title { font-size: 16px; font-weight: 600; color: #1a1a2e; margin-bottom: 8px; word-break: break-word; }
.mc-mod-line { display: flex; gap: 6px; margin-bottom: 10px; }
.mc-det-row { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 9px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
.mc-det-row label { color: #909399; flex-shrink: 0; }
.mc-det-row span { color: #1a1a2e; word-break: break-all; text-align: right; }
.mc-det-block { margin-top: 12px; }
.mc-det-block label { font-size: 13px; color: #909399; display: block; margin-bottom: 6px; }
.mc-det-text { font-size: 13px; color: #1a1a2e; line-height: 1.6; max-height: 180px; overflow-y: auto; word-break: break-word; background: #f7f8fa; border-radius: 8px; padding: 10px; }
</style>
