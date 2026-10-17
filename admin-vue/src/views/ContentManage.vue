<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-tabs">
        <div v-for="t in ['image','video','trash']" :key="t" class="mc-tab"
             :class="{ active: activeTab === t }" @click="onTabChange(t)">
          {{ t === 'image' ? '图片' : t === 'video' ? '视频' : '回收站' }}
        </div>
      </div>
      <div class="mc-toolbar">
        <input v-model="searchKey" class="mc-search" placeholder="搜索标题/作者"
               @keyup.enter="currentPage=1;load()" />
        <div class="mc-fbtn" @click="currentPage=1;load()">搜索</div>
      </div>
      <div class="mc-filters">
        <select v-model="categoryFilter" class="mc-select" @change="currentPage=1;load()">
          <option value="">全部分类</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
        <select v-model="moderationFilter" class="mc-select" @change="currentPage=1;load()">
          <option value="">全部审核</option>
          <option value="pending">待审核</option>
          <option value="safe">已通过</option>
          <option value="unsafe">已驳回</option>
        </select>
      </div>
      <div class="mc-filters" style="margin-top:6px">
        <span class="mc-act" style="padding:7px 14px;font-size:12px" :class="{ ok: sortOrder==='desc' }" @click="sortOrder='desc';currentPage=1;load()">倒序 ▾</span>
        <span class="mc-act" style="padding:7px 14px;font-size:12px" :class="{ ok: sortOrder==='asc' }" @click="sortOrder='asc';currentPage=1;load()">正序 ▴</span>
        <span style="font-size:11px;color:#999;margin-left:auto;align-self:center">置顶内容固定顶部</span>
      </div>

      <!-- 移动端：批量操作栏（补桌面功能） -->
      <div style="display:flex;align-items:center;gap:8px;margin:10px 0">
        <span class="mc-act" style="flex:none;padding:7px 14px" :class="{ ok: mBatchMode }" @click="mBatchMode=!mBatchMode">{{ mBatchMode ? '取消批量' : '批量操作' }}</span>
        <span v-if="mBatchMode" style="font-size:12px;color:#666">已选 {{ mBatchIds.size }} 项</span>
        <span v-if="mBatchMode && activeTab!=='trash'" style="flex:1;display:flex;gap:6px">
          <span class="mc-act ok" style="flex:1" @click="mBatchOp('safe')">通过</span>
          <span class="mc-act warn" style="flex:1" @click="mBatchOp('unsafe')">驳回</span>
        </span>
        <span v-if="mBatchMode && activeTab==='trash'" style="flex:1;display:flex;gap:6px">
          <span class="mc-act ok" style="flex:1" @click="mBatchOp('restore')">恢复</span>
          <span class="mc-act danger" style="flex:1" @click="mBatchOp('hard_delete')">彻底删</span>
        </span>
        <span v-if="mBatchMode && activeTab!=='trash'" class="mc-act danger" style="flex:none" @click="mBatchOp('soft_delete')">删除</span>
        <span v-if="mBatchMode" class="mc-act" style="flex:none" @click="mBatchSelAll">{{ mBatchAll ? '取消全选' : '全选' }}</span>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无内容</div>
        <div v-for="row in list" :key="row.id" class="mc-card" @click="mBatchMode ? toggleMBatch(row.id) : openDetail(row)">
          <div class="mc-card-top">
            <span v-if="mBatchMode" class="mc-sel" :class="{ on: mBatchIds.has(row.id) }" style="flex-shrink:0;width:22px;height:22px;border:1.5px solid #cbd5e1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;color:transparent;margin-right:8px;margin-top:2px" >✓</span>
            <div class="mc-thumb" v-if="row.image_url">
              <img :src="row.image_url" alt="" />
            </div>
            <div class="mc-thumb mc-thumb-empty" v-else>{{ row.video_url ? '▶' : '无图' }}</div>
            <div class="mc-card-info">
              <div class="mc-title">{{ row.title || '(无标题)' }}</div>
              <div class="mc-meta">{{ (row.nickname || row.username || '用户#' + row.user_id) }} · {{ row.category || '未分类' }}</div>
              <div class="mc-data">点赞 {{ row.likes || 0 }} · 浏览 {{ row.views_count || 0 }} · {{ row.created_at || '' }}</div>
            </div>
            <span class="mc-mod" :class="'m-' + row.moderation_status">{{ modLabel(row.moderation_status) }}</span>
          </div>
          <div class="mc-tags">
            <span v-for="t in tagList(row)" :key="t" class="mc-tag">{{ t }}</span>
          </div>
          <div class="mc-actions">
            <template v-if="activeTab === 'trash'">
              <span class="mc-act ok" @click.stop="restore(row)">恢复</span>
              <span class="mc-act danger" @click.stop="hardDel(row)">删除</span>
            </template>
            <template v-else>
              <span class="mc-act" :class="{ pinned: row.is_pinned == 1 }" @click.stop="pinContent(row)">{{ row.is_pinned == 1 ? '取消置顶' : '置顶' }}</span>
              <span class="mc-act" :class="row.moderation_status === 'safe' ? 'warn' : 'ok'" @click.stop="setMod(row, row.moderation_status === 'safe' ? 'unsafe' : 'safe')">{{ row.moderation_status === 'safe' ? '驳回' : '通过' }}</span>
              <span class="mc-act danger" @click.stop="softDel(row)">删除</span>
            </template>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 标签/分类编辑弹层 -->
      <div class="mc-mask" v-if="metaDlg" @click="metaDlg=false">
        <div class="mc-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>编辑标签与分类</span>
            <span class="mc-close" @click="metaDlg=false">✕</span>
          </div>
          <div class="mc-form-row">
            <label>标签</label>
            <input v-model="metaTagsText" placeholder="多个标签用逗号分隔" />
          </div>
          <div class="mc-form-row">
            <label>分类</label>
            <input v-model="metaCategoryText" placeholder="输入分类" />
          </div>
          <div class="mc-form-row">
            <label>推荐</label>
            <label class="mc-switch"><input type="checkbox" v-model="metaRecommended" />参与推荐</label>
          </div>
          <button class="mc-save" @click="saveMeta">保存</button>
        </div>
      </div>

      <!-- 内容详情弹层（移动端） -->
      <div class="mc-mask" v-if="detailDlg" @click="detailDlg=false">
        <div class="mc-sheet" style="max-height:88%" @click.stop>
          <div class="mc-sheet-head">
            <span>内容详情</span>
            <span class="mc-close" @click="detailDlg=false">✕</span>
          </div>
          <div class="mc-sec" style="overflow:auto;max-height:64vh">
            <img v-if="detail.image_url" :src="detail.image_url" class="mc-det-img" style="width:100%;max-height:240px;object-fit:cover;border-radius:10px" />
            <div v-else class="mc-thumb mc-thumb-empty" style="width:100%;height:140px;border-radius:10px">{{ detail.video_url ? '▶ 视频内容' : '无预览图' }}</div>

            <div class="mc-title" style="font-size:17px;margin:12px 0 4px">{{ detail.title || '(无标题)' }}</div>

            <div class="mc-detail-row">
              <span class="mc-detail-label">作者</span>
              <span class="mc-detail-val">
                <img v-if="detail.avatar" :src="detail.avatar" class="mc-detail-avatar" />
                {{ detail.nickname || detail.username || '用户#' + detail.user_id }}
              </span>
            </div>
            <div class="mc-detail-row"><span class="mc-detail-label">ID</span><span class="mc-detail-val">#{{ detail.id }}</span></div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">分类</span>
              <span class="mc-detail-val">{{ detail.category || '未分类' }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">标签</span>
              <span class="mc-detail-val">
                <span v-for="t in tagList(detail)" :key="t" class="mc-tag">{{ t }}</span>
                <span v-if="!tagList(detail).length" style="color:#999">无</span>
              </span>
            </div>
            <div class="mc-detail-row"><span class="mc-detail-label">来源</span><span class="mc-detail-val">{{ srcLabel(detail.source) }}</span></div>
            <div class="mc-detail-row"><span class="mc-detail-label">数据</span><span class="mc-detail-val">点赞 {{ detail.likes || 0 }} · 评论 {{ detail.comments || 0 }} · 浏览 {{ detail.views_count || 0 }}</span></div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">审核</span>
              <span class="mc-detail-val"><span class="mc-mod" :class="'m-' + detail.moderation_status">{{ modLabel(detail.moderation_status) }}</span><span v-if="detail.moderated_at" style="color:#999;font-size:12px"> · {{ detail.moderated_at }}</span></span>
            </div>
            <div class="mc-detail-row"><span class="mc-detail-label">推荐/置顶</span><span class="mc-detail-val">{{ detail.recommended == 1 ? '参与推荐' : '不推荐' }} · {{ detail.is_pinned == 1 ? '已置顶' : '未置顶' }}</span></div>
            <div class="mc-detail-row"><span class="mc-detail-label">创建</span><span class="mc-detail-val">{{ detail.created_at || '-' }}</span></div>
            <div v-if="detail.content" class="mc-desc" style="margin-top:10px;background:#f5f7fa;padding:10px;border-radius:8px;color:#444;font-size:13px;line-height:1.6;word-break:break-all">
              <div style="font-weight:600;color:#333;margin-bottom:4px">内容描述</div>
              {{ detail.content }}
            </div>
          </div>

          <div class="mc-actions" style="margin-top:14px;flex-wrap:wrap;gap:8px">
            <span class="mc-act" @click="detailDlg=false; openMeta(rowOf(detail))">编辑标签分类</span>
            <span v-if="activeTab !== 'trash'" class="mc-act" :class="{ pinned: detail.is_pinned == 1 }" @click="pinContent(rowOf(detail))">{{ detail.is_pinned == 1 ? '取消置顶' : '置顶' }}</span>
            <span v-if="activeTab !== 'trash'" class="mc-act" @click="glmModerate(rowOf(detail))">GLM 审核</span>
            <template v-if="activeTab !== 'trash'">
              <span class="mc-act" :class="detail.moderation_status === 'safe' ? 'warn' : 'ok'" @click="setMod(rowOf(detail), detail.moderation_status === 'safe' ? 'unsafe' : 'safe')">{{ detail.moderation_status === 'safe' ? '驳回' : '通过' }}</span>
              <span class="mc-act danger" @click="softDel(rowOf(detail))">删除</span>
            </template>
            <template v-else>
              <span class="mc-act ok" @click="restore(rowOf(detail))">恢复</span>
              <span class="mc-act danger" @click="hardDel(rowOf(detail))">彻底删除</span>
            </template>
          </div>
        </div>
      </div>

      <!-- 通用操作确认弹层（移动端替代 ElMessageBox 居中弹窗） -->
      <div class="mc-mask" v-if="confirmSheet.show" @click="sheetCancel">
        <div class="mc-sheet" @click.stop>
          <div class="mc-sheet-head">
            <span>{{ confirmSheet.title }}</span>
            <span class="mc-close" @click="sheetCancel">✕</span>
          </div>
          <div class="mc-confirm-text">{{ confirmSheet.text }}</div>
          <div class="mc-actions" style="margin-top:18px">
            <span class="mc-act" @click="sheetCancel">取消</span>
            <span class="mc-act" :class="confirmSheet.danger ? 'danger' : 'ok'" @click="sheetOk">确定</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
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

    <!-- 排序切换：置顶内容固定顶部，其余按时间正序/倒序 -->
    <div style="margin:8px 0;display:flex;align-items:center;gap:8px">
      <el-radio-group v-model="sortOrder" size="small" @change="currentPage=1;load()">
        <el-radio-button value="desc">倒序（最新在前）</el-radio-button>
        <el-radio-button value="asc">正序（最早在前）</el-radio-button>
      </el-radio-group>
      <span style="font-size:12px;color:#999">置顶内容固定显示在顶部</span>
    </div>

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
      <el-table-column label="标题" min-width="180" show-overflow-tooltip>
        <template #default="{row}">
          <span>{{ row.title || '(无标题)' }}</span>
          <el-tag v-if="row.is_pinned == 1" type="danger" size="small" style="margin-left:6px">置顶</el-tag>
        </template>
      </el-table-column>
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
          <span style="font-size:12px;color:#666">点赞 {{ row.likes }} · 浏览 {{ row.views_count }}</span>
          <div v-if="row.recommended==1"><el-tag type="warning" size="small" effect="light">推荐</el-tag></div>
        </template>
      </el-table-column>
      <el-table-column label="审核" width="90">
        <template #default="{row}">
          <el-tag :type="modType(row.moderation_status)" size="small">{{ modLabel(row.moderation_status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="150" />
      <el-table-column label="操作" width="270" fixed="right">
        <template #default="{row}">
          <el-button size="small" @click="openMeta(row)">标签</el-button>
          <template v-if="activeTab==='trash'">
            <el-button size="small" type="success" @click="restore(row)">恢复</el-button>
            <el-popconfirm title="彻底删除且无法恢复？" @confirm="hardDel(row)">
              <template #reference><el-button size="small" type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
          <template v-else>
            <el-button size="small" :type="row.is_pinned == 1 ? 'danger' : 'warning'" :loading="pinningId===row.id" @click="pinContent(row)">{{ row.is_pinned == 1 ? '取消置顶' : '置顶' }}</el-button>
            <el-button size="small" type="primary" :loading="glmLoadingId===row.id" @click="glmModerate(row)">GLM</el-button>
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
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

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
const modLabel = (m) => m === 'safe' ? '通过' : m === 'unsafe' || m === 'blocked' ? '驳回' : '待审'
const modType = (m) => m === 'safe' ? 'success' : m === 'unsafe' || m === 'blocked' ? 'danger' : 'info'

const onTabChange = (t) => { if (t) activeTab.value = t; currentPage.value = 1; moderationFilter.value = ''; load() }

const sortOrder = ref('desc') // desc倒序（默认）/ asc正序，置顶内容始终最前

const load = async () => {
  loading.value = true
  try {
    const params = { page: currentPage.value, limit: pageSize.value, type: activeTab.value, sort: sortOrder.value }
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

// 移动端加载状态
const mLoadingMore = ref(false)
const hasMore = computed(() => list.value.length < total.value)
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  currentPage.value += 1
  try {
    const params = { page: currentPage.value, limit: pageSize.value, type: activeTab.value, sort: sortOrder.value }
    if (searchKey.value) params.search = searchKey.value
    if (categoryFilter.value) params.category = categoryFilter.value
    if (moderationFilter.value && activeTab.value !== 'trash') params.moderation = moderationFilter.value
    const r = await api.get('/admin_content.php', { params })
    if (r.data.code === 200) {
      const more = r.data.data || []
      list.value = list.value.concat(more)
      total.value = r.data.total || 0
    } else {
      currentPage.value -= 1 // 失败回退页码
    }
  } catch (e) { currentPage.value -= 1 }
  mLoadingMore.value = false
}
// 滚动到底部自动加载（移动端滚动容器是 .mc-list 外层，这里绑定到 document 捕获 el-main 滚动）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
    loadMore()
  }
}
onMounted(() => { load(); loadOptions(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })

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

// ===== 通用确认：移动端用底部弹出 mc-sheet，桌面端沿用 ElMessageBox =====
const confirmSheet = ref({ show: false, title: '', text: '', danger: false, onOk: null })
const askConfirm = (title, text, danger = false) => new Promise(resolve => {
  if (isMobile.value) {
    confirmSheet.value = { show: true, title, text, danger: !!danger, onOk: resolve }
  } else {
    ElMessageBox.confirm(text, title, { type: danger ? 'warning' : 'info' })
      .then(() => resolve(true)).catch(() => resolve(false))
  }
})
const sheetOk = () => { const cb = confirmSheet.value.onOk; confirmSheet.value.show = false; cb && cb(true) }
const sheetCancel = () => { confirmSheet.value.onOk = null; confirmSheet.value.show = false }

// 标签编辑
const metaDlg = ref(false)
const metaId = ref(0), metaTags = ref([]), metaCategory = ref(''), metaRecommended = ref(false)
const metaTagsText = ref(''), metaCategoryText = ref('')
const openMeta = (row) => {
  metaId.value = row.id
  metaTags.value = tagList(row)
  metaTagsText.value = metaTags.value.join(',')
  metaCategory.value = row.category || ''
  metaCategoryText.value = metaCategory.value
  metaRecommended.value = row.recommended == 1
  metaDlg.value = true
}
// ===== 内容详情弹层（移动端） =====
const detailDlg = ref(false)
const detail = ref({})
const rowOf = (d) => list.value.find(r => r.id === d.id) || d
const srcLabel = (s) => s === 'video' ? '视频上传' : s === 'ai' ? 'AI 生成' : s === 'upload' ? '用户上传' : (s || '未知')
const openDetail = (row) => {
  detail.value = Object.assign({}, row)
  detailDlg.value = true
}

const saveMeta = async () => {
  const tags = isMobile.value ? metaTagsText.value.split(',').map(s => s.trim()).filter(Boolean) : metaTags.value
  const category = isMobile.value ? metaCategoryText.value.trim() : metaCategory.value
  try {
    await api.post('/admin_content.php', { id: metaId.value, tags, category, recommended: metaRecommended.value ? 1 : 0 }, { params: { action: 'update_meta' } })
    ElMessage.success('已保存')
    metaDlg.value = false
    refresh()
  } catch (e) { ElMessage.error('保存失败') }
}

// 单个操作
const softDel = async (row) => {
  // 移动端用底部弹出确认；桌面端保持原有 el-popconfirm
  if (isMobile.value && !(await askConfirm('移入回收站', `将 #${row.id}「${row.title || '(无标题)'}」移入回收站，可在回收站恢复。确定？`, true))) return
  try { await api.delete('/admin_content.php', { params: { id: row.id } }); ElMessage.success('已移入回收站'); refresh() } catch (e) { ElMessage.error('删除失败') }
}
const restore = async (row) => {
  try { await api.post('/admin_content.php', { id: row.id }, { params: { action: 'restore' } }); ElMessage.success('已恢复'); refresh() } catch (e) { ElMessage.error('恢复失败') }
}
const hardDel = async (row) => {
  // 移动端用底部弹出确认；桌面端保持原有 el-popconfirm
  if (isMobile.value && !(await askConfirm('彻底删除', `将 #${row.id}「${row.title || '(无标题)'}」彻底删除且无法恢复。确定？`, true))) return
  try { await api.delete('/admin_content.php', { params: { id: row.id, hard: '1' } }); ElMessage.success('已彻底删除'); refresh() } catch (e) { ElMessage.error('删除失败') }
}
const setMod = async (row, st) => {
  try { await api.post('/admin_content.php', { id: row.id, moderation_status: st }, { params: { action: 'set_moderation' } }); ElMessage.success(st === 'safe' ? '已通过' : '已驳回'); refresh() } catch (e) { ElMessage.error('操作失败') }
}

// 置顶主推：is_pinned=1 的内容排推荐流最前（复用 admin_recommend.php pin 接口）
const pinningId = ref(0)
const pinContent = async (row) => {
  const pinned = row.is_pinned == 1 ? 0 : 1
  // 移动端走底部弹出 sheet，桌面端走 ElMessageBox
  const ok = await askConfirm(
    pinned ? '置顶主推' : '取消置顶',
    pinned ? `将 #${row.id}「${row.title || ''}」置顶到推荐流最前（所有用户可见）。确定？` : `取消 #${row.id} 的置顶？`,
    pinned
  )
  if (!ok) return
  pinningId.value = row.id
  try {
    const r = await api.post('/admin_recommend.php', { action: 'pin', id: row.id, pinned })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || '操作成功')
      refresh()
    } else {
      ElMessage.error(r.data.message || '操作失败')
    }
  } catch (e) { ElMessage.error('操作失败') }
  pinningId.value = 0
}

// GLM 自动审核单条
const glmLoadingId = ref(0)
const glmModerate = async (row) => {
  glmLoadingId.value = row.id
  try {
    const r = await api.post('/admin_content.php', { id: row.id }, { params: { action: 'glm_moderate' } })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || 'GLM 审核完成')
      row.moderation_status = r.data.data?.moderation_status
      refresh()
    } else {
      ElMessage.error(r.data.message || 'GLM 审核失败')
    }
  } catch (e) { ElMessage.error('GLM 审核失败') }
  glmLoadingId.value = 0
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

// ==================== 移动端：批量操作（补桌面功能） ====================
const mBatchMode = ref(false)
const mBatchIds = ref(new Set())
const mBatchAll = computed(() => list.value.length > 0 && mBatchIds.value.size === list.value.length)
const toggleMBatch = (id) => { const s = new Set(mBatchIds.value); s.has(id) ? s.delete(id) : s.add(id); mBatchIds.value = s }
const mBatchSelAll = () => { const s = new Set(); if (!mBatchAll.value) list.value.forEach(r => s.add(r.id)); mBatchIds.value = s }
const mBatchOp = async (op) => {
  if (!mBatchIds.value.size) { ElMessage.warning('请先选择内容'); return }
  const ids = [...mBatchIds.value]
  const label = { safe: '审核通过', unsafe: '审核驳回', restore: '恢复', soft_delete: '移入回收站', hard_delete: '彻底删除' }[op]
  const ok = await askConfirm('批量操作', `确定为选中的 ${ids.length} 项执行「${label}」？`, op === 'hard_delete' || op === 'soft_delete')
  if (!ok) return
  try {
    await api.post('/admin_content.php', { ids, op }, { params: { action: 'batch' } })
    ElMessage.success(`${label}完成`)
    mBatchIds.value = new Set()
    refresh()
  } catch (e) { ElMessage.error(`${label}失败`) }
}
</script>

<style scoped>
/* 移动端确认弹层文本（主体样式沿用全局 mobile-cards.css 的 mc-*） */
.mc-confirm-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  word-break: break-all;
}
/* 详情内联小头像（全局 .mc-detail-avatar 是居中大图样式，这里覆盖为行内小圆头像） */
.mc-detail-row .mc-detail-val .mc-detail-avatar {
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  vertical-align: -5px;
  margin-right: 6px;
  margin-bottom: 0;
}
/* 移动端批量勾选框选中态 */
.mc-sel.on { background: #2f6bf0; border-color: #2f6bf0; color: #fff; }
</style>