<template>
  <div>
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <h2 style="margin:0">轮播管理</h2>
      <el-button type="primary" size="small" @click="openForm({})">添加轮播</el-button>
    </div>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="title" label="标题" min-width="160" />
      <el-table-column label="图片" width="100">
        <template #default="{row}"><el-image :src="row.image_url" style="width:80px;height:50px;border-radius:4px" fit="cover" /></template>
      </el-table-column>
      <el-table-column prop="sort_order" label="排序" width="60" />
      <el-table-column prop="is_active" label="状态" width="70">
        <template #default="{row}"><el-tag :type="row.is_active==1?'success':'info'" size="small">{{row.is_active==1?'启用':'禁用'}}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showForm" :title="isEdit?'编辑轮播':'添加轮播'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="form.image_url" /></el-form-item>
        <el-form-item label="作者"><el-input v-model="form.author" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.is_active" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForm=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import {ref,onMounted} from 'vue'
import {ElMessage,ElMessageBox} from 'element-plus'
import api from '@/api'
const list=ref([]),loading=ref(true),showForm=ref(false),saving=ref(false),form=ref({}),isEdit=ref(false)
const load=async()=>{loading.value=true;try{const r=await api.get('/admin_carousels.php');if(r.data.code===200)list.value=r.data.data||[]}catch(e){}loading.value=false}
const openForm=(row)=>{isEdit.value=!!row.id;form.value={...row,sort_order:row.sort_order??0,is_active:row.is_active??1};showForm.value=true}
const save=async()=>{
  saving.value=true
  try{
    if(isEdit.value){await api.put('/admin_carousels.php',form.value)}
    else{await api.post('/admin_carousels.php',form.value)}
    ElMessage.success('保存成功');showForm.value=false;load()
  }catch(e){ElMessage.error('保存失败')}
  saving.value=false
}
const del=(row)=>{ElMessageBox.confirm('确定删除？').then(async()=>{try{await api.delete('/admin_carousels.php',{params:{id:row.id}});ElMessage.success('已删除');load()}catch(e){ElMessage.error('删除失败')}}).catch(()=>{})}
onMounted(load)
</script>