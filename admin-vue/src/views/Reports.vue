<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <input v-model="searchKey" class="mc-search" placeholder="搜索举报人/被举报人/原因"
               @keyup.enter="currentPage=1;load()" />
        <div class="mc-fbtn" @click="currentPage=1;load()">搜索</div>
      </div>
      <div class="mc-filters">
        <select v-model="typeFilter" class="mc-select" @change="currentPage=1;load()">
          <option value="">全部类型</option>
          <option value="user">用户</option>
          <option value="message">私聊消息</option>
          <option value="article">文章</option>
          <option value="comment">评论</option>
        </select>
        <select v-model="statusFilter" class="mc-select" @change="currentPage=1;load()">
          <option value="">全部状态</option>
          <option value="0">待处理</option>
          <option value="1">已处理</option>
          <option value="2">已驳回</option>
        </select>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无举报</div>
        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-card-top">
            <div class="mc-thumb">{{ initial(row.reporter_nick || row.reporter_name || '#' + row.reporter_id) }}</div>
            <div class="mc-card-info">
              <div class="mc-title">{{ row.reporter_nick || row.reporter_name || ('用户#' + row.reporter_id) }}</div>
              <div class="mc-meta">{{ typeLabel(row.target_type) }} · {{ row.target_name || ('#' + row.target_id) }}</div>
              <div class="mc-data">{{ row.reason || '-' }}</div>
              <div class="mc-data">ID:{{ row.id }} · {{ fmtTime(row.created_at) }}</div>
            </div>
            <span class="mc-mod" :class="'m-' + statusCls(row.status)">{{ statusLabel(row.status) }}</span>
          </div>
          <div class="mc-tags" v-if="row.detail">
            <span class="mc-tag">{{ row.detail }}</span>
          </div>
          <div class="mc-actions" @click.stop>
            <span class="mc-act" @click="openDetail(row)">查看详情</span>
            <template v-if="row.status == 0">
              <span class="mc-act ok" @click="setStatus(row,1)">处理</span>
              <span class="mc-act warn" @click="setStatus(row,2)">驳回</span>
            </template>
            <span class="mc-act danger" @click="del(row)">删除</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 举报详情弹层 -->
      <div v-if="showDetail && detail" class="mc-mask" @click.self="showDetail=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>举报详情</span>
            <span class="mc-close" @click="showDetail=false">✕</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">ID</span>
            <span class="mc-dv">#{{ detail.id }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">状态</span>
            <span class="mc-dv"><span class="mc-mod" :class="'m-' + statusCls(detail.status)">{{ statusLabel(detail.status) }}</span>
              <em v-if="detail.status===1" class="mc-desc">（已处理）</em><em v-else-if="detail.status===2" class="mc-desc">（已驳回）</em><em v-else class="mc-desc">（等待处理）</em>
            </span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">举报人</span>
            <span class="mc-dv">{{ detail.reporter_nick || detail.reporter_name || ('用户#' + detail.reporter_id) }}（ID:{{ detail.reporter_id }}）</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">举报类型</span>
            <span class="mc-dv">{{ typeLabel(detail.target_type) }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">被举报对象</span>
            <span class="mc-dv">{{ detail.target_name || ('#' + detail.target_id) }}（ID:{{ detail.target_id }}）</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">举报原因</span>
            <span class="mc-dv">{{ detail.reason || '-' }}</span>
          </div>
          <div class="mc-detail-block">
            <span class="mc-dl">详细说明</span>
            <div class="mc-dv mc-longtext">{{ detail.detail || '（无）' }}</div>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">提交时间</span>
            <span class="mc-dv">{{ fmtTime(detail.created_at) }}</span>
          </div>
          <div class="mc-actions" style="margin-top:16px">
            <template v-if="detail.status == 0">
              <span class="mc-act ok" @click="setStatus(detail,1)">标记处理</span>
              <span class="mc-act warn" @click="setStatus(detail,2)">驳回</span>
            </template>
            <span class="mc-act danger" @click="del(detail)">删除</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
      <div class="header-row">
        <h2 style="margin:0">举报管理</h2>
        <div class="header-controls">
          <el-input v-model="searchKey" placeholder="搜索举报人/被举报人/原因" clearable size="small" style="width:220px" @clear="load" @keyup.enter="load" />
          <el-select v-model="typeFilter" placeholder="全部类型" clearable size="small" style="width:110px" @change="() => load()">
            <el-option value="user" label="用户" />
            <el-option value="message" label="私聊消息" />
            <el-option value="article" label="文章" />
            <el-option value="comment" label="评论" />
          </el-select>
          <el-select v-model="statusFilter" placeholder="全部状态" clearable size="small" style="width:110px" @change="() => load()">
            <el-option value="0" label="待处理" />
            <el-option value="1" label="已处理" />
            <el-option value="2" label="已驳回" />
          </el-select>
          <el-button size="small" @click="load">刷新</el-button>
        </div>
      </div>

      <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无举报">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="举报人" width="110">
          <template #default="{row}">{{ row.reporter_nick || row.reporter_name || '用户#' + row.reporter_id }}</template>
        </el-table-column>
        <el-table-column label="类型" width="100">
          <template #default="{row}">
            <el-tag size="small" :type="row.target_type==='user'?'danger':row.target_type==='message'?'warning':'info'">
              {{ typeLabel(row.target_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="被举报对象" min-width="140" show-overflow-tooltip>
          <template #default="{row}">{{ row.target_name || ('#' + row.target_id) }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="120" show-overflow-tooltip />
        <el-table-column label="详情" min-width="160" show-overflow-tooltip>
          <template #default="{row}">{{ row.detail || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{row}">
            <el-tag :type="row.status==0?'danger':row.status==1?'success':'info'" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{row}">
            <el-button v-if="row.status==0" size="small" type="success" @click="setStatus(row,1)">处理</el-button>
            <el-button v-if="row.status==0" size="small" type="warning" @click="setStatus(row,2)">驳回</el-button>
            <el-popconfirm title="删除该举报记录？" @confirm="del(row)">
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
const total = ref(0), currentPage = ref(1), pageSize = ref(10)
const searchKey = ref(''), statusFilter = ref(''), typeFilter = ref('')

const typeLabel = (t) => t === 'user' ? '用户' : t === 'message' ? '私聊消息' : t === 'article' ? '文章' : '评论'
const statusLabel = (s) => s == 0 ? '待处理' : s == 1 ? '已处理' : '已驳回'
const statusCls = (s) => s == 0 ? 'pending' : s == 1 ? 'safe' : 'blocked'
const initial = (v) => (v || '?').trim().charAt(0).toUpperCase()
const fmtTime = (v) => (v && String(v) !== '0000-00-00 00:00:00') ? String(v).replace('T', ' ').slice(0, 19) : ''

// 移动端详情弹层
const showDetail = ref(false)
const detail = ref(null)
const openDetail = (row) => { detail.value = { ...row }; showDetail.value = true }
const closeDetail = () => { showDetail.value = false }

const load = async () => {
  loading.value = true
  try {
    const r = await api.get('/admin_reports.php', {
      params: {
        page: currentPage.value, limit: pageSize.value,
        status: statusFilter.value === '' ? undefined : statusFilter.value,
        type: typeFilter.value || undefined,
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

// 移动端加载状态 & 上拉加载下一页
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  currentPage.value += 1
  try {
    const r = await api.get('/admin_reports.php', {
      params: {
        page: currentPage.value, limit: pageSize.value,
        status: statusFilter.value === '' ? undefined : statusFilter.value,
        type: typeFilter.value || undefined,
        search: searchKey.value || undefined
      }
    })
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
// 滚动到底部自动加载（滚动容器是 .admin-main，这里绑定到 document 捕获 el-main 滚动）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}
onMounted(() => { load(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })

const setStatus = async (row, status) => {
  try {
    await api.put('/admin_reports.php', { id: row.id, status })
    ElMessage.success(status === 1 ? '已标记处理' : '已驳回')
    closeDetail()
    load()
  } catch (e) { ElMessage.error('操作失败') }
}

const del = async (row) => {
  try {
    await api.delete('/admin_reports.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    closeDetail()
    if (list.value.length <= 1 && currentPage.value > 1) currentPage.value--
    load()
  } catch (e) { ElMessage.error('删除失败') }
}
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.header-controls { display: flex; gap: 8px; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }

/* 移动端详情弹层 */
.mc-sheet { max-height: 78vh; overflow-y: auto; }
.mc-detail-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px dashed #f0f2f5; font-size: 14px; }
.mc-detail-block { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; font-size: 14px; }
.mc-dl { flex: 0 0 74px; color: #909399; }
.mc-dv { flex: 1; min-width: 0; color: #1a1a2e; word-break: break-all; }
.mc-desc { font-style: normal; font-size: 12px; color: #bbb; }
.mc-longtext { white-space: pre-wrap; word-break: break-word; background: #f8f9fc; border-radius: 8px; padding: 8px 10px; line-height: 1.6; max-height: 40vh; overflow-y: auto; }
</style>
