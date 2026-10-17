<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="mc-toolbar">
        <input v-model="keyword" class="mc-search" placeholder="搜索用户名/昵称"
               @keyup.enter="load(1)" />
        <div class="mc-fbtn" @click="load(1)">搜索</div>
      </div>

      <!-- 移动端图表区 -->
      <div class="mc-card" style="margin-bottom:10px">
        <div class="mc-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>行为趋势</span>
          <span class="mc-tabs" style="display:flex;gap:4px">
            <span class="mc-tab" :class="{ active: trendDays === 7 }" style="font-size:11px;padding:2px 8px" @click="trendDays=7;loadCharts()">7天</span>
            <span class="mc-tab" :class="{ active: trendDays === 30 }" style="font-size:11px;padding:2px 8px" @click="trendDays=30;loadCharts()">30天</span>
          </span>
        </div>
        <SvgLineChart :labels="trendLabels" :series="trendSeries" />
      </div>
      <div class="mc-card" style="margin-bottom:10px">
        <div class="mc-title">行为类型分布</div>
        <SvgDonutChart :items="typeDistItems" />
      </div>
      <div class="mc-card" style="margin-bottom:10px">
        <div class="mc-title">24 小时活跃分布</div>
        <SvgBarChart :labels="hourLabels" :values="hourValues" />
      </div>

      <div class="mc-list">
        <div v-if="loading && !list.length" class="mc-tip">加载中...</div>
        <div v-else-if="!list.length" class="mc-tip">暂无数据</div>
        <div v-for="row in list" :key="row.user_id" class="mc-card" @click="openDetail(row)">
          <div class="mc-title">{{ row.nickname || '未知用户' }}<template v-if="row.username">（{{ row.username }}）</template></div>
          <div class="mc-meta" style="margin-top:4px">#{{ row.user_id ?? '-' }} · {{ roleLabel(row.role) }} · 活跃 {{ row.active_days ?? 0 }} 天 · 共 {{ row.total ?? 0 }} 次</div>
          <div class="mc-stats">
            <div class="mc-stat-cell"><span class="mc-stat-n">{{ row.clicks ?? 0 }}</span><span class="mc-stat-l">点击</span></div>
            <div class="mc-stat-cell"><span class="mc-stat-n">{{ row.views ?? 0 }}</span><span class="mc-stat-l">浏览</span></div>
            <div class="mc-stat-cell"><span class="mc-stat-n">{{ row.stays ?? 0 }}</span><span class="mc-stat-l">停留</span></div>
            <div class="mc-stat-cell"><span class="mc-stat-n">{{ row.exposures ?? 0 }}</span><span class="mc-stat-l">曝光</span></div>
          </div>
          <div class="mc-data" style="margin-top:8px">偏好：{{ row.top_category || '—' }} · 总时长 {{ fmtSeconds(row.stay_seconds) }}</div>
          <div class="mc-data">最后活跃：{{ row.last_active || '—' }}</div>
          <div class="mc-actions">
            <span class="mc-act" @click.stop="openDetail(row)">查看明细</span>
            <span class="mc-act" @click.stop="viewSimilar(row)">相似用户</span>
          </div>
        </div>
        <div class="mc-more" v-if="mLoadingMore">加载中...</div>
        <div class="mc-more" v-else-if="!hasMore && list.length">没有更多了</div>
        <div class="mc-more" v-else-if="list.length">上拉加载更多</div>
      </div>

      <!-- 相似用户底部弹层（移动端） -->
      <div v-if="showSimilar" class="mc-mask" @click.self="showSimilar=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>「{{ simBaseName }}」的相似用户</span>
            <span class="mc-close" @click="showSimilar=false">✕</span>
          </div>
          <div class="mc-sheet-scroll">
            <div v-if="!similarList.length" class="mc-tip">暂无相似用户</div>
            <div v-for="s in similarList" :key="s.id" class="mc-card" style="margin-bottom:8px">
              <div class="mc-card-top">
                <div class="mc-card-info">
                  <div class="mc-title">{{ s.nickname }}（{{ s.username }}）</div>
                  <div class="mc-meta" style="margin-top:4px">{{ roleLabel(s.role) }} · 行为 {{ s.total }} 次 · 活跃 {{ s.active_days }} 天</div>
                </div>
                <div class="mc-ver-badge" :style="s.similarity > 45 ? 'background:#e8f5e9;color:#2e7d32' : 'background:#fff3e0;color:#e65100'">{{ s.similarity }}%</div>
              </div>
              <div style="height:6px;background:#f0f0f0;border-radius:3px;margin-top:8px;overflow:hidden">
                <div :style="{ width: s.similarity + '%', height: '100%', background: s.similarity > 45 ? '#67c23a' : '#e6a23c' }"></div>
              </div>
            </div>
          </div>
          <button class="mc-save" @click="showSimilar=false">关闭</button>
        </div>
      </div>

      <!-- 明细底部弹层（移动端） -->
      <div v-if="showDetail" class="mc-mask" @click.self="showDetail=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>{{ (curUser?.nickname || curUser?.username) || '用户' }} 行为明细</span>
            <span class="mc-close" @click="showDetail=false">✕</span>
          </div>
          <div class="mc-sheet-scroll">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <select v-model="typeFilter" class="mc-select" style="flex:1" @change="loadDetail(1)">
                <option value="all">全部</option>
                <option value="content_click">点击</option>
                <option value="page_view">浏览</option>
                <option value="page_stay">停留</option>
                <option value="rec_view">曝光</option>
              </select>
              <span class="mc-act danger" style="flex-shrink:0" @click="clearUser">清空行为</span>
            </div>
            <div v-if="detailLoading && !detailItems.length" class="mc-tip">加载中...</div>
            <div v-else-if="!detailItems.length" class="mc-tip">暂无记录</div>
            <div v-for="row in detailItems" :key="row.id" class="mc-card" style="margin-bottom:8px">
              <div class="mc-card-top">
                <div class="mc-thumb" v-if="row.image_url"><img :src="row.image_url" alt="" /></div>
                <div class="mc-thumb" v-else style="font-size:20px">🖼️</div>
                <div class="mc-card-info">
                  <div class="mc-title">{{ row.title || ('内容 #' + (row.content_id ?? '—')) }}</div>
                  <div class="mc-meta" style="margin-top:6px">
                    <span class="mc-type" :class="typeCls(row.type)">{{ typeLabel(row.type) }}</span>
                    <span v-if="contentTypeLabel(row.content_type)">{{ contentTypeLabel(row.content_type) }} · </span>
                    {{ row.category || '未分类' }}
                    <template v-if="row.type === 'page_stay'"> · 停留 {{ row.duration ?? 0 }}s</template>
                  </div>
                  <div class="mc-data">记录 #{{ row.id ?? '-' }} · {{ row.timestamp || '—' }}</div>
                </div>
              </div>
              <div class="mc-actions">
                <span class="mc-act danger" @click="delOne(row)">删除</span>
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
            <span class="mc-act" style="flex:1" :class="{disabled: detailPage<=1}" @click="detailPage>1 && loadDetail(detailPage-1)">上一页</span>
            <span style="font-size:12px;color:#909399;text-align:center">共 {{ detailTotal }} 条</span>
            <span class="mc-act" style="flex:1" :class="{disabled: detailPage*detailLimit>=detailTotal}" @click="detailPage*detailLimit<detailTotal && loadDetail(detailPage+1)">下一页</span>
          </div>
        </div>
      </div>

      <!-- 操作确认底部弹层（移动端） -->
      <div v-if="mConfirm" class="mc-mask" @click.self="mConfirm=null">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>{{ mConfirm.title || '操作确认' }}</span>
            <span class="mc-close" @click="mConfirm=null">✕</span>
          </div>
          <div class="mc-del-text">{{ mConfirm.message }}</div>
          <div class="mc-actions" style="margin-top:16px">
            <span class="mc-act" @click="mConfirm=null">取消</span>
            <span class="mc-act danger" @click="mDoConfirm">确认</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端表格（原有，保留） ==================== -->
    <template v-else>
      <div class="header-row">
        <h2>用户行为分析</h2>
      </div>
      <!-- 图表区 -->
      <el-row :gutter="12" style="margin-bottom:12px">
        <el-col :span="12">
          <el-card shadow="never" style="margin-bottom:12px">
            <template #header><div style="display:flex;justify-content:space-between;align-items:center">
              <span>行为趋势（近 {{ trendDays }} 天）</span>
              <el-radio-group size="small" v-model="trendDays" @change="loadCharts">
                <el-radio-button :value="7">7天</el-radio-button>
                <el-radio-button :value="30">30天</el-radio-button>
              </el-radio-group>
            </div></template>
            <SvgLineChart :labels="trendLabels" :series="trendSeries" />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never" style="margin-bottom:12px">
            <template #header>行为类型分布（近 30 天）</template>
            <SvgDonutChart :items="typeDistItems" />
          </el-card>
        </el-col>
      </el-row>
      <el-card shadow="never" style="margin-bottom:12px">
        <template #header>24 小时活跃分布（近 7 天）</template>
        <SvgBarChart :labels="hourLabels" :values="hourValues" />
      </el-card>
      <!-- 相似用户 -->
      <el-card shadow="never" style="margin-bottom:12px" v-if="similarList.length">
        <template #header>相似用户（行为特征余弦相似度）</template>
        <div style="font-size:12px;color:#999;margin-bottom:8px">点击表格行「明细」可查看该用户的相似用户</div>
        <el-table :data="similarList" size="small" style="width:100%">
          <el-table-column prop="nickname" label="用户" min-width="140">
            <template #default="{row}">{{row.nickname}}（{{row.username}}）</template>
          </el-table-column>
          <el-table-column prop="similarity" label="相似度" width="100">
            <template #default="{row}">
              <el-progress :percentage="row.similarity" :stroke-width="10" :color="row.similarity > 45 ? '#67c23a' : '#e6a23c'" style="width:80px" />
            </template>
          </el-table-column>
          <el-table-column prop="total" label="行为数" width="80" />
          <el-table-column prop="active_days" label="活跃天" width="80" />
          <el-table-column prop="role" label="角色" width="90">
            <template #default="{row}">{{roleLabel(row.role)}}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{row}"><el-button size="small" link type="primary" @click="viewSimilar(row)">查看</el-button></template>
          </el-table-column>
        </el-table>
      </el-card>
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
            <el-button size="small" type="primary" link @click="viewSimilar(row)">相似</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination style="margin-top:12px" layout="total, prev, pager, next" :total="total" :page-size="limit" :current-page="page" @current-change="p => load(p)" />
    </template>

    <!-- 明细弹窗（桌面端专用；移动端在 isMobile 分支内用 mc-sheet 底部弹层） -->
    <el-dialog v-if="!isMobile" v-model="showDetail" :title="(curUser?curUser.nickname:'')+' 行为明细'" width="760px">
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
import {ref, computed, onMounted, onUnmounted} from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'
import SvgLineChart from '@/components/SvgLineChart.vue'
import SvgDonutChart from '@/components/SvgDonutChart.vue'
import SvgBarChart from '@/components/SvgBarChart.vue'

const { isMobile } = useMobile()

const list=ref([]),loading=ref(false),total=ref(0),page=ref(1),limit=ref(20),keyword=ref('')
const showDetail=ref(false),curUser=ref(null),typeFilter=ref('all'),detailItems=ref([]),detailLoading=ref(false),detailTotal=ref(0),detailPage=ref(1),detailLimit=ref(30)
const typeLabel=(t)=>({content_click:'点击',page_view:'浏览',page_stay:'停留',rec_view:'曝光'}[t]||t||'未知')
const typeCls=(t)=>({content_click:'t-click',page_view:'t-view',page_stay:'t-stay',rec_view:'t-expo'}[t]||'t-other')
const contentTypeLabel=(t)=>({image:'图片',video:'视频',article:'文章'}[t]||(t?t:''))
const fmtSeconds=(s)=>{s=Number(s)||0;if(s>=3600)return (s/3600).toFixed(1)+'h';if(s>=60)return Math.round(s/60)+'m';return s+'s'}
const roleLabel=(r)=>r==='super_admin'?'超管':r==='admin'?'管理员':'普通用户'
// ── 图表数据 ──
const trendDays = ref(30)
const trendLabels = ref([])
const trendSeries = ref([])
const typeDistItems = ref([])
const hourValues = ref([])
const hourLabels = ['0','2','4','6','8','10','12','14','16','18','20','22']
const similarList = ref([])
const TYPE_COLORS = { page_view: '#2f6bf0', rec_view: '#f59e0b', content_click: '#10b981', page_stay: '#8b5cf6' }
const TYPE_LABELS = { page_view: '浏览', rec_view: '曝光', content_click: '点击', page_stay: '停留' }
const loadCharts = async () => {
  try {
    const [tr, hr, td, sm] = await Promise.allSettled([
      api.get('/admin_behaviors.php', { params: { action: 'trend', days: trendDays.value } }),
      api.get('/admin_behaviors.php', { params: { action: 'hourly', days: 7 } }),
      api.get('/admin_behaviors.php', { params: { action: 'type_dist', days: 30 } }),
      api.get('/admin_behaviors.php', { params: { action: 'similar', user_id: similarBaseId.value || 0 } })
    ])
    if (tr.status === 'fulfilled' && tr.value.data.code === 200) {
      const d = tr.value.data.data
      trendLabels.value = (d.dates || []).map(x => x.slice(5))
      trendSeries.value = (d.types || []).map(t => ({
        name: t, color: TYPE_COLORS[t] || '#999',
        points: (d.dates || []).map(dt => (d.series[dt] && d.series[dt][t]) || 0)
      })).filter(s => s.points.some(v => v > 0))
    }
    if (hr.status === 'fulfilled' && hr.value.data.code === 200) {
      const h = hr.value.data.data.hours || []
      hourValues.value = hourLabels.map((_, i) => h[i * 2] + (h[i * 2 + 1] || 0))
    }
    if (td.status === 'fulfilled' && td.value.data.code === 200) {
      typeDistItems.value = (td.value.data.data || []).map(x => ({
        label: TYPE_LABELS[x.type] || x.type, value: Number(x.c), color: TYPE_COLORS[x.type] || '#999'
      })).filter(x => x.value > 0)
    }
    if (sm.status === 'fulfilled' && sm.value.data.code === 200) {
      similarList.value = sm.value.data.data.similar || []
    }
  } catch (e) {}
}
const similarBaseId = ref(0)
const showSimilar = ref(false)
const simBaseName = ref('')
const viewSimilar = async (row) => {
  similarBaseId.value = row.id
  simBaseName.value = row.nickname || row.username || ('#' + row.id)
  try {
    const r = await api.get('/admin_behaviors.php', { params: { action: 'similar', user_id: row.id, top: 5 } })
    if (r.data.code === 200) similarList.value = r.data.data.similar || []
    if (isMobile.value) showSimilar.value = true
  } catch (e) {}
}
const firstChar=(s)=>{if(!s)return '?';return String(s).trim().charAt(0).toUpperCase()}
const load=async(p)=>{loading.value=true;page.value=p;try{const r=await api.get('/admin_behaviors.php',{params:{action:'list',page:p,limit:limit.value,keyword:keyword.value}});if(r.data.code===200){list.value=r.data.data.items||[];total.value=r.data.data.total||0}}catch(e){}loading.value=false}
const openDetail=(row)=>{curUser.value=row;typeFilter.value='all';detailItems.value=[];detailPage.value=1;showDetail.value=true;loadDetail(1)}
const loadDetail=async(p)=>{if(!curUser.value)return;detailLoading.value=true;detailPage.value=p;try{const r=await api.get('/admin_behaviors.php',{params:{action:'detail',user_id:curUser.value.user_id,page:p,limit:detailLimit.value,type:typeFilter.value}});if(r.data.code===200){detailItems.value=r.data.data.items||[];detailTotal.value=r.data.data.total||0}}catch(e){}detailLoading.value=false}
const doDelOne=async(row)=>{try{await api.post('/admin_behaviors.php',{action:'delete',id:row.id});ElMessage.success('已删除');loadDetail(detailPage.value)}catch(e){ElMessage.error('删除失败')}}
const delOne=(row)=>{
  if(isMobile.value){mAsk('确定删除该条记录？',()=>doDelOne(row),'删除记录');return}
  ElMessageBox.confirm('确定删除该条记录？').then(()=>doDelOne(row)).catch(()=>{})
}
const doClearUser=async()=>{try{await api.post('/admin_behaviors.php',{action:'clear_user',user_id:curUser.value.user_id});ElMessage.success('已清空');showDetail.value=false;load(1)}catch(e){ElMessage.error('清空失败')}}
const clearUser=()=>{
  const msg=`确定清空「${curUser.value?.nickname||''}」的全部行为？不可恢复`
  if(isMobile.value){mAsk(msg,doClearUser,'清空用户行为');return}
  ElMessageBox.confirm(msg,'警告',{type:'warning'}).then(doClearUser).catch(()=>{})
}

// 移动端操作确认：底部弹层（mc-mask + mc-sheet）；桌面端仍用 ElMessageBox
const mConfirm=ref(null)
const mAsk=(message,onOk,title='操作确认')=>{mConfirm.value={title,message,onOk}}
const mDoConfirm=async()=>{
  const c=mConfirm.value
  mConfirm.value=null
  if(c&&typeof c.onOk==='function'){try{await c.onOk()}catch(e){/* 由调用方处理 */}}
}

// 移动端上拉加载
const mLoadingMore=ref(false)
const hasMore=computed(()=>list.value.length<total.value)
const loadMore=async()=>{
  if(mLoadingMore.value||!hasMore.value)return
  mLoadingMore.value=true
  const next=page.value+1
  try{
    const r=await api.get('/admin_behaviors.php',{params:{action:'list',page:next,limit:limit.value,keyword:keyword.value}})
    if(r.data.code===200){
      const more=r.data.data.items||[]
      list.value=list.value.concat(more)
      total.value=r.data.data.total||0
      page.value=next
    }
  }catch(e){}
  mLoadingMore.value=false
}
// 滚动到底部自动加载（移动端滚动容器 .admin-main）
const onScroll=()=>{
  const el=document.querySelector('.admin-main')
  if(!el)return
  if(el.scrollTop+el.clientHeight>=el.scrollHeight-40)loadMore()
}
onMounted(()=>{load(1);loadCharts();document.addEventListener('scroll',onScroll,true)})
onUnmounted(()=>{document.removeEventListener('scroll',onScroll,true)})
</script>

<style scoped>
/* 移动端底部弹层：内容超高时内部滚动 */
.mc-sheet-scroll { max-height: 62vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
/* 移动端确认文案 */
.mc-del-text { font-size: 14px; color: #555; line-height: 1.7; word-break: break-all; }
/* 移动端分页不可用态 */
.mc-act.disabled { opacity: .45; pointer-events: none; }
/* 用户行为计数 2×2 宫格：避免长行在小屏换行错乱 */
.mc-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 10px; }
.mc-stat-cell { background: #f7f8fa; border-radius: 8px; padding: 7px 10px; display: flex; flex-direction: column; }
.mc-stat-n { font-size: 16px; font-weight: 700; color: #222a47; line-height: 1.3; }
.mc-stat-l { font-size: 11px; color: #909399; margin-top: 1px; }
/* 明细：行为类型彩色标签 */
.mc-type { display: inline-block; font-size: 11px; border-radius: 10px; padding: 2px 9px; margin-right: 6px; font-weight: 600; }
.mc-type.t-click { background: #eef4ff; color: #2f6bf0; }
.mc-type.t-view { background: #e8f7ef; color: #00a862; }
.mc-type.t-stay { background: #fff7e6; color: #f59e0b; }
.mc-type.t-expo { background: #f2edff; color: #7c5cf0; }
.mc-type.t-other { background: #f2f4f7; color: #5a6475; }
</style>
