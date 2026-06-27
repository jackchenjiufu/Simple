<template>
  <div>
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <h2 style="margin:0">公告管理</h2>
      <el-button type="primary" size="small" @click="openForm({})">添加公告</el-button>
    </div>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="180" />
      <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
      <el-table-column prop="created_at" label="时间" width="170" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="showDialog" :title="isEdit?'编辑公告':'添加公告'" width="500px">
      <el-form :model="form" label-width="60px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="内容"><el-input v-model="form.content" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import {getAnnouncements,saveAnnouncement,deleteAnnouncement} from '@/api'
const list=ref([]),loading=ref(true),showDialog=ref(false),saving=ref(false),form=ref({}),isEdit=ref(false)
const load=async()=>{loading.value=true;try{const r=await getAnnouncements();if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false}
const openForm=(row)=>{isEdit.value=!!row.id;form.value={...row};showDialog.value=true}
const save=async()=>{
  saving.value=true
  try{
    await saveAnnouncement({action:'create_announcement',token:'doo_admin_2024',...form.value})
    ElMessage.success('保存成功');showDialog.value=false;load()
  }catch(e){ElMessage.error('保存失败')}
  saving.value=false
}
const del=(row)=>{ElMessageBox.confirm('确定删除？').then(async()=>{try{await deleteAnnouncement(row.id);ElMessage.success('已删除');load()}catch(e){ElMessage.error('删除失败')}}).catch(()=>{})}
onMounted(load)
</script>