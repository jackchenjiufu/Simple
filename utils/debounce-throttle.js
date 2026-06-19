/**
 * 防抖和节流工具函数
 * 用于控制函数的执行频率，避免频繁API调用
 */

/**
 * 防抖函数
 * 延迟执行函数，在指定时间内多次调用只执行最后一次
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖处理后的函数
 */
function debounce(func, wait = 300, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = async () => {
      timeout = null;
      if (!immediate) await func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) return func.apply(this, args);
  };
}

/**
 * 节流函数
 * 限制函数的执行频率，在指定时间内只执行一次
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流处理后的函数
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export {
  debounce,
  throttle
};