<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <input v-model="searchKey" class="mc-search" placeholder="搜索内容/用户/文章"
               @keyup.enter="currentPage=1;load()" />
        <div class="mc-fbtn" @click="currentPage=1;load()">搜索</div>
      </div>
      <div class="mc-filters">
        <select v-model="statusFilter" class="mc-select" @change="currentPage=1;load()">
          <option value="">全部状态</option>
          <option value="0">正常</option>
          <option value="1">已隐藏</option>
        </select>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无评论</div>
        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-card-top">
            <div class="mc-thumb">
              <img v-if="row.avatar" :src="row.avatar" alt="" />
              <span v-else>{{ avatarChar(row) }}</span>
            </div>
            <div class="mc-card-info">
              <div class="mc-title" :style="row.status==1 ? 'color:#bbb' : ''">{{ row.content || '(无内容)' }}</div>
              <div class="mc-meta">{{ row.nickname || row.username || '用户#' + row.user_id }} · {{ row.article_title || '文章#' + row.article_id }}</div>
              <div class="mc-data">{{ fmtTime(row.created_at) }}</div>
            </div>
            <span class="mc-mod" :class="row.status==1 ? 'm-unsafe' : 'm-safe'">{{ row.status==1 ? '已隐藏' : '正常' }}</span>
          </div>
          <div class="mc-tags">
            <span v-if="row.is_top==1" class="mc-tag" style="background:#eef4ff;color:#2f6bf0">置顶</span>
            <span v-if="row.parent_id>0" class="mc-tag">回复评论#{{ row.parent_id }}</span>
            <span v-if="row.likes !== undefined && Number(row.likes) > 0" class="mc-tag">赞 {{ row.likes }}</span>
          </div>
          <div class="mc-actions">
            <span class="mc-act pinned" @click.stop="openDetail(row)">详情</span>
            <span class="mc-act" :class="{ pinned: row.is_top==1 }" @click.stop="toggleTop(row)">{{ row.is_top==1 ? '取消置顶' : '置顶' }}</span>
            <span class="mc-act" :class="row.status==1 ? 'ok' : 'warn'" @click.stop="toggleHide(row)">{{ row.status==1 ? '恢复' : '隐藏' }}</span>
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
            <span>评论详情</span>
            <span class="mc-close" @click="detail=null">✕</span>
          </div>
          <div class="mc-detail-avatar" v-if="detail.avatar"><img :src="detail.avatar" alt="" /></div>
          <div class="mc-detail-title">{{ detail.content || '(无内容)' }}</div>
          <div class="mc-mod-line">
            <span class="mc-mod" :class="detail.status==1 ? 'm-unsafe' : 'm-safe'">{{ detail.status==1 ? '已隐藏' : '正常' }}</span>
            <span v-if="detail.is_top==1" class="mc-mod" style="background:#eef4ff;color:#2f6bf0">置顶</span>
          </div>
          <div class="mc-det-row"><label>ID</label><span>{{ detail.id }}</span></div>
          <div class="mc-det-row"><label>作者</label><span>{{ detail.nickname || detail.username || '用户#' + detail.user_id }}（ID:{{ detail.user_id ?? '-' }}）</span></div>
          <div class="mc-det-row"><label>所属文章</label><span>{{ detail.article_title || '文章#' + detail.article_id }}（ID:{{ detail.article_id ?? '-' }}）</span></div>
          <div class="mc-det-row" v-if="detail.content_id"><label>内容ID</label><span>{{ detail.content_id }}</span></div>
          <div class="mc-det-row" v-if="detail.parent_id"><label>回复对象</label><span>评论#{{ detail.parent_id }}</span></div>
          <div class="mc-det-row" v-if="detail.likes !== undefined"><label>点赞数</label><span>{{ detail.likes }}</span></div>
          <div class="mc-det-row"><label>评论时间</label><span>{{ detail.created_at || '-' }}</span></div>
          <div class="mc-det-row"><label>状态</label><span>{{ detail.status==1 ? '已隐藏' : '正常' }}</span></div>
          <div class="mc-actions" style="margin-top:14px;border:none;padding:0">
            <span class="mc-act" :class="detail.is_top==1 ? 'ok' : 'pinned'" @click="toggleTop(detail); detail=null">{{ detail.is_top==1 ? '取消置顶' : '置顶' }}</span>
            <span class="mc-act" :class="detail.status==1 ? 'ok' : 'warn'" @click="toggleHide(detail)">{{ detail.status==1 ? '恢复' : '隐藏' }}</span>
            <span class="mc-act danger" @click="del(detail); detail=null">删除</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
    <div class="header-row">
      <h2 style="margin:0">评论管理</h2>
      <div class="header-controls">
        <el-input v-model="searchKey" placeholder="搜索内容/用户/文章" clearable size="small" style="width:200px" @clear="load" @keyup.enter="load" />
        <el-select v-model="statusFilter" placeholder="全部状态" clearable size="small" style="width:110px" @change="() => load()">
          <el-option value="0" label="正常" />
          <el-option value="1" label="已隐藏" />
        </el-select>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无评论">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="内容" min-width="260" show-overflow-tooltip>
        <template #default="{row}">
          <span :style="row.status==1 ? 'color:#bbb' : ''">{{ row.content }}</span>
          <el-tag v-if="row.is_top==1" type="warning" size="small" style="margin-left:6px">置顶</el-tag>
          <el-tag v-if="row.parent_id>0" type="info" size="small" style="margin-left:6px">回复</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="用户" width="110">
        <template #default="{row}">{{ row.nickname || row.username || '用户#' + row.user_id }}</template>
      </el-table-column>
      <el-table-column label="文章" min-width="150" show-overflow-tooltip>
        <template #default="{row}">{{ row.article_title || '文章#' + row.article_id }}</template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{row}">
          <el-tag :type="row.status==1?'info':'success'" size="small">{{ row.status==1?'已隐藏':'正常' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="160" />
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="toggleTop(row)">{{ row.is_top==1?'取消置顶':'置顶' }}</el-button>
          <el-button size="small" :type="row.status==1?'success':'warning'" @click="toggleHide(row)">{{ row.status==1?'恢复':'隐藏' }}</el-button>
          <el-popconfirm title="删除该评论及其回复？" @confirm="del(row)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-row" v-if="total>0">
      <el-pagination
        v-model:current-page="currentPage" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" small @current-change="() => load()"
      />
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const list = ref([]), loading = ref(true)
const detail = ref(null)
const total = ref(0), currentPage = ref(1), pageSize = ref(10)
const searchKey = ref(''), statusFilter = ref('')

const avatarChar = (row) => {
  const name = row.nickname || row.username || '用户'
  return (name[0] || '?').toUpperCase()
}

// 时间截断到分钟
const fmtTime = (t) => (t || '').substring(0, 16) || ''

// 打开详情弹层
const openDetail = (row) => { detail.value = row }

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_comments.php', {
      params: {
        page: currentPage.value, limit: pageSize.value,
        status: statusFilter.value === '' ? undefined : statusFilter.value,
        search: searchKey.value || undefined
      }
    })
    if (r.data.code === 200) {
      list.value = r.data.data || []
      total.value = r.data.total || 0
    }
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

// 移动端加载状态
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  const nextPage = currentPage.value + 1
  try {
    const r = await api.get('/admin_comments.php', {
      params: {
        page: nextPage, limit: pageSize.value,
        status: statusFilter.value === '' ? undefined : statusFilter.value,
        search: searchKey.value || undefined
      }
    })
    if (r.data.code === 200) {
      const more = r.data.data || []
      list.value = list.value.concat(more)
      total.value = r.data.total || 0
      currentPage.value = nextPage
    }
  } catch (e) { /* 网络错误，保持页码不前进 */ }
  mLoadingMore.value = false
}
// 滚动到底部自动加载（滚动容器是 .admin-main 的滚动，绑定到 document 捕获）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}
onMounted(() => { load(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })

const toggleTop = async (row) => {
  try {
    await api.put('/admin_comments.php', { id: row.id, is_top: row.is_top == 1 ? 0 : 1 })
    ElMessage.success(row.is_top == 1 ? '已取消置顶' : '已置顶')
    load()
  } catch (e) { ElMessage.error('操作失败') }
}

const toggleHide = async (row) => {
  try {
    await api.put('/admin_comments.php', { id: row.id, status: row.status == 1 ? 0 : 1 })
    ElMessage.success(row.status == 1 ? '已恢复显示' : '已隐藏')
    load()
  } catch (e) { ElMessage.error('操作失败') }
}

const del = async (row) => {
  try {
    await api.delete('/admin_comments.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    if (list.value.length <= 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) { ElMessage.error('删除失败') }
}
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.header-controls { display: flex; gap: 8px; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
/* 详情弹层 */
.mc-detail { max-height: 82vh; overflow-y: auto; }
.mc-detail-avatar { display: flex; justify-content: center; margin-bottom: 12px; }
.mc-detail-avatar img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
.mc-detail-title { font-size: 15px; line-height: 1.6; color: #1a1a2e; margin-bottom: 8px; word-break: break-word; background: #f7f8fa; border-radius: 8px; padding: 10px; }
.mc-mod-line { display: flex; gap: 6px; margin-bottom: 10px; }
.mc-det-row { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 9px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
.mc-det-row label { color: #909399; flex-shrink: 0; }
.mc-det-row span { color: #1a1a2e; word-break: break-all; text-align: right; }
</style>
