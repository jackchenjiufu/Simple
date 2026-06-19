<template>
  <view class="cards-section">
    <view class="cards-container" v-if="cards.length > 0 && !loading">
      <view
        class="card-item"
        v-for="(card, index) in cards"
        :key="card.id || index"
        @click="clickCard(card, index)"
      >
        <view class="card-thumb">
          <image-lazy
            :src="formatImageUrl(card.cover || card.image || card.image_url || '/static/img/default-cover.png')"
            mode="aspectFill"
          ></image-lazy>
        </view>
        <view class="card-info">
          <text class="card-title">{{ card.title }}</text>
          <text class="card-author">{{ card.username || card.author || '未知作者' }}</text>
          <text class="card-recommend-tag" v-if="card.recommendedBy">
            {{ card.recommendedBy === 'personalized' ? '智能推荐' : '热门推荐' }}
          </text>
        </view>
      </view>
    </view>
    <view class="cards-loading" v-else-if="loading">
      <skeleton type="cards" :count="4"></skeleton>
      <text class="loading-text">{{ loadingText }}</text>
    </view>
    <view class="cards-loading" v-else>
      <skeleton type="cards" :count="4"></skeleton>
    </view>
    <view class="loading-more" v-if="loadingMore">
      <text class="loading-more-text">{{ loadingMoreText }}</text>
    </view>
  </view>
</template>

<script>
import Skeleton from '../../skeleton/skeleton.vue';

export default {
  name: 'RecommendCard',
  components: { Skeleton },
  props: {
    cards: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
    loadingText: { type: String, default: '正在为你生成智能推荐...' },
    loadingMoreText: { type: String, default: '正在加载更多图片...' },
    currentRecommendId: { type: String, default: '' }
  },
  methods: {
    clickCard(card, index) {
      this.$emit('click', card, index);
    },
    formatImageUrl(url) {
      if (!url) return '/static/img/default-cover.png';
      url = url.trim().replace(/`/g, '');
      if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.includes('139.196.185.197') && !url.includes('7070')) {
          url = url.replace('http://139.196.185.197/', 'http://139.196.185.197:7070/');
        }
        return url;
      }
      return url.startsWith('/') ? `http://139.196.185.197:7070${url}` : '/static/img/default-cover.png';
    }
  }
};
</script>

<style>
.cards-section {
  flex: 1;
  padding: 12upx;
  position: relative;
  background-color: #ffffff;
}

.cards-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16upx;
  padding: 12upx;
  overflow: visible;
  align-content: flex-start;
}

.card-item {
  background-color: #ffffff;
  border-radius: 12upx;
  overflow: hidden;
  width: calc(50% - 8upx);
  display: flex;
  flex-direction: column;
  padding: 12upx;
  gap: 8upx;
  box-shadow: 0 2upx 8upx rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
  flex-shrink: 0;
}

.card-item:active {
  box-shadow: 0 4upx 16upx rgba(0, 0, 0, 0.1);
}

.card-thumb {
  width: 100%;
  height: 250upx;
  border-radius: 8upx;
  overflow: hidden;
  background-color: #f3f4f6;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.card-title {
  color: #1f2937;
  font-size: 26upx;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-author {
  color: #6b7280;
  font-size: 22upx;
}

.card-recommend-tag {
  font-size: 22upx;
  color: #1b44a6;
  background-color: rgba(27, 68, 166, 0.08);
  padding: 4px 8px;
  border-radius: 8upx;
  margin-top: 8upx;
  display: inline-block;
}

.cards-loading {
  padding: 24upx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16upx;
}

.loading-text {
  color: #9ca3af;
  font-size: 26upx;
  text-align: center;
  margin-top: 16upx;
}

.loading-more {
  text-align: center;
  padding: 24upx;
  margin-top: 12upx;
  background-color: #ffffff;
}

.loading-more-text {
  color: #6b7280;
  font-size: 24upx;
}
</style>