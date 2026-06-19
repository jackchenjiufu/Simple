/**
 * 数据缓存工具类
 * 用于缓存API请求数据，减少网络请求，提高应用性能
 */
const CACHE_PREFIX = 'doo_cache_'; // 缓存前缀
const DEFAULT_EXPIRE_TIME = 30 * 60 * 1000; // 默认过期时间：30分钟

/**
 * 将数据缓存到本地
 * @param {string} key - 缓存键名
 * @param {any} data - 缓存数据
 * @param {number} expireTime - 过期时间（毫秒），默认30分钟
 */
function setCache(key, data, expireTime = DEFAULT_EXPIRE_TIME) {
  try {
    // 构建缓存对象
    const cacheData = {
      data: data,
      expireTime: Date.now() + expireTime,
      createTime: Date.now()
    };
    // 转换为JSON字符串
    const cacheString = JSON.stringify(cacheData);
    // 存储到本地缓存
    uni.setStorageSync(CACHE_PREFIX + key, cacheString);
    return true;
  } catch (error) {
    console.error('设置缓存失败:', error);
    return false;
  }
}

/**
 * 从本地获取缓存数据
 * @param {string} key - 缓存键名
 * @returns {any|null} 缓存数据，如果不存在或已过期则返回null
 */
function getCache(key) {
  try {
    // 从本地缓存获取数据
    const cacheString = uni.getStorageSync(CACHE_PREFIX + key);
    if (!cacheString) {
      return null;
    }
    
    // 解析JSON字符串
    const cacheData = JSON.parse(cacheString);
    // 检查是否过期
    if (Date.now() > cacheData.expireTime) {
      // 数据已过期，清除缓存
      uni.removeStorageSync(CACHE_PREFIX + key);
      return null;
    }
    
    return cacheData.data;
  } catch (error) {
    console.error('获取缓存失败:', error);
    return null;
  }
}

/**
 * 清除指定键名的缓存
 * @param {string} key - 缓存键名
 */
function removeCache(key) {
  try {
    uni.removeStorageSync(CACHE_PREFIX + key);
    return true;
  } catch (error) {
    console.error('清除缓存失败:', error);
    return false;
  }
}

/**
 * 清除所有缓存
 */
function clearCache() {
  try {
    // 获取所有缓存键名
    const keys = uni.getStorageInfoSync().keys;
    // 遍历所有键名，清除带有指定前缀的缓存
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        uni.removeStorageSync(key);
      }
    });
    return true;
  } catch (error) {
    console.error('清除所有缓存失败:', error);
    return false;
  }
}

/**
 * 清除指定前缀的缓存
 * @param {string} prefix - 缓存键名前缀
 */
function clearCacheByPrefix(prefix) {
  try {
    // 获取所有缓存键名
    const keys = uni.getStorageInfoSync().keys;
    // 遍历所有键名，清除带有指定前缀的缓存
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX + prefix)) {
        uni.removeStorageSync(key);
      }
    });
    return true;
  } catch (error) {
    console.error('清除前缀缓存失败:', error);
    return false;
  }
}

/**
 * 获取缓存剩余时间
 * @param {string} key - 缓存键名
 * @returns {number} 剩余时间（毫秒），如果不存在则返回0
 */
function getCacheRemainingTime(key) {
  try {
    const cacheString = uni.getStorageSync(CACHE_PREFIX + key);
    if (!cacheString) {
      return 0;
    }
    
    const cacheData = JSON.parse(cacheString);
    const remainingTime = cacheData.expireTime - Date.now();
    return Math.max(0, remainingTime);
  } catch (error) {
    console.error('获取缓存剩余时间失败:', error);
    return 0;
  }
}

/**
 * 检查缓存是否存在且未过期
 * @param {string} key - 缓存键名
 * @returns {boolean} 是否存在且未过期
 */
function hasValidCache(key) {
  return getCache(key) !== null;
}

// 导出缓存工具方法
export default {
  setCache,
  getCache,
  removeCache,
  clearCache,
  clearCacheByPrefix,
  getCacheRemainingTime,
  hasValidCache
};