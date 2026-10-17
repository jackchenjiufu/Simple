/**
 * 角色权限控制
 *
 * 目前只有一条规则：「监控」页签仅超级管理员（super_admin）可见。
 *
 * 角色来源：登录接口返回的 user.role，随 userInfo 落在 storage 里。
 * 前端隐藏只是体验层；真正的边界在服务端
 * （server-node/src/modules/monitor/monitor.guard.ts 只放行 super_admin）。
 */

export const ROLE_SUPER_ADMIN = 'super_admin';

/** pages.json 里 tabBar 的下标：0首页 1工时 2监控 3消息 4我 */
export const MONITOR_TAB_INDEX = 2;

/** 当前登录用户角色，取不到返回空串 */
export function currentRole() {
  try {
    const raw = uni.getStorageSync('userInfo');
    if (!raw) return '';
    const ui = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return String((ui && ui.role) || '');
  } catch (e) {
    return '';
  }
}

export function isSuperAdmin() {
  return currentRole() === ROLE_SUPER_ADMIN;
}

/**
 * 按角色刷新「监控」页签的显示状态。
 * uni.setTabBarItem 的 visible 需要 App/H5 3.2.10+，当前打包 SDK 远高于此；
 * 老环境不支持时静默失败，不影响其他功能。
 */
export function applyTabPerm() {
  const visible = isSuperAdmin();
  try {
    uni.setTabBarItem({
      index: MONITOR_TAB_INDEX,
      visible,
      fail: () => {},
    });
  } catch (e) {
    /* 忽略：低版本运行时没有 visible 参数 */
  }
  return visible;
}

/** tabBar 可能还没创建好，冷启动时补一次 */
export function applyTabPermTwice() {
  applyTabPerm();
  setTimeout(() => applyTabPerm(), 800);
  return isSuperAdmin();
}

/**
 * 监控系列页面的统一入口守卫。
 * @returns {boolean} true=放行；false=已提示并跳回首页
 */
export function guardMonitor() {
  if (isSuperAdmin()) return true;
  uni.showToast({ title: '该功能仅超级管理员可见', icon: 'none', duration: 1800 });
  setTimeout(() => {
    uni.switchTab({ url: '/pages/tabbar/tabbar-1/tabbar-1' });
  }, 500);
  return false;
}
