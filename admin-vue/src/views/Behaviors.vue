<template>
  <div>
    <div class="header-row">
      <h2>用户行为分析</h2>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <el-input v-model="keyword" placeholder="搜索用户名/昵称" style="width:240px" @keyup.enter="load(1)" />
      <el-button type="primary" size="small" @click="load(1)">搜索</el-button>
    </div>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="nickname" label="用户" min-width="120">
        <template #default="{row}">{{row.nickname}}（{{row.username}}）</template>
      </el-table-column>
      <el-table-column prop="role" label="角色" width="80">
        <template #default="{row}">
          <el-tag size="small" :type="row.role==='super_admin'?'warning':(row.role==='admin'?'primary':'info')">{{row.role}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="total" label="行为数" width="80" sortable />
      <el-table-column prop="clicks" label="点击" width="70" />
      <el-table-column prop="views" label="浏览" width="70" />
      <el-table-column prop="stays" label="停留" width="70" />
      <el-table-column prop="exposures" label="曝光" width="70" />
      <el-table-column label="总时长" width="90">
        <template #default="{row}">{{fmtSeconds(row.stay_seconds)}}</template>
      </el-table-column>
      <el-table-column prop="active_days" label="活跃天" width="70" />
      <el-table-column prop="top_category" label="偏好分类" width="90" />
      <el-table-column prop="last_active" label="最后活跃" width="160" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openDetail(row)">明细</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination style="margin-top:12px" layout="total, prev, pager, next" :total="total" :page-size="limit" :current-page="page" @current-change="p => load(p)" />

    <el-dialog v-model="showDetail" :title="(curUser?curUser.nickname:'')+' 行为明细'" width="760px">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <el-radio-group v-model="typeFilter" @change="loadDetail(1)">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="content_click">点击</el-radio-button>
          <el-radio-button label="page_view">浏览</el-radio-button>
          <el-radio-button label="page_stay">停留</el-radio-button>
          <el-radio-button label="rec_view">曝光</el-radio-button>
        </el-radio-group>
        <el-button type="danger" size="small" style="margin-left:auto" @click="clearUser">清空该用户全部行为</el-button>
      </div>
      <el-table :data="detailItems" stripe v-loading="detailLoading" height="420" style="width:100%">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="类型" width="80">
          <template #default="{row}"><el-tag size="small">{{typeLabel(row.type)}}</el-tag></template>
        </el-table-column>
        <el-table-column label="图片" width="80">
          <template #default="{row}">
            <el-image v-if="row.image_url" :src="row.image_url" fit="cover" style="width:52px;height:52px;border-radius:6px;cursor:pointer"
              :preview-src-list="[row.image_url]" preview-teleported />
            <span v-else style="color:#bbb">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="内容" min-width="180">
          <template #default="{row}">{{row.title || ('内容 #'+row.content_id)}}</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="90" />
        <el-table-column prop="duration" label="停留(s)" width="80" />
        <el-table-column prop="timestamp" label="时间" width="160" />
        <el-table-column label="操作" width="80">
          <template #default="{row}">
            <el-button size="small" type="danger" link @click="delOne(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:10px" layout="total, prev, pager, next" :total="detailTotal" :page-size="detailLimit" :current-page="detailPage" @current-change="p => loadDetail(p)" />
    </el-dialog>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import api from '@/api'
const list=ref([]),loading=ref(false),total=ref(0),page=ref(1),limit=ref(20),keyword=ref('')
const showDetail=ref(false),curUser=ref(null),typeFilter=ref('all'),detailItems=ref([]),detailLoading=ref(false),detailTotal=ref(0),detailPage=ref(1),detailLimit=ref(30)
const typeLabel=(t)=>({content_click:'点击',page_view:'浏览',page_stay:'停留',rec_view:'曝光'}[t]||t)
const fmtSeconds=(s)=>{s=Number(s)||0;if(s>=3600)return (s/3600).toFixed(1)+'h';if(s>=60)return Math.round(s/60)+'m';return s+'s'}
const load=async(p)=>{loading.value=true;page.value=p;try{const r=await api.get('/admin_behaviors.php',{params:{action:'list',page:p,limit:limit.value,keyword:keyword.value}});if(r.data.code===200){list.value=r.data.data.items||[];total.value=r.data.data.total||0}}catch(e){}loading.value=false}
const openDetail=(row)=>{curUser.value=row;typeFilter.value='all';detailItems.value=[];detailPage.value=1;showDetail.value=true;loadDetail(1)}
const loadDetail=async(p)=>{if(!curUser.value)return;detailLoading.value=true;detailPage.value=p;try{const r=await api.get('/admin_behaviors.php',{params:{action:'detail',user_id:curUser.value.user_id,page:p,limit:detailLimit.value,type:typeFilter.value}});if(r.data.code===200){detailItems.value=r.data.data.items||[];detailTotal.value=r.data.data.total||0}}catch(e){}detailLoading.value=false}
const delOne=(row)=>{ElMessageBox.confirm('确定删除该条记录？').then(async()=>{try{await api.post('/admin_behaviors.php',{action:'delete',id:row.id});ElMessage.success('已删除');loadDetail(detailPage.value)}catch(e){ElMessage.error('删除失败')}}).catch(()=>{})}
const clearUser=()=>{ElMessageBox.confirm(`确定清空「${curUser.value.nickname}」的全部行为？不可恢复`,'警告',{type:'warning'}).then(async()=>{try{await api.post('/admin_behaviors.php',{action:'clear_user',user_id:curUser.value.user_id});ElMessage.success('已清空');showDetail.value=false;load(1)}catch(e){ElMessage.error('清空失败')}}).catch(()=>{})}
onMounted(()=>load(1))
</script>
