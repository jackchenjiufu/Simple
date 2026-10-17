<template>
  <view class="apnl panel">
    <view class="page">
      <!-- 统计四格：命中 / 真人 / 待裁决 / 已过滤（全部取后端口径） -->
      <view class="card stats">
          <view class="stat">
            <text class="stat-n">{{ ready ? today.total : '—' }}</text>
            <text class="stat-l">命中</text>
          </view>
          <view class="stat stat-line">
            <text class="stat-n">{{ ready ? today.human : '—' }}</text>
            <text class="stat-l">真人</text>
          </view>
          <view class="stat stat-line">
            <text class="stat-n stat-n-blue">{{ ready ? today.pending : '—' }}</text>
            <text class="stat-l">待裁决</text>
          </view>
          <view class="stat stat-line">
            <text class="stat-n">{{ ready ? today.filtered : '—' }}</text>
            <text class="stat-l">已过滤</text>
          </view>
        </view>

        <!-- 状态筛选：全部 / 待裁决 / 真人 / 已过滤（数字取今日口径） -->
        <view class="fchips">
          <view
            class="fchip"
            :class="{ 'fchip-on': status === '' }"
            hover-class="chip-hv"
            :hover-stay-time="60"
            @tap="setStatus('')"
          >
            <text class="fchip-t">全部</text>
            <text class="fchip-n">{{ ready ? today.total : '' }}</text>
          </view>
          <view
            class="fchip fchip-warn"
            :class="{ 'fchip-on': status === 'pending' }"
            hover-class="chip-hv"
            :hover-stay-time="60"
            @tap="setStatus('pending')"
          >
            <text class="fchip-t">待裁决</text>
            <text class="fchip-n">{{ ready ? today.pending : '' }}</text>
          </view>
          <view
            class="fchip"
            :class="{ 'fchip-on': status === 'human' }"
            hover-class="chip-hv"
            :hover-stay-time="60"
            @tap="setStatus('human')"
          >
            <text class="fchip-t">真人</text>
            <text class="fchip-n">{{ ready ? today.human : '' }}</text>
          </view>
          <view
            class="fchip"
            :class="{ 'fchip-on': status === 'filtered' }"
            hover-class="chip-hv"
            :hover-stay-time="60"
            @tap="setStatus('filtered')"
          >
            <text class="fchip-t">已过滤</text>
            <text class="fchip-n">{{ ready ? today.filtered : '' }}</text>
          </view>
        </view>

        <!-- 通道筛选：按数据里实际出现的通道动态生成 -->
        <scroll-view class="chips" scroll-x :show-scrollbar="false">
          <view class="chips-in">
            <view
              v-for="c in chanChips"
              :key="c.value === '' ? '__all' : c.value"
              class="chip"
              :class="{ 'chip-on': chan === c.value }"
              hover-class="chip-hv"
              :hover-stay-time="60"
              @tap="setChan(c.value)"
            >
              <text class="chip-t">{{ c.label }}</text>
            </view>
          </view>
        </scroll-view>

        <!-- 加载中 -->
        <view v-if="loading" class="card state">
          <view class="muted">加载中</view>
        </view>

        <!-- 失败重试 -->
        <view v-else-if="error" class="card state">
          <view class="state-t">加载失败</view>
          <view class="muted state-msg">{{ error }}</view>
          <view class="btn" hover-class="btn-hv" @tap="load">
            <view class="btn-t">重试</view>
          </view>
        </view>

        <!-- 三组列表：真人 / 待裁决 / 已过滤 -->
        <template v-else>
          <view v-for="g in groups" :key="g.key">
            <view class="sec">
              <view class="sec-t">{{ g.title }}</view>
              <view class="sec-a" :class="{ 'sec-a-hl': g.key === 'pending' }">{{ g.items.length }} 条</view>
            </view>
            <view class="card">
              <view
                v-for="(it, i) in g.items"
                :key="g.key + '-' + (it.id !== undefined && it.id !== null ? it.id : i)"
                class="it"
                :class="{ 'it-off': g.dim, last: i === g.items.length - 1 }"
                hover-class="it-hv"
                :hover-stay-time="60"
                @tap="openDetail(it, g.key)"
              >
                <view class="thumb">
                  <image
                    v-if="thumbOf(it)"
                    class="thumb-img"
                    :src="thumbOf(it)"
                    mode="aspectFill"
                    @error="onImgError(it)"
                  />
                  <view v-else class="thumb-ph"></view>
                </view>
                <view class="it-main">
                  <view class="it-t">{{ timeOf(it.ts) }} · {{ kindText(it.kind) }}</view>
                  <view class="it-s">{{ it.channel || '未知通道' }} · {{ pushedText(it) }}</view>
                </view>
                <view class="it-score">{{ scorePct(it.score) }}</view>
              </view>
            </view>
          </view>

          <!-- 空状态 -->
          <view v-if="!groups.length" class="card state state-empty">
            <view class="state-t">{{ chan ? '该通道暂无告警' : '今天还没有告警' }}</view>
            <view class="muted state-msg">camctl 上报后会出现在这里</view>
          </view>
        </template>
      </view>

    <!-- 详情浮层：全屏遮罩 + 底部抽屉（保持原有样式与行为） -->
    <view v-if="detailOpen && detailItem" class="ovl" @tap="closeDetail" @touchmove.stop.prevent="noop">
      <view class="sheet" @tap.stop>
        <view class="sheet-head">
          <view class="sheet-t">告警详情</view>
          <view class="sheet-x" hover-class="sheet-x-hv" :hover-stay-time="60" @tap="closeDetail">
            <text class="sheet-x-t">关闭</text>
          </view>
        </view>

        <scroll-view class="sheet-body" scroll-y>
          <view v-if="detailImg" class="d-img-wrap" @tap="previewCurrent">
            <image class="d-img" :src="detailImg" mode="widthFix" />
          </view>
          <view v-else class="d-img-ph">
            <text class="muted">无现场图</text>
          </view>

          <view class="d-rows">
            <view class="d-row">
              <view class="d-k">时间</view>
              <view class="d-v">{{ timeFull(detailItem.ts) }}</view>
            </view>
            <view class="d-row">
              <view class="d-k">通道</view>
              <view class="d-v">{{ detailItem.channel || '未知通道' }}</view>
            </view>
            <view class="d-row">
              <view class="d-k">分类</view>
              <view class="d-v" :class="{ 'd-v-blue': detailItem.kind === 'pending' }">
                {{ kindLabel(detailItem.kind) }}
              </view>
            </view>
            <view class="d-row">
              <view class="d-k">置信度</view>
              <view class="d-v">{{ scorePct(detailItem.score) }}</view>
            </view>
            <view class="d-row">
              <view class="d-k">事件</view>
              <view class="d-v">{{ eventOf(detailItem) }}</view>
            </view>
            <view class="d-row">
              <view class="d-k">说明</view>
              <view class="d-v d-v-wrap">{{ noteOf(detailItem) }}</view>
            </view>
            <view class="d-row">
              <view class="d-k">推送状态</view>
              <view class="d-v">{{ pushedText(detailItem) }}</view>
            </view>
          </view>
        </scroll-view>

        <!-- 裁决按钮 -->
        <view v-if="canVerdict" class="d-act">
          <template v-if="detailItem.kind === 'pending'">
            <view class="b b-ghost" :class="{ 'b-busy': verdictBusy }" hover-class="b-hv" @tap="doVerdict('reject')">
              <text class="b-t b-t-dark">确认不是</text>
            </view>
            <view class="b b-dark" :class="{ 'b-busy': verdictBusy }" hover-class="b-hv" @tap="doVerdict('human')">
              <text class="b-t b-t-light">确认是真人</text>
            </view>
          </template>
          <template v-else>
            <view class="b b-ghost" :class="{ 'b-busy': verdictBusy }" hover-class="b-hv" @tap="doVerdict('reset')">
              <text class="b-t b-t-blue">撤销裁决</text>
            </view>
          </template>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchAlerts, fetchAlertStats, fetchAlertChannels, setAlertVerdict, imageUrl, ensureLogin } from '../../utils/monitor-api.js';

const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
// 通道展示顺序偏好，其余通道按出现顺序补在后面
const CHAN_ORDER = ['道路', '鹅厂前', '鹅厂后'];

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseTs(ts) {
  if (ts === null || ts === undefined || ts === '') return null;
  let d = null;
  if (typeof ts === 'number') {
    d = new Date(ts < 1e12 ? ts * 1000 : ts);
  } else if (typeof ts === 'string') {
    if (/^\d+$/.test(ts)) {
      const n = Number(ts);
      d = new Date(n < 1e12 ? n * 1000 : n);
    } else if (ts.indexOf('T') >= 0 || ts.indexOf('Z') >= 0) {
      d = new Date(ts);
    } else {
      d = new Date(ts.replace(/-/g, '/'));
    }
  }
  if (!d || isNaN(d.getTime())) return null;
  return d;
}

function metaOf(it) {
  const m = it && it.meta;
  if (!m) return {};
  if (typeof m === 'string') {
    try {
      const o = JSON.parse(m);
      return o && typeof o === 'object' ? o : {};
    } catch (e) {
      return {};
    }
  }
  return typeof m === 'object' ? m : {};
}

export default {
  data() {
    return {
      loading: false,
      ready: false,
      error: '',
      status: '',
      chan: '',
      chanList: [],
      stats: { today: {}, daily: [] },
      list: [],
      imgErr: {},
      detailOpen: false,
      detailItem: null,
      detailGroupKey: '',
      verdictBusy: false,
    };
  },
  computed: {
    today() {
      const t = (this.stats && this.stats.today) || {};
      return {
        total: num(t.total),
        human: num(t.human),
        pending: num(t.pending),
        // 直接用后端 filtered，不用 total - pushed 自算
        filtered: num(t.filtered),
        pushed: num(t.pushed),
      };
    },
    // 通道清单：后端配了但今天可能没有数据的通道也要出现在 chips 里
    channels() {
      const out = [];
      const seen = {};
      // 1) 后端通道表（含 0 条）
      (this.chanList || []).forEach((c) => {
        const n = c && c.name ? String(c.name) : '';
        if (!n || seen[n]) return;
        seen[n] = true;
        out.push(n);
      });
      // 2) 数据里出现但通道表没有的（兜底，不丢数据）
      this.list.forEach((it) => {
        const c = it && it.channel ? String(it.channel) : '';
        if (!c || seen[c]) return;
        seen[c] = true;
        out.push(c);
      });
      const head = [];
      CHAN_ORDER.forEach((c) => {
        if (seen[c]) head.push(c);
      });
      const rest = out.filter((c) => CHAN_ORDER.indexOf(c) < 0);
      return head.concat(rest);
    },
    chanChips() {
      const chips = [{ value: '', label: '全部' }];
      this.channels.forEach((c) => chips.push({ value: c, label: c }));
      return chips;
    },

    // 通道 + 状态双重筛选后的列表
    visibleList() {
      let out = this.list;
      if (this.chan) out = out.filter((it) => String((it && it.channel) || '') === this.chan);
      if (this.status) {
        out = out.filter((it) => {
          const k = String((it && it.kind) || '');
          if (this.status === 'filtered') return k !== 'human' && k !== 'pending';
          return k === this.status;
        });
      }
      return out;
    },
    groups() {
      const human = [];
      const pending = [];
      const filtered = [];
      this.visibleList.forEach((it) => {
        const k = String((it && it.kind) || '');
        if (k === 'human') human.push(it);
        else if (k === 'pending') pending.push(it);
        else filtered.push(it);
      });
      // 待裁决置顶，真人次之，已过滤最后
      return [
        { key: 'pending', title: '待裁决', items: pending, dim: false },
        { key: 'human', title: '真人', items: human, dim: false },
        { key: 'filtered', title: '已过滤', items: filtered, dim: true },
      ].filter((g) => g.items.length > 0);
    },
    detailImg() {
      const it = this.detailItem;
      if (!it || !it.image_path) return '';
      if (this.imgErr[this.imgKey(it)]) return '';
      return imageUrl(it.image_path);
    },
    // 放大时可左右滑：本组所有图，current 指向当前这张
    detailUrls() {
      const g = this.groups.find((x) => x.key === this.detailGroupKey);
      const src = g ? g.items : this.visibleList;
      const out = [];
      src.forEach((it) => {
        if (it && it.image_path && !this.imgErr[this.imgKey(it)]) out.push(imageUrl(it.image_path));
      });
      return out;
    },
    canVerdict() {
      const it = this.detailItem;
      if (!it) return false;
      const k = String(it.kind || '');
      if (k === 'pending') return true;
      return k === 'human' && String(it.verdict || '') === 'confirmed';
    },
    daily() {
      const raw = this.stats && Array.isArray(this.stats.daily) ? this.stats.daily : [];
      const rows = raw.slice(-7).map((x) => {
        const total = num(x.total);
        return {
          d: x.d,
          total,
          isToday: this.isTodayKey(x.d),
          label: this.dayLabel(x.d),
        };
      });
      const max = rows.reduce((m, r) => (r.total > m ? r.total : m), 0);
      rows.forEach((r) => {
        r.pct = r.total > 0 && max > 0 ? Math.max(6, Math.round((r.total / max) * 100)) : 0;
      });
      return rows;
    },
    trendSum() {
      const raw = this.stats && Array.isArray(this.stats.daily) ? this.stats.daily : [];
      return raw.slice(-7).reduce((s, x) => s + num(x.total), 0);
    },
  },
  watch: {
    // 裁决后 kind 变了，分组会重算，不需要额外处理
  },
  mounted() {
    if (!ensureLogin()) return;
    this.load();
  },
  methods: {
    noop() {},
    // 供父页面（监控页页签）切换过来时主动刷新
    reload() {
      this.load();
    },
    async load() {
      if (!this.ready) this.loading = true;
      this.error = '';
      try {
        const [s, l, ch] = await Promise.all([fetchAlertStats(7), fetchAlerts(50), fetchAlertChannels()]);
        this.stats = s && typeof s === 'object' ? s : { today: {}, daily: [] };
        this.list = Array.isArray(l) ? l : [];
        this.chanList = Array.isArray(ch) ? ch : [];
        // 选中的通道若已不存在，回到「全部」
        if (this.chan && this.channels.indexOf(this.chan) < 0) this.chan = '';
      } catch (e) {
        this.error = (e && e.message) || '网络错误';
      } finally {
        this.loading = false;
        this.ready = true;
      }
    },
    async reloadStats() {
      try {
        const s = await fetchAlertStats(7);
        this.stats = s && typeof s === 'object' ? s : { today: {}, daily: [] };
      } catch (e) {
        // 统计刷新失败不阻塞裁决结果，但仍提示真实错误
        uni.showToast({ title: (e && e.message) || '统计刷新失败', icon: 'none' });
      }
    },
    setChan(v) {
      const next = v || '';
      if (next === this.chan) return;
      this.chan = next;
    },
    setStatus(v) {
      const next = v || '';
      if (next === this.status) return;
      this.status = next;
    },
    /* ===== 详情浮层 ===== */
    openDetail(it, groupKey) {
      if (!it) return;
      this.detailGroupKey = groupKey || '';
      this.detailItem = it;
      this.detailOpen = true;
    },
    closeDetail() {
      this.detailOpen = false;
      this.detailItem = null;
      this.detailGroupKey = '';
    },
    previewCurrent() {
      const urls = this.detailUrls;
      const cur = this.detailImg;
      if (!cur || !urls.length) return;
      uni.previewImage({
        urls,
        current: cur,
      });
    },
    /* ===== 人工裁决 ===== */
    async doVerdict(action) {
      const it = this.detailItem;
      if (!it || this.verdictBusy) return;
      if (action !== 'human' && action !== 'reject' && action !== 'reset') return;
      this.verdictBusy = true;
      try {
        const r = await setAlertVerdict(it.id, action);
        const res = r && typeof r === 'object' ? r : {};
        // 就地更新这条记录
        if (action === 'human') {
          it.kind = res.kind || 'human';
          it.verdict = res.verdict || 'confirmed';
        } else if (action === 'reject') {
          it.kind = res.kind || 'other';
          it.verdict = res.verdict || 'rejected';
        } else {
          it.kind = res.kind || 'pending';
          it.verdict = res.verdict || 'pending';
        }
        await this.reloadStats();
        this.closeDetail();
        uni.showToast({
          title: action === 'human' ? '已确认' : action === 'reject' ? '已过滤' : '已撤销',
          icon: 'none',
        });
      } catch (e) {
        uni.showToast({ title: (e && e.message) || '操作失败', icon: 'none' });
      } finally {
        this.verdictBusy = false;
      }
    },
    /* ===== 展示工具 ===== */
    isTodayKey(d) {
      return this.dayKey(d) === this.todayKey();
    },
    todayKey() {
      const t = new Date();
      return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    },
    dayKey(d) {
      if (d === null || d === undefined) return '';
      return String(d).slice(0, 10);
    },
    dayLabel(d) {
      if (this.isTodayKey(d)) return '今天';
      const key = this.dayKey(d);
      const p = key.split('-');
      if (p.length === 3) {
        const dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        if (!isNaN(dt.getTime())) return WEEK[dt.getDay()];
      }
      return key.length >= 5 ? key.slice(5) : '—';
    },
    timeOf(ts) {
      const d = parseTs(ts);
      if (!d) return '--:--';
      return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    },
    timeFull(ts) {
      const d = parseTs(ts);
      if (!d) return '—';
      return (
        d.getFullYear() +
        '-' +
        pad2(d.getMonth() + 1) +
        '-' +
        pad2(d.getDate()) +
        ' ' +
        pad2(d.getHours()) +
        ':' +
        pad2(d.getMinutes()) +
        ':' +
        pad2(d.getSeconds())
      );
    },
    kindText(kind) {
      const k = String(kind || '');
      if (k === 'human') return '真人';
      if (k === 'pending') return '待裁决';
      return '已过滤';
    },
    kindLabel(kind) {
      return this.kindText(kind);
    },
    pushedText(it) {
      const p = it && it.pushed;
      return p === true || p === 1 || p === '1' ? '已推送' : '未推送';
    },
    scorePct(score) {
      if (score === null || score === undefined || score === '') return '—';
      const n = Number(score);
      if (!Number.isFinite(n)) return '—';
      if (n <= 1) return Math.round(n * 100) + '%';
      if (n <= 100) return Math.round(n) + '%';
      return '—';
    },
    eventOf(it) {
      const m = metaOf(it);
      const v = m.event;
      return v === null || v === undefined || v === '' ? '—' : String(v);
    },
    noteOf(it) {
      const m = metaOf(it);
      const v = m.note;
      if (v === null || v === undefined || v === '') return '—';
      return String(v).replace(/\*\*/g, '').trim() || '—';
    },
    imgKey(it) {
      return String(it && it.id !== undefined && it.id !== null ? it.id : '') + '|' + String((it && it.image_path) || '');
    },
    thumbOf(it) {
      if (!it || !it.image_path) return '';
      if (this.imgErr[this.imgKey(it)]) return '';
      return imageUrl(it.image_path);
    },
    onImgError(it) {
      this.imgErr[this.imgKey(it)] = true;
    },
  },
};
</script>

