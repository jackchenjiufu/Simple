<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <div class="header-row" style="margin-bottom:10px">
        <h2 style="margin:0;font-size:18px">版本管理</h2>
      </div>

      <div class="mc-tabs">
        <div v-for="t in tabs" :key="t.value" class="mc-tab"
             :class="{ active: activeTab === t.value }" @click="switchTab(t.value)">
          {{ t.label }}
        </div>
      </div>

      <!-- ==================== APK 版本（移动端） ==================== -->
      <div v-if="activeTab === 'apk'">
        <!-- 上传按钮独立整行，不与其他控件挤在一起 -->
        <div class="mc-uprow">
          <div class="mc-fbtn mc-upbtn" @click="showApkUpload=true">＋ 上传新版本</div>
        </div>
        <div class="mc-list">
          <div v-if="loadingApk" class="mc-tip">加载中...</div>
          <div v-else-if="!mApkList.length" class="mc-tip">暂无版本记录</div>
          <div v-for="row in mApkList" :key="row.id" class="mc-card">
            <div class="mc-card-top">
              <span class="mc-ver-pill" :class="row.type === 'apk' ? 'pill-apk' : 'pill-wgt'">{{ row.type === 'apk' ? 'APK' : 'WGT' }}</span>
              <div class="mc-card-info">
                <div class="mc-title">v{{ row.version || '--' }}</div>
                <div class="mc-meta">{{ row.type === 'apk' ? 'APK 全量包' : 'WGT 热更新' }} · {{ row.createTime || row.created_at || '--' }}</div>
                <div class="mc-data">{{ row.description || '暂无更新说明' }}</div>
              </div>
            </div>
            <div class="mc-actions">
              <span v-if="row.downloadUrl" class="mc-act ok" @click="handleDownload(row.downloadUrl)">
                {{ row.type === 'apk' ? '下载 APK' : '下载文件' }}
              </span>
              <span v-if="!row.downloadUrl" class="mc-act" style="background:#f4f4f5;color:#aaa">无文件</span>
              <span class="mc-act danger" @click="deleteApkMobile(row)">删除</span>
            </div>
          </div>
          <div class="mc-more" v-if="mLoadingMore">加载中...</div>
          <div class="mc-more" v-else-if="!hasMoreApk && mApkList.length">没有更多了</div>
          <div class="mc-more" v-else-if="mApkList.length">上拉加载更多</div>
        </div>
      </div>

      <!-- ==================== WGT 热更新（移动端） ==================== -->
      <div v-else>
        <!-- 上传按钮独立整行，不与其他控件挤在一起 -->
        <div class="mc-uprow">
          <div class="mc-fbtn mc-upbtn" @click="showWgtUpload=true">＋ 上传 WGT 热更新包</div>
        </div>
        <div class="mc-list">
          <div v-if="loadingWgt" class="mc-tip">加载中...</div>
          <div v-else-if="!mWgtList.length" class="mc-tip">暂无 WGT 文件</div>
          <div v-for="row in mWgtList" :key="row.name" class="mc-card">
            <div class="mc-card-top">
              <span class="mc-ver-pill pill-wgt">WGT</span>
              <div class="mc-card-info">
                <div class="mc-title" style="font-family:monospace">{{ row.name || '--' }}</div>
                <div class="mc-meta">{{ (row.size_mb ?? 0) }} MB · {{ row.mtime || '--' }}</div>
              </div>
            </div>
            <div class="mc-actions">
              <span class="mc-act ok" @click="handleDownload(row.url)">下载</span>
              <span class="mc-act danger" @click="deleteWgtMobile(row)">删除</span>
            </div>
          </div>
          <div class="mc-more" v-if="mLoadingMore">加载中...</div>
          <div class="mc-more" v-else-if="!hasMoreWgt && mWgtList.length">没有更多了</div>
          <div class="mc-more" v-else-if="mWgtList.length">上拉加载更多</div>
        </div>
      </div>

      <!-- APK/WGT 上传底部弹层（移动端） -->
      <div v-if="showApkUpload" class="mc-mask" @click.self="showApkUpload=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>发布新版本</span>
            <span class="mc-close" @click="showApkUpload=false">✕</span>
          </div>
          <div class="mc-sheet-scroll">
            <div class="mc-form-row">
              <label>版本号 *</label>
              <input v-model="apkForm.version" placeholder="例如 2.5.0" />
              <div style="font-size:12px;color:#999">格式：X.X.X</div>
            </div>
            <div class="mc-form-row">
              <label>更新类型 *</label>
              <el-radio-group v-model="apkForm.update_type">
                <el-radio value="wgt">WGT 热更新（静默安装，用户无感）</el-radio>
                <el-radio value="apk">APK 全量包（系统安装器弹窗，适合大版本）</el-radio>
              </el-radio-group>
            </div>
            <div class="mc-form-row">
              <label>更新说明</label>
              <textarea v-model="apkForm.description" rows="3" placeholder="请输入更新内容"></textarea>
            </div>
            <div class="mc-form-row">
              <label>{{ apkForm.update_type==='apk' ? 'APK 文件' : 'WGT 文件' }} *</label>
              <input ref="apkFileInput" type="file" :accept="apkForm.update_type==='apk'?'.apk':'.wgt'" @change="e => apkFile = e.target.files[0]" />
              <div style="font-size:12px;color:#999">
                {{ apkForm.update_type==='apk' ? '上传 APK 文件到 downloads/' : '文件名建议：app_wgt_v'+(apkForm.version||'').replace(/\./g,'_')+'.wgt' }}
              </div>
            </div>
          </div>
          <div class="mc-actions" style="margin-top:14px">
            <span class="mc-act" @click="showApkUpload=false">取消</span>
            <span class="mc-act ok" :class="{ 'is-loading': uploadingApk }" @click="uploadApk">{{ uploadingApk ? '上传中...' : '上传' }}</span>
          </div>
        </div>
      </div>

      <!-- WGT 上传底部弹层（移动端） -->
      <div v-if="showWgtUpload" class="mc-mask" @click.self="showWgtUpload=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>上传 WGT 热更新包</span>
            <span class="mc-close" @click="showWgtUpload=false">✕</span>
          </div>
          <div class="mc-form-row">
            <label>WGT 文件 *</label>
            <input ref="wgtFileInput" type="file" accept=".wgt" @change="e => wgtFile = e.target.files[0]" />
          </div>
          <div class="mc-form-row">
            <label>文件名约定</label>
            <span style="font-size:12px;color:#999">推荐命名：<code>app_wgt_v2_5_0.wgt</code>（版本号用下划线）</span>
          </div>
          <div class="mc-actions" style="margin-top:14px">
            <span class="mc-act" @click="showWgtUpload=false">取消</span>
            <span class="mc-act ok" :class="{ 'is-loading': uploadingWgt }" @click="uploadWgt">{{ uploadingWgt ? '上传中...' : '上传' }}</span>
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
        <h2 style="margin:0">版本管理</h2>
      </div>

      <el-tabs v-model="activeTab" style="margin-top:12px">
        <!-- ==================== APK 版本 ==================== -->
        <el-tab-pane label="APK 版本" name="apk">
          <div class="header-row" style="margin-bottom:12px">
            <span style="color:#909399;font-size:13px">全量包更新</span>
            <el-button type="primary" size="small" @click="showApkUpload=true">上传新版本</el-button>
          </div>
          <el-table :data="apkList" stripe v-loading="loadingApk" empty-text="暂无版本记录">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="版本号" width="100">
              <template #default="{row}"><el-tag>v{{ row.version }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="description" label="更新说明" min-width="260" show-overflow-tooltip />
            <el-table-column label="类型" width="100">
              <template #default="{row}">
                <el-tag :type="row.type==='apk'?'danger':'success'" size="small">
                  {{ row.type==='apk' ? 'APK 全量' : 'WGT 热更新' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="下载" width="180">
              <template #default="{row}">
                <el-button v-if="row.downloadUrl" size="small" link type="primary" @click="handleDownload(row.downloadUrl)">{{ row.type==='apk'?'下载 APK':'下载文件' }}</el-button>
                <span v-else style="color:#999">无文件</span>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="发布时间" width="150" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{row}">
                <el-popconfirm title="确认删除此版本？" @confirm="deleteApk(row)">
                  <template #reference><el-button size="small" type="danger">删除</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <!-- APK 上传弹窗 -->
          <el-dialog v-model="showApkUpload" title="发布新版本" width="460px">
            <el-form :model="apkForm" label-width="80px">
              <el-form-item label="版本号" required>
                <el-input v-model="apkForm.version" placeholder="例如 2.5.0" />
                <div style="font-size:12px;color:#999;margin-top:4px">格式：X.X.X</div>
              </el-form-item>
              <el-form-item label="更新类型" required>
                <el-radio-group v-model="apkForm.update_type">
                  <el-radio value="wgt">
                    <span style="font-weight:500">WGT 热更新</span>
                    <span style="font-size:12px;color:#909399;margin-left:4px">静默安装，用户无感</span>
                  </el-radio>
                  <div style="margin-top:8px" />
                  <el-radio value="apk">
                    <span style="font-weight:500">APK 全量包</span>
                    <span style="font-size:12px;color:#909399;margin-left:4px">系统安装器弹窗，适合大版本</span>
                  </el-radio>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="更新说明">
                <el-input v-model="apkForm.description" type="textarea" :rows="4" placeholder="请输入更新内容" />
              </el-form-item>
              <el-form-item :label="apkForm.update_type==='apk'?'APK 文件':'WGT 文件'">
                <input ref="apkFileInput" type="file" :accept="apkForm.update_type==='apk'?'.apk':'.wgt'" @change="e => apkFile = e.target.files[0]" />
                <div style="font-size:12px;color:#999;margin-top:4px">
                  {{ apkForm.update_type==='apk' ? '上传 APK 文件到 downloads/' : '上传对应文件，文件名建议：app_wgt_v'+apkForm.version.replace(/\./g,'_')+'.wgt' }}
                </div>
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="showApkUpload=false">取消</el-button>
              <el-button type="primary" :loading="uploadingApk" @click="uploadApk">{{ uploadingApk ? '上传中...' : '上传' }}</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>

        <!-- ==================== WGT 热更新 ==================== -->
        <el-tab-pane label="WGT 热更新" name="wgt">
          <div class="header-row" style="margin-bottom:12px">
            <span style="color:#909399;font-size:13px">热更新包（.wgt），App 启动时自动检测下载 → 静默安装 → 重启生效（App.vue 已实现）</span>
            <el-button type="primary" size="small" @click="showWgtUpload=true">上传 WGT</el-button>
          </div>
          <div v-if="wgtStats" style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:140px;background:#f0f9ff;border:1px solid #bae0fd;border-radius:8px;padding:12px 16px">
              <div style="font-size:24px;font-weight:700;color:#0b6bcb">{{ wgtStats.total }}</div>
              <div style="font-size:12px;color:#666">安装上报总数</div>
            </div>
            <div style="flex:1;min-width:140px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px">
              <div style="font-size:24px;font-weight:700;color:#16a34a">{{ wgtStats.ok }}</div>
              <div style="font-size:12px;color:#666">静默安装成功</div>
            </div>
            <div style="flex:1;min-width:140px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px">
              <div style="font-size:24px;font-weight:700;color:#dc2626">{{ wgtStats.fail }}</div>
              <div style="font-size:12px;color:#666">安装失败</div>
            </div>
            <div style="flex:1;min-width:140px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:12px 16px">
              <div style="font-size:24px;font-weight:700;color:#7c3aed">{{ wgtStats.devices }}</div>
              <div style="font-size:12px;color:#666">覆盖设备数</div>
            </div>
          </div>
          <div v-if="wgtStats && wgtStats.per_wgt && wgtStats.per_wgt.length" style="margin-bottom:12px;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:8px 12px">
            <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:6px">按包统计</div>
            <div v-for="w in wgtStats.per_wgt" :key="w.wgt_name" style="display:flex;gap:10px;align-items:center;font-size:12px;color:#666;padding:5px 0;border-bottom:1px dashed #f0f0f0;flex-wrap:wrap">
              <span style="font-family:monospace;min-width:220px">{{ w.wgt_name }}</span>
              <el-tag size="small" type="info">共 {{ w.total }}</el-tag>
              <el-tag size="small" type="success">成功 {{ w.ok }}</el-tag>
              <el-tag size="small" type="danger">失败 {{ w.fail }}</el-tag>
              <el-tag size="small">设备 {{ w.devices }}</el-tag>
              <span style="margin-left:auto;font-weight:600">{{ w.total > 0 ? Math.round(w.ok / w.total * 100) : 0 }}%</span>
            </div>
          </div>
          <div v-if="wgtStats && wgtStats.recent && wgtStats.recent.length" style="margin-bottom:12px;background:#fafafa;border:1px solid #eee;border-radius:8px;padding:8px 12px">
            <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:6px">最近安装记录（{{ wgtStats.recent.length }}）</div>
            <div v-for="rec in wgtStats.recent.slice(0,10)" :key="rec.id" style="font-size:12px;color:#666;padding:5px 0;border-bottom:1px dashed #f0f0f0">
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <el-tag size="small" :type="rec.status === 'ok' ? 'success' : 'danger'">{{ rec.status === 'ok' ? '成功' : '失败' }}</el-tag>
                <span style="font-family:monospace">{{ rec.wgt_name }}</span>
                <span>{{ rec.model }} <template v-if="rec.sys_version">· {{ rec.sys_version }}</template></span>
                <el-tag size="small" type="info" v-if="rec.version">App {{ rec.version }}</el-tag>
                <span style="margin-left:auto">{{ rec.created_at }}</span>
              </div>
              <div v-if="rec.status === 'fail' && rec.message" style="color:#dc2626;margin-top:2px;font-family:monospace;font-size:11px;word-break:break-all">原因: {{ rec.message }}</div>
            </div>
          </div>
          <el-table :data="wgtList" stripe v-loading="loadingWgt" empty-text="暂无 WGT 文件">
            <el-table-column prop="name" label="文件名" min-width="300">
              <template #default="{row}">
                <el-tag type="success" size="small">WGT</el-tag>
                <span style="margin-left:8px;font-family:monospace;font-size:13px">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="大小" width="100">
              <template #default="{row}">{{ row.size_mb }} MB</template>
            </el-table-column>
            <el-table-column prop="mtime" label="上传时间" width="170" />
            <el-table-column label="下载" width="100">
              <template #default="{row}">
                <el-button size="small" link type="primary" @click="handleDownload(row.url)">下载</el-button>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{row}">
                <el-popconfirm title="确认删除此 WGT 文件？" @confirm="deleteWgt(row)">
                  <template #reference><el-button size="small" type="danger">删除</el-button></template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <!-- WGT 上传弹窗 -->
          <el-dialog v-model="showWgtUpload" title="上传 WGT 热更新包" width="460px">
            <el-form label-width="80px">
              <el-form-item label="WGT 文件" required>
                <input ref="wgtFileInput" type="file" accept=".wgt" @change="e => wgtFile = e.target.files[0]" />
              </el-form-item>
              <el-form-item label="文件名约定">
                <span style="font-size:12px;color:#999">推荐命名：<code>app_wgt_v2_5_0.wgt</code>（版本号用下划线）</span>
              </el-form-item>
            </el-form>
            <template #footer>
              <el-button @click="showWgtUpload=false">取消</el-button>
              <el-button type="primary" :loading="uploadingWgt" @click="uploadWgt">{{ uploadingWgt ? '上传中...' : '上传' }}</el-button>
            </template>
          </el-dialog>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const activeTab = ref('apk')
const tabs = [
  { value: 'apk', label: 'APK 版本' },
  { value: 'wgt', label: 'WGT 热更新' }
]
const mobilePageSize = 12

// ---- APK 相关 ----
const apkList = ref([]), loadingApk = ref(true)
const showApkUpload = ref(false), uploadingApk = ref(false)
const apkForm = ref({ version: '', description: '', update_type: 'wgt' })
const apkFile = ref(null)
const apkFileInput = ref(null)

// ---- WGT 相关 ----
const wgtList = ref([]), loadingWgt = ref(true)
const wgtStats = ref(null)
const showWgtUpload = ref(false), uploadingWgt = ref(false)
const wgtFile = ref(null)
const wgtFileInput = ref(null)

// ---- 移动端分页显示（客户端切片，接口不做分页则安全降级） ----
const mApkList = ref([])
const mWgtList = ref([])
const apkPage = ref(1)
const wgtPage = ref(1)

const hasMoreApk = computed(() => mApkList.value.length < apkList.value.length)
const hasMoreWgt = computed(() => mWgtList.value.length < wgtList.value.length)

const sliceApk = () => { apkPage.value = 1; mApkList.value = apkList.value.slice(0, mobilePageSize) }
const sliceWgt = () => { wgtPage.value = 1; mWgtList.value = wgtList.value.slice(0, mobilePageSize) }

const switchTab = (t) => {
  activeTab.value = t
  if (t === 'apk') sliceApk()
  else sliceWgt()
}

const mLoadingMore = ref(false)
const loadMore = async () => {
  if (mLoadingMore.value) return
  if (activeTab.value === 'apk') {
    if (!hasMoreApk.value) return
    mLoadingMore.value = true
    apkPage.value += 1
    mApkList.value = mApkList.value.concat(apkList.value.slice((apkPage.value - 1) * mobilePageSize, apkPage.value * mobilePageSize))
    mLoadingMore.value = false
  } else {
    if (!hasMoreWgt.value) return
    mLoadingMore.value = true
    wgtPage.value += 1
    mWgtList.value = mWgtList.value.concat(wgtList.value.slice((wgtPage.value - 1) * mobilePageSize, wgtPage.value * mobilePageSize))
    mLoadingMore.value = false
  }
}

// 滚动到底部自动加载（移动端滚动容器是 el-main 外层，绑定到 document 捕获）
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadMore()
}
onMounted(() => { loadApk(); loadWgt(); document.addEventListener('scroll', onScroll, true) })
onUnmounted(() => { document.removeEventListener('scroll', onScroll, true) })

const loadApk = async () => {
  loadingApk.value = true
  try {
    const r = await api.get('/get_versions.php')
    if (r.data.code === 200) { apkList.value = r.data.data || []; sliceApk() }
  } catch (e) { /* ignore */ }
  loadingApk.value = false
}

const uploadApk = async () => {
  if (!apkForm.value.version) { ElMessage.warning('请输入版本号'); return }
  if (!apkFile.value) { ElMessage.warning(apkForm.value.update_type === 'apk' ? '请选择 APK 文件' : '请选择 WGT 文件'); return }
  uploadingApk.value = true
  try {
    const fd = new FormData()
    fd.append('version', apkForm.value.version)
    fd.append('description', apkForm.value.description)
    fd.append('update_type', apkForm.value.update_type)
    fd.append('apk_file', apkFile.value)
    const r = await api.post('/upload_version.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (r.data.code === 200) {
      ElMessage.success('上传成功')
      showApkUpload.value = false
      apkForm.value = { version: '', description: '', update_type: 'wgt' }
      apkFile.value = null
      loadApk()
    } else { ElMessage.error(r.data.message || '上传失败') }
  } catch (e) { ElMessage.error('上传失败') }
  uploadingApk.value = false
}

const deleteApk = async (row) => {
  try {
    const r = await api.post('/delete_version.php', { id: row.id })
    if (r.data.code === 200) { ElMessage.success('已删除'); loadApk() }
    else ElMessage.error(r.data.message)
  } catch (e) { ElMessage.error('删除失败') }
}

const deleteApkMobile = async (row) => {
  // 移动端：底部确认弹层；桌面端：原居中确认框
  if (isMobile.value) { mAsk(`确认删除 v${row.version || ''}（#${row.id}）？删除后不可恢复。`, () => deleteApk(row), '删除版本'); return }
  try { await ElMessageBox.confirm(`确认删除 v${row.version}（#${row.id}）？`, '删除版本', { type: 'warning' }) } catch (e) { return }
  deleteApk(row)
}

const loadWgt = async () => {
  loadingWgt.value = true
  try {
    const r = await api.get('/wgt_manager.php')
    if (r.data.code === 200) { wgtList.value = r.data.data || []; wgtStats.value = r.data.stats || null; sliceWgt() }
  } catch (e) { /* ignore */ }
  loadingWgt.value = false
}

const uploadWgt = async () => {
  if (!wgtFile.value) { ElMessage.warning('请选择 WGT 文件'); return }
  uploadingWgt.value = true
  try {
    const fd = new FormData()
    fd.append('file', wgtFile.value)
    const r = await api.post('/wgt_manager.php', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (r.data.code === 200) {
      ElMessage.success('上传成功')
      showWgtUpload.value = false
      wgtFile.value = null
      loadWgt()
    } else { ElMessage.error(r.data.message || '上传失败') }
  } catch (e) { ElMessage.error('上传失败') }
  uploadingWgt.value = false
}

const deleteWgt = async (row) => {
  try {
    const r = await api.delete('/wgt_manager.php', { data: { name: row.name } })
    if (r.data.code === 200) { ElMessage.success('已删除'); loadWgt() }
    else ElMessage.error(r.data.message)
  } catch (e) { ElMessage.error('删除失败') }
}

const deleteWgtMobile = async (row) => {
  // 移动端：底部确认弹层；桌面端：原居中确认框
  if (isMobile.value) { mAsk(`确认删除 ${row.name || ''}？删除后不可恢复。`, () => deleteWgt(row), '删除 WGT'); return }
  try { await ElMessageBox.confirm(`确认删除 ${row.name}？`, '删除 WGT', { type: 'warning' }) } catch (e) { return }
  deleteWgt(row)
}

// 移动端操作确认：底部弹层（mc-mask + mc-sheet）；桌面端仍用 ElMessageBox
const mConfirm = ref(null)
const mAsk = (message, onOk, title = '操作确认') => { mConfirm.value = { title, message, onOk } }
const mDoConfirm = async () => {
  const c = mConfirm.value
  mConfirm.value = null
  if (c && typeof c.onOk === 'function') { try { await c.onOk() } catch (e) { /* 由调用方处理 */ } }
}

const handleDownload = (url) => window.open(url, '_blank')
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
/* 上传按钮独立整行（移动端）：不与筛选/说明挤在同一行 */
.mc-uprow { margin: 0 12px 10px; }
.mc-upbtn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 46px;
  line-height: 46px;
  padding: 0;
  font-size: 15px;
  font-weight: 600;
  box-sizing: border-box;
  box-shadow: 0 2px 10px rgba(47, 107, 240, .25);
}
/* 版本类型小胶囊（替代无意义的缩略图与伪审核角标） */
.mc-ver-pill {
  flex-shrink: 0;
  align-self: center;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  padding: 6px 12px;
}
.pill-apk { background: #fdeef0; color: #ef4444; }
.pill-wgt { background: #eef4ff; color: #2f6bf0; }
/* 移动端底部弹层：内容超高时内部滚动 */
.mc-sheet-scroll { max-height: 62vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
/* 移动端确认文案 */
.mc-del-text { font-size: 14px; color: #555; line-height: 1.7; word-break: break-all; }
/* 上传表单 textarea 与原生控件样式对齐 */
.mc-form-row textarea {
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  resize: none;
  font-family: inherit;
}
/* 上传中不可重复点击 */
.mc-act.is-loading { opacity: .6; pointer-events: none; }
</style>
