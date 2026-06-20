<template>
  <view class="users-section">
    <view class="users-container" v-if="users.length > 0">
      <view
        class="user-item"
        v-for="(user, index) in users"
        :key="user.id || index"
        @click="clickUser(user)"
      >
        <view class="user-avatar">
          <image-lazy
            :src="formatAvatarUrl(user.avatar)"
            mode="aspectFill"
            lazy-load="true"
          ></image-lazy>
        </view>
        <view class="user-info">
          <text class="user-name">{{ user.nickname || user.username }}</text>
        </view>
      </view>
    </view>
    <view class="users-loading" v-else>
      <skeleton type="users" :count="4"></skeleton>
    </view>
  </view>
</template>

<script>
import Skeleton from '../../skeleton/skeleton.vue';
import apiConfig from '../../../utils/api.js';

export default {
  name: 'UserCard',
  components: { Skeleton },
  props: {
    users: { type: Array, default: () => [] }
  },
  methods: {
    clickUser(user) {
      this.$emit('click', user);
    },
    formatAvatarUrl(avatar) {
      return apiConfig.getImageUrl(avatar);
    }
  }
};
</script>

<style>
.users-section {
  width: 100%;
  padding: 12upx;
}

.users-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12upx;
  padding: 0 2px;
}

.user-item {
  background-color: #ffffff;
  border-radius: 12upx;
  overflow: hidden;
  padding: 24upx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12upx;
  box-shadow: 0 2upx 8upx rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.3s ease;
}

.user-item:active {
  box-shadow: 0 4upx 16upx rgba(0, 0, 0, 0.1);
}

.user-avatar {
  width: 100upx;
  height: 100upx;
  border-radius: 50%;
  overflow: hidden;
  background-color: #f3f4f6;
}

.user-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8upx;
}

.user-name {
  font-size: 30upx;
  font-weight: 600;
  color: #1f2937;
  display: block;
  text-align: center;
}

.users-loading {
  padding: 24upx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16upx;
}
</style>