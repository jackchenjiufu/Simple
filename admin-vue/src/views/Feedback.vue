<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <select v-model="statusFilter" class="mc-select" @change="currentPage = 1; load()">
          <option value="">全部状态</option>
          <option :value="0">未读</option>
          <option :value="1">已读</option>
          <option :value="2">已解决</option>
          <option :value="3">已完结</option>
        </select>
        <div class="mc-fbtn" @click="currentPage = 1; load()">刷新</div>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">{{ emptyText }}</div>

        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-card-top">
            <div class="mc-thumb mc-thumb-empty">{{ (row.nickname || row.username || '?').charAt(0).toUpperCase() }}</div>
            <div class="mc-card-info">
              <div class="mc-title">#{{ row.id }} {{ row.nickname || row.username || '未知用户' }}</div>
              <div class="mc-meta">{{ row.type ? '类型：' + typeLabel(row.type) : '' }} <template v-if="row.reply_count">· {{ row.reply_count }}轮</template></div>
              <div class="mc-data">
                <span class="mc-mod" :class="'m-' + statusMod(row.status)">{{ statusLabel(row.status) }}</span>
                <span style="margin-left:6px">{{ row.contact || '无联系方式' }}</span>
                <span style="margin-left:6px">{{ fmtTime(row.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- 对话摘要 -->
          <div class="mc-fb-content">{{ row.content || '(无内容)' }}</div>
          <div class="mc-tags">
            <template v-if="row.replies && row.replies.length">
              <span v-for="(r, i) in row.replies" :key="i" class="mc-tag" :style="r.role === 'admin' ? 'color:#2f6bf0;background:#eef4ff' : ''">
                <span v-if="r.source==='super_admin_cmd'" class="mc-tag-badge">AI执行</span>
                <span v-else-if="r.source==='manual' && r.role==='admin'" class="mc-tag-badge b-ai">AI客服</span>
                {{ r.role === 'admin' ? '管理员' : '用户' }}: {{ r.content }}
              </span>
            </template>
            <span v-else class="mc-tag">用户: {{ row.content }}</span>
          </div>

          <div class="mc-actions">
            <span class="mc-act pinned" @click.stop="openDetail(row)">详情</span>
            <span class="mc-act" @click.stop="startReply(row)">回复</span>
            <span class="mc-act warn" @click.stop="openStatusSheet(row)">状态</span>
            <span class="mc-act danger" @click.stop="handleDelete(row)">删除</span>
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
            <span>反馈详情</span>
            <span class="mc-close" @click="detail=null">✕</span>
          </div>
          <div class="mc-detail-avatar" v-if="detail.avatar"><img :src="detail.avatar" alt="" /></div>
          <div class="mc-det-row"><label>ID</label><span>{{ detail.id }}</span></div>
          <div class="mc-det-row"><label>用户</label><span>{{ detail.nickname || detail.username || '未知用户' }}（ID:{{ detail.user_id ?? '-' }}）</span></div>
          <div class="mc-det-row"><label>类型</label><span>{{ detail.type ? typeLabel(detail.type) : '-' }}</span></div>
          <div class="mc-det-row"><label>状态</label><span>{{ statusLabel(detail.status) }}</span></div>
          <div class="mc-det-row"><label>联系方式</label><span>{{ detail.contact || '-' }}</span></div>
          <div class="mc-det-row"><label>提交时间</label><span>{{ detail.created_at || '-' }}</span></div>
          <div class="mc-det-row" v-if="detail.updated_at"><label>更新时间</label><span>{{ detail.updated_at }}</span></div>
          <div class="mc-det-row"><label>回复轮数</label><span>{{ detail.reply_count ?? (detail.replies ? detail.replies.length : 0) }}</span></div>
          <div class="mc-det-block">
            <label>反馈内容</label>
            <div class="mc-det-text">{{ detail.content || '(无内容)' }}</div>
          </div>
          <div class="mc-det-block" v-if="detail.reply">
            <label>管理员回复</label>
            <div class="mc-det-text">{{ detail.reply }}</div>
          </div>
          <div class="mc-det-block" v-if="detail.replies && detail.replies.length">
            <label>完整对话（{{ detail.replies.length }}轮）</label>
            <div class="mc-det-chat">
              <div v-for="(r,i) in detail.replies" :key="i" class="mc-chat-line" :class="r.role==='admin'?'mc-chat-admin':'mc-chat-user'">
                <span class="mc-chat-role">{{ r.role==='admin'?'管理员':'用户' }}</span>
                <span v-if="r.source==='super_admin_cmd'" class="mc-chat-badge">AI执行</span>
                <span v-else-if="r.source==='manual' && r.role==='admin'" class="mc-chat-badge badge-ai">AI客服</span>
                <span class="mc-chat-text">{{ r.content }}</span>
                <span class="mc-chat-time">{{ r.created_at ? r.created_at.substring(11,16) : '' }}</span>
              </div>
            </div>
          </div>
          <div class="mc-actions" style="margin-top:14px;border:none;padding:0">
            <span class="mc-act" @click="startReply(detail); detail=null">回复</span>
            <span class="mc-act warn" @click="openStatusSheet(detail)">状态</span>
            <span class="mc-act danger" @click="handleDelete(detail); detail=null">删除</span>
          </div>
        </div>
      </div>
      <!-- 状态选择弹层（底部弹出，4 状态单选） -->
      <div class="mc-mask" v-if="statusRow" @click.self="statusRow=null">
        <div class="mc-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>设置状态 #{{ statusRow.id }}</span>
            <span class="mc-close" @click="statusRow=null">✕</span>
          </div>
          <div v-for="s in STATUS_OPTIONS" :key="s.value" class="mc-status-item" :class="{ active: Number(statusRow.status) === s.value }" @click="pickStatus(statusRow, s.value)">
            <span>{{ s.label }}</span>
            <span v-if="Number(statusRow.status) === s.value" class="mc-status-check">✓</span>
          </div>
        </div>
      </div>
      <!-- 回复弹层（底部弹出） -->
      <div class="mc-mask" v-if="replyRow" @click.self="cancelReply">
        <div class="mc-sheet mc-reply-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>回复反馈 #{{ replyRow.id }}</span>
            <span class="mc-close" @click="cancelReply">✕</span>
          </div>
          <div class="mc-reply-prev" v-if="replyRow && lastAdminReply(replyRow)">上次回复：{{ lastAdminReply(replyRow) }}</div>
          <textarea v-model="replyText" class="mc-reply-textarea" rows="4"
                    placeholder="输入回复内容，用户会收到通知..." maxlength="500"></textarea>
          <button class="mc-save" :disabled="savingReply" @click="saveReply(replyRow)">
            {{ savingReply ? '发送中...' : '发送回复' }}
          </button>
        </div>
      </div>
    </div>
    <template v-else>
      <div class="header-row">
        <h2 style="margin:0">反馈管理</h2>
        <div class="header-controls">
          <el-select v-model="statusFilter" placeholder="全部状态" clearable size="small" style="width:120px" @change="() => load()">
            <el-option :value="''" label="全部状态" />
            <el-option :value="0" label="未读" />
            <el-option :value="1" label="已读" />
            <el-option :value="2" label="已解决" />
            <el-option :value="3" label="已完结" />
          </el-select>
          <el-button size="small" @click="load">刷新</el-button>
        </div>
      </div>

      <el-table
        :data="list" stripe v-loading="loading" style="width:100%;margin-top:12px"
        :empty-text="emptyText"
      >
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="70" />
        <el-table-column label="用户" width="90">
          <template #default="{row}">
            {{ row.nickname || row.username || '未知' }}
          </template>
        </el-table-column>
        <el-table-column label="联系方式" width="110">
          <template #default="{row}">
            {{ row.contact || '--' }}
          </template>
        </el-table-column>
        <el-table-column label="对话" min-width="240">
          <template #default="{row}">
            <div class="chat-list">
              <div v-for="(r,i) in row.replies" :key="i" class="chat-line" :class="r.role==='admin'?'chat-admin':'chat-user'">
                <span class="chat-label">{{ r.role==='admin'?'管理员':'用户' }}</span>
                <span v-if="r.source==='super_admin_cmd'" class="chat-src src-cmd">AI执行</span>
                <span v-else-if="r.source==='manual' && r.role==='admin'" class="chat-src">AI客服</span>
                <span class="chat-text">{{ r.content }}</span>
                <span class="chat-time">{{ r.created_at ? r.created_at.substring(11,16) : '' }}</span>
              </div>
              <div v-if="!row.replies || !row.replies.length" class="chat-line chat-user">
                <span class="chat-label">用户</span>
                <span class="chat-text">{{ row.content }}</span>
              </div>
              <div v-if="editingId===row.id" class="reply-edit">
                <el-input v-model="replyText" size="small" placeholder="输入回复..." />
                <div class="reply-actions">
                  <el-button size="small" type="primary" @click="saveReply(row)">保存</el-button>
                  <el-button size="small" @click="cancelReply">取消</el-button>
                </div>
              </div>
              <div v-else-if="row.status!==3" class="chat-quick-reply">
                <el-button size="small" @click="startReply(row)">回复</el-button>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{row}">
            <el-tag :type="row.status===2?'success':row.status===3?'info':row.status===1?'warning':'info'" size="small">
              {{ row.status===2?'已解决':row.status===3?'已完结':row.status===1?'已读':'未读' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="140">
          <template #default="{row}">
            {{ row.created_at ? row.created_at.substring(0,16) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{row}">
            <div class="op-group">
              <el-button size="small" @click="startReply(row)">回复</el-button>
              <el-select size="small" :model-value="row.status" @change="(v)=>setStatus(row,v)" style="width:90px">
                <el-option :value="0" label="未读" />
                <el-option :value="1" label="已读" />
                <el-option :value="2" label="已解决" />
                <el-option :value="3" label="已完结" />
              </el-select>
              <el-popconfirm
                title="确认删除此反馈？"
                confirm-button-text="删除"
                cancel-button-text="取消"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button size="small" type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row" v-if="total>0">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          small
          @current-change="() => load()"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const list=ref([]), loading=ref(true), editingId=ref(null), replyText=ref('')
const replyRow=ref(null), savingReply=ref(false)  // 移动端回复底部弹层
const detail=ref(null)
const emptyText=ref('暂无数据')
const statusFilter=ref('')
const currentPage=ref(1)
const pageSize=ref(10)
const total=ref(0)

// 移动端状态文字（Number() 兜底字符串状态值）
const statusLabel = (s) => { const n = Number(s); return n === 2 ? '已解决' : n === 3 ? '已完结' : n === 1 ? '已读' : '未读' }

// 状态徽标色：0未读/3已完结=灰(pending)，1已读=红(unsafe)，2已解决=绿(safe)
const statusMod = (s) => { const n = Number(s); return n === 2 ? 'safe' : n === 1 ? 'unsafe' : 'pending' }

// 反馈类型文字
const typeLabel = (t) => {
  const map = { bug: '问题/Bug', feedback: '反馈建议', suggestion: '建议', question: '咨询', complaint: '投诉', other: '其他' }
  return map[t] || t
}

// 时间截断到分钟
const fmtTime = (t) => (t || '').substring(0, 16) || ''

// 打开详情弹层
const openDetail = (row) => { detail.value = row }

const load=async(silent)=>{
  if(!silent) loading.value=true
  try{
    const params = { page: currentPage.value, limit: pageSize.value }
    if (statusFilter.value !== '') params.status = statusFilter.value

    const r=await api.get('/admin_feedback.php', { params })
    if(r.data.code===200){
      list.value=r.data.data||[]
      total.value=r.data.total||0
    }else{
      list.value=[]
      total.value=0
      emptyText.value=r.data.code===401?'未授权，请重新登录':(r.data.message||'暂无数据')
      if(r.data.code===401) ElMessage.error('登录已过期，请重新登录')
    }
  }catch(e){
    list.value=[]
    total.value=0
    emptyText.value=(e.response&&e.response.status===401)?'未授权，请重新登录':'加载失败'
    if(e.response&&e.response.status===401) ElMessage.error('登录已过期，请重新登录')
    else ElMessage.error('加载失败')
  }
  loading.value=false
}

// ===== 移动端上拉加载 =====
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  currentPage.value += 1
  try {
    const params = { page: currentPage.value, limit: pageSize.value }
    if (statusFilter.value !== '') params.status = statusFilter.value
    const r = await api.get('/admin_feedback.php', { params })
    if (r.data.code === 200) {
      list.value = list.value.concat(r.data.data || [])
      total.value = r.data.total || 0
    } else {
      currentPage.value -= 1
    }
  } catch (e) { currentPage.value -= 1 }
  mLoadingMore.value = false
}
// 滚动到底部自动加载下一页（滚动容器是 .admin-main）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}

const setStatus=async(row,v)=>{
  try{
    await api.put('/admin_feedback.php',{id:row.id,status:v})
    ElMessage.success('已更新')
    load()
  }catch(e){ElMessage.error('更新失败')}
}

// ===== 移动端状态单选弹层（mc-sheet）=====
const STATUS_OPTIONS = [
  { value: 0, label: '未读' },
  { value: 1, label: '已读' },
  { value: 2, label: '已解决' },
  { value: 3, label: '已完结' },
]
const statusRow = ref(null)  // 状态弹层当前目标
const openStatusSheet = (row) => { statusRow.value = row }
const pickStatus = (row, v) => {
  setStatus(row, v)
  statusRow.value = null
}

// 移动端：打开回复底部弹层；桌面端：行内展开编辑框（两者共用 replyText）
// 移动端输入框留空（后端 PUT reply 会追加一条新回复，预填上次回复会导致重复提交）；桌面端保留原预填逻辑
const startReply=(row)=>{
  editingId.value=row.id
  replyRow.value=row
  replyText.value=isMobile.value ? '' : (row.reply||'')
}

// 上次回复：后端回复写入 feedback_replies 表（role='admin'），f.reply 为遗留列，取不到时兜底
const lastAdminReply=(row)=>{
  const reps=row.replies||[]
  for(let i=reps.length-1;i>=0;i--){
    if(reps[i].role==='admin' && reps[i].content) return reps[i].content
  }
  return row.reply||''
}

const cancelReply=()=>{
  editingId.value=null
  replyRow.value=null
  replyText.value=''
}

const saveReply=async(row)=>{
  if(!replyText.value.trim()){
    ElMessage.warning('请输入回复内容')
    return
  }
  savingReply.value=true
  try{
    await api.put('/admin_feedback.php',{id:row.id,reply:replyText.value})
    ElMessage.success('回复已保存')
    cancelReply()
    load()
  }catch(e){ElMessage.error('保存失败')}
  savingReply.value=false
}

const handleDelete=async(row)=>{
  try{
    await api.delete('/admin_feedback.php', { params: { id: row.id } })
    ElMessage.success('已删除')
    if (list.value.length <= 1 && currentPage.value > 1) {
      currentPage.value--
    }
    load()
  }catch(e){ElMessage.error('删除失败')}
}

// ===== 实时轮询：检测用户新追问 =====
const followUpCount=ref(0)
let lastSnapshot={}
let lastTotal=null
let pollTimer=null
let pollInitialized=false  // 首次轮询只建快照，不通知历史追问

const notifyFollowUp=(row,last)=>{
  followUpCount.value++
  document.title=`(${followUpCount.value}) 反馈管理`
  ElNotification({
    title:`新追问 #${row.id} — ${row.nickname||row.username||'用户'}`,
    message:last.content,
    type:'warning',
    duration:8000
  })
  if('Notification' in window){
    if(Notification.permission==='default') Notification.requestPermission()
    if(Notification.permission==='granted'){
      try{ new Notification(`反馈新追问 #${row.id}`, { body: last.content }) }catch(e){}
    }
  }
}

const poll=async()=>{
  if(document.hidden) return
  try{
    // 用全量列表检测（不受当前状态筛选影响）
    const r=await api.get('/admin_feedback.php',{params:{page:1,limit:50}})
    if(r.data.code!==200) return
    const rows=r.data.data||[]
    const snap={}
    let changed=false
    for(const row of rows){
      const reps=row.replies||[]
      const rc=reps.length
      const prev=lastSnapshot[row.id]
      const last=reps.length?reps[reps.length-1]:null
      snap[row.id]={rc,status:row.status}
      // 新追问：最后一条是用户消息 且 回复数比上次多（或首次出现时 status=0）
      const isNewFollow = last && last.role==='user' && prev && prev.rc<rc
      if(pollInitialized && isNewFollow){
        changed=true
        notifyFollowUp(row,last)
      }
    }
    // 全新反馈（首次轮询不通知历史数据）
    if(pollInitialized && lastTotal!==null && r.data.total>lastTotal){
      const newRows=rows.filter(x=>!lastSnapshot[x.id] && (x.replies||[]).length===0)
      for(const nr of newRows.slice(0,3)){
        changed=true
        notifyFollowUp(nr,{content:nr.content})
      }
    }
    lastTotal=r.data.total
    lastSnapshot=snap
    pollInitialized=true
    if(changed) load(true)
  }catch(e){/* 静默，下轮再试 */}
}

const startPoll=()=>{
  pollTimer=setInterval(poll,15000)
  const onVisible=()=>{ if(!document.hidden) poll() }
  document.addEventListener('visibilitychange',onVisible)
  document._fbVisibilityHandler=onVisible
}

onMounted(()=>{ load(); startPoll(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(()=>{
  if(pollTimer) clearInterval(pollTimer)
  if(document._fbVisibilityHandler){
    document.removeEventListener('visibilitychange',document._fbVisibilityHandler)
    delete document._fbVisibilityHandler
  }
  document.removeEventListener('scroll', onScroll, true)
  document.title='反馈管理'
})
</script>

<style scoped>
.header-row {
  display: flex; align-items: center; justify-content: space-between;
}
.header-controls {
  display: flex; gap: 8px; align-items: center;
}
.reply-edit .reply-actions {
  margin-top: 4px; display: flex; gap: 8px; align-items: center;
}
.op-group {
  display: flex; gap: 4px; align-items: center; flex-wrap: nowrap;
}
.chat-list { display: flex; flex-direction: column; gap: 6px; }
.chat-line { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; font-size: 12px; }
.chat-user { background: #f4f6f8; color: #303133; }
.chat-admin { background: #ecf5ff; color: #303133; }
.chat-label { flex-shrink: 0; font-weight: 600; font-size: 11px; }
.chat-user .chat-label { color: #909399; }
.chat-admin .chat-label { color: #409eff; }
.chat-text { flex: 1; word-break: break-all; }
.chat-time { flex-shrink: 0; color: #c0c4cc; font-size: 11px; }
.chat-quick-reply { margin-top: 4px; }
/* 回复来源标识 */
.chat-src {
  flex-shrink: 0; font-size: 10px; line-height: 1; padding: 2px 5px; border-radius: 4px;
  background: #e6e8eb; color: #5a6066;
}
.chat-src.src-cmd {
  background: #fdecea; color: #e0372f; font-weight: 600;
}
.mc-tag-badge {
  font-size: 10px; line-height: 1; padding: 1px 4px; border-radius: 3px; margin-right: 4px;
  background: #fdecea; color: #e0372f; font-weight: 600;
}
.mc-tag-badge.b-ai { background: #eef4ff; color: #2f6bf0; }
.badge-ai { font-weight: 500 !important; }
.pagination-row {
  margin-top: 16px; display: flex; justify-content: center;
}
.mc-reply-input {
  flex: 1; width: 100%; padding: 8px 10px; border: 1px solid #e5e7eb;
  border-radius: 8px; font-size: 14px; box-sizing: border-box;
}
/* 卡片正文（截断） */
.mc-fb-content { margin-top: 8px; font-size: 13px; color: #374151; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
/* 详情弹层 */
.mc-detail { max-height: 82vh; overflow-y: auto; }
.mc-detail-avatar { display: flex; justify-content: center; margin-bottom: 12px; }
.mc-detail-avatar img { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; }
.mc-det-row { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; padding: 9px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
.mc-det-row label { color: #909399; flex-shrink: 0; }
.mc-det-row span { color: #1a1a2e; word-break: break-all; text-align: right; }
.mc-det-block { margin-top: 12px; }
.mc-det-block label { font-size: 13px; color: #909399; display: block; margin-bottom: 6px; }
.mc-det-text { font-size: 13px; color: #1a1a2e; line-height: 1.6; max-height: 160px; overflow-y: auto; word-break: break-word; background: #f7f8fa; border-radius: 8px; padding: 10px; }
.mc-det-chat { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
.mc-chat-line { display: flex; align-items: flex-start; gap: 6px; padding: 6px 8px; border-radius: 8px; font-size: 12px; }
.mc-chat-user { background: #f4f6f8; color: #303133; }
.mc-chat-admin { background: #ecf5ff; color: #303133; }
.mc-chat-role { flex-shrink: 0; font-weight: 600; font-size: 11px; color: #409eff; }
.mc-chat-user .mc-chat-role { color: #909399; }
.mc-chat-text { flex: 1; word-break: break-all; }
.mc-chat-time { flex-shrink: 0; color: #c0c4cc; font-size: 11px; }
/* 移动端状态单选弹层 */
.mc-status-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 13px 14px; border-radius: 10px; background: #f5f6fa;
  margin-bottom: 8px; font-size: 14px; color: #1a1a2e; cursor: pointer;
}
.mc-status-item.active { background: #eef4ff; color: #2f6bf0; font-weight: 600; }
.mc-status-check { color: #2f6bf0; font-weight: 700; }
/* 移动端回复底部弹层 */
.mc-reply-sheet { max-height: 80vh; overflow-y: auto; }
.mc-reply-prev { font-size: 12px; color: #909399; background: #f7f8fa; border-radius: 8px; padding: 8px 10px; margin-bottom: 10px; word-break: break-all; }
.mc-reply-textarea { width: 100%; box-sizing: border-box; border: 1px solid #e5e7eb; border-radius: 9px; padding: 10px 12px; font-size: 14px; line-height: 1.5; outline: none; resize: vertical; }
</style>
