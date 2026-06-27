<template>
  <view class="carousel-section" v-if="items.length > 0" :style="{ height: height }">
    <swiper
      class="carousel-swiper"
      :indicator-dots="true"
      :autoplay="true"
      :interval="3000"
      :circular="true"
      @change="onChange"
    >
      <swiper-item
        class="carousel-item"
        v-for="(item, index) in items"
        :key="'carousel-' + index + '-' + (item.id || '')"
        @click="clickItem(item)"
      >
        <view class="carousel-card">
          <image-lazy
            :src="formatImageUrl(item.image)"
            mode="aspectFill"
            :preload="true"
          ></image-lazy>
          <view class="carousel-info">
            <text class="carousel-title">{{ item.title || '' }}</text>
            <text class="carousel-author">{{ item.author || '' }}</text>
          </view>
        </view>
      </swiper-item>
    </swiper>
  </view>
  <view class="carousel-loading" v-else>
    <skeleton type="carousel"></skeleton>
  </view>
</template>

<script>
import Skeleton from '../../skeleton/skeleton.vue';
import apiConfig from '../../../utils/api.js';

export default {
  name: 'Carousel',
  components: { Skeleton },
  props: {
    items: { type: Array, default: () => [] },
    height: { type: String, default: '350px' }
  },
  data() {
    return { current: 0 };
  },
  methods: {
    onChange(e) { this.current = e.detail.current; },
    clickItem(item) { this.$emit('click', item); },
    formatImageUrl(url) {
      return apiConfig.getImageUrl(url);
    }
  }
};
</script>

<style>
.carousel-section {
  width: 100%;
  height: 350px;
  background-color: #ffffff;
  min-height: 250px;
}

.carousel-swiper {
  width: 100%;
  height: 100%;
}

.carousel-item {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 0;
  overflow: hidden;
}

.carousel-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24upx;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%);
}

.carousel-title {
  color: #ffffff;
  font-size: 30upx;
  font-weight: 600;
  margin-bottom: 8upx;
  display: block;
}

.carousel-author {
  color: rgba(255,255,255,0.8);
  font-size: 24upx;
}

.carousel-loading {
  width: 100%;
  height: 350px;
  background-color: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>