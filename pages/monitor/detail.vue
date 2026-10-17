<template>
  <view class="page">
    <!-- 顶部剧照：背后一整块，底部渐隐进页面底色 -->
    <view class="hero">
      <image v-if="backdrop" class="hero-img" :src="backdrop" mode="aspectFill" />
      <view v-else class="hero-img hero-empty"></view>
      <view class="hero-fade"></view>

      <view class="hd" :style="{ paddingTop: statusBar + 'px' }">
        <view class="back" hover-class="back-hv" :hover-stay-time="60" @tap="goBack">
          <image class="back-i" src="/static/img/icons/back.png" mode="aspectFit" />
        </view>
        <view class="hd-ph"></view>
      </view>
    </view>

    <view v-if="loading" class="state">
      <text class="state-t">正在读取影片信息…</text>
    </view>

    <view v-else-if="err" class="state">
      <text class="state-t">打不开这个页面</text>
      <text class="state-s">{{ err }}</text>
      <view class="btn-retry" hover-class="btn-hv" :hover-stay-time="60" @tap="load">
        <text class="btn-retry-t">重试</text>
      </view>
    </view>

    <view v-else class="body">
      <!-- 海报 + 基础信息 -->
      <view class="top">
        <view class="poster-box">
          <image v-if="poster" class="poster" :src="poster" mode="aspectFill" />
          <view v-else class="poster poster-empty">
            <text class="poster-ph">{{ initial }}</text>
          </view>
          <view v-if="playedPct > 0 && !played" class="poster-bar">
            <view class="poster-bar-in" :style="{ width: playedPct + '%' }"></view>
          </view>
        </view>

        <view class="info">
          <text class="title">{{ item.Name }}</text>
          <text v-if="tagline" class="tagline">{{ tagline }}</text>

          <view class="meta-row">
            <text v-if="item.ProductionYear" class="meta">{{ item.ProductionYear }}</text>
            <text v-if="runtimeMin" class="meta">{{ runtimeMin }} 分钟</text>
            <text v-if="item.OfficialRating" class="meta-rating">{{ item.OfficialRating }}</text>
          </view>

          <view v-if="score" class="score-row">
            <text class="score-star">★</text>
            <text class="score">{{ score }}</text>
            <text class="score-of">/ 10</text>
          </view>

          <view v-if="genres.length" class="chips">
            <text v-for="g in genres" :key="g" class="chip">{{ g }}</text>
          </view>
        </view>
      </view>

      <!-- 播放 -->
      <view class="play-row">
        <view class="btn-play" hover-class="btn-play-hv" :hover-stay-time="60" @tap="playMain">
          <text class="btn-play-i">▶</text>
          <text class="btn-play-t">{{ playLabel }}</text>
        </view>
        <view v-if="resumeSec > 60 && !played" class="btn-restart" hover-class="btn-hv" :hover-stay-time="60" @tap="playFromStart">
          <text class="btn-restart-t">从头播放</text>
        </view>
      </view>

      <!-- 简介 -->
      <view v-if="item.Overview" class="card">
        <text class="card-h">简介</text>
        <text class="overview" :class="{ clamp: !ovOpen }">{{ item.Overview }}</text>
        <text v-if="overviewLong" class="more" @tap="ovOpen = !ovOpen">{{ ovOpen ? '收起' : '展开全部' }}</text>
      </view>

      <!-- 剧集：季 + 分集 -->
      <view v-if="isSeries" class="card">
        <view class="card-hd">
          <text class="card-h">选集</text>
          <text v-if="episodes.length" class="card-sub">{{ episodes.length }} 集</text>
        </view>

        <scroll-view v-if="seasons.length > 1" scroll-x class="seasons">
          <view
            v-for="s in seasons"
            :key="s.Id"
            class="season"
            :class="{ on: s.Id === curSeason }"
            hover-class="btn-hv"
            :hover-stay-time="60"
            @tap="pickSeason(s.Id)"
          >
            <text class="season-t">{{ s.Name || '第 ' + s.IndexNumber + ' 季' }}</text>
          </view>
        </scroll-view>

        <text v-if="epLoading" class="ep-tip">正在读取分集…</text>
        <text v-else-if="epErr" class="ep-err">{{ epErr }}</text>
        <view v-else class="ep-list">
          <view
            v-for="ep in episodes"
            :key="ep.Id"
            class="ep-row"
            hover-class="ep-hv"
            :hover-stay-time="60"
            @tap="playEpisode(ep)"
          >
            <view class="ep-thumb">
              <image v-if="epImg(ep)" class="ep-thumb-i" :src="epImg(ep)" mode="aspectFill" />
              <view v-else class="ep-thumb-i ep-thumb-ph"></view>
              <view v-if="epPct(ep) > 0" class="ep-thumb-bar">
                <view class="ep-thumb-in" :style="{ width: epPct(ep) + '%' }"></view>
              </view>
            </view>
            <view class="ep-mid">
              <text class="ep-no">{{ epNo(ep) }}</text>
              <text class="ep-name">{{ ep.Name || '未命名' }}</text>
              <text v-if="epSub(ep)" class="ep-sub">{{ epSub(ep) }}</text>
            </view>
            <text class="ep-go">›</text>
          </view>
        </view>
      </view>

      <!-- 演职员 -->
      <view v-if="people.length" class="card">
        <text class="card-h">演职员</text>
        <scroll-view scroll-x class="people">
          <view v-for="p in people" :key="p.Id + p.Name" class="person">
            <image v-if="personImg(p)" class="person-i" :src="personImg(p)" mode="aspectFill" />
            <view v-else class="person-i person-ph">
              <text class="person-ph-t">{{ (p.Name || '?').slice(0, 1) }}</text>
            </view>
            <text class="person-n">{{ p.Name }}</text>
            <text v-if="p.Role" class="person-r">{{ p.Role }}</text>
          </view>
        </scroll-view>
      </view>

      <view class="foot"></view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { guardMonitor } from '../../utils/perm.js';

const statusBar = (() => {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 0;
  } catch (e) {
    return 0;
  }
})();

const item = ref(null);
const loading = ref(true);
const err = ref('');
const ovOpen = ref(false);

const seasons = ref([]);
const curSeason = ref('');
const episodes = ref([]);
const epLoading = ref(false);
const epErr = ref('');

let itemId = '';
let fromPlayer = false; // 从播放器返回时只刷新进度，不整页重来

/* ---------------- Jellyfin ---------------- */

function deviceId() {
  let d = uni.getStorageSync('jf_device_id');
  if (!d) {
    d = 'simple-' + Math.random().toString(36).slice(2, 10);
    uni.setStorageSync('jf_device_id', d);
  }
  return d;
}

function base() {
  return (uni.getStorageSync('jf_base') || '').replace(/\/+$/, '');
}

function token() {
  return uni.getStorageSync('jf_token') || '';
}

function uid() {
  return uni.getStorageSync('jf_uid') || '';
}

function jfReq(path, method, body) {
  const b = base();
  const t = token();
  return new Promise((resolve, reject) => {
    uni.request({
      url: path.indexOf('http') === 0 ? path : `${b}${path}`,
      method: method || 'GET',
      data: body || undefined,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        Authorization:
          `MediaBrowser Client="Simple", Device="App", DeviceId="${deviceId()}", ` +
          `Version="2.8.1", Token="${t}"`,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error(`HTTP ${res.statusCode}`));
      },
      fail: (e) => reject(new Error((e && e.errMsg) || '网络异常')),
    });
  });
}

/* ---------------- 图片 ---------------- */

const poster = computed(() => {
  const it = item.value;
  const tag = it && it.ImageTags && it.ImageTags.Primary;
  if (!tag) return '';
  return `${base()}/Items/${it.Id}/Images/Primary?maxWidth=520&tag=${tag}&ApiKey=${token()}`;
});

const backdrop = computed(() => {
  const it = item.value;
  const tags = (it && it.BackdropImageTags) || [];
  if (!tags.length) return '';
  return `${base()}/Items/${it.Id}/Images/Backdrop/0?maxWidth=1400&tag=${tags[0]}&ApiKey=${token()}`;
});

function personImg(p) {
  if (!p || !p.PrimaryImageTag) return '';
  return `${base()}/Items/${p.Id}/Images/Primary?maxWidth=200&tag=${p.PrimaryImageTag}&ApiKey=${token()}`;
}

function epImg(ep) {
  const tag = ep && ep.ImageTags && ep.ImageTags.Primary;
  if (!tag) return '';
  return `${base()}/Items/${ep.Id}/Images/Primary?fillHeight=200&tag=${tag}&ApiKey=${token()}`;
}

/* ---------------- 展示字段 ---------------- */

const isSeries = computed(() => !!item.value && item.value.Type === 'Series');

const initial = computed(() => {
  const n = (item.value && item.value.Name) || '';
  return n ? n.slice(0, 1) : '影';
});

const tagline = computed(() => {
  const t = (item.value && item.value.Taglines) || [];
  return t[0] || '';
});

const genres = computed(() => {
  const g = (item.value && item.value.Genres) || [];
  return g.slice(0, 3);
});

const runtimeMin = computed(() => {
  const t = (item.value && item.value.RunTimeTicks) || 0;
  return t ? Math.round(t / 600000000) : 0;
});

const score = computed(() => {
  const c = item.value && item.value.CommunityRating;
  return c ? Number(c).toFixed(1) : '';
});

const overviewLong = computed(() => {
  const o = (item.value && item.value.Overview) || '';
  return o.length > 110;
});

const people = computed(() => {
  const arr = (item.value && item.value.People) || [];
  const cast = arr.filter((p) => p.Type === 'Actor').slice(0, 16);
  const dir = arr.filter((p) => p.Type === 'Director').slice(0, 2);
  return [...dir, ...cast];
});

const resumeSec = computed(() => {
  const u = (item.value && item.value.UserData) || {};
  return u.PlaybackPositionTicks ? Math.round(u.PlaybackPositionTicks / 10000000) : 0;
});

const played = computed(() => {
  const u = (item.value && item.value.UserData) || {};
  return !!u.Played;
});

const playedPct = computed(() => {
  const total = (item.value && item.value.RunTimeTicks) || 0;
  if (!total || !resumeSec.value || played.value) return 0;
  return Math.min(100, Math.round((resumeSec.value * 10000000 / total) * 100));
});

const playLabel = computed(() => {
  if (played.value) return '重新播放';
  if (resumeSec.value > 60) return '继续观看';
  return isSeries.value ? '从第一集开始' : '播放';
});

/* ---------------- 加载 ---------------- */

const FIELDS =
  'Overview,Genres,People,ProductionYear,OfficialRating,CommunityRating,' +
  'RunTimeTicks,ImageTags,BackdropImageTags,UserData,ChildCount,Taglines';

async function load() {
  itemId = itemId || '';
  if (!base() || !token() || !uid()) {
    err.value = '还没有连接视频站，回到视频页点右上角 ＋ 添加';
    loading.value = false;
    return;
  }
  if (!itemId) {
    err.value = '缺少影片 ID';
    loading.value = false;
    return;
  }
  loading.value = true;
  err.value = '';
  try {
    const r = await jfReq(`/Users/${uid()}/Items/${itemId}?Fields=${FIELDS}`);
    item.value = r || null;
    if (!r) throw new Error('影片不存在');
    if (r.Type === 'Series') await loadSeasons();
  } catch (e) {
    err.value = (e && e.message) || '网络异常';
  } finally {
    loading.value = false;
  }
}

async function loadSeasons() {
  try {
    const r = await jfReq(`/Shows/${itemId}/Seasons?UserId=${uid()}&Fields=ItemCounts`);
    seasons.value = (r && r.Items) || [];
    if (seasons.value.length) {
      // 默认停在「有未看完」的那一季，否则第一季
      curSeason.value = seasons.value[0].Id;
      await loadEpisodes(curSeason.value);
    }
  } catch (e) {
    epErr.value = (e && e.message) || '读取季失败';
  }
}

async function loadEpisodes(seasonId) {
  epLoading.value = true;
  epErr.value = '';
  episodes.value = [];
  try {
    const q =
      `UserId=${uid()}&SeasonId=${seasonId}` +
      '&Fields=Overview,RunTimeTicks,UserData,ImageTags' +
      '&SortBy=IndexNumber&SortOrder=Ascending';
    const r = await jfReq(`/Shows/${itemId}/Episodes?${q}`);
    episodes.value = (r && r.Items) || [];
    if (!episodes.value.length) epErr.value = '这一季没有可播放的分集';
  } catch (e) {
    epErr.value = (e && e.message) || '读取分集失败';
  } finally {
    epLoading.value = false;
  }
}

function pickSeason(id) {
  if (id === curSeason.value) return;
  curSeason.value = id;
  loadEpisodes(id);
}

/* ---------------- 分集信息 ---------------- */

function epNo(ep) {
  const s = ep && ep.ParentIndexNumber;
  const n = ep && ep.IndexNumber;
  if (s && n) return `S${String(s).padStart(2, '0')}E${String(n).padStart(2, '0')}`;
  if (n) return `第 ${n} 集`;
  return '·';
}

function epSub(ep) {
  const parts = [];
  const u = (ep && ep.UserData) || {};
  const posMin = u.PlaybackPositionTicks ? Math.round(u.PlaybackPositionTicks / 600000000) : 0;
  if (u.Played) parts.push('已看完');
  else if (posMin) parts.push(`看到 ${posMin} 分`);
  const min = ep && ep.RunTimeTicks ? Math.round(ep.RunTimeTicks / 600000000) : 0;
  if (min) parts.push(`${min} 分钟`);
  return parts.join(' · ');
}

function epPct(ep) {
  const total = (ep && ep.RunTimeTicks) || 0;
  const u = (ep && ep.UserData) || {};
  if (!total || !u.PlaybackPositionTicks || u.Played) return 0;
  return Math.min(100, Math.round((u.PlaybackPositionTicks / total) * 100));
}

/* ---------------- 播放 ---------------- */

function goPlayer(id, label, startSec) {
  let u = `/pages/monitor/player?id=${id}&name=${encodeURIComponent(label)}`;
  if (startSec && startSec > 5) u += `&t=${Math.floor(startSec)}`;
  uni.navigateTo({ url: u });
}

function playMain() {
  if (!item.value) return;
  if (isSeries.value) {
    // 剧集：优先接着上次看的那一集，没有就看第一集
    const next =
      episodes.value.find((e) => {
        const u = e.UserData || {};
        return !u.Played && u.PlaybackPositionTicks;
      }) ||
      episodes.value.find((e) => !(e.UserData || {}).Played) ||
      episodes.value[0];
    if (next) playEpisode(next);
    return;
  }
  goPlayer(itemId, item.value.Name || '播放', resumeSec.value);
}

function playFromStart() {
  if (!item.value) return;
  goPlayer(itemId, item.value.Name || '播放', 0);
}

function playEpisode(ep) {
  if (!ep || !ep.Id) return;
  const u = ep.UserData || {};
  const start = u.Played ? 0 : Math.round((u.PlaybackPositionTicks || 0) / 10000000);
  goPlayer(ep.Id, `${item.value.Name} ${epNo(ep)}`, start);
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/monitor/index', fail: () => {} }),
  });
}

/* ---------------- 生命周期 ---------------- */

onLoad((q) => {
  if (!guardMonitor()) return;
  itemId = (q && q.id) || '';
  load();
});

onShow(() => {
  // 从播放器回到详情页：静默刷新观看进度
  if (!fromPlayer) {
    fromPlayer = true;
    return;
  }
  if (!item.value) return;
  jfReq(`/Users/${uid()}/Items/${itemId}?Fields=UserData`)
    .then((r) => {
      if (r && item.value) item.value = { ...item.value, UserData: r.UserData || {} };
      if (isSeries.value && curSeason.value) loadEpisodes(curSeason.value);
    })
    .catch(() => {});
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 40rpx;
}

/* ---------- 顶部剧照 ---------- */

.hero {
  position: relative;
  width: 100%;
  height: 470rpx;
  overflow: hidden;
  background: #0b1020;
}
.hero-img {
  width: 100%;
  height: 100%;
}
.hero-empty {
  background: linear-gradient(135deg, #1b44a6 0%, #0b1020 100%);
}
/* 底部渐隐：必须一直过渡到页面底色，
   否则海报/标题会落在剧照的深色区上，深色字看不见 */
.hero-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 300rpx;
  background: linear-gradient(to bottom, rgba(247, 248, 250, 0) 0%, #f7f8fa 88%);
}

.hd {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 24rpx;
}
.hd-ph {
  flex: 1;
}
.back {
  width: 72rpx;
  height: 72rpx;
  border-radius: 36rpx;
  background: rgba(0, 0, 0, 0.34);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 12rpx;
}
.back-hv {
  background: rgba(0, 0, 0, 0.5);
}
.back-i {
  width: 34rpx;
  height: 34rpx;
}

/* ---------- 状态 ---------- */

.state {
  padding: 120rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state-t {
  font-size: 32rpx;
  color: #0f172a;
  font-weight: 600;
}
.state-s {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #64748b;
  text-align: center;
  line-height: 1.6;
}
.btn-retry {
  margin-top: 32rpx;
  padding: 18rpx 56rpx;
  border-radius: 999rpx;
  background: #1b44a6;
}
.btn-retry-t {
  color: #fff;
  font-size: 28rpx;
}
.btn-hv {
  opacity: 0.82;
}

/* ---------- 海报 + 信息 ---------- */

.body {
  margin-top: -80rpx;
  position: relative;
  padding: 0 32rpx;
}

.top {
  display: flex;
  flex-direction: row;
}

.poster-box {
  width: 214rpx;
  flex-shrink: 0;
  border-radius: 18rpx;
  overflow: hidden;
  background: #e2e8f0;
  box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.22);
  position: relative;
}
.poster {
  width: 214rpx;
  height: 320rpx;
  display: block;
}
.poster-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1b44a6, #0b1020);
}
.poster-ph {
  color: #fff;
  font-size: 76rpx;
  font-weight: 700;
}
.poster-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 8rpx;
  background: rgba(0, 0, 0, 0.4);
}
.poster-bar-in {
  height: 8rpx;
  background: #4a7bff;
}

.info {
  flex: 1;
  min-width: 0;
  margin-left: 24rpx;
  padding-top: 96rpx;
}
.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.32;
}
.tagline {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #7c8798;
  line-height: 1.5;
}
.meta-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 14rpx;
}
.meta {
  font-size: 24rpx;
  color: #64748b;
  margin-right: 18rpx;
}
.meta-rating {
  font-size: 20rpx;
  color: #64748b;
  border: 1rpx solid #cbd5e1;
  border-radius: 6rpx;
  padding: 2rpx 10rpx;
}
.score-row {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  margin-top: 12rpx;
}
.score-star {
  font-size: 24rpx;
  color: #f59e0b;
}
.score {
  margin-left: 6rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}
.score-of {
  margin-left: 4rpx;
  font-size: 20rpx;
  color: #94a3b8;
}
.chips {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: 14rpx;
}
.chip {
  font-size: 22rpx;
  color: #1b44a6;
  background: rgba(27, 68, 166, 0.09);
  border-radius: 8rpx;
  padding: 5rpx 14rpx;
  margin: 0 10rpx 10rpx 0;
}

/* ---------- 播放按钮 ---------- */

.play-row {
  display: flex;
  flex-direction: column;
  margin-top: 36rpx;
}
.btn-play {
  height: 92rpx;
  border-radius: 18rpx;
  background: #1b44a6;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(27, 68, 166, 0.28);
}
.btn-play-hv {
  background: #17398f;
}
.btn-play-i {
  color: #fff;
  font-size: 26rpx;
  margin-right: 12rpx;
}
.btn-play-t {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
.btn-restart {
  align-self: center;
  margin-top: 18rpx;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: #eef1f5;
}
.btn-restart-t {
  font-size: 24rpx;
  color: #475569;
}

/* ---------- 卡片 ---------- */

.card {
  margin-top: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 26rpx;
}
.card-hd {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
}
.card-h {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
}
.card-sub {
  font-size: 24rpx;
  color: #94a3b8;
}
.overview {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #475569;
  line-height: 1.75;
}
.clamp {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
}
.more {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #1b44a6;
}

/* ---------- 季 ---------- */

.seasons {
  white-space: nowrap;
  margin-top: 20rpx;
}
.season {
  display: inline-flex;
  align-items: center;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #eef1f5;
  margin-right: 14rpx;
}
.season.on {
  background: #1b44a6;
}
.season-t {
  font-size: 24rpx;
  color: #475569;
}
.season.on .season-t {
  color: #fff;
  font-weight: 600;
}

/* ---------- 分集 ---------- */

.ep-tip,
.ep-err {
  display: block;
  margin-top: 22rpx;
  font-size: 25rpx;
  color: #64748b;
}
.ep-err {
  color: #dc2626;
}
.ep-list {
  margin-top: 12rpx;
}
.ep-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}
.ep-row:last-child {
  border-bottom: none;
}
.ep-hv {
  background: #f8fafc;
}
.ep-thumb {
  width: 168rpx;
  height: 96rpx;
  border-radius: 10rpx;
  overflow: hidden;
  flex-shrink: 0;
  background: #e2e8f0;
  position: relative;
}
.ep-thumb-i {
  width: 168rpx;
  height: 96rpx;
  display: block;
}
.ep-thumb-ph {
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
}
.ep-thumb-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6rpx;
  background: rgba(0, 0, 0, 0.35);
}
.ep-thumb-in {
  height: 6rpx;
  background: #4a7bff;
}
.ep-mid {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
}
.ep-no {
  display: block;
  font-size: 21rpx;
  color: #1b44a6;
  font-weight: 600;
  letter-spacing: 0.5rpx;
}
.ep-name {
  display: block;
  margin-top: 4rpx;
  font-size: 27rpx;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ep-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #94a3b8;
}
.ep-go {
  font-size: 34rpx;
  color: #cbd5e1;
  margin-left: 12rpx;
}

/* ---------- 演职员 ---------- */

.people {
  white-space: nowrap;
  margin-top: 20rpx;
}
.person {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  width: 132rpx;
  margin-right: 18rpx;
  vertical-align: top;
}
.person-i {
  width: 108rpx;
  height: 108rpx;
  border-radius: 54rpx;
  background: #e2e8f0;
}
.person-ph {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #93a7c9, #64748b);
}
.person-ph-t {
  color: #fff;
  font-size: 40rpx;
  font-weight: 600;
}
.person-n {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #0f172a;
  max-width: 132rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.person-r {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: #94a3b8;
  max-width: 132rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.foot {
  height: 40rpx;
}
</style>
