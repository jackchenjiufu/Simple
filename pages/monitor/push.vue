<template>
  <view class="page">
    <!-- 状态栏遮罩：scroll-view 从屏幕顶端开始，避免内容滚进系统状态栏 -->
    <view class="sb-mask" :style="{ height: statusBar + 'px' }"></view>

    <!-- 固定标题栏：与 APP 其他页面统一的标准 nav-bar -->
    <view class="nav" :style="{ top: statusBar + 'px' }">
      <view class="nav-back" hover-class="hv" :hover-stay-time="60" @tap="goBack">
        <image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit" />
      </view>
      <text class="nav-t">告警推送</text>
      <view class="nav-sp"></view>
    </view>

    <scroll-view class="scr" scroll-y :show-scrollbar="false">
      <view class="body" :style="{ paddingTop: statusBar + 'px' }">
        <view class="body-in">
          <text class="intro">推送由盒子直发飞书，这里控制 App 内的告警提醒偏好</text>

          <!-- 加载态 -->
          <view v-if="loading" class="card state">
            <text class="state-m">加载中</text>
          </view>

          <!-- 失败态 -->
          <view v-else-if="error" class="card state">
            <text class="state-t">加载失败</text>
            <text class="state-m">{{ error }}</text>
            <view class="retry" hover-class="hv" :hover-stay-time="60" @tap="load">
              <text class="retry-t">重试</text>
            </view>
          </view>

          <!-- 设置 -->
          <block v-else>
            <view class="sec">
              <text class="sec-t">接收范围</text>
              <text class="sec-a">{{ savingKey ? '保存中' : savedTip ? '已保存' : '' }}</text>
            </view>
            <view class="card">
              <view class="row row-line">
                <view class="row-main">
                  <text class="row-n">接收告警推送</text>
                  <text class="row-d">总开关，关闭后 App 内不再提醒</text>
                </view>
                <switch
                  class="sw"
                  color="#2563EB"
                  :checked="s.enabled"
                  :disabled="!!savingKey"
                  @change="onToggle('enabled', $event)"
                />
              </view>
              <view class="row row-line" :class="{ 'row-off': !s.enabled }">
                <view class="row-main">
                  <text class="row-n">真人告警</text>
                  <text class="row-d">摄像头识别到真人时提醒</text>
                </view>
                <switch
                  class="sw"
                  color="#2563EB"
                  :checked="s.human"
                  :disabled="!s.enabled || !!savingKey"
                  @change="onToggle('human', $event)"
                />
              </view>
              <view class="row" :class="{ 'row-off': !s.enabled }">
                <view class="row-main">
                  <text class="row-n">待裁决提醒</text>
                  <text class="row-d">有告警等待人工确认时提醒</text>
                </view>
                <switch
                  class="sw"
                  color="#2563EB"
                  :checked="s.pending"
                  :disabled="!s.enabled || !!savingKey"
                  @change="onToggle('pending', $event)"
                />
              </view>
            </view>

            <view class="sec">
              <text class="sec-t">免打扰时段</text>
            </view>
            <view class="card">
              <view class="row row-line">
                <text class="row-n">开始</text>
                <view class="row-right">
                  <picker
                    mode="time"
                    :value="s.quiet_start || '22:00'"
                    :disabled="!!savingKey"
                    @change="onTime('quiet_start', $event)"
                  >
                    <view class="pick" hover-class="hv" :hover-stay-time="60">
                      <text class="pick-t" :class="{ 'pick-off': !s.quiet_start }">{{
                        s.quiet_start || '不设置'
                      }}</text>
                    </view>
                  </picker>
                  <text
                    v-if="s.quiet_start"
                    class="clear"
                    hover-class="hv"
                    :hover-stay-time="60"
                    @tap="clearTime('quiet_start')"
                    >清空</text
                  >
                </view>
              </view>
              <view class="row">
                <text class="row-n">结束</text>
                <view class="row-right">
                  <picker
                    mode="time"
                    :value="s.quiet_end || '07:00'"
                    :disabled="!!savingKey"
                    @change="onTime('quiet_end', $event)"
                  >
                    <view class="pick" hover-class="hv" :hover-stay-time="60">
                      <text class="pick-t" :class="{ 'pick-off': !s.quiet_end }">{{
                        s.quiet_end || '不设置'
                      }}</text>
                    </view>
                  </picker>
                  <text
                    v-if="s.quiet_end"
                    class="clear"
                    hover-class="hv"
                    :hover-stay-time="60"
                    @tap="clearTime('quiet_end')"
                    >清空</text
                  >
                </view>
              </view>
            </view>
            <text class="foot">时段内仍会记录告警，仅静默不提醒</text>
          </block>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { fetchPushSettings, savePushSettings, ensureLogin } from '../../utils/monitor-api.js';
import { guardMonitor } from '../../utils/perm.js';

const statusBar = (() => {
  try {
    return uni.getSystemInfoSync().statusBarHeight || 0;
  } catch (e) {
    return 0;
  }
})();

const DEFAULTS = { enabled: true, human: true, pending: true, quiet_start: '', quiet_end: '' };

const s = ref({ ...DEFAULTS });
const saved = ref({ ...DEFAULTS });
const loading = ref(true);
const error = ref('');
const savedTip = ref(false);
const savingKey = ref('');
let tipTimer = null;

/** 后端可能返回 22:00:00 / 布尔或 0-1，统一成 HH:mm + boolean */
function normalize(raw) {
  const o = raw || {};
  const bool = (v, d) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    return d;
  };
  const hhmm = (v) => {
    if (!v || typeof v !== 'string') return '';
    const m = v.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return '';
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (isNaN(h) || isNaN(mm) || h > 23 || mm > 59) return '';
    return (h < 10 ? '0' + h : '' + h) + ':' + m[2];
  };
  return {
    enabled: bool(o.enabled, DEFAULTS.enabled),
    human: bool(o.human, DEFAULTS.human),
    pending: bool(o.pending, DEFAULTS.pending),
    quiet_start: hhmm(o.quiet_start),
    quiet_end: hhmm(o.quiet_end),
  };
}

function goBack() {
  const stack = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
  if (stack && stack.length > 1) uni.navigateBack({ delta: 1 });
  else uni.reLaunch({ url: '/pages/monitor/index' });
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const r = await fetchPushSettings();
    const n = normalize(r);
    s.value = { ...n };
    saved.value = { ...n };
  } catch (e) {
    if (e && e.code === 401) return;
    error.value = (e && e.message) || '网络错误，请稍后重试';
  } finally {
    loading.value = false;
  }
}

function flashSaved() {
  savedTip.value = true;
  if (tipTimer) clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {
    savedTip.value = false;
  }, 2000);
}

/** 只提交变化的字段；失败回滚到上一次成功的值 */
async function commit(patch) {
  const keys = Object.keys(patch);
  if (!keys.length || savingKey.value) return;
  s.value = { ...s.value, ...patch };
  savingKey.value = keys[0];
  try {
    const r = await savePushSettings(patch);
    /* 接口返回完整设置对象；若只回了 ok，就用「上次成功值 + patch」 */
    const hasKeys =
      r && typeof r === 'object' && ('enabled' in r || 'human' in r || 'pending' in r || 'quiet_start' in r || 'quiet_end' in r);
    const n = normalize(hasKeys ? r : Object.assign({}, saved.value, patch));
    s.value = { ...n };
    saved.value = { ...n };
    flashSaved();
  } catch (e) {
    s.value = { ...saved.value };
    uni.showToast({ title: (e && e.message) || '保存失败', icon: 'none', duration: 2400 });
  } finally {
    savingKey.value = '';
  }
}

function onToggle(key, e) {
  if (savingKey.value) return;
  if (key !== 'enabled' && !s.value.enabled) return;
  const val = !!(e && e.detail && e.detail.value);
  if (s.value[key] === val) return;
  commit({ [key]: val });
}

function onTime(key, e) {
  if (savingKey.value) return;
  const v = (e && e.detail && e.detail.value) || '';
  if (!v || v === s.value[key]) return;
  commit({ [key]: v });
}

function clearTime(key) {
  if (savingKey.value) return;
  if (!s.value[key]) return;
  commit({ [key]: '' });
}

onLoad(() => {
  if (!ensureLogin()) return;
  if (!guardMonitor()) return;
  load();
});
</script>

<style scoped>
.page {
  /* 覆盖 App.vue 全局 .page 的内边距，左右只保留 .body-in 的 36rpx */
  padding: 0;
  height: 100vh;
  background-color: #f7f8fa;
}

/* 状态栏遮罩 */
.sb-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  z-index: 21;
  background-color: #ffffff;
  pointer-events: none;
}

/* 固定标题栏：标准 nav-bar（与 APP 其他页面一致） */
.nav {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 20;
  height: 88rpx;
  box-sizing: border-box;
  padding: 0 24rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}
.nav-back {
  width: 72rpx;
  height: 72rpx;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.back-icon {
  width: 48rpx;
  height: 48rpx;
}
.nav-t {
  flex: 1;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #303132;
}
.nav-sp {
  width: 72rpx;
}

.scr {
  height: 100vh;
  box-sizing: border-box;
}
.body {
  box-sizing: border-box;
}
.body-in {
  padding: 108rpx 36rpx 0;
  padding-bottom: 160rpx;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.intro {
  display: block;
  padding: 0 4rpx 8rpx;
  font-size: 11px;
  line-height: 1.6;
  color: #94a3b8;
}

/* 卡片 */
.card {
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(15, 23, 42, 0.04);
}

/* 区块标题 */
.sec {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin: 36rpx 4rpx 16rpx;
}
.sec-t {
  font-size: 26rpx;
  font-weight: 600;
  color: #0f172a;
}
.sec-a {
  font-size: 11px;
  color: #94a3b8;
}

/* 行 */
.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background-color: #ffffff;
}
.row-line {
  border-bottom: 1rpx solid #f1f4f8;
}
.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.row-n {
  font-size: 13.5px;
  font-weight: 500;
  color: #0f172a;
  flex-shrink: 0;
}
.row-d {
  margin-top: 6rpx;
  font-size: 11px;
  color: #94a3b8;
}
.row-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex-shrink: 0;
  margin-left: 20rpx;
}
.pick {
  padding: 4rpx 0 4rpx 16rpx;
}
.pick-t {
  font-size: 12.5px;
  color: #0f172a;
}
.pick-off {
  color: #94a3b8;
}
.clear {
  margin-left: 20rpx;
  padding-left: 20rpx;
  border-left: 1rpx solid #edf0f4;
  font-size: 11.5px;
  color: #94a3b8;
}
/* 总开关关闭时子项置灰 */
.row-off {
  opacity: 0.45;
}
.sw {
  margin-left: 16rpx;
  transform: scale(0.86);
  transform-origin: right center;
  flex-shrink: 0;
}
.hv {
  opacity: 0.6;
}
.foot {
  display: block;
  padding: 16rpx 8rpx 0;
  font-size: 11px;
  line-height: 1.6;
  color: #94a3b8;
}

/* 加载 / 失败 */
.state {
  margin-top: 24rpx;
  padding: 56rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.state-t {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}
.state-m {
  margin-top: 12rpx;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
}
.retry {
  margin-top: 32rpx;
  padding: 16rpx 48rpx;
  border: 1rpx solid #0f172a;
  border-radius: 999rpx;
}
.retry-t {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
</style>
