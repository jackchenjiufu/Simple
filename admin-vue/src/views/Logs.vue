<template>
  <div>
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
  </div>
</template>
<script setup>
import {ref,onMounted} from "vue"
import api from "@/api"

const list=ref([]),loading=ref(true)
const total=ref(0),currentPage=ref(1),pageSize=ref(20)
const searchKey=ref(''),typeFilter=ref('')
const typeOptions=['login','admin','content','follow','behavior','message']

const load=async()=>{
  loading.value=true
  try{
    const r=await api.get('/admin_logs.php',{params:{page:currentPage.value,limit:pageSize.value,type:typeFilter.value||undefined,search:searchKey.value||undefined}})
    if(r.data.code===200){
      list.value=r.data.data||[]
      total.value=r.data.total||0
    }
  }catch(e){}
  loading.value=false
}
onMounted(load)
</script>
<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; }
.header-controls { display: flex; gap: 8px; }
.pagination-row { margin-top: 16px; display: flex; justify-content: center; }
</style>
