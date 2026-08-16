<template>
  <div>
    <div class="header-row">
      <h2 style="margin:0">内容管理</h2>
      <div class="header-controls">
        <el-input v-model="searchKey" placeholder="搜索标题/作者" clearable size="small" style="width:180px" @clear="load" @keyup.enter="load" />
        <el-select v-model="categoryFilter" placeholder="全部分类" clearable size="small" style="width:120px" @change="load">
          <el-option v-for="c in categories" :key="c" :value="c" :label="c" />
        </el-select>
        <el-select v-model="moderationFilter" placeholder="全部审核" clearable size="small" style="width:110px" @change="load">
          <el-option value="pending" label="待审核" />
          <el-option value="safe" label="已通过" />
          <el-option value="unsafe" label="已驳回" />
        </el-select>
        <el-button size="small" @click="load">刷新</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" @tab-change="onTabChange" style="margin-top:10px">
      <el-tab-pane label="图片" name="image" />
      <el-tab-pane label="视频" name="video" />
      <el-tab-pane label="回收站" name="trash" />
    </el-tabs>

    <!-- 批量操作栏 -->
    <div v-if="selected.length > 0" style="margin:8px 0;">
      <span style="font-size:13px;color:#666;margin-right:10px">已选 {{ selected.length }} 项</span>
      <el-button size="small" type="primary" @click="batchOp('safe')">审核通过</el-button>
      <el-button size="small" type="warning" @click="batchOp('unsafe')">审核驳回</el-button>
      <el-button v-if="activeTab==='trash'" size="small" type="success" @click="batchOp('restore')">批量恢复</el-button>
      <el-button v-if="activeTab==='trash'" size="small" type="danger" @click="batchOp('hard_delete')">彻底删除</el-button>
      <el-button v-else size="small" type="danger" @click="batchOp('soft_delete')">移入回收站</el-button>
    </div>

    <el-table :data="list" stripe v-loading="loading" style="width:100%;margin-top:8px" empty-text="暂无内容" @selection-change="sel => selected = sel.map(r => r.id)">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="预览" width="80">
        <template #default="{row}">
          <img v-if="row.image_url" :src="row.image_url" style="width:56px;height:56px;object-fit:cover;border-radius:4px" />
          <span v-else style="color:#999;font-size:12px">无图</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
      <el-table-column label="作者" width="100">
        <template #default="{row}">{{ row.nickname || row.username || '用户#' + row.user_id }}</template>
      </el-table-column>
      <el-table-column label="分类" width="90">
        <template #default="{row}"><el-tag size="small" effect="plain">{{ row.category || '-' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="标签" min-width="150">
        <template #default="{row}">
          <el-tag v-for="t in tagList(row)" :key="t" size="small" style="margin-right:4px">{{ t }}</el-tag>
          <span v-if="!tagList(row).length" style="color:#bbb">-</span>
        </template>
      </el-table-column>
      <el-table-column label="数据" width="100">
        <template #default="{row}">
          <span style="font-size:12px;color:#666">👍{{ row.likes }} 👁{{ row.views_count }}</span>
          <div v-if="row.recommended==1"><el-tag type="warning" size="small" effect="light">推荐</el-tag></div>
        </template>
      </el-table-column>
      <el-table-column label="审核" width="90">
        <template #default="{row}">
          <el-tag :type="modType(row.moderation_status)" size="small">{{ modLabel(row.moderation_status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="150" />
      <el-table-column label="操作" width="210" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openMeta(row)">标签</el-button>
          <template v-if="activeTab==='trash'">
            <el-button size="small" type="success" @click="restore(row)">恢复</el-button>
            <el-popconfirm title="彻底删除且无法恢复？" @confirm="hardDel(row)">
              <template #reference><el-button size="small" type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
          <template v-else>
            <el-button size="small" :type="row.moderation_status==='safe' ? 'warning' : 'success'" @click="setMod(row, row.moderation_status==='safe' ? 'unsafe' : 'safe')">{{ row.moderation_status==='safe' ? '驳回' : '通过' }}</el-button>
            <el-popconfirm title="移入回收站？" @confirm="softDel(row)">
              <template #reference><el-button size="small" type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-row" v-if="total>0">
      <el-pagination
        v-model:current-page="currentPage" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" small @current-change="load"
      />
    </div>

    <!-- 标签/分类编辑弹窗 -->
    <el-dialog v-model="metaDlg" title="编辑标签与分类" width="480">
      <el-form label-width="70px">
        <el-form-item label="标签">
          <el-select v-model="metaTags" multiple filterable allow-create default-first-option placeholder="输入后回车添加" style="width:100%">
            <el-option v-for="t in allTags" :key="t" :value="t" :label="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="metaCategory" filterable allow-create default-first-option placeholder="选择或输入新分类" style="width:100%">
            <el-option v-for="c in categories" :key="c" :value="c" :label="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐">
          <el-switch v-model="metaRecommended" active-text="参与推荐" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="metaDlg=false">取消</el-button>
        <el-button size="small" type="primary" @click="saveMeta">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const list = ref([]), loading = ref(true)
const total = ref(0), currentPage = ref(1), pageSize = ref(15)
const activeTab = ref('image')
const searchKey = ref(''), categoryFilter = ref(''), moderationFilter = ref('')
const selected = ref([])
const categories = ref([])
const allTags = ref([])

const tagList = (row) => {
  if (!row.tags) return []
  try {
    const v = JSON.parse(row.tags)
    return Array.isArray(v) ? v.map(String) : String(v).split(',').filter(Boolean)
  } catch (e) { return String(row.tags).split(',').filter(Boolean) }
}
const modLabel = (m) => m === 'safe' ? '通过' : m === 'unsafe' ? '驳回' : '待审'
const modType = (m) => m === 'safe' ? 'success' : m === 'unsafe' ? 'danger' : 'info'

const onTabChange = () => { currentPage.value = 1; moderationFilter.value = ''; load() }

const load = async () => {
  loading.value = true
  try {
    const params = { page: currentPage.value, limit: pageSize.value, type: activeTab.value }
    if (searchKey.value) params.search = searchKey.value
    if (categoryFilter.value) params.category = categoryFilter.value
    if (moderationFilter.value && activeTab.value !== 'trash') params.moderation = moderationFilter.value
    const r = await api.get('/admin_content.php', { params })
    if (r.data.code === 200) {
      list.value = r.data.data || []
      total.value = r.data.total || 0
    }
  } catch (e) { /* ignore */ }
  loading.value = false
}

const loadOptions = async () => {
  try {
    const r = await api.get('/admin_content.php', { params: { type: 'image', limit: 200 } })
    if (r.data.code === 200) {
      const cs = new Set(), ts = new Set()
      ;(r.data.data || []).forEach(row => {
        if (row.category) cs.add(row.category)
        tagList(row).forEach(t => ts.add(t))
      })
      categories.value = [...cs].slice(0, 50)
      allTags.value = [...ts].slice(0, 100)
    }
  } catch (e) { /* ignore */ }
}

const refresh = () => { load(); loadOptions() }

// 标签编辑
const metaDlg = ref(false)
const metaId = ref(0), metaTags = ref([]), metaCategory = ref(''), metaRecommended = ref(false)
const openMeta = (row) => {
  metaId.value = row.id
  metaTags.value = tagList(row)
  metaCategory.value = row.category || ''
  metaRecommended.value = row.recommended == 1
  metaDlg.value = true
}
const saveMeta = async () => {
  try {
    await api.post('/admin_content.php', { id: metaId.value, tags: metaTags.value, category: metaCategory.value, recommended: metaRecommended.value ? 1 : 0 }, { params: { action: 'update_meta' } })
    ElMessage.success('已保存')
    metaDlg.value = false
    refresh()
  } catch (e) { ElMessage.error('保存失败') }
}

// 单个操作
const softDel = async (row) => {
  try { await api.delete('/admin_content.php', { params: { id: row.id } }); ElMessage.success('已移入回收站'); refresh() } catch (e) { ElMessage.error('删除失败') }
}
const restore = async (row) => {
  try { await api.post('/admin_content.php', { id: row.id }, { params: { action: 'restore' } }); ElMessage.success('已恢复'); refresh() } catch (e) { ElMessage.error('恢复失败') }
}
const hardDel = async (row) => {
  try { await api.delete('/admin_content.php', { params: { id: row.id, hard: '1' } }); ElMessage.success('已彻底删除'); refresh() } catch (e) { ElMessage.error('删除失败') }
}
const setMod = async (row, st) => {
  try { await api.post('/admin_content.php', { id: row.id, moderation_status: st }, { params: { action: 'set_moderation' } }); ElMessage.success(st === 'safe' ? '已通过' : '已驳回'); refresh() } catch (e) { ElMessage.error('操作失败') }
}

// 批量操作
const batchOp = async (op) => {
  if (!selected.value.length) return
  const label = { safe: '审核通过', unsafe: '审核驳回', restore: '恢复', soft_delete: '移入回收站', hard_delete: '彻底删除' }[op]
  try {
    await api.post('/admin_content.php', { ids: selected.value, op }, { params: { action: 'batch' } })
    ElMessage.success(`${label}完成`)
    selected.value = []
    refresh()
  } catch (e) { ElMessage.error(`${label}失败`) }
}

onMounted(() => { load(); loadOptions() })
</script>