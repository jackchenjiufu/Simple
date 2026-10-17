<template>
  <div>
    <!-- ==================== 移动端卡片式（App web-view/窄屏） ==================== -->
    <div v-if="isMobile" class="mc-wrap">
      <!-- 顶部功能分区 -->
      <div class="mc-tabs">
        <div v-for="s in sections" :key="s.key" class="mc-tab"
             :class="{ active: activeSection === s.key }" @click="switchSection(s.key)">
          {{ s.label }}
        </div>
      </div>

      <!-- ══════════ 分区：概览统计 ══════════ -->
      <template v-if="activeSection === 'overview'">
        <div class="mc-grid" style="margin:12px 12px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="mc-stat" style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 6px rgba(0,0,0,.04)">
            <div class="mc-stat-num" style="font-size:22px;font-weight:700;color:#222a47">{{ overview?.total ?? '-' }}</div>
            <div class="mc-stat-label" style="font-size:12px;color:#909399;margin-top:4px">图片内容 · 参与推荐 {{ overview?.recommended_on ?? 0 }}</div>
          </div>
          <div class="mc-stat" style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 6px rgba(0,0,0,.04)">
            <div class="mc-stat-num" style="font-size:22px;font-weight:700;color:#2f6bf0">{{ overview?.ctr ?? '-' }}%</div>
            <div class="mc-stat-label" style="font-size:12px;color:#909399;margin-top:4px">点击率 CTR（点击 / 曝光）</div>
          </div>
          <div class="mc-stat" style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 6px rgba(0,0,0,.04)">
            <div class="mc-stat-num" style="font-size:22px;font-weight:700;color:#222a47">{{ overview?.behavior_count?.toLocaleString() ?? '-' }}</div>
            <div class="mc-stat-label" style="font-size:12px;color:#909399;margin-top:4px">行为总数（点击/浏览/停留/曝光）</div>
          </div>
          <div class="mc-stat" style="background:#fff;border-radius:12px;padding:12px;box-shadow:0 1px 6px rgba(0,0,0,.04)">
            <div class="mc-stat-num" style="font-size:22px;font-weight:700;color:#222a47">{{ overview?.behavior_users ?? '-' }}</div>
            <div class="mc-stat-label" style="font-size:12px;color:#909399;margin-top:4px">活跃用户（有行为记录）</div>
          </div>
        </div>

        <!-- 算法信息 -->
        <div class="mc-card" style="margin:12px">
          <div class="mc-title" style="font-size:14px;font-weight:600;margin-bottom:8px">推荐算法（{{ overview?.algorithm?.version || 'fusion' }}）</div>
          <div class="mc-meta" style="line-height:2.1;margin-top:2px">
            <div><span style="color:#999">公式：</span><code>{{ overview?.algorithm?.weights }}</code></div>
            <div><span style="color:#999">行为：</span>{{ overview?.algorithm?.behavior_weights }}</div>
            <div><span style="color:#999">衰减：</span>{{ overview?.algorithm?.decay_days }} 天半衰 · 打散 ≤ {{ overview?.algorithm?.mmr_limit }} 条</div>
            <div><span style="color:#999">行为点击 / 浏览 / 停留 / 曝光：</span>{{ overview?.behavior?.content_click ?? 0 }} / {{ overview?.behavior?.page_view ?? 0 }} / {{ overview?.behavior?.page_stay ?? 0 }} / {{ overview?.behavior?.rec_view ?? 0 }}</div>
          </div>
        </div>

        <!-- 算法参数手调：每行一个参数（大输入框 + 中文标签 + 说明），避免小屏 grid 挤压 -->
        <div class="mc-card" style="margin:12px">
          <div class="mc-title" style="font-size:14px;font-weight:600;margin-bottom:4px">算法参数（保存后实时生效）</div>

          <div class="mc-form-group">融合权重（合计 ≈ 1）</div>
          <div class="mc-form-row">
            <label>内容匹配权重 CB <span class="mc-hint">与用户已浏览内容相似的图片，0~1</span></label>
            <input v-model="algo.w_cb" type="number" step="0.05" min="0" max="1" placeholder="0.4" />
          </div>
          <div class="mc-form-row">
            <label>用户协同权重 UserCF <span class="mc-hint">行为相似的用户喜欢的内容，0~1</span></label>
            <input v-model="algo.w_cf" type="number" step="0.05" min="0" max="1" placeholder="0.2" />
          </div>
          <div class="mc-form-row">
            <label>物品协同权重 ItemCF <span class="mc-hint">与已浏览内容相似度的其它内容，0~1</span></label>
            <input v-model="algo.w_itemcf" type="number" step="0.05" min="0" max="1" placeholder="0.2" />
          </div>
          <div class="mc-form-row">
            <label>热度权重 Hot <span class="mc-hint">按点击热度兜底，0~1</span></label>
            <input v-model="algo.w_hot" type="number" step="0.05" min="0" max="1" placeholder="0.2" />
          </div>

          <div class="mc-form-group">探索比例（按行为量动态取档）</div>
          <div class="mc-form-row">
            <label>冷启动探索比例 <span class="mc-hint">低行为量用户多探索新内容，0~1</span></label>
            <input v-model="algo.explore_cold" type="number" step="0.05" min="0" max="1" placeholder="0.5" />
          </div>
          <div class="mc-form-row">
            <label>成长期探索比例 <span class="mc-hint">有一定行为量用户，0~1</span></label>
            <input v-model="algo.explore_grow" type="number" step="0.05" min="0" max="1" placeholder="0.35" />
          </div>
          <div class="mc-form-row">
            <label>成熟期探索比例 <span class="mc-hint">高活跃用户按画像推荐为主，0~1</span></label>
            <input v-model="algo.explore_mature" type="number" step="0.05" min="0" max="1" placeholder="0.2" />
          </div>

          <div class="mc-form-group">推荐条数</div>
          <div class="mc-form-row">
            <label>每屏条数 <span class="mc-hint">0 = 不限</span></label>
            <input v-model="algo.total_need" type="number" min="0" max="200" placeholder="50" />
          </div>

          <div class="mc-form-group">行为权重与衰减</div>
          <div class="mc-form-row">
            <label>点击权重 <span class="mc-hint">一次点击计分，0~50</span></label>
            <input v-model="algo.w_click" type="number" min="0" max="50" placeholder="10" />
          </div>
          <div class="mc-form-row">
            <label>停留上限（秒） <span class="mc-hint">停留时长计分封顶值，1~20</span></label>
            <input v-model="algo.w_stay_max" type="number" min="1" max="20" placeholder="5" />
          </div>
          <div class="mc-form-row">
            <label>浏览权重 <span class="mc-hint">一次浏览计分，0~10</span></label>
            <input v-model="algo.w_view" type="number" step="0.5" min="0" max="10" placeholder="1" />
          </div>
          <div class="mc-form-row">
            <label>时间衰减天数 <span class="mc-hint">行为权重按天数半衰衰减，1~180</span></label>
            <input v-model="algo.decay_days" type="number" min="1" max="180" step="5" placeholder="30" />
          </div>

          <div class="mc-actions">
            <span class="mc-act" @click="loadAlgoConfig">重置为当前</span>
            <span class="mc-act ok" @click="saveAlgoConfig">保存参数</span>
          </div>
        </div>

        <!-- 热门 TOP10 -->
        <div class="mc-card" style="margin:12px">
          <div class="mc-title" style="font-size:14px;font-weight:600;margin-bottom:10px">热门图片 TOP10（按点击）</div>
          <div v-if="!overview?.hot_top?.length" class="mc-tip" style="padding:16px 0">暂无数据</div>
          <div v-for="(row, i) in overview?.hot_top || []" :key="row.id" style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f2f4f7">
            <span style="width:20px;text-align:center;font-weight:700;color:#c0c4cc">{{ i + 1 }}</span>
            <img v-if="row.image_url" :src="row.image_url" style="width:44px;height:44px;border-radius:6px;object-fit:cover;flex-shrink:0" />
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#1a1a2e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ row.title || '(无标题)' }}</div>
              <div style="font-size:11px;color:#999">👆 {{ row.click_cnt ?? 0 }} 次</div>
            </div>
            <span class="mc-mod" :class="row.recommended == 1 ? 'm-safe' : 'm-unsafe'">{{ row.recommended == 1 ? '在池' : '移出' }}</span>
          </div>
        </div>
      </template>

      <!-- ══════════ 分区：推荐池 ══════════ -->
      <template v-else-if="activeSection === 'pool'">
        <div class="mc-toolbar">
          <input v-model="search" class="mc-search" placeholder="搜索标题" @keyup.enter="searchContents" />
          <div class="mc-fbtn" @click="searchContents">搜索</div>
        </div>
        <div class="mc-filters">
          <select v-model="category" class="mc-select" @change="searchContents">
            <option value="">全部分类</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>
          <select v-model="source" class="mc-select" @change="searchContents">
            <option value="">全部来源</option>
            <option value="doo">Doo App</option>
            <option value="goo">Goo 迁移</option>
          </select>
        </div>
        <div class="mc-list">
          <div v-if="loading" class="mc-tip">加载中...</div>
          <div v-else-if="!contents.length" class="mc-tip">暂无内容</div>
          <div v-for="row in contents" :key="row.id" class="mc-card" @click.stop>
            <div class="mc-card-top">
              <div class="mc-thumb" v-if="row.image_url">
                <img :src="row.image_url" alt="" />
              </div>
              <div class="mc-thumb mc-thumb-empty" v-else>{{ row.video_url ? '▶' : '无图' }}</div>
              <div class="mc-card-info">
                <div class="mc-title">{{ row.title || '(无标题)' }}</div>
                <div class="mc-meta">{{ row.source === 'goo' ? 'Goo 迁移' : 'Doo' }} · {{ row.category || '未分类' }}</div>
                <div class="mc-data">点击 {{ row.click_cnt || 0 }} · #{{ row.id }} {{ row.is_pinned == 1 ? '· 置顶' : '' }}</div>
              </div>
              <span class="mc-mod" :class="row.recommended == 1 ? 'm-safe' : 'm-unsafe'">{{ row.recommended == 1 ? '在池' : '移出' }}</span>
            </div>
            <div class="mc-tags" v-if="safeTags(row.tags).length">
              <span v-for="t in safeTags(row.tags)" :key="t" class="mc-tag">{{ t }}</span>
            </div>
            <div class="mc-actions">
              <span class="mc-act" :class="{ ok: row.recommended == 1, 'is-loading': toggling === row.id }" @click.stop="toggleRecommend(row, row.recommended == 1 ? 0 : 1)">{{ row.recommended == 1 ? '移出推荐' : '参与推荐' }}</span>
              <span class="mc-act pinned" :class="{ disabled: row.recommended != 1 }" @click.stop="pinContent(row, row.is_pinned == 1 ? 0 : 1)">{{ row.is_pinned == 1 ? '取消置顶' : '置顶主推' }}</span>
              <span class="mc-act warn" :class="{ 'is-loading': tagging === row.id }" @click.stop="tagOne(row)">AI 打标</span>
            </div>
          </div>
          <div class="mc-more" v-if="mLoadingMore">加载中...</div>
          <div class="mc-more" v-else-if="!contentsHasMore && contents.length">没有更多了</div>
          <div class="mc-more" v-else-if="contents.length">上拉加载更多</div>
        </div>
      </template>

      <!-- ══════════ 分区：相似图片组 ══════════ -->
      <template v-else-if="activeSection === 'groups'">
        <div class="mc-tip" style="padding:8px 0 4px">共 {{ groups?.total_categories ?? '-' }} 类 · {{ groups?.total_items ?? '-' }} 张图片</div>
        <div class="mc-list">
          <div v-if="!groups?.groups?.length" class="mc-tip">暂无内容</div>
          <div v-for="g in groups?.groups || []" :key="g.category" class="mc-card" @click.stop>
            <div class="mc-card-top">
              <div class="mc-title" style="flex:1">{{ g.category }}（{{ g.size }} 张）</div>
              <span class="mc-mod m-safe">推荐 {{ g.recommended_count }}</span>
            </div>
            <div v-if="g.items?.length" class="mc-tags" style="gap:8px">
              <div v-for="it in g.items" :key="it.id" style="width:72px;text-align:center">
                <img :src="it.image_url" style="width:72px;height:72px;border-radius:8px;object-fit:cover" />
                <div style="font-size:10px;color:#999;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👆 {{ it.click_cnt }}</div>
              </div>
            </div>
            <div class="mc-meta" style="margin-top:8px">该类总点击 {{ g.click_total }}</div>
          </div>
        </div>
      </template>

      <!-- ══════════ 分区：指纹去重 ══════════ -->
      <template v-else-if="activeSection === 'fp'">
        <div class="mc-tip" style="padding:8px 0 4px">指纹 {{ fp?.total_fingerprints ?? '-' }} · 同源组 {{ fp?.groups?.length ?? '-' }} · 未分组 {{ fp?.ungrouped ?? '-' }}</div>
        <div class="mc-toolbar" style="justify-content:stretch">
          <div class="mc-fbtn" style="flex:1;background:#f4f6fb;color:#e64340" :class="{ 'is-loading': batchDeduping }" @click="dedupAllGroupsMobile">一键去重全部（{{ needDedupCount }} 组）</div>
        </div>
        <div class="mc-list">
          <div v-if="!fp?.groups?.length" class="mc-tip">暂无同源图组</div>
          <div v-for="g in fp?.groups || []" :key="'fp-'+g.group_id" class="mc-card" @click.stop>
            <div class="mc-card-top">
              <div class="mc-title" style="flex:1">同源组 {{ g.group_id }}（{{ g.size }} 张）</div>
              <span class="mc-mod" :class="g.recommended_count > 1 ? 'm-unsafe' : 'm-safe'">{{ g.recommended_count > 1 ? g.recommended_count + ' 张需去重' : '已去重' }}</span>
            </div>
            <div v-if="g.items?.length" class="mc-tags" style="gap:8px">
              <div v-for="it in g.items" :key="it.id" style="width:72px;text-align:center">
                <img :src="it.image_url" style="width:72px;height:72px;border-radius:8px;object-fit:cover" />
                <span class="mc-mod" :class="it.recommended ? 'm-safe' : 'm-unsafe'" style="margin-top:2px">{{ it.recommended ? '推荐中' : '已移出' }}</span>
              </div>
            </div>
            <div class="mc-meta" v-for="(p, pi) in g.pairs || []" :key="'p'+pi" style="margin-top:6px">
              {{ fpNameOf(g, p.a) }} ↔ {{ fpNameOf(g, p.b) }} · <span :style="{ color: p.similarity >= 90 ? '#e64340' : '#2f6bf0', fontWeight: 600 }">{{ p.similarity }}%</span>
            </div>
            <div v-if="g.recommended_count > 1" class="mc-actions">
              <span class="mc-act danger" :class="{ 'is-loading': deduping === g.group_id }" @click.stop="dedupGroup(g.group_id)">一键去重</span>
            </div>
          </div>
        </div>
      </template>

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

    <!-- ==================== 桌面端（原有，保留） ==================== -->
    <template v-else>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">内容推荐管理</h2>
      <el-button size="small" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <!-- 概览 -->
    <el-row :gutter="16" style="margin-bottom:16px">
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">图片内容</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ overview?.total ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">参与推荐 {{ overview?.recommended_on ?? '-' }}</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">点击行为</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ overview?.behavior_count?.toLocaleString() ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">次 content_click</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">活跃用户</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#222a47">{{ overview?.behavior_users ?? '-' }}</div>
          <div style="font-size:12px;color:#909399">有行为记录</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="never">
          <div style="font-size:12px;color:#909399">点击率 CTR</div>
          <div style="margin-top:6px;font-size:20px;font-weight:700;color:#2f6bf0">{{ overview?.ctr ?? '-' }}%</div>
          <div style="font-size:12px;color:#909399">点击 / 曝光</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 算法信息 + 行为分布 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <span>推荐算法（融合版 v1.0）</span>
      </template>
      <el-row :gutter="16">
        <el-col :span="12">
          <div style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:100px">算法公式</span><code>{{ overview?.algorithm?.weights }}</code></div>
            <div><span style="color:#999;display:inline-block;width:100px">行为权重</span>{{ overview?.algorithm?.behavior_weights }}</div>
            <div><span style="color:#999;display:inline-block;width:100px">时间衰减</span>{{ overview?.algorithm?.decay_days }} 天半衰 · 分类打散 ≤ {{ overview?.algorithm?.mmr_limit }} 条</div>
          </div>
        </el-col>
        <el-col :span="12">
          <div style="font-size:13px;color:#555;line-height:2.2">
            <div><span style="color:#999;display:inline-block;width:100px">内容点击</span>{{ overview?.behavior?.content_click?.toLocaleString() }}</div>
            <div><span style="color:#999;display:inline-block;width:100px">页面浏览</span>{{ overview?.behavior?.page_view?.toLocaleString() }} · 停留 {{ overview?.behavior?.page_stay?.toLocaleString() }}</div>
            <div><span style="color:#999;display:inline-block;width:100px">推荐曝光</span>{{ overview?.behavior?.rec_view?.toLocaleString() }} · 活跃用户 {{ overview?.behavior_users }}</div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 算法参数手调 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>推荐算法参数（可手调，实时生效）</span>
          <div style="display:flex;gap:8px">
            <el-button size="small" text :loading="algoLoading" @click="loadAlgoConfig">重置为当前</el-button>
            <el-button size="small" type="primary" :loading="savingAlgo" @click="saveAlgoConfig">保存参数</el-button>
          </div>
        </div>
      </template>
      <el-form :model="algo" label-width="110px" size="small" style="max-width:860px">
        <el-divider content-position="left" style="margin:0 0 10px">融合权重（合计 ≈ 1）</el-divider>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="内容匹配 CB"><el-input-number v-model="algo.w_cb" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="UserCF"><el-input-number v-model="algo.w_cf" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="ItemCF"><el-input-number v-model="algo.w_itemcf" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="热度 Hot"><el-input-number v-model="algo.w_hot" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left" style="margin:0 0 10px">探索比例（按行为量动态取档）</el-divider>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="冷启动"><el-input-number v-model="algo.explore_cold" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="成长期"><el-input-number v-model="algo.explore_grow" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="成熟期"><el-input-number v-model="algo.explore_mature" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="每屏条数(0=不限)"><el-input-number v-model="algo.total_need" :min="0" :max="200" :step="10" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <el-divider content-position="left" style="margin:0 0 10px">行为权重与衰减</el-divider>
        <el-row :gutter="16">
          <el-col :span="6"><el-form-item label="点击权重"><el-input-number v-model="algo.w_click" :min="0" :max="50" :step="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="停留上限"><el-input-number v-model="algo.w_stay_max" :min="1" :max="20" :step="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="浏览权重"><el-input-number v-model="algo.w_view" :min="0" :max="10" :step="0.5" :precision="1" style="width:100%" /></el-form-item></el-col>
          <el-col :span="6"><el-form-item label="衰减天数"><el-input-number v-model="algo.decay_days" :min="1" :max="180" :step="5" style="width:100%" /></el-form-item></el-col>
        </el-row>
        <div style="font-size:12px;color:#909399;margin-top:4px">
          保存后推荐缓存自动清空，下一次请求立即按新参数出结果。当前公式：
          <code>{{ algoText }}</code>
        </div>
      </el-form>
    </el-card>

    <el-row :gutter="16">
      <!-- 热门 TOP10 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>热门图片 TOP10（按点击）</template>
          <el-table :data="overview?.hot_top || []" size="small" max-height="440">
            <el-table-column type="index" label="#" width="50" />
            <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip>
              <template #default="{row}">
                <div style="display:flex;align-items:center;gap:8px">
                  <el-image :src="row.image_url" style="width:36px;height:36px;border-radius:4px" fit="cover" />
                  <span>{{ row.title || '(无标题)' }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="点击" width="70" align="right">
              <template #default="{row}">{{ row.click_cnt }}</template>
            </el-table-column>
            <el-table-column label="推荐" width="70">
              <template #default="{row}">
                <el-tag :type="row.recommended == 1 ? 'success' : 'info'" size="small">{{ row.recommended == 1 ? '在池' : '移出' }}</el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 推荐池管理 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span>推荐池（图片内容）</span>
              <div style="display:flex;gap:8px">
                <el-input v-model="search" placeholder="搜索标题" size="small" style="width:140px" clearable @keyup.enter="loadContents" />
                <el-select v-model="source" placeholder="全部来源" size="small" style="width:110px" clearable @change="loadContents">
                  <el-option label="Doo App" value="doo" />
                  <el-option label="Goo 迁移" value="goo" />
                </el-select>
                <el-select v-model="category" placeholder="全部分类" size="small" style="width:130px" clearable @change="loadContents">
                  <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
                </el-select>
                <el-button size="small" @click="loadContents">查询</el-button>
              </div>
            </div>
          </template>
          <el-table :data="contents" size="small" max-height="440">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="媒体" width="80">
              <template #default="{row}">
                <el-image v-if="row.image_url" :src="row.image_url" style="width:52px;height:52px;border-radius:4px" fit="cover" />
                <el-tag v-else-if="row.video_url" type="danger" size="small">视频</el-tag>
                <span v-else style="color:#c0c4cc">—</span>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
            <el-table-column label="来源" width="90">
              <template #default="{row}">
                <el-tag :type="row.source === 'goo' ? 'warning' : 'primary'" size="small" effect="plain">{{ row.source === 'goo' ? 'Goo 迁移' : 'Doo' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分类" width="90" />
            <el-table-column label="AI 标签" min-width="130">
              <template #default="{row}">
                <div v-if="row.tags && row.tags !== ''" style="display:flex;flex-wrap:wrap;gap:3px">
                  <el-tag v-for="t in safeTags(row.tags)" :key="t" size="small" type="info" effect="plain" style="margin:1px 0">{{ t }}</el-tag>
                </div>
                <span v-else style="color:#c0c4cc;font-size:12px">—</span>
              </template>
            </el-table-column>
            <el-table-column label="AI 打标" width="85" align="center">
              <template #default="{row}">
                <el-button size="small" type="primary" link :loading="tagging === row.id" @click="tagOne(row)">AI 打标</el-button>
              </template>
            </el-table-column>
            <el-table-column label="点击" width="70" align="right">
              <template #default="{row}">{{ row.click_cnt }}</template>
            </el-table-column>
            <el-table-column label="参与推荐" width="90">
              <template #default="{row}">
                <el-switch :model-value="row.recommended == 1" :loading="toggling === row.id" @change="(v) => toggleRecommend(row, v)" />
              </template>
            </el-table-column>
            <el-table-column label="主推" width="110" align="center">
              <template #default="{row}">
                <el-button v-if="row.is_pinned == 1" size="small" type="danger" link :loading="pinning === row.id" @click="pinContent(row, 0)">
                  ⭐ 已置顶
                </el-button>
                <el-button v-else size="small" type="warning" link :disabled="row.recommended != 1" :loading="pinning === row.id" @click="pinContent(row, 1)">
                  置顶主推
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- 相似图片组（按类别） -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>相似图片组（按类别分组）</span>
          <span style="font-size:12px;color:#909399">共 {{ groups?.total_categories ?? '-' }} 类 · {{ groups?.total_items ?? '-' }} 张图片</span>
        </div>
      </template>
      <el-empty v-if="groups && (!groups.groups || !groups.groups.length)" description="暂无内容" />
      <div v-else style="display:flex;flex-direction:column;gap:12px">
        <el-card v-for="g in groups?.groups || []" :key="g.category" shadow="never" style="border:1px solid #f0f2f5">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
            <span style="font-weight:600;font-size:14px;color:#222a47">{{ g.category }}（{{ g.size }} 张）</span>
            <span>
              <el-tag size="small" type="success" style="margin-right:6px">推荐 {{ g.recommended_count }}</el-tag>
              <el-tag size="small" type="warning">点击 {{ g.click_total }}</el-tag>
            </span>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div v-for="it in g.items" :key="it.id" style="width:120px;text-align:center">
              <el-image :src="it.image_url" style="width:120px;height:120px;border-radius:8px" fit="cover" :preview-src-list="[it.image_url]" preview-teleported />
              <div style="font-size:12px;color:#666;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ it.title }}</div>
              <div style="font-size:11px;color:#999">点击 {{ it.click_cnt }}</div>
            </div>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- 视觉指纹去重（独立功能：同源图识别 + 一键去重） -->
    <el-card shadow="never" style="margin-top:16px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>视觉指纹去重（pHash 同源图识别）</span>
          <span style="font-size:12px;color:#909399">指纹 {{ fp?.total_fingerprints ?? '-' }} · 同源组 {{ fp?.groups?.length ?? '-' }} · 未分组 {{ fp?.ungrouped ?? '-' }}</span>
        </div>
      </template>
      <el-empty v-if="fp && (!fp.groups || !fp.groups.length)" description="暂无同源图组（cron 指纹任务每小时增量，每天 4:20 SIFT 复核）" />
      <div v-else style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 12px;background:#f7f8fa;border-radius:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <el-checkbox v-model="selectAllFp" :indeterminate="fpIndeterminate" @change="onSelectAllFp">
              全选需去重组（{{ needDedupCount }} 组）
            </el-checkbox>
            <span style="font-size:12px;color:#909399">已选 {{ selectedGroups.length }} 组</span>
          </div>
          <div>
            <el-button size="small" type="primary" :disabled="!selectedGroups.length" :loading="batchDeduping" @click="dedupSelected">
              去重所选（{{ selectedGroups.length }}）
            </el-button>
            <el-button size="small" type="danger" :disabled="!needDedupCount" :loading="batchDeduping" @click="dedupAllGroups">
              全部一键去重（{{ needDedupCount }} 组）
            </el-button>
          </div>
        </div>
        <el-card v-for="g in fp?.groups || []" :key="'fp-'+g.group_id" shadow="never" style="border:1px solid #f0f2f5">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
            <span style="font-weight:600;font-size:14px;color:#222a47">
              <el-checkbox v-model="selectedGroups" :value="g.group_id" :disabled="g.recommended_count <= 1" style="margin-right:6px" />
              同源组 {{ g.group_id }}（{{ g.size }} 张）
            </span>
            <span>
              <el-tag v-if="g.recommended_count > 1" type="danger" size="small" style="margin-right:6px">{{ g.recommended_count }} 张在推荐池（需去重）</el-tag>
              <el-tag v-else type="success" size="small" style="margin-right:6px">已去重</el-tag>
              <el-button v-if="g.recommended_count > 1" size="small" type="danger" :loading="deduping === g.group_id" @click="dedupGroup(g.group_id)">一键去重</el-button>
            </span>
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <div v-for="it in g.items" :key="it.id" style="width:120px;text-align:center">
              <el-image :src="it.image_url" style="width:120px;height:120px;border-radius:8px" fit="cover" :preview-src-list="[it.image_url]" preview-teleported />
              <div style="font-size:12px;color:#666;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ it.title }}</div>
              <el-tag :type="it.recommended ? 'success' : 'info'" size="small" style="margin-top:2px">{{ it.recommended ? '推荐中' : '已移出' }}</el-tag>
            </div>
          </div>
          <el-divider v-if="g.pairs.length" style="margin:8px 0" />
          <div v-for="(p, pi) in g.pairs" :key="'p'+pi" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px">
            <span style="color:#555">{{ fpNameOf(g, p.a) }} ↔ {{ fpNameOf(g, p.b) }}</span>
            <span :style="{ color: p.similarity >= 90 ? '#e64340' : '#2f6bf0', fontWeight: 600 }">{{ p.similarity }}%</span>
          </div>
        </el-card>
      </div>
    </el-card>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

// 移动端功能分区
const sections = [
  { key: 'overview', label: '概览' },
  { key: 'pool', label: '推荐池' },
  { key: 'groups', label: '相似组' },
  { key: 'fp', label: '去重' }
]
const activeSection = ref('overview')
const switchSection = (key) => {
  activeSection.value = key
  if (key === 'overview') loadOverview()
  else if (key === 'pool') loadContents()
  else if (key === 'groups') loadGroups()
  else if (key === 'fp') loadFingerprints()
}
// 移动端操作确认：底部弹层（mc-mask + mc-sheet）；桌面端仍用 ElMessageBox
const mConfirm = ref(null)
const mAsk = (message, onOk, title = '操作确认') => { mConfirm.value = { title, message, onOk } }
const mDoConfirm = async () => {
  const c = mConfirm.value
  mConfirm.value = null
  if (c && typeof c.onOk === 'function') { try { await c.onOk() } catch (e) { /* 由调用方处理 */ } }
}

// 移动端一次性确认后去重全部（复用后端 all=1 逻辑）
const dedupAllGroupsMobile = () => {
  const n = needDedupCount.value
  if (!n) { ElMessage.info('没有需去重的同源组'); return }
  mAsk(`将对全部 ${n} 个需去重组执行去重：每组保留点击最高的 1 张，其余同源图移出推荐池。确定？`, () => runDedup({ all: 1 }), '全部一键去重')
}

const loading = ref(false)
const overview = ref(null)
const contents = ref([])
const categories = ref([])
const search = ref('')
const category = ref('')
const source = ref('')
const toggling = ref(0)
const groups = ref(null)
const fp = ref(null)
const deduping = ref(0)
const tagging = ref(0)
// 算法参数
const algo = ref({
  w_cb: 0.4, w_cf: 0.2, w_itemcf: 0.2, w_hot: 0.2,
  explore_cold: 0.5, explore_grow: 0.35, explore_mature: 0.2,
  total_need: 50, w_click: 10, w_stay_max: 5, w_view: 1, decay_days: 30
})
const algoLoading = ref(false)
const savingAlgo = ref(false)
const algoText = computed(() => {
  const a = algo.value
  return `CB ${Number(a.w_cb || 0).toFixed(2)} + UserCF ${Number(a.w_cf || 0).toFixed(2)} + ItemCF ${Number(a.w_itemcf || 0).toFixed(2)} + Hot ${Number(a.w_hot || 0).toFixed(2)}`
})

// 读取当前算法参数（服务器生效值）
const loadAlgoConfig = async () => {
  algoLoading.value = true
  try {
    const r = await api.get('/admin_recommend.php', { params: { action: 'algo_config' } })
    if (r.data.code === 200 && r.data.data?.algo) Object.assign(algo.value, r.data.data.algo)
  } catch (e) { /* ignore */ }
  algoLoading.value = false
}

// 保存算法参数
const saveAlgoConfig = async () => {
  savingAlgo.value = true
  try {
    const r = await api.post('/admin_recommend.php', { action: 'save_algo_config', ...algo.value })
    if (r.data.code === 200) { ElMessage.success(r.data.message); loadOverview() }
    else ElMessage.error(r.data.message || '保存失败')
  } catch (e) { ElMessage.error('保存失败') }
  savingAlgo.value = false
}

// 解析 tags JSON（"[\"a\",\"b\"]" 或 "a,b"）
const safeTags = (raw) => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : [] } catch (e) { return [] }
}

const tagOne = async (row) => {
  tagging.value = row.id
  try {
    const r = await api.post('/admin_recommend.php', { action: 'tag_one', id: row.id })
    if (r.data.code === 200) {
      row.category = r.data.data.category
      row.tags = JSON.stringify(r.data.data.tags)
      ElMessage.success(`已打标：${r.data.data.category}（${(r.data.data.tags || []).join('、')}）`)
    } else {
      ElMessage.error(r.data.message || '打标失败')
    }
  } catch (e) {
    ElMessage.error('请求失败')
  } finally {
    tagging.value = 0
    loadGroups()
  }
}

const loadGroups = async () => {
  try {
    const r = await api.get('/admin_recommend.php', { params: { action: 'groups' } })
    if (r.data.code === 200) groups.value = r.data.data
  } catch (e) { /* ignore */ }
}

const loadFingerprints = async () => {
  try {
    const r = await api.get('/admin_recommend.php', { params: { action: 'fingerprints' } })
    if (r.data.code === 200) fp.value = r.data.data
  } catch (e) { /* ignore */ }
}

const fpNameOf = (g, id) => {
  const it = (g.items || []).find(x => x.id === id)
  return it ? it.title : ('#' + id)
}

// 指纹组选择 + 批量/全部去重
const selectedGroups = ref([])
const selectAllFp = ref(false)
const batchDeduping = ref(false)
const needDedupCount = computed(() => (fp.value?.groups || []).filter(g => g.recommended_count > 1).length)
const fpIndeterminate = computed(() => selectedGroups.value.length > 0 && selectedGroups.value.length < needDedupCount.value)
const onSelectAllFp = (v) => {
  if (v) selectedGroups.value = (fp.value?.groups || []).filter(g => g.recommended_count > 1).map(g => g.group_id)
  else selectedGroups.value = []
}
const runDedup = async (payload, tip) => {
  batchDeduping.value = true
  try {
    const r = await api.post('/admin_recommend.php', { action: 'dedup', ...payload })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || '去重完成')
      selectedGroups.value = []
      selectAllFp.value = false
      await loadFingerprints()
      await loadOverview()
    } else {
      ElMessage.error(r.data.message || '去重失败')
    }
  } catch (e) { ElMessage.error('去重失败') }
  batchDeduping.value = false
}
const dedupSelected = async () => {
  if (!selectedGroups.value.length) return
  try {
    await ElMessageBox.confirm(`将对所选 ${selectedGroups.value.length} 组执行去重：每组保留点击最高的 1 张，其余同源图移出推荐池。确定？`, '去重所选组', { type: 'warning' })
  } catch (e) { return }
  await runDedup({ group_ids: selectedGroups.value })
}
const dedupAllGroups = async () => {
  try {
    await ElMessageBox.confirm(`将对全部 ${needDedupCount.value} 个需去重组执行去重：每组保留点击最高的 1 张，其余同源图移出推荐池。确定？`, '全部一键去重', { type: 'warning' })
  } catch (e) { return }
  await runDedup({ all: 1 })
}

const doDedupGroup = async (gid) => {
  deduping.value = gid
  try {
    const r = await api.post('/admin_recommend.php', { action: 'dedup', group_id: gid })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || '去重完成')
      await loadFingerprints()
      await loadOverview()
    } else {
      ElMessage.error(r.data.message || '去重失败')
    }
  } catch (e) { ElMessage.error('去重失败') }
  deduping.value = 0
}
const dedupGroup = async (gid) => {
  const message = '去重规则：组内保留点击最高的 1 张，其余同源图移出推荐池。确定执行？'
  if (isMobile.value) { mAsk(message, () => doDedupGroup(gid), '一键去重'); return }
  try { await ElMessageBox.confirm(message, '一键去重', { type: 'warning' }) } catch (e) { return }
  doDedupGroup(gid)
}

const loadOverview = async () => {
  try {
    const r = await api.get('/admin_recommend.php')
    if (r.data.code === 200) overview.value = r.data.data
  } catch (e) { /* ignore */ }
}

const loadContents = async (page = 1, append = false) => {
  // 移动端分页参数；桌面端保持一次拉全量（不传 page 时桌面分页逻辑不启用）
  const params = { action: 'contents', search: search.value || undefined, category: category.value || undefined, source: source.value || undefined }
  if (isMobile.value) { params.page = page; params.limit = contentsPageSize }
  try {
    const r = await api.get('/admin_recommend.php', { params })
    if (r.data.code === 200) {
      const items = r.data.data.items || []
      contents.value = append ? contents.value.concat(items) : items
      if (r.data.data.categories) categories.value = r.data.data.categories
      if (isMobile.value) {
        contentsTotal.value = r.data.data.total || contents.value.length
        if (append) contentsPage.value = page
        return true
      }
    }
  } catch (e) { /* ignore */ }
  return false
}

// ============ 移动端：滚动到底自动上拉加载下一页 ============
const contentsPage = ref(1)
const contentsTotal = ref(0)
const contentsPageSize = 12
const mLoadingMore = ref(false)
const contentsHasMore = computed(() => contents.value.length < contentsTotal.value)

const searchContents = async () => {
  contentsPage.value = 1
  loading.value = true
  try { await loadContents(1, false) } catch (e) { /* ignore */ }
  loading.value = false
}

const loadMoreContents = async () => {
  if (!isMobile.value || mLoadingMore.value || !contentsHasMore.value) return
  mLoadingMore.value = true
  const ok = await loadContents(contentsPage.value + 1, true)
  if (!ok) contentsPage.value -= 1 // 失败回退页码
  mLoadingMore.value = false
}

// 移动端滚动容器是 .admin-main（el-main），用捕获监听滚动判断距底 40px
const onScroll = () => {
  if (!isMobile.value) return
  const el = document.querySelector('.admin-main')
  if (!el) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) loadMoreContents()
}

const toggleRecommend = async (row, val) => {
  toggling.value = row.id
  try {
    const r = await api.post('/admin_recommend.php', { action: 'toggle', id: row.id, recommended: val ? 1 : 0 })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || '操作成功')
      await loadContents()
      await loadOverview()
    } else {
      ElMessage.error(r.data.message || '操作失败')
    }
  } catch (e) { ElMessage.error('操作失败') }
  toggling.value = 0
}

// 置顶/主推（is_pinned）
const pinning = ref(0)
const doPin = async (row, pinned) => {
  pinning.value = row.id
  try {
    const r = await api.post('/admin_recommend.php', { action: 'pin', id: row.id, pinned: pinned ? 1 : 0 })
    if (r.data.code === 200) {
      ElMessage.success(r.data.message || '操作成功')
      await loadContents()
    } else {
      ElMessage.error(r.data.message || '操作失败')
    }
  } catch (e) { ElMessage.error('操作失败') }
  pinning.value = 0
}
const pinContent = async (row, pinned) => {
  const message = pinned ? `将 #${row.id}「${row.title || ''}」置顶到推荐流最前（所有用户可见）。确定？` : `取消 #${row.id} 的置顶？`
  const title = pinned ? '置顶主推' : '取消置顶'
  if (isMobile.value) { mAsk(message, () => doPin(row, pinned), title); return }
  try { await ElMessageBox.confirm(message, title, { type: pinned ? 'warning' : 'info' }) } catch (e) { return }
  doPin(row, pinned)
}

const loadAll = async () => {
  loading.value = true
  await Promise.all([loadOverview(), loadContents(), loadGroups(), loadFingerprints(), loadAlgoConfig()])
  loading.value = false
}

onMounted(() => {
  loadAll()
  document.addEventListener('scroll', onScroll, true)
})
onUnmounted(() => {
  document.removeEventListener('scroll', onScroll, true)
})
</script>

<style scoped>
/* 移动端确认文案 */
.mc-del-text { font-size: 14px; color: #555; line-height: 1.7; word-break: break-all; }
/* 算法参数：每行一个参数，输入框占满整行、可正常编辑 */
.mc-form-row { width: 100%; }
.mc-form-row input { width: 100%; box-sizing: border-box; -webkit-appearance: none; appearance: none; }
.mc-form-group { font-size: 12px; font-weight: 600; color: #2f6bf0; margin: 14px 0 8px; }
.mc-hint { display: block; font-size: 11px; color: #a0a4ad; font-weight: 400; margin-top: 2px; }
</style>
