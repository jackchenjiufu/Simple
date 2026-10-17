<template>
  <view class="page">
    <view class="sb-mask" :style="{ height: statusBar + 'px' }"></view>

    <view class="hd" :style="{ top: statusBar + 'px' }">
      <view class="back-box" hover-class="back-hv" :hover-stay-time="60" @tap="goBack">
        <image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit" />
      </view>
      <text class="title">{{ name }}</text>
      <view class="ph"></view>
    </view>

    <view class="body" :style="{ paddingTop: (statusBar + headH) + 'px' }">
      <view v-if="loading" class="state">
        <text class="state-t">正在准备播放…</text>
        <text v-if="stage" class="state-s">{{ stage }}</text>
      </view>

      <view v-else-if="err" class="state">
        <text class="state-t">播放失败</text>
        <text class="state-s">{{ err }}</text>
        <view class="btns">
          <view class="retry" hover-class="retry-hv" :hover-stay-time="60" @tap="play">
            <text class="retry-t">重试</text>
          </view>
          <view v-if="fallbackUrl" class="retry" hover-class="retry-hv" :hover-stay-time="60" @tap="openExternal">
            <text class="retry-t">用浏览器打开</text>
          </view>
        </view>
      </view>

      <view v-else-if="nativeOn" class="state">
        <text class="state-t">已用内置播放器打开</text>
        <text class="state-s">ExoPlayer 硬解 · 返回后可用下面的按钮再播</text>
        <view class="btns">
          <view class="retry" hover-class="retry-hv" :hover-stay-time="60" @tap="relaunchNative">
            <text class="retry-t">再播一次</text>
          </view>
          <view class="retry" hover-class="retry-hv" :hover-stay-time="60" @tap="pickExternal">
            <text class="retry-t">用外部播放器</text>
          </view>
        </view>
        <view class="ext" hover-class="retry-hv" :hover-stay-time="60" @tap="fallbackInline">
          <text class="ext-t">内置播放器有问题？改用页面内播放 ›</text>
        </view>
      </view>

      <video
        v-else
        id="pg-video"
        :key="url"
        class="player"
        :src="url"
        :autoplay="true"
        codec="hardware"
        :show-fullscreen-btn="true"
        :show-play-btn="true"
        :enable-progress-gesture="true"
        :object-fit="'contain'"
        @error="onVideoError"
        @timeupdate="onProgress"
        @play="onVideoPlay"
      ></video>

      <text v-if="!loading && !err && !nativeOn && modeText" class="mode">{{ modeText }}</text>
      <view v-if="!loading && !err" class="ext" hover-class="retry-hv" :hover-stay-time="60" @tap="pickExternal">
        <text class="ext-t">卡顿或没声音？用外部播放器打开 ›</text>
      </view>
      <text v-if="err" class="dbg">{{ dbg }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app';
import { guardMonitor } from '../../utils/perm.js';

const statusBar = (() => {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 0;
  } catch (e) {
    return 0;
  }
})();

const HEAD_RPX = 88;
const headH = (() => {
  try {
    return uni.upx2px(HEAD_RPX);
  } catch (e) {
    return HEAD_RPX / 2;
  }
})();

const name = ref('播放');
const url = ref('');
const modeText = ref('');
const loading = ref(true);
const err = ref('');
const dbg = ref('');
const stage = ref('');
const fallbackUrl = ref('');
const nativeOn = ref(false);
let itemId = '';

let cands = [];
let idx = 0;
let externalUrl = '';
let playSessionId = '';
let reported = false;
let stallTimer = null;
let lastProgressAt = 0;
// 记录「什么时候把播放交给原生页」，用来区分 onShow 是首次进入还是从播放器返回
let nativeAt = 0;
// 详情页点「继续观看」时带进来的起播秒数
let startSec = 0;
let seeked = false;

// 这台盒子是 J1900（4 核赛扬），软件转 4K HEVC 只有 0.15 倍速，
// 所以策略是：能用手机解码就绝不转码，转码只作为兜底。
const DIRECT_PLAY = [
  {
    Container: 'mkv,mp4,ts,m4v,mov,webm',
    Type: 'Video',
    VideoCodec: 'h264,hevc,mpeg4,vp9',
    AudioCodec: 'aac,ac3,eac3,mp3,flac,opus,vorbis',
  },
];

// 只换封装不重编码：视频直拷，音频必要时转（CPU 开销极小）
const DIRECT_STREAM = [
  {
    Container: 'ts',
    Type: 'Video',
    VideoCodec: 'h264,hevc',
    AudioCodec: 'aac,ac3,eac3,mp3',
    Protocol: 'hls',
    Context: 'Streaming',
  },
];

const PROFILE_HLS = {
  MaxStreamingBitrate: 140000000,
  DirectPlayProfiles: DIRECT_PLAY,
  DirectStreamProfiles: DIRECT_STREAM,
  TranscodingProfiles: [
    {
      Container: 'ts',
      Type: 'Video',
      VideoCodec: 'h264',
      AudioCodec: 'aac',
      Protocol: 'hls',
      Context: 'Streaming',
      MaxAudioChannels: '2',
    },
  ],
};

const PROFILE_MP4 = {
  MaxStreamingBitrate: 140000000,
  DirectPlayProfiles: DIRECT_PLAY,
  DirectStreamProfiles: DIRECT_STREAM,
  TranscodingProfiles: [
    {
      Container: 'mp4',
      Type: 'Video',
      VideoCodec: 'h264',
      AudioCodec: 'aac',
      Protocol: 'http',
      Context: 'Streaming',
      MaxAudioChannels: '2',
    },
  ],
};

onLoad((q) => {
  if (!guardMonitor()) return;
  itemId = (q && q.id) || '';
  name.value = decodeURIComponent((q && q.name) || '播放');
  startSec = Number((q && q.t) || 0) || 0;
  play();
});

onUnload(() => {
  clearStall();
  reportStop();
});

// 从原生播放页返回时，用户要的是「回到片库」，不是停在「已用内置播放器打开」这一页。
// 首次进入本页时 nativeAt 还是 0，所以不会误触发。
onShow(() => {
  if (!nativeOn.value || !nativeAt) return;
  if (Date.now() - nativeAt < 800) return; // 播放器还没来得及盖上来
  nativeAt = 0;
  reportStop();
  uni.navigateBack({
    fail: () => {
      // 没有上一页（极少数直达场景），留在本页让用户自己选
      uni.showToast({ title: '播放器已关闭', icon: 'none' });
    },
  });
});

function goBack() {
  uni.navigateBack();
}

function deviceId() {
  let d = uni.getStorageSync('jf_device_id');
  if (!d) {
    d = 'simple-' + Math.random().toString(36).slice(2, 10);
    uni.setStorageSync('jf_device_id', d);
  }
  return d;
}

function authHeader(token) {
  return (
    `MediaBrowser Client="Simple", Device="App", DeviceId="${deviceId()}", ` +
    `Version="2.7.5", Token="${token}"`
  );
}

function req(urlStr, method, body, token) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: urlStr,
      method,
      data: body || undefined,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        Authorization: authHeader(token),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(new Error(`HTTP ${res.statusCode}`));
      },
      fail: (e) => reject(new Error((e && e.errMsg) || '网络异常')),
    });
  });
}

// Jellyfin 12 只认 ApiKey（大写 K）
function withKey(u) {
  if (/[?&]ApiKey=/i.test(u)) return u;
  const sep = u.indexOf('?') >= 0 ? '&' : '?';
  return `${u}${sep}ApiKey=${encodeURIComponent(uni.getStorageSync('jf_token') || '')}`;
}

function abs(base, path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return withKey(path);
  return withKey(`${base}${path}`);
}

function playbackInfo(base, uid, token, profile) {
  return req(
    `${base}/Items/${itemId}/PlaybackInfo?UserId=${uid}&IsPlayback=true&AutoOpenLiveStream=true&MaxStreamingBitrate=140000000`,
    'POST',
    { DeviceProfile: profile },
    token,
  );
}

function reportPlayback(base, token, action, body) {
  try {
    uni.request({
      url: `${base}/Sessions/Playing${action}`,
      method: 'POST',
      data: body,
      timeout: 6000,
      header: { 'Content-Type': 'application/json', Authorization: authHeader(token) },
    });
  } catch (e) {}
}

function reportStart() {
  if (reported) return;
  reported = true;
  const base = (uni.getStorageSync('jf_base') || '').replace(/\/+$/, '');
  const token = uni.getStorageSync('jf_token') || '';
  reportPlayback(base, token, '', {
    ItemId: itemId,
    PlaySessionId: playSessionId,
    CanSeek: true,
    IsPaused: false,
    PlayMethod: 'DirectPlay',
  });
}

function reportStop() {
  if (!reported) return;
  reported = false;
  const base = (uni.getStorageSync('jf_base') || '').replace(/\/+$/, '');
  const token = uni.getStorageSync('jf_token') || '';
  // 停播放：让服务端立刻回收转码进程，不然会堆到把 CPU 拖死
  reportPlayback(base, token, '/Stopped', { ItemId: itemId, PlaySessionId: playSessionId });
}

async function play() {
  const base = (uni.getStorageSync('jf_base') || '').replace(/\/+$/, '');
  const token = uni.getStorageSync('jf_token') || '';
  const uid = uni.getStorageSync('jf_uid') || '';
  if (!base || !token || !uid) {
    err.value = '还没有连接视频站，回到视频页点右上角 ＋ 添加';
    loading.value = false;
    return;
  }
  if (!itemId) {
    err.value = '缺少影片 ID';
    loading.value = false;
    return;
  }

  reportStop();
  clearStall();

  loading.value = true;
  err.value = '';
  dbg.value = '';
  url.value = '';
  modeText.value = '';
  fallbackUrl.value = '';
  cands = [];
  idx = 0;
  playSessionId = '';
  externalUrl = '';

  try {
    stage.value = '向视频站请求播放地址…';

    const [a, b] = await Promise.all([
      playbackInfo(base, uid, token, PROFILE_HLS).catch((e) => ({ __e: e })),
      playbackInfo(base, uid, token, PROFILE_MP4).catch((e) => ({ __e: e })),
    ]);

    if (a && a.__e && b && b.__e) throw a.__e;

    const srcA = (a && a.MediaSources && a.MediaSources[0]) || null;
    const srcB = (b && b.MediaSources && b.MediaSources[0]) || null;
    const src = srcA || srcB;
    if (!srcA && !srcB) throw new Error('没有可用的媒体源');

    playSessionId = (a && a.PlaySessionId) || (b && b.PlaySessionId) || '';

    const list = [];
    const seen = {};
    const push = (mode, u) => {
      if (!u || seen[u]) return;
      seen[u] = 1;
      list.push({ mode, u });
    };

    // 这台盒子（J1900 四核）转 4K 只有 0.15 倍速，转码必然卡死；
    // 而且 Jellyfin 因外挂字幕/音轨判定保守，不给 DirectPlay。
    // 但静态流地址是直出原文件（实测 206 + Accept-Ranges），不依赖它的判定。
    const msId = (src && src.Id) || itemId;
    const direct = (srcA && srcA.DirectStreamUrl) || (srcB && srcB.DirectStreamUrl) || '';
    const staticUrl = `${base}/Videos/${itemId}/stream?Static=true&MediaSourceId=${msId}&ApiKey=${encodeURIComponent(token)}`;

    // 音轨：优先挑手机能吃下的（aac/mp3…），否则视频直拷+音频转 aac（几乎不耗 CPU）
    const streams = (src && src.MediaStreams) || [];
    const audios = streams.filter((s) => s.Type === 'Audio');
    const okAudio = /^(aac|mp3|opus|flac|vorbis)$/i;
    const plainAudio = audios.find((a) => okAudio.test(a.Codec || ''));
    const defAudio = audios.find((a) => a.IsDefault) || audios[0];
    const defOk = !!(defAudio && okAudio.test(defAudio.Codec || ''));
    const audioIdx = (plainAudio || defAudio || {}).Index;

    const psq = playSessionId ? `&PlaySessionId=${playSessionId}` : '';
    const remuxUrl =
      audioIdx === undefined
        ? ''
        : `${base}/videos/${itemId}/master.m3u8?DeviceId=${deviceId()}&MediaSourceId=${msId}` +
          `&VideoCodec=copy&AudioCodec=aac&AudioStreamIndex=${audioIdx}&SegmentContainer=ts` +
          `${psq}&ApiKey=${encodeURIComponent(token)}`;

    // 默认音轨手机能放就直连（零开销），放不了就先走「视频直拷+音频AAC」
    if (defOk || !remuxUrl) {
      push('原片直连（不转码）', staticUrl);
      if (remuxUrl) push('视频直拷+音频AAC', remuxUrl);
    } else {
      push('视频直拷+音频AAC（手机解码）', remuxUrl);
      push('原片直连（不转码）', staticUrl);
    }
    if (direct) push('直接串流（换封装不重编码）', abs(base, direct));

    // #ifdef H5
    push('转码播放（MP4）', abs(base, srcB && srcB.TranscodingUrl));
    push('转码播放（HLS）', abs(base, srcA && srcA.TranscodingUrl));
    // #endif
    // #ifndef H5
    push('转码播放（HLS）', abs(base, srcA && srcA.TranscodingUrl));
    push('转码播放（MP4）', abs(base, srcB && srcB.TranscodingUrl));
    // #endif

    if (!list.length) throw new Error('服务端没有返回播放地址');

    // 外链优先用「视频直拷+音频AAC」：外部播放器里音轨最稳
    externalUrl = remuxUrl || staticUrl;

    cands = list;
    fallbackUrl.value = list[list.length - 1].u;
    stage.value = '';
    loading.value = false;

    // App 端优先交给原生 ExoPlayer（4K HEVC HDR 硬解比 ijkplayer 靠谱）；
    // 老 APK 没有这个 Activity，会抛异常，自动退回页面内 <video>
    // #ifndef H5
    if (launchNative()) {
      nativeOn.value = true;
      return;
    }
    // #endif
    use(0);
  } catch (e) {
    stage.value = '';
    err.value = (e && e.message) || '网络异常';
    dbg.value = `请求：${base}`;
    loading.value = false;
  }
}

function use(i) {
  if (i >= cands.length) {
    err.value = '所有播放方式都失败了';
    dbg.value = dbg.value || '可点「用浏览器打开」试试';
    loading.value = false;
    return;
  }
  idx = i;
  const c = cands[i];
  modeText.value = c.mode;
  url.value = c.u;
  armStall();
  reportStart();
}

// 转码跟不上时，播放器会一直黑屏等数据，不会报错 —— 用看门狗兜住
function clearStall() {
  if (stallTimer) {
    clearTimeout(stallTimer);
    stallTimer = null;
  }
}

function armStall() {
  clearStall();
  lastProgressAt = Date.now();
  stallTimer = setTimeout(() => {
    const idle = Math.round((Date.now() - lastProgressAt) / 1000);
    if (idle < 16) {
      armStall();
      return;
    }
    onStall(idle);
  }, 18000);
}

function onProgress() {
  lastProgressAt = Date.now();
}

/** 页面内播放也要接住「继续观看」的起播位置 */
function onVideoPlay() {
  onProgress();
  if (seeked || startSec <= 5) return;
  seeked = true;
  try {
    uni.createVideoContext('pg-video').seek(startSec);
  } catch (e) {}
}

function onStall(idle) {
  const cur = cands[idx] && cands[idx].mode;
  if (idx + 1 < cands.length) {
    dbg.value = `「${cur}」${idle} 秒没出画面，改试 ${cands[idx + 1].mode}`;
    use(idx + 1);
    return;
  }
  err.value = `「${cur}」${idle} 秒没有画面`;
  dbg.value =
    '视频站转码速度跟不上（这台机器是 J1900 四核，转 4K 只有 0.15 倍速）。建议看 1080p 片源，或用浏览器/第三方播放器打开';
  modeText.value = '';
  clearStall();
}

function onVideoError(e) {
  const msg = (e && e.detail && (e.detail.errMsg || e.detail)) || '';
  console.error('[player] video error:', e);
  if (idx + 1 < cands.length) {
    dbg.value = `「${cands[idx].mode}」放不了${msg ? '（' + msg + '）' : ''}，改试 ${cands[idx + 1].mode}`;
    use(idx + 1);
    return;
  }
  err.value = '播放器无法解码该视频' + (msg ? `：${msg}` : '');
  dbg.value = '可点「用浏览器打开」在系统播放器里试';
  modeText.value = '';
  clearStall();
}

function openExternal() {
  const u = fallbackUrl.value || url.value;
  if (!u) return;
  // #ifdef H5
  window.open(u, '_blank');
  // #endif
  // #ifndef H5
  try {
    plus.runtime.openURL(u);
  } catch (e) {
    uni.setClipboardData({ data: u });
    uni.showToast({ title: '链接已复制', icon: 'none' });
  }
  // #endif
}

// 原生播放页（ExoPlayer）。传入候选地址列表，Activity 内部逐个试
function launchNative() {
  // #ifdef H5
  return false;
  // #endif
  // #ifndef H5
  if (!cands || !cands.length) return false;
  try {
    if (typeof plus === 'undefined' || !plus.android) return false;
    const main = plus.android.runtimeMainActivity();
    const Intent = plus.android.importClass('android.content.Intent');
    const it = new Intent();
    it.setClassName('com.simple.app', 'com.simple.app.ExoPlayerActivity');
    it.putExtra('playlist', JSON.stringify(cands.map((c) => c.u)));
    it.putExtra('title', String(name.value || '播放'));
    if (startSec > 5) it.putExtra('startMs', startSec * 1000);
    main.startActivity(it);
    nativeAt = Date.now();
    reportStart();
    return true;
  } catch (e) {
    console.error('[player] native launch failed:', e);
    return false;
  }
  // #endif
}

function relaunchNative() {
  if (launchNative()) nativeOn.value = true;
  else uni.showToast({ title: '内置播放器打不开', icon: 'none' });
}

function fallbackInline() {
  nativeOn.value = false;
  reportStop();
  use(0);
}

// 交给外部播放器：VLC / MX Player 对 4K HEVC HDR 硬解和音轨切换都成熟
function pickExternal() {
  if (!externalUrl) {
    uni.showToast({ title: '还没有播放地址', icon: 'none' });
    return;
  }
  // #ifdef H5
  window.open(externalUrl, '_blank');
  return;
  // #endif
  // #ifndef H5
  uni.showActionSheet({
    itemList: ['VLC', 'MX Player', '系统浏览器'],
    success: (r) => {
      if (r.tapIndex === 0) openWith('org.videolan.vlc');
      else if (r.tapIndex === 1) openWith('com.mxtech.videoplayer.ad');
      else openExternal();
    },
  });
  // #endif
}

function openWith(pkg) {
  const u = externalUrl || fallbackUrl.value || url.value;
  if (!u) return;
  try {
    const main = plus.android.runtimeMainActivity();
    const Intent = plus.android.importClass('android.content.Intent');
    const Uri = plus.android.importClass('android.net.Uri');
    const it = new Intent(Intent.ACTION_VIEW);
    it.setDataAndType(Uri.parse(u), 'video/*');
    it.setPackage(pkg);
    it.addFlags(0x10000000);
    main.startActivity(it);
  } catch (e) {
    uni.showModal({
      title: '打不开',
      content: '没找到这个播放器，可以先装一个（VLC 免费），或者选「系统浏览器」',
      showCancel: false,
    });
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 0 60rpx;
  background: #0b1020;
}
.sb-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 21;
  background: #0b1020;
  pointer-events: none;
}
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
  padding: 0 24rpx;
  background: #0b1020;
}
.back-box {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-hv {
  opacity: 0.6;
}
.back-icon {
  width: 48rpx;
  height: 48rpx;
  filter: invert(1);
}
.title {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ph {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
}
.body {
  box-sizing: border-box;
}
.player {
  width: 100%;
  height: 56.25vw;
  background: #000000;
}
.mode {
  display: block;
  margin: 20rpx 30rpx 0;
  font-size: 11px;
  color: #64748b;
}
.dbg {
  display: block;
  margin: 12rpx 30rpx 0;
  font-size: 11px;
  line-height: 1.6;
  color: #475569;
  word-break: break-all;
}
.ext {
  margin: 18rpx 30rpx 0;
  padding: 16rpx 0;
  align-self: flex-start;
}
.ext-t {
  font-size: 12px;
  color: #60a5fa;
}
.state {
  padding: 120rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state-t {
  font-size: 14px;
  color: #e2e8f0;
}
.state-s {
  margin-top: 12rpx;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
}
.btns {
  display: flex;
  flex-direction: row;
}
.retry {
  margin: 32rpx 12rpx 0;
  padding: 16rpx 40rpx;
  border: 1rpx solid #475569;
  border-radius: 999rpx;
}
.retry-hv {
  opacity: 0.6;
}
.retry-t {
  font-size: 13px;
  color: #e2e8f0;
}
</style>
