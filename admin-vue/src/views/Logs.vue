<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <input v-model="searchKey" class="mc-search" placeholder="搜索用户/IP/关键词"
               @keyup.enter="currentPage=1;load()" />
        <div class="mc-fbtn" @click="currentPage=1;load()">搜索</div>
      </div>
      <div class="mc-filters">
        <select v-model="typeFilter" class="mc-select" @change="currentPage=1;load()">
          <option value="">全部类型</option>
          <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无日志</div>
        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-title"><span class="mc-tag" :class="typeClass(row.type)">{{ typeLabel(row.type) }}</span> {{ row.action }}</div>
          <div class="mc-meta" style="margin-top:6px">{{ row.username || '系统' }} · IP {{ row.ip_address || '-' }}</div>
          <div class="mc-data" style="margin-top:6px">{{ row.message || '(无详情)' }}</div>
          <div class="mc-data" style="margin-top:4px">{{ row.created_at || '' }}</div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 移动端：日志详情底部弹层 -->
      <div v-if="mDetailSheet" class="mc-mask" @click.self="mDetailSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>日志详情</span>
            <span class="mc-close" @click="mDetailSheet=false">✕</span>
          </div>
          <div class="mc-sheet-body">
            <div class="mc-detail-row">
              <span class="mc-detail-label">ID</span>
              <span class="mc-detail-val">{{ mDetail?.id ?? '-' }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">类型</span>
              <span class="mc-detail-val">
                <span class="mc-tag" :class="typeClass(mDetail?.type)">{{ typeLabel(mDetail?.type) }}</span>
              </span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">操作</span>
              <span class="mc-detail-val">{{ mDetail?.action || '-' }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">用户</span>
              <span class="mc-detail-val">{{ mDetail?.username || '系统' }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">IP</span>
              <span class="mc-detail-val">{{ mDetail?.ip_address || '-' }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">时间</span>
              <span class="mc-detail-val">{{ mDetail?.created_at || '-' }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">详情</span>
              <span class="mc-detail-val">{{ mDetail?.message || '（无详情）' }}</span>
            </div>
          </div>
          <button class="mc-save" @click="mDetailSheet=false">关闭</button>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
      <div class="header-row">
        <h2 style="margin:0">系统日志</h2>
        <div class="header-controls">
          <el-input v-model="searchKey" placeholder="搜索用户/IP/关键词" clearable size="small" style="width:220px" @clear="load" @keyup.enter="load" />
          <el-select v-model="typeFilter" placeholder="全部类型" clearable size="small" style="width:120px" @change="load">
            <el-option v-for="t in typeOptions" :key="t" :value="t" :label="t" />
          </el-select>
          <el-button size="small" @click="load">刷新</el-button>
        </div>
      </div>

      <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px" empty-text="暂无日志">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="type" label="类型" width="90">
          <template #default="{row}">
            <el-tag :type="row.type==='admin'?'danger':row.type==='login'?'warning':'info'" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="110" />
        <el-table-column prop="message" label="详情" min-width="280" show-overflow-tooltip />
        <el-table-column prop="username" label="用户" width="100" />
        <el-table-column prop="ip_address" label="IP" width="130" />
        <el-table-column prop="created_at" label="时间" width="170" />
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
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const list=ref([]),loading=ref(true)
const total=ref(0),currentPage=ref(1),pageSize=ref(20)
const searchKey=ref(''),typeFilter=ref('')
const typeOptions=['login','admin','content','follow','behavior','message']

const buildParams = () => {
  const params = { page: currentPage.value, limit: pageSize.value }
  if (typeFilter.value) params.type = typeFilter.value
  if (searchKey.value) params.search = searchKey.value
  return params
}

const load=async()=>{
  loading.value=true
  try{
    const r=await api.get('/admin_logs.php',{params:buildParams()})
    if(r.data.code===200){
      list.value=r.data.data||[]
      total.value=r.data.total||0
    }
  }catch(e){}
  loading.value=false
}

const typeLabel = (t) => ({ login: '登录', admin: '管理', content: '内容', follow: '关注', behavior: '行为', message: '消息' }[t] || t || '其他')
const typeClass = (t) => ({ login: 'warn', admin: 'danger', content: 'ok', follow: 'info', behavior: 'info', message: 'info' }[t] || 'info')

// 移动端详情底部弹层
const mDetail = ref(null)
const mDetailSheet = ref(false)

const openDetail = (row) => {
  mDetail.value = row
  mDetailSheet.value = true
}

// 移动端加载状态
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  currentPage.value += 1
  try {
    const r = await api.get('/admin_logs.php', { params: buildParams() })
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
// 滚动到底部自动加载（移动端滚动容器是 .mc-list 外层，这里绑定到 document 捕获 el-main 滚动）
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
.header-controls { display: flex; gap: 8px; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }

/* 移动端底部弹层 */
.mc-sheet { max-height: 85vh; display: flex; flex-direction: column; }
.mc-sheet-body { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.mc-detail-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
.mc-detail-row:last-child { border-bottom: none; }
.mc-detail-label { width: 44px; flex-shrink: 0; color: #909399; }
.mc-detail-val { flex: 1; min-width: 0; color: #1a1a2e; word-break: break-all; line-height: 1.5; }
</style>
