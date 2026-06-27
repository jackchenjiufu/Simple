<template>
  <div>
    <h2 style="margin-bottom:20px">控制台</h2>
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="hover" style="margin-bottom:20px">
          <div class="card-value">{{ card.value }}</div>
          <div class="card-label">{{ card.label }}</div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
const cards = [
  { value: '--', label: '用户总数' },
  { value: '--', label: '内容总数' },
  { value: '--', label: '公告数' },
  { value: '--', label: '反馈数' },
]
</script>

<style scoped>
.card-value { font-size: 32px; font-weight: 700; color: #1b44a6; }
.card-label { font-size: 14px; color: #909399; margin-top: 8px; }
</style>
