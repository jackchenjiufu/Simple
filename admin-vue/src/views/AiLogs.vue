<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <select v-model="sourceFilter" class="mc-select" @change="currentPage = 1; load()">
          <option value="">全部来源</option>
          <option value="ai_reply">AI客服回复</option>
          <option value="super_admin_cmd">AI执行指令</option>
          <option value="manual">人工回复</option>
        </select>
        <div class="mc-fbtn" @click="currentPage = 1; load()">刷新</div>
      </div>
      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">{{ emptyText }}</div>

        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-title">
            <span class="mc-tag" :class="srcClass(row.source)">{{ srcLabel(row.source) }}</span>
            #{{ row.feedback_id }} · {{ row.nickname || row.username || '未知用户' }}
          </div>
          <div class="mc-meta">{{ row.fb_type ? '类型：' + (row.fb_type) : '' }} · {{ fmtTime(row.created_at) }}</div>
          <div class="mc-fb-content">{{ row.content }}</div>
          <div v-if="row.fb_content" class="mc-ref">原反馈：{{ row.fb_content }}</div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 详情弹层 -->
      <div class="mc-mask" v-if="detail" @click.self="detail=null">
        <div class="mc-sheet mc-detail">
          <div class="mc-sheet-head"><span>AI 操作详情</span><span class="mc-close" @click="detail=null">✕</span></div>
          <div class="mc-det-row"><label>来源</label><span>{{ srcLabel(detail.source) }}</span></div>
          <div class="mc-det-row"><label>集数</label><span>#{{ detail.feedback_id }}</span></div>
          <div class="mc-det-row"><label>用户</label><span>{{ detail.nickname || detail.username || '未知' }}（ID:{{ detail.user_id ?? '-' }}）</span></div>
          <div class="mc-det-row"><label>类型</label><span>{{ detail.fb_type || '-' }}</span></div>
          <div class="mc-det-row"><label>时间</label><span>{{ detail.created_at || '-' }}</span></div>
          <div class="mc-det-block"><label>AI 输出</label><div class="mc-det-text">{{ detail.content || '(无)' }}</div></div>
          <div class="mc-det-block" v-if="detail.fb_content"><label>原反馈</label><div class="mc-det-text">{{ detail.fb_content }}</div></div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格 ==================== -->
    <template v-else>
      <div class="header-row">
        <h2 style="margin:0">AI 操作记录</h2>
        <div class="header-controls">
          <el-select v-model="sourceFilter" placeholder="全部来源" clearable size="small" style="width:140px" @change="() => load()">
            <el-option :value="''" label="全部来源" />
            <el-option :value="'ai_reply'" label="AI客服回复" />
            <el-option :value="'super_admin_cmd'" label="AI执行指令" />
            <el-option :value="'manual'" label="人工回复" />
          </el-select>
          <el-input v-model="searchKey" placeholder="搜索内容/用户" clearable size="small" style="width:200px" @keyup.enter="currentPage=1;load()" @clear="currentPage=1;load()" />
          <el-button size="small" @click="currentPage=1;load()">搜索</el-button>
          <el-button size="small" @click="load()">刷新</el-button>
        </div>
      </div>

      <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" :empty-text="emptyText">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="feedback_id" label="反馈#号" width="80" />
        <el-table-column label="来源" width="110">
          <template #default="{row}">
            <el-tag :type="row.source==='super_admin_cmd'?'danger':'success'" size="small" effect="dark" v-if="row.source==='super_admin_cmd'">AI执行</el-tag>
            <el-tag :type="row.source==='ai_reply'?'':'info'" size="small" v-else-if="row.source==='ai_reply'">AI客服</el-tag>
            <el-tag type="info" size="small" v-else>人工</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="90">
          <template #default="{row}">{{ row.nickname || row.username || '未知' }}</template>
        </el-table-column>
        <el-table-column label="AI 输出" min-width="260" show-overflow-tooltip>
          <template #default="{row}">{{ row.content || '(无)' }}</template>
        </el-table-column>
        <el-table-column label="原反馈" min-width="180" show-overflow-tooltip>
          <template #default="{row}">{{ row.fb_content || '(无)' }}</template>
        </el-table-column>
        <el-table-column label="时间" width="150">
          <template #default="{row}">{{ (row.created_at||'').substring(0,16) }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-row" v-if="total>0">
        <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="total" layout="total, prev, pager, next" small @current-change="() => load()" />
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
const total = ref(0), currentPage = ref(1), pageSize = ref(20)
const sourceFilter = ref(''), searchKey = ref('')
const emptyText = ref('暂无记录')
const detail = ref(null)

const srcLabel = (s) => ({ ai_reply: 'AI客服回复', super_admin_cmd: 'AI执行指令', manual: '人工回复' }[s] || s || '未知')
const srcClass = (s) => s === 'super_admin_cmd' ? 'danger' : s === 'manual' ? 'info' : 'ok'
const fmtTime = (t) => (t || '').substring(0, 16)

const buildParams = () => {
  const p = { page: currentPage.value, limit: pageSize.value }
  if (sourceFilter.value) p.source = sourceFilter.value
  if (searchKey.value) p.search = searchKey.value
  return p
}

const load = async (silent) => {
  if (!silent) loading.value = true
  try {
    const r = await api.get('/admin_ai_logs.php', { params: buildParams() })
    if (r.data.code === 200) {
      list.value = r.data.data || []
      total.value = r.data.total || 0
    } else { list.value = []; total.value = 0; emptyText.value = r.data.message || '暂无记录' }
  } catch (e) { list.value = []; total.value = 0; emptyText.value = '加载失败' }
  loading.value = false
}

const openDetail = (row) => { detail.value = row }

// 移动端上拉加载
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true; currentPage.value += 1
  try {
    const r = await api.get('/admin_ai_logs.php', { params: buildParams() })
    if (r.data.code === 200) { list.value = list.value.concat(r.data.data || []); total.value = r.data.total || 0 }
    else currentPage.value -= 1
  } catch (e) { currentPage.value -= 1 }
  mLoadingMore.value = false
}
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadMore()
}

onMounted(() => { load(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.header-controls { display: flex; gap: 8px; align-items: center; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
.mc-ref { margin-top:6px; color:#909399; font-size:12px; }
.mc-detail-block { margin-top: 12px; }
.mc-det-text { margin-top:6px; font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-all; }
.mc-det-row { display:flex; gap:12px; padding:10px 0; border-bottom:1px solid #f2f4f7; font-size:13px; }
.mc-det-row label { width:44px; flex-shrink:0; color:#909399; }
</style>