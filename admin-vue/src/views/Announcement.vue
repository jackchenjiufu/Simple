<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view / 窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar" style="margin-top: 12px;">
        <div style="flex:1;height:38px;line-height:38px;padding:0 4px;font-size:15px;font-weight:600;color:#1a1a2e">公告管理</div>
        <div class="mc-fbtn" @click="openForm({})">＋ 添加公告</div>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!mList.length" class="mc-tip">暂无公告</div>
        <div v-for="row in mList" :key="row.id" class="mc-card">
          <div class="mc-card-top">
            <div class="mc-thumb">{{ (row.title || '公').slice(0, 1) }}</div>
            <div class="mc-card-info">
              <div class="mc-title">{{ row.title || '(无标题)' }}</div>
              <div class="mc-meta mc-content">{{ row.content || '暂无内容' }}</div>
              <div class="mc-data">ID:{{ row.id }} · {{ fmtTime(row.created_at) }}</div>
            </div>
            <span class="mc-mod" :class="row.is_active == 0 ? 'm-unsafe' : 'm-pending'">{{ row.is_active == 0 ? '已停用' : '公告' }}</span>
          </div>
          <div class="mc-actions">
            <span class="mc-act" @click="openDetail(row)">查看详情</span>
            <span class="mc-act" @click="openForm(row)">编辑</span>
            <span class="mc-act danger" @click="del(row)">删除</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && mList.length">没有更多了</div>
        <div class="mc-more" v-else-if="mList.length">上拉加载更多</div>
      </div>

      <!-- 公告详情弹层 -->
      <div v-if="showDetail && detail" class="mc-mask" @click.self="showDetail=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>公告详情</span>
            <span class="mc-close" @click="showDetail=false">✕</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">ID</span>
            <span class="mc-dv">#{{ detail.id }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">标题</span>
            <span class="mc-dv mc-title-text">{{ detail.title || '(无标题)' }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">状态</span>
            <span class="mc-dv">
              <span class="mc-mod" :class="detail.is_active == 0 ? 'm-unsafe' : 'm-safe'">{{ detail.is_active == 0 ? '已停用' : '启用中' }}</span>
            </span>
          </div>
          <div class="mc-detail-block">
            <span class="mc-dl">内容</span>
            <div class="mc-dv mc-longtext">{{ detail.content || '（无）' }}</div>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">发布时间</span>
            <span class="mc-dv">{{ fmtTime(detail.created_at) }}</span>
          </div>
          <div v-if="detail.updated_at" class="mc-detail-row">
            <span class="mc-dl">更新时间</span>
            <span class="mc-dv">{{ fmtTime(detail.updated_at) }}</span>
          </div>
          <div class="mc-actions" style="margin-top:16px">
            <span class="mc-act ok" @click="showDetail=false;openForm(detail)">编辑</span>
            <span class="mc-act danger" @click="del(detail)">删除</span>
          </div>
        </div>
      </div>

      <!-- 移动端新增/编辑公告底部弹层 -->
      <div v-if="showDialog" class="mc-mask" @click.self="showDialog=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>{{ isEdit ? '编辑公告' : '添加公告' }}</span>
            <span class="mc-close" @click="showDialog=false">✕</span>
          </div>
          <div class="mc-form-row">
            <label>标题</label>
            <input v-model="form.title" placeholder="请输入公告标题" />
          </div>
          <div class="mc-form-row">
            <label>内容</label>
            <textarea v-model="form.content" rows="4" placeholder="请输入公告内容"></textarea>
          </div>
          <button class="mc-save" :disabled="saving" @click="save">{{ saving ? '保存中...' : '保存' }}</button>
        </div>
      </div>

      <!-- 移动端删除确认弹层 -->
      <div v-if="showDel" class="mc-mask" @click.self="showDel=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>删除确认</span>
            <span class="mc-close" @click="showDel=false">✕</span>
          </div>
          <div class="mc-del-text">确定删除这条公告吗？删除后不可恢复。</div>
          <div class="mc-actions" style="margin-top:16px">
            <span class="mc-act" @click="showDel=false">取消</span>
            <span class="mc-act danger" @click="confirmDel">删除</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
    <div class="header-row">
      <h2>公告管理</h2>
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

    <!-- 桌面端新增/编辑弹窗（仅桌面；移动端用底部弹层） -->
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
    </template>
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getAnnouncements, saveAnnouncement, deleteAnnouncement } from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()
const list = ref([]), loading = ref(true), showDialog = ref(false), saving = ref(false), form = ref({}), isEdit = ref(false)

const fmtTime = (v) => (v && String(v) !== '0000-00-00 00:00:00') ? String(v).replace('T', ' ').slice(0, 19) : ''

// 移动端详情弹层
const showDetail = ref(false)
const detail = ref(null)
const openDetail = (row) => { detail.value = { ...row }; showDetail.value = true }
const closeDetail = () => { showDetail.value = false }

// 移动端：客户端分块滚动（getAnnouncements 一次返回全部，按块追加展示）
const mAll = ref([]), mList = ref([]), mTotal = ref(0), mPageSize = ref(15)
const hasMore = computed(() => mList.value.length < mTotal.value)
const applyMobileChunk = () => { mList.value = mAll.value.slice(0, mPageSize.value) }

const load = async () => {
  loading.value = true
  try {
    const r = await getAnnouncements()
    if (r.data.code === 200) {
      const data = r.data.data || []
      list.value = data                 // 桌面端表格
      mAll.value = data                 // 移动端全量
      mTotal.value = data.length
      applyMobileChunk()
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}
const openForm = (row) => {
  isEdit.value = !!row.id
  form.value = { id: row.id || null, title: row.title || '', content: row.content || '' }
  showDialog.value = true
}
const save = async () => {
  saving.value = true
  try {
    const payload = { token: localStorage.getItem('admin_token') || '', title: (form.value.title || '').trim(), content: form.value.content || '' }
    if (isEdit.value) {
      await saveAnnouncement({ action: 'update_announcement', ...payload, id: form.value.id })
    } else {
      await saveAnnouncement({ action: 'create_announcement', ...payload })
    }
    ElMessage.success('保存成功'); showDialog.value = false; closeDetail(); load()
  } catch (e) { ElMessage.error('保存失败') }
  saving.value = false
}
// 移动端删除：底部确认弹层；桌面端：原居中确认框
const showDel = ref(false)
const delTarget = ref(null)
const doDel = async (row) => {
  try { await deleteAnnouncement(row.id); ElMessage.success('已删除'); closeDetail(); load() } catch (e) { ElMessage.error('删除失败') }
}
const del = (row) => {
  if (isMobile.value) { delTarget.value = row; showDel.value = true; return }
  ElMessageBox.confirm('确定删除？').then(() => doDel(row)).catch(() => {})
}
const confirmDel = () => { const row = delTarget.value; showDel.value = false; if (row) doDel(row) }

// 移动端上拉加载更多
const mLoadingMore = ref(false)
const loadMore = () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  const cur = mList.value.length
  mList.value = mList.value.concat(mAll.value.slice(cur, cur + mPageSize.value))
  mLoadingMore.value = false
}
// 滚动到底部自动加载（监听 document 捕获 .admin-main 滚动）
const onScroll = () => {
  if (!isMobile.value) return
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadMore()
}
onMounted(() => { load(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })
</script>
<style scoped>
.mc-content {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
/* 移动端详情弹层 */
.mc-sheet { max-height: 78vh; overflow-y: auto; }
.mc-detail-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px dashed #f0f2f5; font-size: 14px; }
.mc-detail-block { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; font-size: 14px; }
.mc-dl { flex: 0 0 74px; color: #909399; }
.mc-dv { flex: 1; min-width: 0; color: #1a1a2e; word-break: break-all; }
.mc-title-text { font-weight: 600; }
.mc-longtext { white-space: pre-wrap; word-break: break-word; background: #f8f9fc; border-radius: 8px; padding: 8px 10px; line-height: 1.6; max-height: 40vh; overflow-y: auto; }
/* 移动端底部表单/删除确认 */
.mc-form-row textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  line-height: 1.6;
  outline: none;
  resize: vertical;
}
.mc-del-text { font-size: 14px; color: #333; line-height: 1.7; }
</style>
