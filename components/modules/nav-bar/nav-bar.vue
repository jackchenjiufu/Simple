<template>
  <view class="nav-root">
    <template v-if="mode === 'back'">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="nav-bar nav-bar-back">
        <view class="nav-back" @click="goBack">
          <image class="back-icon" src="/static/img/icons/back.png" mode="aspectFit"></image>
        </view>
        <text class="nav-title">{{ title }}</text>
        <view class="nav-placeholder"></view>
      </view>
    </template>
    <template v-else>
      <view class="nav-bar">
        <view
          class="nav-item"
          :class="{ active: activeTab === 'home' }"
          @click="switchTab('home')"
        >
          <text class="nav-label">首页</text>
          <view class="nav-indicator" v-if="activeTab === 'home'"></view>
        </view>
        <view
          class="nav-item"
          :class="{ active: activeTab === 'articles' }"
          @click="switchTab('articles')"
        >
          <text class="nav-label">文章</text>
          <view class="nav-indicator" v-if="activeTab === 'articles'"></view>
        </view>
        <view
          class="nav-item"
          :class="{ active: activeTab === 'agent' }"
          @click="switchTab('agent')"
        >
          <text class="nav-label">智能体</text>
          <view class="nav-indicator" v-if="activeTab === 'agent'"></view>
        </view>
      </view>
    </template>
  </view>
</template>

<script>
export default {
  name: 'NavBar',
  props: {
    mode: {
      type: String,
      default: 'tabs' // 'tabs'=首页Tab切换, 'back'=返回导航+标题
    },
    activeTab: {
      type: String,
      default: 'articles'
    },
    title: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      statusBarHeight: 20
    };
  },
  mounted() {
    if (this.mode !== 'back') return;
    try {
      const info = uni.getSystemInfoSync();
      this.statusBarHeight = info.statusBarHeight || 20;
    } catch(e) { console.warn(e); }
  },
  methods: {
    switchTab(tab) {
      this.$emit('switch', tab);
    },
    goBack() {
      this.$emit('back');
      uni.navigateBack();
    }
  }
};
</script>

<style scoped>
.nav-root { background-color: #ffffff; flex-shrink: 0; }

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 18upx;
  height: 88upx;
  background-color: #ffffff;
  padding: 0 32upx;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.status-bar { width: 100%; background-color: #ffffff; flex-shrink: 0; }
.nav-back { width: 72upx; height: 72upx; display: flex; align-items: center; justify-content: center; margin-left: -12upx; }
.back-icon { width: 48upx; height: 48upx; }
.nav-title { flex: 1; text-align: center; font-size: 30upx; font-weight: 600; color: #303132; }
.nav-placeholder { width: 72upx; }

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 8upx 16upx;
  min-width: 80upx;
}

.nav-label {
  font-size: 26upx;
  color: #9ca3af;
  line-height: 1.4;
  transition: color 0.25s ease;
}

.nav-item.active .nav-label {
  color: #1b44a6;
  font-weight: 600;
}

.nav-indicator {
  position: absolute;
  bottom: -2upx;
  width: 40upx;
  height: 4upx;
  background: #1b44a6;
  border-radius: 2upx;
}
</style>
