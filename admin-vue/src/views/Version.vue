<template>
  <div>
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
              <el-tag :type="row.update_type==='apk'?'danger':'success'" size="small">
                {{ row.update_type==='apk' ? 'APK 全量' : 'WGT 热更新' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="下载" width="180">
            <template #default="{row}">
              <el-button v-if="row.downloadUrl" size="small" link type="primary" @click="handleDownload(row.downloadUrl)">{{ row.update_type==='apk'?'下载 APK':'下载文件' }}</el-button>
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
            <el-form-item :label="apkForm.update_type==='apk'?'APK 文件':'文件（可选）'">
              <input ref="apkFileInput" type="file" :accept="apkForm.update_type==='apk'?'.apk':'.apk,.wgt'" @change="e => apkFile = e.target.files[0]" />
              <div style="font-size:12px;color:#999;margin-top:4px">
                {{ apkForm.update_type==='apk' ? '上传 APK 文件到 downloads/' : '上传对应文件，文件名建议：app_wgt_v'+apkForm.version.replace(/\\./g,'_')+'.wgt' }}
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

const activeTab = ref('apk')

// ---- APK 相关 ----
const apkList = ref([]), loadingApk = ref(true)
const showApkUpload = ref(false), uploadingApk = ref(false)
const apkForm = ref({ version: '', description: '', update_type: 'wgt' })
const apkFile = ref(null)
const apkFileInput = ref(null)

const loadApk = async () => {
  loadingApk.value = true
  try {
    const r = await api.get('/get_versions.php')
    if (r.data.code === 200) apkList.value = r.data.data || []
  } catch (e) { /* ignore */ }
  loadingApk.value = false
}

const uploadApk = async () => {
  if (!apkForm.value.version) { ElMessage.warning('请输入版本号'); return }
  if (!apkFile.value) { ElMessage.warning('请选择 APK 文件'); return }
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

// ---- WGT 相关 ----
const wgtList = ref([]), loadingWgt = ref(true)
const showWgtUpload = ref(false), uploadingWgt = ref(false)
const wgtFile = ref(null)
const wgtFileInput = ref(null)

const loadWgt = async () => {
  loadingWgt.value = true
  try {
    const r = await api.get('/wgt_manager.php')
    if (r.data.code === 200) wgtList.value = r.data.data || []
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

const handleDownload = (url) => window.open(url, '_blank')

onMounted(() => { loadApk(); loadWgt() })
</script>

<style scoped>
.header-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
</style>
