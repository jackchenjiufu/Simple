<template>
  <view class="nav-bar">
    <view
      class="nav-item"
      :class="{ active: activeTab === 'recommend' }"
      @click="switchTab('recommend')"
    >
      <text class="nav-label">推荐</text>
      <view class="nav-indicator" v-if="activeTab === 'recommend'"></view>
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

<script>
export default {
  name: 'NavBar',
  props: {
    activeTab: {
      type: String,
      default: 'recommend'
    }
  },
  methods: {
    switchTab(tab) {
      this.$emit('switch', tab);
    }
  }
};
</script>

<style scoped>
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
