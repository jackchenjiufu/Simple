<template>
  <view class="images-section">
    <view class="images-waterfall" v-if="images.length > 0">
      <view 
        class="waterfall-item" 
        v-for="(image, index) in images" 
        :key="image.id || index"
        @click="clickImage(image)"
      >
        <view class="image-wrapper">
          <image-lazy 
            :src="formatImageUrl(image.url || image.image || image.cover)" 
            mode="aspectFill"
            lazy-load="true"
          ></image-lazy>
        </view>
        <view class="image-info">
          <text class="image-title">{{ image.title }}</text>
          <text class="image-author">{{ image.author || image.username || '未知作者' }}</text>
        </view>
      </view>
    </view>
    <view class="empty-state" v-else>
      <text class="empty-text">{{ emptyText }}</text>
    </view>
  </view>
</template>

<script>
import { userBehaviorTracker } from '../../../utils/user-behavior.js';

export default {
  name: 'ImageWaterfall',
  props: {
    images: {
      type: Array,
      default: () => []
    },
    emptyText: {
      type: String,
      default: '暂无图片'
    },
    columns: {
      type: Number,
      default: 2
    }
  },
  methods: {
    // 点击图片
    clickImage(image) {
      // 记录图片点击行为
      userBehaviorTracker.trackContentClick(image.id, 'image', 0);
      // 触发点击事件
      this.$emit('click', image);
    },
    // 格式化图片URL
    formatImageUrl(url) {
      if (!url) return '/static/img/default-cover.png';
      
      // 去除可能存在的空格和反引号
      url = url.trim().replace(/`/g, '');
      
      // 检查是否是完整URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        // 确保URL格式正确
        if (url.includes('139.196.185.197') && !url.includes('7070')) {
          // 修复端口
          url = url.replace('http://139.196.185.197/', 'http://139.196.185.197:7070/');
        }
        
        // 尝试使用WebP格式（如果支持）
        if (this.supportsWebP() && (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png'))) {
          url = url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
        
        return url;
      } else if (url.startsWith('/')) {
        // 相对路径，添加完整URL
        let fullUrl = `http://139.196.185.197:7070${url}`;
        
        // 尝试使用WebP格式（如果支持）
        if (this.supportsWebP() && (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png'))) {
          fullUrl = fullUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
        
        return fullUrl;
      } else {
        // 其他情况，使用默认图片
        return '/static/img/default-cover.png';
      }
    },
    
    // 检查浏览器是否支持WebP格式
    supportsWebP() {
      if (typeof window === 'undefined') return false;
      
      if (this._webpSupported === undefined) {
        const elem = document.createElement('canvas');
        this._webpSupported = elem.getContext && elem.getContext('2d') && elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      }
      return this._webpSupported;
    }
  }
};
</script>

<style scoped>
.images-section {
  padding: var(--spacing-lg);
}

.images-waterfall {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
  padding: 0;
}

/* 响应式布局 */
@media (min-width: 768px) {
  .images-waterfall {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .images-waterfall {
    grid-template-columns: repeat(6, 1fr);
  }
}

.waterfall-item {
  background-color: var(--bg-color);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.waterfall-item:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  background-color: var(--bg-light);
}

.image-info {
  padding: var(--spacing-sm);
}

.image-title {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-primary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.image-author {
  font-size: var(--font-xs);
  color: var(--text-secondary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  text-align: center;
  padding: var(--spacing-xxl);
}

.empty-text {
  font-size: var(--font-md);
  color: var(--text-tertiary);
}
</style>