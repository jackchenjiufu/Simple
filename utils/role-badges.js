/**
 * 角色徽章动态工具
 * 从后端拉取角色列表（public_roles.php），任何后台角色都显示徽章
 * 颜色：角色表 badge_color 优先，空则按名称 hash 自动生成
 */
import apiConfig from './api.js';

let rolesCache = null;      // [{id, name, badge_color}]
let loadingPromise = null;

// 名称 → 稳定颜色（hash 取色）
function hashColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return { text: `hsl(${hue}, 55%, 35%)`, bg: `hsl(${hue}, 55%, 95%)`, border: `hsl(${hue}, 50%, 80%)` };
}

// 加载角色列表（缓存 + 并发去重）
export function loadRoles(force = false) {
  if (rolesCache && !force) return Promise.resolve(rolesCache);
  if (loadingPromise && !force) return loadingPromise;
  loadingPromise = new Promise((resolve) => {
    uni.request({
      url: apiConfig.baseUrl + 'public_roles.php',
      method: 'GET',
      success: (res) => {
        try {
          const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          rolesCache = (result && result.code === 200 && Array.isArray(result.data)) ? result.data : [];
        } catch (e) { rolesCache = []; }
        resolve(rolesCache);
      },
      fail: () => { rolesCache = []; resolve(rolesCache); }
    });
  }).finally(() => { loadingPromise = null; });
  return loadingPromise;
}

// 懒加载：缓存未就绪且无加载中请求时自动触发，防止页面漏调 loadRoles() 导致徽章不显示
function ensureRoles() {
  if (rolesCache === null && !loadingPromise) loadRoles();
}

// 角色是否显示徽章（非 user 角色）
export function isBadgeRole(name) {
  if (!name || name === 'user') return false;
  ensureRoles();
  if (rolesCache) return rolesCache.some(r => r.name === name);
  return ['super_admin', 'admin', 'editor'].includes(name); // 未加载完时兜底内置角色
}

// 角色徽章显示名（角色表 display_name 优先，兜底内置映射）
export function badgeLabel(name) {
  const map = { super_admin: '超级管理员', admin: '管理员', editor: '编辑' };
  if (map[name]) return map[name];
  ensureRoles();
  const found = rolesCache ? rolesCache.find(r => r.name === name) : null;
  return (found && found.display_name) ? found.display_name : (name || '');
}

// 角色徽章样式
export function badgeStyle(name) {
  ensureRoles();
  const found = rolesCache ? rolesCache.find(r => r.name === name) : null;
  if (found && found.badge_color) {
    return { color: found.badge_color, background: found.badge_color + '14', border: '1upx solid ' + found.badge_color + '66' };
  }
  const c = hashColor(name || 'x');
  return { color: c.text, background: c.bg, border: '1upx solid ' + c.border };
}
