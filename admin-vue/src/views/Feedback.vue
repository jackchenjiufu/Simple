<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">反馈管理</h2>
      <div class="header-controls">
        <el-select v-model="statusFilter" placeholder="全部状态" clearable size="small" style="width:120px" @change="load">
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
        @current-change="load"
      />
    </div>
  </div>
</template>

<script setup>
import {ref,onMounted,onUnmounted} from 'vue'
import {ElMessage} from 'element-plus'
import api from '@/api'

const list=ref([]), loading=ref(true), editingId=ref(null), replyText=ref('')
const emptyText=ref('暂无数据')
const statusFilter=ref('')
const currentPage=ref(1)
const pageSize=ref(10)
const total=ref(0)

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

const setStatus=async(row,v)=>{
  try{
    await api.put('/admin_feedback.php',{id:row.id,status:v})
    ElMessage.success('已更新')
    load()
  }catch(e){ElMessage.error('更新失败')}
}

const startReply=(row)=>{
  editingId.value=row.id
  replyText.value=row.reply||''
}

const cancelReply=()=>{
  editingId.value=null
  replyText.value=''
}

const saveReply=async(row)=>{
  if(!replyText.value.trim()){
    ElMessage.warning('请输入回复内容')
    return
  }
  try{
    await api.put('/admin_feedback.php',{id:row.id,reply:replyText.value})
    ElMessage.success('回复已保存')
    editingId.value=null
    load()
  }catch(e){ElMessage.error('保存失败')}
}

const handleDelete=async(row)=>{
  try{
    await api.delete('/admin_feedback.php', { data: { id: row.id } })
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
      const isNewFollow = last && last.role==='user' && (!prev || prev.rc<rc)
      if(isNewFollow){
        changed=true
        notifyFollowUp(row,last)
      }
    }
    // 全新反馈
    if(lastTotal!==null && r.data.total>lastTotal){
      const newRows=rows.filter(x=>!lastSnapshot[x.id] && (x.replies||[]).length===0)
      for(const nr of newRows.slice(0,3)){
        changed=true
        notifyFollowUp(nr,{content:nr.content})
      }
    }
    lastTotal=r.data.total
    lastSnapshot=snap
    if(changed) load(true)
  }catch(e){/* 静默，下轮再试 */}
}

const startPoll=()=>{
  pollTimer=setInterval(poll,15000)
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) poll() })
}

onMounted(()=>{ load(); startPoll() })
onUnmounted(()=>{ if(pollTimer) clearInterval(pollTimer) })
</script>

<style scoped>
.header-row {
  display: flex; align-items: center; justify-content: space-between;
}
.header-controls {
  display: flex; gap: 8px; align-items: center;
}
.reply-edit .reply-actions {
  margin-top: 4px; display: flex; gap: 4px;
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
.pagination-row {
  margin-top: 16px; display: flex; justify-content: center;
}
</style>