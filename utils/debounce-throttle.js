/**
 * 防抖工具函数
 * 用于控制函数的执行频率，避免频繁API调用
 */

/**
 * 防抖函数
 * 延迟执行函数，在指定时间内多次调用只执行最后一次，返回 Promise
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖处理后的函数（返回 Promise）
 */
function debounce(func, wait = 300, immediate = false) {
  let timeout;
  let resolveList = [];
  return function executedFunction(...args) {
    const ctx = this;
    return new Promise((resolve) => {
      resolveList.push(resolve);
      const later = async () => {
        timeout = null;
        const result = await func.apply(ctx, args);
        resolveList.forEach(r => r(result));
        resolveList = [];
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        const result = func.apply(ctx, args);
        resolveList.forEach(r => r(result));
        resolveList = [];
      }
    });
  };
}

export {
  debounce
};