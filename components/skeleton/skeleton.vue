<template>
  <view class="skeleton-container">
    <!-- 轮播图骨架屏 -->
    <view class="skeleton-carousel" v-if="type === 'carousel'">
      <view class="skeleton-carousel-item">
        <view class="skeleton-carousel-image"></view>
        <view class="skeleton-carousel-content">
          <view class="skeleton-carousel-title"></view>
          <view class="skeleton-carousel-author"></view>
        </view>
      </view>
    </view>
    
    <!-- 卡片列表骨架屏 -->
    <view class="skeleton-cards" v-if="type === 'cards'">
      <view class="skeleton-card" v-for="i in count" :key="'card-' + i">
        <view class="skeleton-card-image"></view>
        <view class="skeleton-card-content">
          <view class="skeleton-card-title"></view>
          <view class="skeleton-card-author"></view>
        </view>
      </view>
    </view>
    
    <!-- 用户列表骨架屏 -->
    <view class="skeleton-users" v-if="type === 'users'">
      <view class="skeleton-user" v-for="i in count" :key="'user-' + i">
        <view class="skeleton-user-avatar"></view>
        <view class="skeleton-user-content">
          <view class="skeleton-user-name"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    // 骨架屏类型：carousel, cards, users
    type: {
      type: String,
      required: true
    },
    // 骨架屏数量（用于列表类型）
    count: {
      type: Number,
      default: 4
    }
  }
};
</script>

<style scoped>
.skeleton-container {
  width: 100%;
  overflow: hidden;
}

/* 轮播图骨架屏 */
.skeleton-carousel {
  width: 100%;
  height: 250px;
  background-color: #f5f5f5;
}

.skeleton-carousel-item {
  width: 100%;
  height: 100%;
  padding: 10px;
  box-sizing: border-box;
}

.skeleton-carousel-image {
  width: 100%;
  height: 80%;
  background-color: #e0e0e0;
  border-radius: 8px;
  animation: shimmer 1.5s infinite linear;
}

.skeleton-carousel-content {
  margin-top: 10px;
}

.skeleton-carousel-title {
  width: 60%;
  height: 16px;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin-bottom: 8px;
  animation: shimmer 1.5s infinite linear;
}

.skeleton-carousel-author {
  width: 40%;
  height: 13px;
  background-color: #e0e0e0;
  border-radius: 4px;
  animation: shimmer 1.5s infinite linear;
  animation-delay: 0.2s;
}

/* 卡片列表骨架屏 */
.skeleton-cards {
  padding: 10px;
}

.skeleton-card {
  display: flex;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.skeleton-card-image {
  width: 40px;
  height: 40px;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin-right: 12px;
  animation: shimmer 1.5s infinite linear;
}

.skeleton-card-content {
  flex: 1;
}

.skeleton-card-title {
  width: 70%;
  height: 14px;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin-bottom: 4px;
  animation: shimmer 1.5s infinite linear;
}

.skeleton-card-author {
  width: 50%;
  height: 12px;
  background-color: #e0e0e0;
  border-radius: 4px;
  animation: shimmer 1.5s infinite linear;
  animation-delay: 0.2s;
}

/* 用户列表骨架屏 */
.skeleton-users {
  padding: 10px;
}

.skeleton-user {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.skeleton-user-avatar {
  width: 60px;
  height: 60px;
  background-color: #e0e0e0;
  border-radius: 50%;
  margin-bottom: 10px;
  animation: shimmer 1.5s infinite linear;
}

.skeleton-user-content {
  width: 100%;
  text-align: center;
}

.skeleton-user-name {
  width: 60%;
  height: 16px;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin: 0 auto;
  animation: shimmer 1.5s infinite linear;
  animation-delay: 0.2s;
}

/* 闪烁动画 */
@keyframes shimmer {
  0% {
    background-position: -100% 0;
  }
  100% {
    background-position: 100% 0;
  }
}

.skeleton-carousel-image,
.skeleton-carousel-title,
.skeleton-carousel-author,
.skeleton-card-image,
.skeleton-card-title,
.skeleton-card-author,
.skeleton-user-avatar,
.skeleton-user-name {
  background-image: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
}
</style>