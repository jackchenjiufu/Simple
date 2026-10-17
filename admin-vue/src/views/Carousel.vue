<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <input v-model="searchKey" class="mc-search" placeholder="搜索标题"
               @keyup.enter="currentPage=1;load()" />
        <div class="mc-fbtn" @click="currentPage=1;load()">搜索</div>
      </div>
      <div class="mc-filters">
        <div class="mc-fbtn" style="flex:1" @click="openForm({})">添加轮播</div>
      </div>

      <div class="mc-list">
        <div v-if="loading" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无内容</div>
        <div v-for="row in list" :key="row.id" class="mc-card" @click="openDetail(row)">
          <div class="mc-card-top">
            <div class="mc-thumb" v-if="row.image_url">
              <img :src="row.image_url" alt="" />
            </div>
            <div class="mc-thumb mc-thumb-empty" v-else>无图</div>
            <div class="mc-card-info">
              <div class="mc-title">{{ row.title || '(无标题)' }}</div>
              <div class="mc-meta">作者：{{ row.author || 'admin' }}</div>
              <div class="mc-data">排序 {{ row.sort_order ?? 0 }} · {{ linkLabel(row.link_type) }}</div>
              <div class="mc-data">ID:{{ row.id }} · {{ fmtTime(row.created_at) }}</div>
            </div>
            <span class="mc-mod" :class="row.is_active == 1 ? 'm-safe' : 'm-unsafe'">{{ row.is_active == 1 ? '启用' : '禁用' }}</span>
          </div>
          <div class="mc-tags">
            <span v-if="row.link_type==='article'||row.link_type==='announcement'" class="mc-tag">ID:{{ row.link_id ?? 0 }}</span>
            <span v-if="row.link_type==='url'||row.link_type==='web'" class="mc-tag mc-tag-link">{{ row.link_url || '无链接' }}</span>
            <span v-if="(row.link_type==='url'||row.link_type==='web') && !row.link_url" class="mc-tag">无跳转地址</span>
          </div>
          <div class="mc-actions" @click.stop>
            <span class="mc-act" @click="openDetail(row)">查看详情</span>
            <span class="mc-act ok" @click="toggleActive(row)">{{ row.is_active == 1 ? '禁用' : '启用' }}</span>
            <span class="mc-act" @click="openForm(row)">编辑</span>
            <span class="mc-act danger" @click="del(row)">删除</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 轮播详情弹层 -->
      <div v-if="showDetail && detail" class="mc-mask" @click.self="showDetail=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>轮播详情</span>
            <span class="mc-close" @click="showDetail=false">✕</span>
          </div>
          <div class="mc-detail-img" v-if="detail.image_url">
            <img :src="detail.image_url" alt="" @click="preview" />
          </div>
          <div class="mc-detail-img mc-detail-img-empty" v-else>无图片</div>
          <div class="mc-detail-row">
            <span class="mc-dl">ID</span>
            <span class="mc-dv">#{{ detail.id }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">标题</span>
            <span class="mc-dv mc-title-text">{{ detail.title || '(无标题)' }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">作者</span>
            <span class="mc-dv">{{ detail.author || 'admin' }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">状态</span>
            <span class="mc-dv"><span class="mc-mod" :class="detail.is_active == 1 ? 'm-safe' : 'm-unsafe'">{{ detail.is_active == 1 ? '启用' : '禁用' }}</span></span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">排序</span>
            <span class="mc-dv">{{ detail.sort_order ?? 0 }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">跳转类型</span>
            <span class="mc-dv">{{ linkLabel(detail.link_type) }}</span>
          </div>
          <div v-if="detail.link_type==='article'||detail.link_type==='announcement'" class="mc-detail-row">
            <span class="mc-dl">关联 {{ detail.link_type==='article'?'文章':'公告' }} ID</span>
            <span class="mc-dv">{{ detail.link_id ?? 0 }}</span>
          </div>
          <div v-if="detail.link_type==='url'||detail.link_type==='web'" class="mc-detail-block">
            <span class="mc-dl">跳转链接</span>
            <a class="mc-dv" :href="detail.link_url" target="_blank">{{ detail.link_url || '（无）' }}</a>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">图片地址</span>
            <span class="mc-dv mc-url">{{ detail.image_url || '（无）' }}</span>
          </div>
          <div class="mc-detail-row">
            <span class="mc-dl">创建时间</span>
            <span class="mc-dv">{{ fmtTime(detail.created_at) }}</span>
          </div>
          <div v-if="detail.updated_at" class="mc-detail-row">
            <span class="mc-dl">更新时间</span>
            <span class="mc-dv">{{ fmtTime(detail.updated_at) }}</span>
          </div>
          <div class="mc-actions" style="margin-top:16px">
            <span class="mc-act ok" @click="toggleActive(detail)">{{ detail.is_active == 1 ? '禁用' : '启用' }}</span>
            <span class="mc-act" @click="showDetail=false;openForm(detail)">编辑</span>
            <span class="mc-act danger" @click="del(detail)">删除</span>
          </div>
        </div>
      </div>

      <!-- 移动端新增/编辑轮播底部弹层 -->
      <div v-if="showForm" class="mc-mask" @click.self="showForm=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>{{ isEdit ? '编辑轮播' : '添加轮播' }}</span>
            <span class="mc-close" @click="showForm=false">✕</span>
          </div>
          <div class="mc-form-row">
            <label>标题</label>
            <input v-model="form.title" placeholder="请输入标题" />
          </div>
          <div class="mc-form-row">
            <label>图片</label>
            <div style="display:flex;align-items:center;gap:10px">
              <el-upload name="image" :action="uploadUrl" :headers="uploadHeaders" :data="uploadData" :http-request="customUpload" :on-success="handleUploadSuccess" :show-file-list="false" accept="image/*">
                <span class="mc-fbtn" style="display:inline-block;height:34px;line-height:34px;padding:0 14px;font-size:13px">上传图片</span>
              </el-upload>
              <img v-if="form.image_url" :src="form.image_url" style="width:52px;height:52px;border-radius:8px;object-fit:cover" alt="" />
            </div>
          </div>
          <div class="mc-form-row">
            <label>作者</label>
            <input v-model="form.author" placeholder="admin" />
          </div>
          <div class="mc-form-row">
            <label>排序</label>
            <input v-model.number="form.sort_order" type="number" min="0" />
          </div>
          <div class="mc-form-row">
            <label>启用</label>
            <label class="mc-switch">
              <input type="checkbox" :checked="form.is_active == 1" @change="form.is_active = $event.target.checked ? 1 : 0" />启用中
            </label>
          </div>
          <div class="mc-form-row">
            <label>点击跳转</label>
            <select v-model="form.link_type" class="mc-select">
              <option value="none">不跳转</option>
              <option value="article">文章详情</option>
              <option value="announcement">公告详情</option>
              <option value="web">网页</option>
              <option value="url">外部链接</option>
            </select>
          </div>
          <div class="mc-form-row" v-if="form.link_type==='article'||form.link_type==='announcement'">
            <label>{{ form.link_type==='article' ? '文章 ID' : '公告 ID' }}</label>
            <input v-model.number="form.link_id" type="number" min="0" />
          </div>
          <div class="mc-form-row" v-if="form.link_type==='url'||form.link_type==='web'">
            <label>链接地址</label>
            <input v-model="form.link_url" placeholder="https://..." />
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
          <div class="mc-del-text">确定删除这条轮播吗？删除后不可恢复。</div>
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
        <h2>轮播管理</h2>
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
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{row}">
            <el-button size="small" @click="openForm(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="del(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row" v-if="total>0">
        <el-pagination
          v-model:current-page="currentPage" :page-size="pageSize" :total="total"
          layout="total, prev, pager, next" small @current-change="load"
        />
      </div>

      <!-- 添加/编辑弹窗（仅桌面；移动端用底部弹层） -->
      <el-dialog v-model="showForm" :title="isEdit?'编辑轮播':'添加轮播'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="图片">
          <el-upload name="image" :action="uploadUrl" :headers="uploadHeaders" :data="uploadData" :http-request="customUpload" :on-success="handleUploadSuccess" :show-file-list="false" accept="image/*">
            <el-button size="small">上传图片</el-button>
          </el-upload>
          <el-image v-if="form.image_url" :src="form.image_url" style="width:160px;height:100px;margin-top:8px;border-radius:4px" fit="cover" />
        </el-form-item>
        <el-form-item label="作者"><el-input v-model="form.author" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.is_active" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="点击跳转">
          <el-select v-model="form.link_type" style="width:160px">
            <el-option label="不跳转" value="none" />
            <el-option label="文章详情" value="article" />
            <el-option label="公告详情" value="announcement" />
            <el-option label="网页" value="web" />
            <el-option label="外部链接" value="url" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.link_type === 'article' || form.link_type === 'announcement'" :label="form.link_type === 'article' ? '文章 ID' : '公告 ID'">
          <el-input-number v-model="form.link_id" :min="0" style="width:160px" />
        </el-form-item>
        <el-form-item v-if="form.link_type === 'url' || form.link_type === 'web'" label="链接地址">
          <el-input v-model="form.link_url" placeholder="https://..." />
        </el-form-item>
      </el-form>
        <template #footer>
          <el-button @click="showForm=false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存</el-button>
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

const list=ref([]),loading=ref(true),showForm=ref(false),saving=ref(false),form=ref({}),isEdit=ref(false)
const searchKey=ref('')
const total=ref(0),currentPage=ref(1),pageSize=ref(10)

const customUpload=async ({file,onSuccess,onError})=>{
  const fd=new FormData()
  fd.append('image',file)
  fd.append('title','carousel')
  fd.append('author','admin')
  try{
    const res=await fetch(uploadUrl,{method:'POST',headers:uploadHeaders,body:fd})
    const j=await res.json().catch(()=>({}))
    if(res.ok && j.code===200 && j.data?.url){ onSuccess(j) }
    else{ const msg=(j && j.message)||'上传失败'; ElMessage.error(msg); onError(new Error(msg)) }
  }catch(e){ ElMessage.error('上传失败：'+(e&&e.message?e.message:'')); onError(e) }
}
const uploadHeaders = {'X-Admin-Token': localStorage.getItem('admin_token') || ''}
const uploadData = {title:'carousel',author:'admin'}
const uploadUrl = "/doo/server/api/upload_image.php"
const handleUploadSuccess=(res)=>{if(res.code===200&&res.data?.url)form.value.image_url=res.data.url}

const linkLabel=(t)=>(
  t==='article'?'文章详情':t==='announcement'?'公告详情':t==='web'?'网页':t==='url'?'外部链接':'不跳转'
)
const fmtTime=(v)=>(v && String(v)!=='0000-00-00 00:00:00') ? String(v).replace('T',' ').slice(0,19) : ''

// 移动端详情弹层
const showDetail=ref(false)
const detail=ref(null)
const openDetail=(row)=>{detail.value={...row};showDetail.value=true}
const closeDetail=()=>{showDetail.value=false}
const preview=()=>{ if(detail.value?.image_url) window.open(detail.value.image_url, '_blank') }

// 移动端启停切换
const toggleActive=async(row)=>{
  if(!row.id){ElMessage.error('参数错误');return}
  try{
    await api.put('/admin_carousels.php',{...row,is_active:row.is_active==1?0:1})
    ElMessage.success('已更新状态')
    if(detail.value && detail.value.id===row.id) closeDetail()
    load()
  }catch(e){ElMessage.error('操作失败')}
}

const load=async()=>{
  loading.value=true
  try{
    const params={page:currentPage.value,limit:pageSize.value}
    if(searchKey.value)params.search=searchKey.value
    const r=await api.get('/admin_carousels.php',{params})
    if(r.data.code===200){
      list.value=r.data.data||[]
      total.value=r.data.total||r.data.data?.length||0
    }
  }catch(e){}
  loading.value=false
}

// 移动端上拉加载
const mLoadingMore=ref(false)
const hasMore=computed(()=>list.value.length<total.value)
const loadMore=async()=>{
  if(mLoadingMore.value||!hasMore.value)return
  mLoadingMore.value=true
  currentPage.value+=1
  try{
    const params={page:currentPage.value,limit:pageSize.value}
    if(searchKey.value)params.search=searchKey.value
    const r=await api.get('/admin_carousels.php',{params})
    if(r.data.code===200){
      const more=r.data.data||[]
      list.value=list.value.concat(more)
      total.value=r.data.total||list.value.length
    }else{
      currentPage.value-=1
    }
  }catch(e){currentPage.value-=1}
  mLoadingMore.value=false
}
const onScroll=()=>{
  const el=document.querySelector('.admin-main')
  if(!el)return
  if(el.scrollTop+el.clientHeight>=el.scrollHeight-40){loadMore()}
}
onMounted(()=>{load();document.addEventListener('scroll',onScroll,true)})
onUnmounted(()=>{document.removeEventListener('scroll',onScroll,true)})

const openForm=(row)=>{
  isEdit.value=!!row.id
  form.value={
    id: row.id || null,
    title: row.title || '',
    author: row.author || '',
    image_url: row.image_url || '',
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active == null ? 1 : Number(row.is_active),
    link_type: row.link_type || 'none',
    link_id: Number(row.link_id) || 0,
    link_url: row.link_url || ''
  }
  showForm.value=true
}
const save=async()=>{
  saving.value=true
  try{
    if(isEdit.value){await api.put('/admin_carousels.php',form.value)}
    else{await api.post('/admin_carousels.php',form.value)}
    ElMessage.success('保存成功');showForm.value=false;load()
  }catch(e){ElMessage.error('保存失败')}
  saving.value=false
}
// 移动端删除：底部确认弹层；桌面端：原居中确认框
const showDel=ref(false)
const delTarget=ref(null)
const doDel=async(row)=>{
  try{await api.delete('/admin_carousels.php',{params:{id:row.id}});ElMessage.success('已删除');closeDetail();load()}catch(e){ElMessage.error('删除失败')}
}
const del=(row)=>{
  if(isMobile.value){delTarget.value=row;showDel.value=true;return}
  ElMessageBox.confirm('确定删除？').then(()=>doDel(row)).catch(()=>{})
}
const confirmDel=()=>{const row=delTarget.value;showDel.value=false;if(row)doDel(row)}
</script>

<style scoped>
/* 移动端详情弹层 */
.mc-sheet { max-height: 78vh; overflow-y: auto; }
.mc-detail-img { width: 100%; height: 180px; border-radius: 10px; overflow: hidden; background: #f2f3f5; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; }
.mc-detail-img img { width: 100%; height: 100%; object-fit: cover; }
.mc-detail-img-empty { color: #bbb; font-size: 13px; }
.mc-detail-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px dashed #f0f2f5; font-size: 14px; }
.mc-detail-block { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; font-size: 14px; }
.mc-dl { flex: 0 0 74px; color: #909399; }
.mc-dv { flex: 1; min-width: 0; color: #1a1a2e; word-break: break-all; }
.mc-title-text { font-weight: 600; }
.mc-url { font-size: 12px; color: #909399; word-break: break-all; }
.mc-tag-link { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* 移动端底部删除确认 */
.mc-del-text { font-size: 14px; color: #333; line-height: 1.7; }
</style>
