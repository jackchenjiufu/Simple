<template>
  <div>
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <h2 style="margin:0">用户管理</h2>
      <el-button type="primary" size="small" @click="openForm({})">添加用户</el-button>
    </div>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column label="头像" width="60"><template #default="{row}"><el-avatar :src="row.avatar" size="small" v-if="row.avatar" /><span v-else style="color:#ccc">--</span></template></el-table-column>
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column prop="role" label="角色" width="80" />
      <el-table-column prop="created_at" label="注册时间" width="170" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openForm(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="del(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="showForm" :title="isEdit?'编辑用户':'添加用户'" width="450px">
      <el-form :model="form" label-width="70px">
        <el-form-item label="用户名"><el-input v-model="form.username" :disabled="isEdit" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width:100%">
            <el-option label="管理员" value="admin" />
            <el-option label="用户" value="user" />
          </el-select>
        </el-form-item>
        <el-form-item label="密码" v-if="!isEdit"><el-input v-model="form.password" type="password" /></el-form-item>
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
const total=ref(0)
const load=async()=>{loading.value=true;try{const r=await api.get('/admin_users.php');if(r.data.code===200){list.value=r.data.data||[];total.value=list.value.length}}catch(e){}loading.value=false}
const openForm=(row)=>{isEdit.value=!!row.id;form.value={...row};showForm.value=true}
const save=async()=>{saving.value=true;try{if(isEdit.value){await api.put('/admin_users.php',form.value)}else{await api.post('/admin_users.php',form.value)};ElMessage.success('保存成功');showForm.value=false;load()}catch(e){ElMessage.error('保存失败'+e.message)};saving.value=false}
const del=(row)=>{ElMessageBox.confirm('确定删除用户 '+row.username+'？').then(async()=>{try{await api.delete('/admin_users.php',{params:{id:row.id}});ElMessage.success('已删除');load()}catch(e){ElMessage.error('删除失败')}}).catch(()=>{})}
onMounted(load)
</script>
