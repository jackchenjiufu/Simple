<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">反馈管理</h2>
      <div class="header-controls">
        <el-select v-model="statusFilter" placeholder="全部状态" clearable size="small" style="width:110px" @change="load">
          <el-option :value="''" label="全部状态" />
          <el-option :value="0" label="未读" />
          <el-option :value="1" label="已读" />
          <el-option :value="2" label="已解决" />
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
      <el-table-column prop="reply" label="回复" min-width="180">
        <template #default="{row}">
          <div v-if="editingId===row.id" class="reply-edit">
            <el-input v-model="replyText" size="small" placeholder="输入回复..." />
            <div class="reply-actions">
              <el-button size="small" type="primary" @click="saveReply(row)">保存</el-button>
              <el-button size="small" @click="cancelReply">取消</el-button>
            </div>
          </div>
          <span v-else>{{ row.reply || '--' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{row}">
          <el-tag :type="row.status===2?'success':row.status===1?'warning':'info'" size="small">
            {{ row.status===2?'已解决':row.status===1?'已读':'未读' }}
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
            <el-select size="small" :model-value="row.status" @change="(v)=>setStatus(row,v)" style="width:80px">
              <el-option :value="0" label="未读" />
              <el-option :value="1" label="已读" />
              <el-option :value="2" label="已解决" />
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
import {ref,onMounted} from 'vue'
import {ElMessage} from 'element-plus'
import api from '@/api'

const list=ref([]), loading=ref(true), editingId=ref(null), replyText=ref('')
const emptyText=ref('暂无数据')
const statusFilter=ref('')
const currentPage=ref(1)
const pageSize=ref(10)
const total=ref(0)

const load=async()=>{
  loading.value=true
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

onMounted(load)
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
.pagination-row {
  margin-top: 16px; display: flex; justify-content: center;
}
</style>