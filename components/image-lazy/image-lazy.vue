<template>
  <view class="image-lazy-container">
    <view class="image-placeholder" v-if="!loaded && !error">
      <text class="placeholder-text">加载中...</text>
    </view>
    <image
      :src="finalImageUrl"
      :mode="mode"
      :class="['image-lazy', { 'image-loaded': loaded }]"
      @load="onImageLoad"
      @error="onImageError"
      lazy-load="true"
    ></image>
    <view class="image-error" v-if="error">
      <text class="error-text">加载失败</text>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    src: { type: String, required: true },
    mode: { type: String, default: 'aspectFill' },
    compress: { type: Boolean, default: false },
    compressQuality: { type: Number, default: 0.8 }
  },
  computed: {
    finalImageUrl() {
      if (this.compress) {
        const sep = this.src.includes('?') ? '&' : '?';
        return `${this.src}${sep}quality=${this.compressQuality * 100}`;
      }
      return this.src;
    }
  },
  data() {
    return { loaded: false, error: false };
  },
  methods: {
    onImageLoad() { this.loaded = true; this.error = false; this.$emit('load', this.src); },
    onImageError() { this.loaded = false; this.error = true; this.$emit('error', this.src); }
  }
};
</script>

<style>
.image-lazy-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: opacity 0.3s ease;
}

.placeholder-text {
  font-size: 24upx;
  color: #9ca3af;
}

.image-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: opacity 0.3s ease;
}

.error-text {
  font-size: 24upx;
  color: #ef4444;
}

.image-lazy {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.5s ease-in-out;
  opacity: 0;
  z-index: 1;
}

.image-loaded {
  opacity: 1;
  z-index: 3;
}
</style>