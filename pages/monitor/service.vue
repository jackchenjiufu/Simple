<template>
  <view class="page" :style="{ paddingTop: (statusBar + headH) + 'px' }">
    <!-- 状态栏遮罩：全页滚动，避免内容钻进系统状态栏 -->
    <view class="sb-mask" :style="{ height: statusBar + 'px' }"></view>

    <!-- 固定标题栏：与 APP 其他页面统一的标准 nav-bar -->
    <view class="hd" :style="{ top: statusBar + 'px' }">
      <view class="nav-back" hover-class="hv" :hover-stay-time="60" @tap="goBack">
        <image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-title">{{ title }}</text>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="card dark sk-card">
      <view class="sk-b sk-h1"></view>
      <view class="sk-b sk-h2"></view>
    </view>

    <!-- 失败 -->
    <view v-else-if="error" class="card err">
      <text class="err-t">加载失败</text>
      <text class="err-m">{{ error }}</text>
      <view class="retry" hover-class="retry-hover" @tap="reload">
        <text class="retry-t">重试</text>
      </view>
    </view>

    <block v-else>
      <!-- 概况 -->
      <view class="card dark">
        <view class="hero-top">
          <view class="badge">
            <text class="badge-t">{{ badge }}</text>
          </view>
          <view class="hero-mid">
            <text class="hero-name">{{ title }}</text>
            <text class="hero-sub">{{ metaText }}</text>
          </view>
          <text class="pill" :class="isOk ? 'pill-ok' : 'pill-off'">{{ isOk ? '在线' : '离线' }}</text>
        </view>
        <view class="hero-num">
          <text class="hero-lat" :class="isOk ? '' : 'hero-lat-off'">{{ isOk ? (latency != null ? latency : '—') : '—' }}</text>
          <text class="hero-unit">ms</text>
        </view>
        <text class="hero-foot">最后检测 {{ lastCheckText }}</text>
      </view>

      <!-- 24 小时统计 -->
      <text class="sec-t">近 24 小时</text>
      <view class="card stats">
        <view class="stat">
          <text class="stat-n" :class="uptimePct >= 99 ? 'ok' : 'warn'">{{ uptimePct }}%</text>
          <text class="stat-l">可用率</text>
        </view>
        <view class="stat stat-line">
          <text class="stat-n">{{ avgLatency == null ? '—' : avgLatency }}</text>
          <text class="stat-l">平均延迟</text>
        </view>
        <view class="stat stat-line">
          <text class="stat-n">{{ hist.length }}</text>
          <text class="stat-l">检测次数</text>
        </view>
        <view class="stat stat-line">
          <text class="stat-n" :class="failCount ? 'warn' : ''">{{ failCount }}</text>
          <text class="stat-l">失败</text>
        </view>
      </view>

      <!-- 延迟趋势 -->
      <text class="sec-t">延迟趋势</text>
      <view class="card chart">
        <view v-if="!bars.length" class="empty">
          <text class="empty-t">暂无采样</text>
        </view>
        <block v-else>
          <view class="bars">
            <view
              v-for="(b, i) in bars"
              :key="i"
              class="bar-wrap"
            >
              <view class="bar" :class="b.ok ? '' : 'bar-fail'" :style="{ height: b.h + '%' }"></view>
            </view>
          </view>
          <view class="chart-foot">
            <text class="chart-lb">{{ barsTime[0] }}</text>
            <text class="chart-lb">峰值 {{ maxLatency }}ms</text>
            <text class="chart-lb">{{ barsTime[1] }}</text>
          </view>
        </block>
      </view>

      <!-- 检测记录 -->
      <text class="sec-t">检测记录</text>
      <view class="card">
        <view v-if="!recent.length" class="empty">
          <text class="empty-t">暂无记录</text>
        </view>
        <view
          v-for="(r, i) in recent"
          :key="i"
          class="row"
          :class="{ 'row-line': i < recent.length - 1 }"
        >
          <view class="dot" :class="r.ok ? 'dot-ok' : 'dot-off'"></view>
          <text class="row-t">{{ r.time }}</text>
          <text class="row-lat">{{ r.ok ? (r.latency != null ? r.latency + 'ms' : '—') : '失败' }}</text>
        </view>
      </view>
    </block>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app';
import { fetchServices, fetchServiceHistory, ensureLogin } from '../../utils/monitor-api.js';
import { guardMonitor } from '../../utils/perm.js';

const statusBar = (() => {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 0;
  } catch (e) {
    return 0;
  }
})();

const HEAD_HEIGHT_RPX = 88;
const headH = (() => {
  try {
    return uni.upx2px(HEAD_HEIGHT_RPX);
  } catch (e) {
    return HEAD_HEIGHT_RPX / 2;
  }
})();

const id = ref(0);
const title = ref('服务');
const svc = ref(null);
const hist = ref([]);
const loading = ref(true);
const error = ref('');
const now = ref(Date.now());

const isOk = computed(() => !!svc.value && Number(svc.value.ok) === 1);
const latency = computed(() => {
  const v = svc.value && svc.value.latency_ms;
  return v == null ? null : Number(v);
});

const badge = computed(() => {
  const n = title.value || '';
  const s = (svc.value && svc.value.skey) || '';
  return (s || n).slice(0, 2).toUpperCase();
});

const metaText = computed(() => {
  if (!svc.value) return '';
  const parts = [];
  const grp = svc.value.grp;
  if (grp === 'cloud') parts.push('云端');
  else if (grp === 'lan') parts.push('内网');
  else if (grp) parts.push(String(grp));
  if (svc.value.kind) parts.push(String(svc.value.kind).toUpperCase());
  if (svc.value.target) parts.push(String(svc.value.target));
  return parts.join(' · ');
});

function fmtTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const lastCheckText = computed(() => (svc.value && svc.value.checked_at ? fmtTime(svc.value.checked_at) : '—'));

const failCount = computed(() => hist.value.filter((x) => Number(x.ok) !== 1).length);

const uptimePct = computed(() => {
  const n = hist.value.length;
  if (!n) return 100;
  const ok = n - failCount.value;
  return Math.round((ok / n) * 1000) / 10;
});

const avgLatency = computed(() => {
  const vals = hist.value.filter((x) => Number(x.ok) === 1 && x.latency_ms != null).map((x) => Number(x.latency_ms));
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
});

const maxLatency = computed(() => {
  const vals = hist.value.filter((x) => x.latency_ms != null).map((x) => Number(x.latency_ms));
  return vals.length ? Math.max(...vals) : 0;
});

// 取最近 60 个采样做柱状图
const sample = computed(() => hist.value.slice(-60));

const bars = computed(() => {
  const s = sample.value;
  const max = Math.max(maxLatency.value, 1);
  return s.map((x) => {
    const ok = Number(x.ok) === 1;
    const lat = x.latency_ms == null ? 0 : Number(x.latency_ms);
    const h = ok ? Math.max(6, Math.min(100, Math.round((lat / max) * 100))) : 100;
    return { ok, h };
  });
});

const barsTime = computed(() => {
  const s = sample.value;
  if (!s.length) return ['', ''];
  return [fmtTime(s[0].ts).slice(0, 5), fmtTime(s[s.length - 1].ts).slice(0, 5)];
});

const recent = computed(() =>
  hist.value
    .slice(-20)
    .reverse()
    .map((x) => ({
      ok: Number(x.ok) === 1,
      latency: x.latency_ms,
      time: fmtTime(x.ts),
    })),
);

async function load(quiet) {
  if (!ensureLogin()) return;
  if (!quiet) loading.value = true;
  error.value = '';
  try {
    const [list, h] = await Promise.all([
      fetchServices(),
      id.value ? fetchServiceHistory(id.value, 24) : Promise.resolve([]),
    ]);
    const arr = Array.isArray(list) ? list : [];
    svc.value = arr.find((x) => Number(x.id) === Number(id.value)) || null;
    if (svc.value && svc.value.name) title.value = svc.value.name;
    hist.value = Array.isArray(h) ? h : [];
  } catch (e) {
    error.value = (e && e.message) || '网络异常';
  } finally {
    loading.value = false;
    now.value = Date.now();
  }
}

function reload() {
  loading.value = true;
  load(false);
}

function goBack() {
  uni.navigateBack({ delta: 1 });
}

onLoad((q) => {
  if (!guardMonitor()) return;
  id.value = Number((q && q.id) || 0);
  if (q && q.name) {
    try {
      title.value = decodeURIComponent(q.name);
    } catch (e) {
      title.value = q.name;
    }
  }
  load(false);
});

onPullDownRefresh(async () => {
  try {
    await load(true);
  } finally {
    uni.stopPullDownRefresh();
  }
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 36rpx 60rpx;
  background: #f7f8fa;
}

.sb-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 21;
  background: #ffffff;
  pointer-events: none;
}

/* 标准导航栏：与 APP 其他页面（修改密码/设置等）完全一致 */
.hd {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 20;
  box-sizing: border-box;
  height: 88rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}
.nav-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-icon {
  width: 48rpx;
  height: 48rpx;
}
.nav-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #303132;
}
.nav-placeholder {
  width: 72rpx;
}
.hv {
  opacity: 0.6;
}

.card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.04);
}

/* 深色概况卡 */
.dark {
  background: #111629;
  box-shadow: 0 10rpx 30rpx rgba(17, 22, 41, 0.18);
}
.hero-top {
  display: flex;
  flex-direction: row;
  align-items: center;
}
.badge {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.badge-t {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
}
.hero-mid {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 20rpx;
  min-width: 0;
}
.hero-name {
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
}
.hero-sub {
  margin-top: 6rpx;
  font-size: 12px;
  color: #94a3b8;
}
.pill {
  font-size: 12px;
  font-weight: 600;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
}
.pill-ok {
  color: #34d399;
  background: rgba(52, 211, 153, 0.14);
}
.pill-off {
  color: #f87171;
  background: rgba(248, 113, 113, 0.14);
}
.hero-num {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  margin-top: 26rpx;
}
.hero-lat {
  font-size: 54px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  letter-spacing: -1rpx;
}
.hero-lat-off {
  color: #64748b;
}
.hero-unit {
  margin-left: 8rpx;
  font-size: 14px;
  color: #94a3b8;
}
.hero-foot {
  margin-top: 16rpx;
  font-size: 12px;
  color: #94a3b8;
}

/* 骨架 */
.sk-card {
  height: 260rpx;
}
.sk-b {
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.1);
}
.sk-h1 {
  width: 55%;
  height: 40rpx;
  margin-top: 20rpx;
}
.sk-h2 {
  width: 35%;
  height: 24rpx;
  margin-top: 24rpx;
}

/* 失败态 */
.err {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 28rpx;
}
.err-t {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}
.err-m {
  margin-top: 10rpx;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
}
.retry {
  margin-top: 26rpx;
  padding: 14rpx 48rpx;
  border-radius: 999rpx;
  background: #2563eb;
}
.retry-hover {
  opacity: 0.8;
}
.retry-t {
  font-size: 14px;
  color: #ffffff;
}

.sec-t {
  display: block;
  margin: 8rpx 0 16rpx;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

/* 四格统计 */
.stats {
  display: flex;
  flex-direction: row;
  padding: 26rpx 8rpx;
}
.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-line {
  border-left: 1rpx solid #eef2f7;
}
.stat-n {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}
.stat-n.ok {
  color: #059669;
}
.stat-n.warn {
  color: #ef4444;
}
.stat-l {
  margin-top: 8rpx;
  font-size: 11px;
  color: #94a3b8;
}

/* 柱状图 */
.chart {
  padding: 28rpx 24rpx;
}
.bars {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  height: 180rpx;
}
.bar-wrap {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: flex-end;
  padding: 0 1rpx;
}
.bar {
  width: 100%;
  border-radius: 4rpx;
  background: #2563eb;
  opacity: 0.85;
}
.bar-fail {
  background: #ef4444;
  opacity: 1;
}
.chart-foot {
  margin-top: 16rpx;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
.chart-lb {
  font-size: 11px;
  color: #94a3b8;
}

/* 记录行 */
.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 22rpx 0;
}
.row-line {
  border-bottom: 1rpx solid #f1f5f9;
}
.dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 18rpx;
}
.dot-ok {
  background: #10b981;
}
.dot-off {
  background: #ef4444;
}
.row-t {
  flex: 1;
  font-size: 14px;
  color: #334155;
}
.row-lat {
  font-size: 13px;
  color: #64748b;
}

.empty {
  padding: 40rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-t {
  font-size: 13px;
  color: #94a3b8;
}
</style>
