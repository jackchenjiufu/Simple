<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <!-- 移动端：API 版本状态卡（当前生效版本角标 + 点击弹底部切换层） -->
      <div class="mc-card mc-ver-card" @click="openVerSheet">
        <div class="mc-card-top">
          <div class="mc-thumb mc-ver-thumb">版</div>
          <div class="mc-card-info">
            <div class="mc-title">API 版本状态</div>
            <div class="mc-meta">当前生效
              <span class="mc-mod" :class="curVerSafe ? 'm-safe' : 'm-pending'">{{ curVerLabel }}</span>
            </div>
            <div class="mc-data">App 端启动时自动跟随，无需发版</div>
          </div>
          <span class="mc-ver-badge" :class="curVerSafe ? 'badge-v2' : 'badge-v1'">{{ curVerSafe ? apiVer.toUpperCase() : 'V1' }}</span>
        </div>
        <div class="mc-ver-stats">
          <div class="mc-ver-stat"><span class="mc-ver-k">v2 接口</span><span class="mc-ver-v">{{ v2Count }}/{{ v2Total }}</span></div>
          <div class="mc-ver-stat"><span class="mc-ver-k">状态</span><span class="mc-ver-v" :class="curVerSafe ? 'm-ok' : 'm-pend'">{{ curVerSafe ? apiVer + ' 生效中' : 'v1 生效中' }}</span></div>
        </div>
        <div class="mc-ver-foot">启动/切换 v1 ↔ v2 ↔ v3，点击打开 ›</div>
      </div>

      <div class="mc-tabs">
        <div v-for="t in ['docs', 'v2']" :key="t" class="mc-tab"
             :class="{ active: mcTab === t }" @click="onMcTabChange(t)">
          {{ tabLabel(t) }}
          <span v-if="t === 'v2'" class="mc-tab-ver" :class="curVerSafe ? 'tv2' : 'tv1'">{{ curVerSafe ? 'v2' : 'v1' }}</span>
        </div>
      </div>
      <div class="mc-toolbar">
        <input v-model="mcSearch" class="mc-search" placeholder="搜索接口路径/说明"
               @keyup.enter="resetMobileList" />
        <div class="mc-fbtn" @click="resetMobileList">搜索</div>
      </div>

      <div class="mc-list">
        <div v-if="loading && !mobileList.length" class="mc-tip">加载中...</div>
        <div v-else-if="mcTab !== 'docs' && !mobileList.length" class="mc-tip">暂无接口</div>

        <!-- 接口文档（版本化 + 文档/编辑双模式） -->
        <template v-if="mcTab === 'docs'">
          <div class="mc-dv-bar">
            <div class="mc-dv-title">接口文档 · {{ docVersion.toUpperCase() }}</div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <span class="mc-fbtn" :class="{ 'mc-mode-active': docMode==='view' }" @click="docMode='view'">文档</span>
              <span class="mc-fbtn" :class="{ 'mc-mode-active': docMode==='edit' }" @click="docMode='edit'">编辑</span>
            </div>
          </div>
          <div class="mc-dv-vers">
            <span v-for="v in docVersions" :key="v" class="mc-dv-ver"
                  :class="{ active: docVersion === v }" @click="docVersion = v">{{ v.toUpperCase() }}</span>
            <span v-if="docMode==='edit'" class="mc-dv-ver mc-dv-add" @click="addDocVersion">＋</span>
          </div>

          <!-- 文档模式：整篇 markdown 渲染 -->
          <div v-if="docMode === 'view'">
            <div v-if="!currentDocs.length" class="mc-tip">该版本暂无接口文档</div>
            <div v-else class="md-doc-body" style="border:1px solid #eef1f6;border-radius:10px;padding:16px;background:#fff;margin-bottom:10px">
              <div v-html="renderedMarkdown"></div>
            </div>
            <span class="mc-fbtn" style="width:100%;box-sizing:border-box;text-align:center" @click="exportMarkdown">导出 .md</span>
          </div>

          <!-- 编辑模式：卡片表单 -->
          <template v-else>
            <div v-for="(row, i) in currentDocs" :key="i" class="mc-card">
              <div class="mc-card-top">
                <div class="mc-card-info">
                  <div class="mc-title mc-path">{{ row.path }}</div>
                  <div class="mc-meta">
                    <span v-for="m in normMethods(row)" :key="m" class="mc-method" :class="'mm-' + m.toLowerCase()" style="font-size:10px;margin-right:4px">{{ m }}</span>
                  </div>
                </div>
                <span class="mc-mod m-pending" @click.stop="removeDocMobile(i)">删除</span>
              </div>
              <div class="mc-dv-fields">
                <input v-model="row.desc" class="mc-input" placeholder="接口说明" />
                <input v-model="row.paramsText" class="mc-input" placeholder="参数 json，如 [{name,required}]" />
                <textarea v-model="row.example" class="mc-input" rows="2" placeholder="响应示例 (curl/JSON)"></textarea>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
              <span class="mc-fbtn mc-dv-addrow" @click="addDocRow">＋ 添加接口</span>
              <span class="mc-fbtn" :class="{ disabled: docSaving }" @click.stop="saveDocsMobile" style="flex:1;text-align:center">
                {{ docSaving ? '保存中...' : '保存本文档' }}
              </span>
            </div>
          </template>
        </template>

        <!-- v2 迁移卡片 -->
        <template v-else>
          <div class="mc-v2-bar">
            <div class="mc-v2-stat">v2 已创建 <b>{{ v2Count }}</b> / {{ v2Total }} 个接口</div>
            <span class="mc-fbtn" :class="{ disabled: creatingAll }" @click.stop="mCreateAllSheet = true">
              {{ creatingAll ? '创建中...' : '一键创建全部' }}</span>
          </div>
          <div v-for="row in mobileList" :key="row.file" class="mc-card">
            <div class="mc-card-top">
              <div class="mc-card-info">
                <div class="mc-title mc-path">{{ row.file || '-' }}</div>
                <div class="mc-data">{{ row.v2 ? '已生成 v2 版本，App 端走 /api/v2/ 路径' : '尚未创建 v2 版本（App 端访问将 404）' }}</div>
              </div>
              <span class="mc-mod" :class="row.v2 ? 'm-safe' : 'm-pending'">{{ row.v2 ? '已创建' : '未创建' }}</span>
            </div>
            <div class="mc-actions">
              <template v-if="!row.v2">
                <span class="mc-act pinned" :class="v2Busy===row.file ? 'disabled' : ''" @click.stop="createV2(row.file)">创建 v2</span>
              </template>
              <template v-else>
                <span class="mc-act danger" @click.stop="mDelTarget=row.file;mDelSheet=true">删除</span>
              </template>
            </div>
          </div>
        </template>

        <div v-if="mLoadingMore" class="mc-more">加载中...</div>
        <div v-else-if="!hasMore && mobileList.length" class="mc-more">没有更多了</div>
        <div v-else-if="mobileList.length" class="mc-more">上拉加载更多</div>
      </div>

      <!-- 移动端：接口详情底部弹层 -->
      <div v-if="mDetailSheet" class="mc-mask" @click.self="mDetailSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>接口详情</span>
            <span class="mc-close" @click="mDetailSheet=false">✕</span>
          </div>
          <div class="mc-sheet-body">
            <div class="mc-detail-row">
              <span class="mc-detail-label">路径</span>
              <code class="mc-detail-val mc-path">{{ mDetail?.path || '-' }}</code>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">方法</span>
              <span class="mc-detail-val">
                <span v-for="m in (mDetail?.methods || [])" :key="m" class="mc-tag" style="margin:2px 6px 2px 0">{{ m }}</span>
                <span v-if="!(mDetail?.methods || []).length">-</span>
              </span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">分组</span>
              <span class="mc-detail-val">{{ groupName(mDetail?.group) }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">状态</span>
              <span class="mc-detail-val">
                <span class="mc-mod" :class="mDetail?.exists ? 'm-safe' : 'm-unsafe'">{{ mDetail?.exists ? '就绪' : '缺失' }}</span>
                <span class="mc-mod" :class="mDetail?.v2 ? 'm-safe' : 'm-pending'" style="margin-left:6px">{{ mDetail?.v2 ? 'v2 已创建' : 'v2 未创建' }}</span>
              </span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">说明</span>
              <span class="mc-detail-val">{{ mDetail?.desc || '（无说明）' }}</span>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">v2 路径</span>
              <code class="mc-detail-val mc-path">{{ mDetail?.v2 ? '/api/v2/' + (mDetail?.path || '').replace('/api/', '') : '未创建（App 访问 404）' }}</code>
            </div>
            <div class="mc-detail-row">
              <span class="mc-detail-label">请求示例</span>
              <div class="mc-detail-val" style="width:100%">
                <pre style="background:#f6f8fa;border:1px solid #eee;border-radius:8px;padding:10px;font-size:11px;line-height:1.7;overflow-x:auto;margin:0;white-space:pre-wrap;word-break:break-all">{{ curlExample(mDetail) }}</pre>
              </div>
            </div>
            <div class="mc-detail-row" v-if="(mDetail?.params || []).length">
              <span class="mc-detail-label">参数</span>
              <span class="mc-detail-val">
                <span v-for="(p, i) in mDetail.params" :key="i" class="mc-tag" style="margin:2px">
                  {{ p?.name || p }}<template v-if="p?.required">*</template>
                </span>
              </span>
            </div>
          </div>
          <button class="mc-save" @click="mDetailSheet=false">关闭</button>
        </div>
      </div>

      <!-- 移动端：删除 v2 确认底部弹层 -->
      <div v-if="mDelSheet" class="mc-mask" @click.self="mDelSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>删除 v2 接口</span>
            <span class="mc-close" @click="mDelSheet=false">✕</span>
          </div>
          <div style="font-size:14px;color:#555;line-height:1.6">
            确定删除 v2/<code style="word-break:break-all">{{ mDelTarget || '' }}</code>？删除后该接口将不再有 v2 版本。
          </div>
          <div class="mc-sheet-acts">
            <span class="mc-act" @click="mDelSheet=false">取消</span>
            <span class="mc-act danger" :class="{ busy: v2Busy === mDelTarget }" @click="confirmDeleteV2">{{ v2Busy === mDelTarget ? '删除中...' : '确认删除' }}</span>
          </div>
        </div>
      </div>

      <!-- 移动端：一键创建全部确认底部弹层 -->
      <div v-if="mCreateAllSheet" class="mc-mask" @click.self="mCreateAllSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>一键创建全部</span>
            <span class="mc-close" @click="mCreateAllSheet=false">✕</span>
          </div>
          <div style="font-size:14px;color:#555;line-height:1.6">
            为全部 <b style="color:#2f6bf0">{{ pendingV2Count }}</b> 个未创建接口生成 v2 转发文件？
          </div>
          <div class="mc-sheet-acts">
            <span class="mc-act" @click="mCreateAllSheet=false">取消</span>
            <span class="mc-act danger" :class="{ busy: creatingAll }" @click="confirmCreateAllV2">{{ creatingAll ? '创建中...' : '开始创建' }}</span>
          </div>
        </div>
      </div>

      <!-- 移动端：API 版本切换底部弹层（桌面端 el-select 的移动替代） -->
      <div v-if="mVerSheet" class="mc-mask" @click.self="mVerSheet=false">
        <div class="mc-sheet">
          <div class="mc-sheet-head">
            <span>切换 API 版本</span>
            <span class="mc-close" @click="mVerSheet=false">✕</span>
          </div>
          <template v-if="mVerStep === 'pick'">
              <div class="mc-ver-opt" :class="{ active: apiVer === 'v1', busy: switchingVer }" @click="askMcSwitchVer('v1')">
                <div>
                  <div class="mc-ver-name">v1<span class="mc-ver-sub">无版本段</span></div>
                  <div class="mc-ver-desc">App 端请求 /api/ 路径（默认）</div>
                </div>
                <span v-if="apiVer === 'v1'" class="mc-ver-cur">当前生效</span>
                <span v-else class="mc-ver-go">切换</span>
              </div>
              <div class="mc-ver-opt" :class="{ active: apiVer === 'v2', busy: switchingVer }" @click="askMcSwitchVer('v2')">
                <div>
                  <div class="mc-ver-name">v2<span class="mc-ver-sub">/api/v2/</span></div>
                  <div class="mc-ver-desc">App 端请求 /api/v2/ 路径</div>
                </div>
                <span v-if="apiVer === 'v2'" class="mc-ver-cur">当前生效</span>
                <span v-else class="mc-ver-go">切换</span>
              </div>
              <div class="mc-ver-opt" :class="{ active: apiVer === 'v3', busy: switchingVer }" @click="askMcSwitchVer('v3')">
                <div>
                  <div class="mc-ver-name">v3<span class="mc-ver-sub">/api/v3/（Node 引擎）</span></div>
                  <div class="mc-ver-desc">App 端请求 /api/v3/ 路径（NestJS 后端）</div>
                </div>
                <span v-if="apiVer === 'v3'" class="mc-ver-cur">当前生效</span>
                <span v-else class="mc-ver-go">切换</span>
              </div>
              <div class="mc-ver-note">切换后 App 端下次启动自动跟随新版本；v3 由 Node 引擎应答（88 接口），v1/v2 走 PHP 引擎。</div>
            </template>
            <template v-else>
              <div style="font-size:15px;color:#333;padding:6px 2px 2px">确定要切换到 <b style="color:#2f6bf0">{{ mVerTarget }}</b>？</div>
              <div style="font-size:12px;color:#909399;margin:6px 2px 0;line-height:1.7">切换后 App 端下次启动自动跟随新版本。切换前请确认 App 用到的接口都已有对应 v2 版本，否则 v2 下会 404。</div>
              <div class="mc-sheet-acts">
                <span class="mc-act" @click="mVerStep='pick'">再想想</span>
                <span class="mc-act danger" :class="{ busy: switchingVer }" @click="confirmMcSwitchVer">{{ switchingVer ? '切换中...' : '确认切换' }}</span>
              </div>
            </template>
            <button class="mc-save" @click="mVerSheet=false">关闭</button>
        </div>
      </div>
    </div>

    <!-- ==================== 桌面端（原有，保留） ==================== -->
    <template v-else>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">API 管理</h2>
      <div style="display:flex;align-items:center;gap:8px">
        <el-tag :type="apiVersion === 'v3' ? 'success' : (apiVersion === 'v2' ? 'success' : 'info')" size="small">{{ apiVersion === 'v3' ? 'v3 生效中' : (apiVersion === 'v2' ? 'v2 生效中' : 'v1 生效中') }}</el-tag>
        <el-tag type="primary" size="small">{{ v2Count }} 个 v2 接口</el-tag>
        <el-button size="small" :loading="loadingAll" @click="loadAll">刷新</el-button>
      </div>
    </div>

    <el-tabs v-model="tab">
      <!-- ═══════════ Tab1: 接口文档（版本化，查看/编辑双模式） ═══════════ -->
      <el-tab-pane label="接口文档" name="docs">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <el-radio-group v-model="docVersion" size="small">
              <el-radio-button v-for="v in docVersions" :key="v" :value="v">{{ v.toUpperCase() }}</el-radio-button>
            </el-radio-group>
            <el-button size="small" text type="primary" @click="addDocVersion">＋新建版本</el-button>
            <span style="font-size:12px;color:#909399">当前版本 <b style="color:#2f6bf0">{{ docVersion.toUpperCase() }}</b> · {{ currentDocs.length }} 个接口</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <el-radio-group v-model="docMode" size="small">
              <el-radio-button value="view">文档</el-radio-button>
              <el-radio-button value="edit">编辑</el-radio-button>
            </el-radio-group>
            <el-input v-if="docMode==='edit'" v-model="docFilter" placeholder="搜索路径/说明" size="small" style="width:200px" clearable />
            <el-button v-if="docMode==='edit'" size="small" type="primary" :loading="docSaving" @click="saveDocs">
              {{ docSaving ? '保存中...' : '保存本文档' }}
            </el-button>
          </div>
        </div>

        <!-- ─── 文档视图（整篇 markdown README） ─── -->
        <div v-if="docMode === 'view'">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
            <div style="font-size:12px;color:#b88230">整篇文档渲染，可切换「编辑」修改后再回来。右侧可导出 .md 或打印。</div>
            <div style="display:flex;gap:6px">
              <el-button size="small" @click="exportMarkdown">导出 .md</el-button>
              <el-button size="small" type="primary" @click="printDoc">打印</el-button>
            </div>
          </div>
          <template v-if="!currentDocs.length">
            <el-empty description="该版本暂无接口文档" :image-size="80" />
          </template>
          <div v-else class="md-doc-body" style="border:1px solid #eef1f6;border-radius:10px;padding:24px 28px;background:#fff;max-width:920px">
            <div v-html="renderedMarkdown"></div>
          </div>
        </div>

        <!-- ─── 编辑视图（表格） ─── -->
        <div v-else>
          <div style="font-size:12px;color:#909399;margin-bottom:10px">
            每个版本独立编辑「接口说明 / 参数 / 响应示例」，保存后仅存到该版本。版本间互相独立，默认新版本从当前版本复制做基底。
          </div>
          <el-table :data="filteredDocs" size="small" border max-height="520">
            <el-table-column width="130" label="方法">
              <template #default="{ row }">
                <el-tag v-for="m in normMethods(row)" :key="m" :type="methodType(m)" size="small" style="margin:1px;font-weight:600;font-size:11px">{{ m }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column width="210" label="路径">
              <template #default="{ row }">
                <code style="font-size:12px;color:#333">{{ row.path }}</code>
              </template>
            </el-table-column>
            <el-table-column label="说明" min-width="200">
              <template #default="{ row }">
                <el-input v-model="row.desc" size="small" placeholder="接口说明" />
              </template>
            </el-table-column>
            <el-table-column label="参数" min-width="170">
              <template #default="{ row }">
                <el-input v-model="row.paramsText" size="small" placeholder="json，如 [{name,required}]" />
              </template>
            </el-table-column>
            <el-table-column label="响应示例 (curl/JSON)" min-width="240">
              <template #default="{ row }">
                <el-input v-model="row.example" size="small" type="textarea" :rows="2" placeholder="请求/响应示例" />
              </template>
            </el-table-column>
            <el-table-column width="90" label="操作">
              <template #default="{ row }">
                <el-button size="small" type="danger" text @click="removeDoc(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button size="small" style="margin-top:8px" @click="addDocRow">＋ 添加接口</el-button>
        </div>
      </el-tab-pane>

      <!-- ═══════════ Tab2: v2 版本切换与迁移 ═══════════ -->
      <el-tab-pane label="v2 版本与迁移" name="v2">
        <el-card shadow="never" style="margin-bottom:16px">
          <template #header>API 版本状态</template>
          <div style="font-size:13px;color:#555;line-height:2.2">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="color:#999;display:inline-block;width:90px">当前生效</span>
              <el-select v-model="apiVer" size="small" style="width:150px" :disabled="switchingVer" @change="onVersionChange">
                <el-option label="v1（无版本段）" value="v1" />
                <el-option label="v2（/api/v2/）" value="v2" />
                <el-option label="v3（/api/v3/ Node）" value="v3" />
              </el-select>
              <el-tag v-if="apiVer === 'v3'" type="success" size="small">Node 生效中</el-tag>
              <el-tag v-else-if="apiVer === 'v2'" type="success" size="small">生效中</el-tag>
              <span style="color:#909399;font-size:12px">App 端启动时自动跟随，无需发版</span>
            </div>
            <div style="font-size:12px;color:#b88230">
              Nginx 下 .htaccess 不生效：v2 接口需物理文件（server/api/v2/xxx.php）；未创建的 v2 接口在 App 端会 404。
            </div>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>v2 接口迁移</span>
              <el-input v-model="v2Filter" placeholder="搜索接口名" size="small" style="width:180px" clearable />
            </div>
          </template>
          <div style="font-size:13px;color:#555;margin-bottom:8px">
            v2 已创建 <b style="color:#2f6bf0">{{ v2Count }}</b> / 共 {{ v2Total }} 个接口
            <el-button size="small" type="primary" text style="margin-left:8px" @click="createAllV2" :loading="creatingAll">一键创建全部</el-button>
          </div>
          <el-table :data="filteredV2Apis" size="small" max-height="460">
            <el-table-column prop="file" label="接口文件" min-width="240" show-overflow-tooltip />
            <el-table-column label="v2 状态" width="90">
              <template #default="{row}">
                <el-tag :type="row.v2 ? 'success' : 'info'" size="small">{{ row.v2 ? '已创建' : '未创建' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{row}">
                <el-button v-if="!row.v2" size="small" type="primary" text :loading="v2Busy===row.file" @click="createV2(row.file)">创建 v2</el-button>
                <el-button v-else size="small" type="danger" text :loading="v2Busy===row.file" @click="deleteV2(row.file)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { marked } from 'marked'
import api, { switchApiVersion } from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const tab = ref('docs')
const groups = ref([])
const total = ref(0)
const apiVersion = ref('v1')
const activeGroups = ref([])

// v2 迁移数据
const v2Apis = ref([])
const v2Filter = ref('')
const loadingAll = ref(false)
const v2Busy = ref('')
const creatingAll = ref(false)
const apiVer = ref('v1')
const loadedVer = ref('v1')
const switchingVer = ref(false)

// ═══════════ 版本文档（Tab1）状态 ═══════════
const docVersions = ref(['v1', 'v2'])   // 已保存文档的版本
const docVersion = ref('v1')            // 当前正在编辑的版本
const docMap = ref({})                  // version -> docs 数组
const docFilter = ref('')
const docSaving = ref(false)
const docMode = ref('view')             // 接口文档查看/编辑模式

// 归一化 methods 为数组（兼容字符串 "GET" / "GET/POST" / 数组）
const normMethods = (doc) => {
  let m = doc && doc.methods
  if (m == null) return ['GET']
  if (Array.isArray(m)) return m.length ? m : ['GET']
  if (typeof m === 'string') return m.replace(/[/,、\s]+/g, ' ').trim().split(' ').filter(Boolean) || ['GET']
  return ['GET']
}

// 解析参数 JSON 字符串 → 数组（用于文档视图参数表）
const parsedParams = (doc) => {
  if (!doc || !doc.paramsText) return []
  try {
    const a = JSON.parse(doc.paramsText)
    return Array.isArray(a) ? a : []
  } catch (e) { return [] }
}

// 按 group 分组（文档视图渲染用）
const groupedDocs = computed(() => {
  const map = {}
  currentDocs.value.forEach(d => {
    const g = d.group || '未分组'
    if (!map[g]) map[g] = []
    map[g].push(d)
  })
  return Object.keys(map).map(g => ({ group: g, items: map[g] }))
})

// HTTP 方法徽标背景色
const methodBg = (m) => {
  const map = { GET: '#10b981', POST: '#2f6bf0', PUT: '#f59e0b', DELETE: '#ef4444', PATCH: '#6b7280', OPTIONS: '#6b7280' }
  return { background: map[(m || '').toUpperCase()] || '#6b7280' }
}

// 生成整篇 README 风格 markdown 文档（当前版本）
const docMarkdown = computed(() => {
  if (!currentDocs.value.length) return '# 暂无接口文档\n\n该版本尚未录入任何接口。'
  const ver = docVersion.value.toUpperCase()
  let md = `# DOO API ${ver} 接口文档\n\n> URL 前缀：\`${ver === 'V1' ? '/doo/server/api/' : '/doo/server/api/' + docVersion.value + '/'}\`　· 接口总数：${currentDocs.value.length}\n\n## 目录\n\n`
  groupedDocs.value.forEach(g => {
    md += `- [${g.group}](#${encodeURIComponent(g.group)})\n`
  })
  md += `\n---\n\n`
  groupedDocs.value.forEach(g => {
    md += `## ${g.group}\n\n`
    g.items.forEach(doc => {
      const m = normMethods(doc).join('/')
      md += `### \`${m}\` ${doc.path}\n\n`
      md += `${doc.desc || '_无说明_'}\n\n`
      const params = parsedParams(doc)
      if (params.length) {
        md += `**参数**\n\n| 字段 | 必填 | 说明 |\n|------|------|------|\n`
        params.forEach(p => {
          md += `| \`${p.name}\` | ${p.required ? '是' : '否'} | ${p.desc || '-'} |\n`
        })
        md += `\n`
      }
      if (doc.example) {
        md += `**响应示例**\n\n\`\`\`json\n${doc.example}\n\`\`\`\n\n`
      }
      md += `---\n\n`
    })
  })
  return md
})

// marked 渲染后的 HTML
const renderedMarkdown = computed(() => {
  try { return marked.parse(docMarkdown.value) }
  catch (e) { return docMarkdown.value }
})

// 导出 Markdown 文件
const exportMarkdown = () => {
  const blob = new Blob([docMarkdown.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `doo-api-${docVersion.value}-docs.md`
  a.click()
  URL.revokeObjectURL(url)
}

// 打印
const printDoc = () => {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>DOO API ${docVersion.value.toUpperCase()} 文档</title><style>body{font-family:system-ui,Segoe UI,sans-serif;max-width:820px;margin:24px auto;padding:0 20px;color:#1a1a2e;line-height:1.7}code{background:#f6f8fa;padding:2px 5px;border-radius:4px;font-size:13px}pre{background:#f6f8fa;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #eef1f6;padding:6px 10px;text-align:left;font-size:13px}h1{border-bottom:2px solid #2f6bf0;padding-bottom:8px}h2,h3{margin-top:24px}</style></head><body>${renderedMarkdown.value}</body></html>`)
  win.document.close()
  setTimeout(() => { win.print() }, 300)
}

// 当前版本文档（含默认方法，若无则从 groups 生成初始骨架）
const currentDocs = computed(() => {
  const key = docVersion.value
  if (docMap.value[key]) return docMap.value[key]
  // 无已存文档：用 admin_apis 的分组接口生成 v1 骨架（仅 v1 首次初始化用）
  if (key !== 'v1') return []
  return groups.value.flatMap(g => (g.items || []).map(it => ({
    path: it.path, methods: it.methods || ['GET'], desc: it.desc || '', paramsText: '', example: '', group: it.group || g.group || ''
  })))
})

const filteredDocs = computed(() => {
  const list = currentDocs.value
  const q = docFilter.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(r =>
    (r.path || '').toLowerCase().includes(q) || (r.desc || '').toLowerCase().includes(q)
  )
})

// 从后端加载已保存的版本文档
const loadDocVersions = async () => {
  try {
    const r = await api.get('/admin_api_docs.php', { params: { action: 'list' } })
    if (r.data?.code === 200) {
      docMap.value = r.data.data.docs || {}
      const vs = r.data.data.versions || []
      if (vs.length) {
        docVersions.value = vs
        docVersion.value = vs.includes(docVersion.value) ? docVersion.value : vs[vs.length - 1]
      }
    }
  } catch (e) { /* 后端尚未部署时静默 */ }
}

// 新建版本（从当前版本复制一份作为基底）
const addDocVersion = async () => {
  try {
    const res = await ElMessageBox.prompt('新版本号（如 v3）：', '新建版本文档', {
      inputValue: 'v3', inputPattern: /^v\d+$/, inputErrorMessage: '请输入 v + 数字'
    })
    const v = res.value.trim()
    if (docVersions.value.includes(v)) { ElMessage.warning('版本 ' + v + ' 已存在'); return }
    docVersions.value.push(v)
    docMap.value[v] = JSON.parse(JSON.stringify(currentDocs.value)) // 复制当前版本作基底
    docVersion.value = v
    ElMessage.success('已创建空版本 ' + v + '（可继续编辑后保存）')
  } catch (e) { /* 取消 */ }
}

// 添加一行接口
const addDocRow = () => {
  currentDocs.value.push({ path: '/api/new_api.php', methods: ['GET'], desc: '', paramsText: '', example: '' })
}

// 删除一行接口
const removeDoc = (row) => {
  const idx = currentDocs.value.indexOf(row)
  if (idx > -1) currentDocs.value.splice(idx, 1)
}

// 保存当前版本文档
const saveDocs = async () => {
  docSaving.value = true
  try {
    const docs = currentDocs.value.map(r => ({
      path: r.path, methods: normMethods(r), desc: r.desc || '',
      paramsText: r.paramsText || '', example: r.example || '', group: r.group || ''
    }))
    const r = await api.post('/admin_api_docs.php', { action: 'save', version: docVersion.value, docs })
    if (r.data?.code === 200) { ElMessage.success(r.data.message); loadDocVersions() }
    else ElMessage.error(r.data?.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  docSaving.value = false
}

const v2Total = computed(() => v2Apis.value.length)
const v2Count = computed(() => v2Apis.value.filter(x => x.v2).length)
const filteredV2Apis = computed(() => {
  const q = v2Filter.value.trim().toLowerCase()
  return q ? v2Apis.value.filter(x => x.file.toLowerCase().includes(q)) : v2Apis.value
})

// 生成请求示例（curl + JSON 参数占位）
const curlExample = (row) => {
  if (!row || !row.path) return ''
  const m = (row.methods && row.methods[0]) || 'GET'
  const base = 'http://139.196.185.197:7070/doo'
  const path = row.path || ''
  const v2path = row.v2 ? '/api/v2/' + path.replace('/api/', '') : path
  const url = base + v2path
  const params = row.params || []
  let body = ''
  if (params.length) {
    body = params.map(p => `"${p.name || p}": "${p.required ? '必填' : '可选'}"`).join(',\n    ')
  }
  if (m === 'GET') {
    return `curl -X GET '${url}'\n  -H 'Authorization: Bearer <token>'`
  }
  return `curl -X POST '${url}'\n  -H 'Content-Type: application/json'\n  -H 'Authorization: Bearer <token>'\n  -d '{
    ${body || '"key": "value"'}
  }'`
}

const methodType = (m) => {
  if (m === 'GET') return 'success'
  if (m === 'POST') return 'primary'
  if (m === 'PUT') return 'warning'
  if (m === 'DELETE') return 'danger'
  return 'info'
}

const loadAll = async () => {
  loadingAll.value = true
  try {
    const settled = await Promise.allSettled([
      api.get('/admin_apis.php'),
      api.get('/admin_v2api.php'),
      api.get('/admin_api_version.php')
    ])
    const [ar, vr, ver] = settled.map(x => (x.status === 'fulfilled' ? x.value : null))
    if (ar?.data?.code === 200) {
      groups.value = ar.data.data || []
      total.value = ar.data.total || 0
      if (ar.data.api_version) apiVersion.value = ar.data.api_version
      activeGroups.value = groups.value.map(g => g.group)
    }
    if (vr?.data?.code === 200) v2Apis.value = vr.data.data.list || []
    if (ver?.data?.code === 200) {
      apiVer.value = ver.data.data.version || 'v1'
      loadedVer.value = apiVer.value
      apiVersion.value = apiVer.value
    }
  } catch (e) { /* ignore */ }
  loadingAll.value = false
  resetMobileList()
  loadDocVersions()
}

const createV2 = async (file) => {
  v2Busy.value = file
  try {
    const r = await api.post('/admin_v2api.php', { action: 'create', file })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadAll() }
    else ElMessage.error(r.data.message || '创建失败')
  } catch (e) { ElMessage.error('创建失败') }
  v2Busy.value = ''
}

const createAllV2 = async (opts = {}) => {
  const { skipConfirm = false } = opts || {}
  const pending = v2Apis.value.filter(x => !x.v2)
  if (!pending.length) { ElMessage.info('已全部创建'); return }
  if (!skipConfirm) {
    try {
      await ElMessageBox.confirm(`为全部 ${pending.length} 个未创建接口生成 v2 转发文件？`, '一键创建 v2', { type: 'warning' })
    } catch (e) { return }
  }
  creatingAll.value = true
  let ok = 0, fail = 0
  for (const p of pending) {
    try {
      const r = await api.post('/admin_v2api.php', { action: 'create', file: p.file })
      if (r.data.code === 200) ok++; else fail++
    } catch (e) { fail++ }
  }
  ElMessage.success(`创建完成：成功 ${ok}，失败 ${fail}`)
  creatingAll.value = false
  loadAll()
}

// 移动端：一键创建全部（底部弹层确认后复用 createAllV2 的核心逻辑）
const pendingV2Count = computed(() => v2Apis.value.filter(x => !x.v2).length)
const mCreateAllSheet = ref(false)
const confirmCreateAllV2 = () => {
  mCreateAllSheet.value = false
  createAllV2({ skipConfirm: true })
}

const deleteV2 = async (file) => {
  try {
    await ElMessageBox.confirm('确定删除 v2/' + file + '？删除后该接口将不再有 v2 版本。', '删除 v2 接口', { type: 'warning' })
  } catch (e) { return }
  await doDeleteV2(file)
}

const doDeleteV2 = async (file) => {
  v2Busy.value = file
  try {
    const r = await api.post('/admin_v2api.php', { action: 'delete', file })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadAll() }
    else ElMessage.error(r.data.message || '删除失败')
  } catch (e) { ElMessage.error('删除失败') }
  v2Busy.value = ''
}

// 移动端：底部弹层确认删除（替代居中的 ElMessageBox）
const confirmDeleteV2 = () => {
  const file = mDelTarget.value
  mDelSheet.value = false
  if (file) doDeleteV2(file)
}

const onVersionChange = async (target) => {
  if (switchingVer.value) { apiVer.value = loadedVer.value; return }
  if (target === loadedVer.value) { apiVer.value = loadedVer.value; return }
  try {
    await ElMessageBox.confirm('确定切换到 ' + target + '？切换后 App 端下次启动将自动跟随新版本。', '版本切换', { type: 'warning' })
  } catch (e) { apiVer.value = loadedVer.value; return }
  switchingVer.value = true
  try {
    const r = await switchApiVersion(target)
    if (r.data.code === 200) {
      ElMessage.success(r.data.message)
      loadedVer.value = target
      apiVer.value = target
      apiVersion.value = target
    } else {
      ElMessage.error(r.data.message || '切换失败')
      apiVer.value = loadedVer.value
    }
  } catch (e) { ElMessage.error('切换失败'); apiVer.value = loadedVer.value }
  switchingVer.value = false
}

/* ───────── 移动端卡片视图：分页 + 上拉加载 ───────── */
const mcTab = ref('docs')
const mcSearch = ref('')
const mobileList = ref([])
const mLoadingMore = ref(false)
const mobilePageSize = 10

// 当前 tab 的完整数据源（docs 摊平为接口行；v2 用已筛选列表并在其上再按 mcSearch 过滤）
const mobileAll = computed(() => {
  const q = mcSearch.value.trim().toLowerCase()
  if (mcTab.value === 'v2') {
    const base = filteredV2Apis.value
    if (!q) return base
    return base.filter(x =>
      (x.file || '').toLowerCase().includes(q) ||
      (x.path || '').toLowerCase().includes(q) ||
      (x.desc || '').toLowerCase().includes(q) ||
      (x.group || '').toLowerCase().includes(q)
    )
  }
  const rows = groups.value.flatMap(g => (g.items || []).map(it => ({ ...it, group: g.group })))
  if (!q) return rows
  return rows.filter(r =>
    (r.path || '').toLowerCase().includes(q) || (r.desc || '').toLowerCase().includes(q)
  )
})
const hasMore = computed(() => mobileList.value.length < mobileAll.value.length)

const resetMobileList = () => {
  mobileList.value = mobileAll.value.slice(0, mobilePageSize)
  mLoadingMore.value = false
}
const onMcTabChange = (t) => {
  mcTab.value = t
  resetMobileList()
}

// 移动端底部弹层状态
const mDetail = ref(null)
const mDetailSheet = ref(false)
const mDelSheet = ref(false)
const mDelTarget = ref('')

const openDetail = (row) => {
  mDetail.value = row
  mDetailSheet.value = true
}

// 移动端：API 版本状态卡 + 底部切换弹层（当前生效版本展示，切换走 switchApiVersion）
const mVerSheet = ref(false)
const mVerStep = ref('pick')   // 弹层阶段: pick=选版本, confirm=确认切换
const mVerTarget = ref('')     // 待确认的目标版本
const curVerSafe = computed(() => apiVer.value === 'v2' || apiVer.value === 'v3')
const curVerLabel = computed(() => (apiVer.value === 'v3' ? 'v3（/api/v3/ Node）' : (apiVer.value === 'v2' ? 'v2（/api/v2/）' : 'v1（无版本段）')))

const openVerSheet = () => { mVerStep.value = 'pick'; mVerSheet.value = true }

// 步骤一：用户点选目标版本 → 进入确认步骤（不立即切换）
const askMcSwitchVer = (target) => {
  if (switchingVer.value) return
  if (target === loadedVer.value) { mVerSheet.value = false; return } // 已是目标版本，直接收起
  mVerTarget.value = target
  mVerStep.value = 'confirm'
}

// 步骤二：确认后真正执行切换（与桌面端 onVersionChange 一致：busy 防重入 + 失败回滚）
const confirmMcSwitchVer = async () => {
  if (switchingVer.value) return
  const target = mVerTarget.value
  switchingVer.value = true
  try {
    const r = await switchApiVersion(target)
    if (r.data.code === 200) {
      ElMessage.success(r.data.message)
      loadedVer.value = target
      apiVer.value = target
      apiVersion.value = target
      mVerSheet.value = false
    } else {
      ElMessage.error(r.data.message || '切换失败')
    }
  } catch (e) { ElMessage.error('切换失败') }
  switchingVer.value = false
}

// 移动端版本切换：已改为「先确认后切换」（askMcSwitchVer→confirmMcSwitchVer），onMcSwitchVer 已废弃
// 滚动到底自动加载下一页（list concat 追加）
const loadMore = async () => {
  if (mLoadingMore.value || !hasMore.value) return
  mLoadingMore.value = true
  await new Promise(r => setTimeout(r, 200)) // 防抖
  const next = mobileAll.value.slice(mobileList.value.length, mobileList.value.length + mobilePageSize)
  mobileList.value = mobileList.value.concat(next)
  mLoadingMore.value = false
}
const onScroll = () => {
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadMore()
}

const methodShort = (methods) => (methods && methods[0]) ? methods[0] + (methods.length > 1 ? '+' : '') : 'API'
const v2Label = (row) => row.v2 ? 'v2 就绪' : 'v1 待迁移'
const groupName = (g) => g || '未分组'
const tabLabel = (t) => t === 'docs' ? '接口文档' : (t === 'docsver' ? '版本文档' : 'v2 迁移')

// 移动端：保存当前版本文档
const saveDocsMobile = async () => {
  docSaving.value = true
  try {
    const docs = currentDocs.value.map(r => ({
      path: r.path, methods: normMethods(r), desc: r.desc || '',
      paramsText: r.paramsText || '', example: r.example || '', group: r.group || ''
    }))
    const r = await api.post('/admin_api_docs.php', { action: 'save', version: docVersion.value, docs })
    if (r.data?.code === 200) { ElMessage.success(r.data.message); loadDocVersions() }
    else ElMessage.error(r.data?.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  docSaving.value = false
}

// 移动端：删除某行接口
const removeDocMobile = (i) => {
  if (currentDocs.value[i]) currentDocs.value.splice(i, 1)
}

onMounted(() => {
  loadAll()
  if (isMobile.value) document.addEventListener('scroll', onScroll, true)
})
onUnmounted(() => {
  document.removeEventListener('scroll', onScroll, true)
})
</script>

<style scoped>
/* markdown 文档渲染样式 */
.md-doc-body ::v-deep h1 {
  font-size: 24px; color: #1a1a2e; border-bottom: 2px solid #2f6bf0; padding-bottom: 10px; margin-top: 0;
}
.md-doc-body ::v-deep h2 {
  font-size: 19px; color: #1a1a2e; border-bottom: 1px solid #eef1f6; padding-bottom: 6px; margin-top: 26px;
}
.md-doc-body ::v-deep h3 {
  font-size: 15px; color: #2f6bf0; margin-top: 20px;
}
.md-doc-body ::v-deep p { font-size: 14px; color: #444; line-height: 1.7; }
.md-doc-body ::v-deep code {
  background: #f0f4ff; color: #2f6bf0; padding: 2px 6px; border-radius: 4px; font-size: 13px;
}
.md-doc-body ::v-deep pre {
  background: #f6f8fa; border: 1px solid #eef1f6; border-radius: 8px; padding: 12px 14px;
  overflow-x: auto; font-size: 13px; line-height: 1.6;
}
.md-doc-body ::v-deep pre code { background: transparent; color: #333; padding: 0; }
.md-doc-body ::v-deep table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 13px; }
.md-doc-body ::v-deep th, .md-doc-body ::v-deep td { border: 1px solid #eef1f6; padding: 6px 10px; text-align: left; }
.md-doc-body ::v-deep th { background: #f7f8fb; color: #909399; font-weight: 600; }
.md-doc-body ::v-deep blockquote { border-left: 4px solid #2f6bf0; margin: 0; padding: 4px 16px; color: #666; background: #f7f9ff; }
.md-doc-body ::v-deep hr { border: none; border-top: 1px solid #eef1f6; margin: 24px 0; }
.md-doc-body ::v-deep ul { padding-left: 20px; }

/* 移动端卡片：接口路径/文件名允许换行显示（默认 mc-title 单行省略） */
.mc-path {
  white-space: normal;
  word-break: break-all;
  line-height: 1.35;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 14px;
}
/* HTTP 方法彩色徽标 */
.mc-method {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
  padding: 2px 8px;
  color: #fff;
}
.mc-method.mm-get { background: #10b981; }
.mc-method.mm-post { background: #2f6bf0; }
.mc-method.mm-put { background: #f59e0b; }
.mc-method.mm-delete { background: #ef4444; }
.mc-method.mm-patch, .mc-method.mm-options { background: #6b7280; }

/* 移动端底部弹层 */
.mc-sheet { max-height: 85vh; display: flex; flex-direction: column; }
.mc-sheet-body { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.mc-sheet-acts { display: flex; gap: 10px; margin-top: 16px; }
.mc-detail-row { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f2f4f7; font-size: 13px; }
.mc-detail-row:last-child { border-bottom: none; }
.mc-detail-label { width: 44px; flex-shrink: 0; color: #909399; }
.mc-detail-val { flex: 1; min-width: 0; color: #1a1a2e; word-break: break-all; line-height: 1.5; }
.mc-act.busy { opacity: .6; }

/* 移动端 API 版本状态卡 */
.mc-ver-card { position: relative; margin-bottom: 10px; }
.mc-ver-thumb {
  width: 48px; height: 48px; border-radius: 10px;
  background: linear-gradient(135deg, #eef4ff, #e8f7ef);
  color: #2f6bf0; font-size: 14px; font-weight: 700;
}
.mc-ver-badge {
  flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: .5px;
  border-radius: 5px; padding: 2px 8px; color: #fff;
}
.mc-ver-badge.badge-v1 { background: #94a3b8; }
.mc-ver-badge.badge-v2 { background: #10b981; }
.mc-ver-stats { display: flex; gap: 10px; margin-top: 12px; }
.mc-ver-stat {
  flex: 1; background: #f7f8fb; border-radius: 8px;
  padding: 8px 10px; font-size: 12px;
}
.mc-ver-k { color: #909399; margin-right: 6px; }
.mc-ver-v { color: #1a1a2e; font-weight: 600; }
.mc-ver-v.m-ok { color: #00a862; }
.mc-ver-v.m-pend { color: #f59e0b; }
.mc-ver-foot {
  margin-top: 10px; font-size: 12px; color: #2f6bf0;
  border-top: 1px dashed #e5e7eb; padding-top: 9px;
}

/* 移动端 tab 上的生效版本角标 */
.mc-tab-ver {
  display: inline-block; margin-left: 5px; vertical-align: 1px;
  font-size: 10px; font-weight: 700; border-radius: 4px; padding: 1px 6px;
}
.mc-tab-ver.tv1 { background: #e5e7eb; color: #6b7280; }
.mc-tab-ver.tv2 { background: #d1fae5; color: #059669; }
.mc-tab.active .mc-tab-ver.tv1 { background: rgba(255,255,255,.28); color: #fff; }
.mc-tab.active .mc-tab-ver.tv2 { background: #d1fae5; color: #059669; }

/* 移动端 v2 迁移：一键创建全部操作条 */
.mc-v2-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: #f7f8fb; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;
}
.mc-v2-stat { font-size: 13px; color: #555; flex: 1; }
.mc-v2-stat b { color: #2f6bf0; }
.mc-v2-bar .mc-fbtn { flex-shrink: 0; }
.mc-v2-bar .mc-fbtn.disabled { opacity: .6; pointer-events: none; }

/* 移动端版本切换弹层选项 */
.mc-ver-opt {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px;
}
.mc-ver-opt.active { border-color: #2f6bf0; background: #f0f5ff; }
.mc-ver-opt.busy { opacity: .6; pointer-events: none; }
.mc-ver-name { font-size: 15px; font-weight: 700; color: #1a1a2e; }
.mc-ver-sub { font-size: 11px; font-weight: 400; color: #909399; margin-left: 6px; }
.mc-ver-desc { font-size: 12px; color: #909399; margin-top: 3px; }
.mc-ver-cur { flex-shrink: 0; font-size: 11px; color: #2f6bf0; background: #e8f0ff; border-radius: 10px; padding: 2px 8px; }
.mc-ver-go { flex-shrink: 0; font-size: 11px; color: #909399; }
.mc-ver-note { font-size: 12px; color: #b88230; line-height: 1.6; margin-bottom: 10px; }

/* 移动端：版本文档 */
.mc-dv-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: #f7f8fb; border-radius: 10px; padding: 10px 12px; margin-bottom: 10px;
}
.mc-dv-title { font-size: 13px; color: #1a1a2e; font-weight: 600; flex: 1; }
.mc-dv-bar .mc-fbtn { flex-shrink: 0; }
.mc-dv-bar .mc-fbtn.disabled { opacity: .6; pointer-events: none; }
.mc-dv-vers { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.mc-dv-ver {
  font-size: 12px; font-weight: 700; border-radius: 8px; padding: 4px 12px;
  background: #f1f2f6; color: #6b7280;
}
.mc-dv-ver.active { background: #2f6bf0; color: #fff; }
.mc-dv-ver.mc-dv-add { background: #e8f0ff; color: #2f6bf0; }
.mc-dv-fields { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.mc-input {
  width: 100%; box-sizing: border-box; border: 1px solid #e5e7eb; border-radius: 8px;
  padding: 7px 10px; font-size: 12px; color: #1a1a2e; background: #fff; line-height: 1.5;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
.mc-input:focus { outline: none; border-color: #2f6bf0; }
.mc-dv-addrow { display: inline-block; margin-top: 10px; }
/* 移动端文档/编辑模式按钮高亮 */
.mc-mode-active { background: #2f6bf0 !important; color: #fff !important; border-color: #2f6bf0 !important; }
</style>
