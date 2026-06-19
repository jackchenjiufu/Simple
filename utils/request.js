/**
 * API请求工具
 * 用于处理API请求，集成缓存功能，减少网络请求，提高应用性能
 */

import apiConfig from './api.js';
import cache from './cache.js';
import { debounce, throttle } from './debounce-throttle.js';

// 请求队列管理
const requestQueue = new Map();

// 重试配置
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * 发送API请求
 * @param {string} endpoint - API端点
 * @param {Object} options - 请求选项
 * @param {string} options.method - 请求方法，默认为GET
 * @param {Object} options.data - 请求数据
 * @param {Object} options.header - 请求头
 * @param {boolean} options.cache - 是否使用缓存，默认为false
 * @param {number} options.cacheTime - 缓存时间（毫秒），默认为30分钟
 * @param {boolean} options.debounce - 是否使用防抖，默认为false
 * @param {number} options.debounceTime - 防抖时间（毫秒），默认为300ms
 * @param {boolean} options.throttle - 是否使用节流，默认为false
 * @param {number} options.throttleTime - 节流时间（毫秒），默认为300ms
 * @param {number} options.retry - 重试次数，默认为3
 * @param {number} options.retryDelay - 重试延迟（毫秒），默认为1000ms
 * @returns {Promise<Object>} 请求结果
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    data = {},
    header = {},
    cache: useCache = false,
    cacheTime = 30 * 60 * 1000,
    debounce: useDebounce = false,
    debounceTime = 300,
    throttle: useThrottle = false,
    throttleTime = 300,
    retry = DEFAULT_RETRY_COUNT,
    retryDelay = DEFAULT_RETRY_DELAY
  } = options;

  // 构建请求URL
  const url = apiConfig.getUrl(endpoint);
  // 构建缓存键名，基于端点、方法和请求数据
  const cacheKey = `${endpoint}_${method}_${JSON.stringify(data)}`;
  
  // 检查是否需要使用缓存
  if (useCache) {
    // 从缓存获取数据
    const cachedData = cache.getCache(cacheKey);
    if (cachedData) {
      console.log('使用缓存数据:', cacheKey);
      return cachedData;
    }
  }

  // 构建请求参数
  const requestOptions = {
    url: url,
    method: method,
    data: data,
    header: {
      'Content-Type': 'application/json',
      ...header
    }
  };

  /**
   * 发送请求的核心函数
   * @param {number} attempt - 当前尝试次数
   * @returns {Promise<Object>} 请求结果
   */
  const sendRequest = async (attempt = 0) => {
    return new Promise((resolve, reject) => {
      uni.request({
        ...requestOptions,
        success: (res) => {
          // 检查响应状态
          if (res.statusCode === 200) {
            const result = res.data;
            
            // 检查是否需要缓存数据
            if (useCache && result.code === 200) {
              // 缓存请求结果
              cache.setCache(cacheKey, result, cacheTime);
            }
            
            resolve(result);
          } else {
            const error = new Error(`请求失败，状态码：${res.statusCode}`);
            console.error('API请求失败:', error);
            
            // 检查是否需要重试
            if (attempt < retry) {
              console.log(`请求失败，正在重试（${attempt + 1}/${retry}）...`);
              setTimeout(() => {
                sendRequest(attempt + 1)
                  .then(resolve)
                  .catch(reject);
              }, retryDelay * Math.pow(2, attempt)); // 指数退避
            } else {
              reject(error);
            }
          }
        },
        fail: (err) => {
          const error = new Error(`请求失败: ${err.errMsg}`);
          console.error('API请求失败:', error);
          
          // 检查是否需要重试
          if (attempt < retry) {
            console.log(`请求失败，正在重试（${attempt + 1}/${retry}）...`);
            setTimeout(() => {
              sendRequest(attempt + 1)
                .then(resolve)
                .catch(reject);
            }, retryDelay * Math.pow(2, attempt)); // 指数退避
          } else {
            reject(error);
          }
        }
      });
    });
  };

  // 检查是否已经有相同的请求在进行中
  const queueKey = `${endpoint}_${method}_${JSON.stringify(data)}`;
  if (requestQueue.has(queueKey)) {
    console.log('使用队列中的请求:', queueKey);
    return requestQueue.get(queueKey);
  }

  // 创建请求Promise并加入队列
  const requestPromise = (async () => {
    try {
      // 根据配置选择是否使用防抖或节流
      if (useDebounce) {
        // 使用防抖，避免频繁请求
        const debouncedRequest = debounce(sendRequest, debounceTime);
        return await debouncedRequest();
      } else if (useThrottle) {
        // 使用节流，限制请求频率
        const throttledRequest = throttle(sendRequest, throttleTime);
        return await throttledRequest();
      } else {
        // 直接发送请求
        return await sendRequest();
      }
    } finally {
      // 请求完成后从队列中移除
      requestQueue.delete(queueKey);
    }
  })();

  // 将请求加入队列
  requestQueue.set(queueKey, requestPromise);
  return requestPromise;
}

/**
 * 发送GET请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
async function get(endpoint, data = {}, options = {}) {
  return request(endpoint, {
    method: 'GET',
    data: data,
    ...options
  });
}

/**
 * 发送POST请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
async function post(endpoint, data = {}, options = {}) {
  return request(endpoint, {
    method: 'POST',
    data: data,
    ...options
  });
}

/**
 * 发送PUT请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
async function put(endpoint, data = {}, options = {}) {
  return request(endpoint, {
    method: 'PUT',
    data: data,
    ...options
  });
}

/**
 * 发送DELETE请求
 * @param {string} endpoint - API端点
 * @param {Object} data - 请求数据
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 请求结果
 */
async function del(endpoint, data = {}, options = {}) {
  return request(endpoint, {
    method: 'DELETE',
    data: data,
    ...options
  });
}

// 导出请求方法
export default {
  /**
   * 通用请求方法
   */
  request,
  /**
   * GET请求方法
   */
  get,
  /**
   * POST请求方法
   */
  post,
  /**
   * PUT请求方法
   */
  put,
  /**
   * DELETE请求方法
   */
  delete: del
};