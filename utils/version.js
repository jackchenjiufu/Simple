/**
 * 版本号比较工具（App.vue 热更新检测共用）
 * @param {string} v1 - 如 '2.4.8'
 * @param {string} v2
 * @returns {number} v1>v2:1, v1<v2:-1, 相等:0
 */
export function compareVersion(v1, v2) {
  const a1 = String(v1 || '').split('.').map(Number)
  const a2 = String(v2 || '').split('.').map(Number)
  for (let i = 0; i < Math.max(a1.length, a2.length); i++) {
    const n1 = a1[i] || 0
    const n2 = a2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}
