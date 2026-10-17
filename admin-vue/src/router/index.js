import { createRouter, createWebHashHistory } from 'vue-router'
import api from '@/api'

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    // mobile=1（App 内 web-view 嵌入）默认进入移动卡片首页；editor 角色默认进入文章管理
    redirect: (to) => {
      if (to.query.mobile === '1') return { path: '/mobile-home', query: { mobile: '1' } }
      const info = JSON.parse(localStorage.getItem('adminInfo') || '{}')
      return info.role === 'editor' ? '/article' : '/dashboard'
    },
    children: [
      { path: 'mobile-home', component: () => import('@/views/MobileHome.vue') },
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'users', component: () => import('@/views/Users.vue') },
      { path: 'carousel', component: () => import('@/views/Carousel.vue') },
      { path: 'announcement', component: () => import('@/views/Announcement.vue') },
      { path: 'article', component: () => import('@/views/Article.vue') },
      { path: 'content-manage', component: () => import('@/views/ContentManage.vue') },
      { path: 'article-edit', component: () => import('@/views/ArticleEdit.vue') },
      { path: 'article-edit/:id', component: () => import('@/views/ArticleEdit.vue') },
      { path: 'feedback', component: () => import('@/views/Feedback.vue') },
      { path: 'comments', component: () => import('@/views/Comments.vue') },
      { path: 'reports', component: () => import('@/views/Reports.vue') },
      { path: 'version', component: () => import('@/views/Version.vue') },
      { path: 'splash', component: () => import('@/views/Splash.vue') },
      { path: 'stats', component: () => import('@/views/Stats.vue') },
      { path: 'behaviors', component: () => import('@/views/Behaviors.vue') },
      { path: 'logs', component: () => import('@/views/Logs.vue') },
      { path: 'ai-logs', component: () => import('@/views/AiLogs.vue') },
      { path: 'api-monitor', component: () => import('@/views/ApiMonitor.vue') },
      { path: 'permissions', component: () => import('@/views/Permissions.vue') },
      { path: 'overtime', component: () => import('@/views/Overtime.vue') },
      { path: 'apis', component: () => import('@/views/ApiList.vue') },
      { path: 'cache', component: () => import('@/views/CacheManage.vue') },
      { path: 'database', component: () => import('@/views/DatabaseManage.vue') },
      { path: 'recommend', component: () => import('@/views/RecommendManage.vue') },
            { path: 'system', component: () => import('@/views/SystemSettings.vue') },
            { path: 'system-config', component: () => import('@/views/SystemConfig.vue') },
      { path: ':pathMatch(.*)*', redirect: '/dashboard' }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  // App 内鉴权通过后携带 token 进入（?admin_token=xxx），免二次登录。
  // 安全修复：token 不能只看是否非空就放行——必须向后端校验其有效性（
  // 后端 admin_auth.php 仅放行 super_admin/admin/editor，普通用户 token 会 401）。
  // 无效/普通用户 token 一律跳登录页，防止任意拼 URL 进入后台。
  const tk = to.query.admin_token
  if (tk) {
    try {
      // 先临时写入 token 供 api 拦截器携带，再向后端校验并取回真实身份
      localStorage.setItem('admin_token', tk)
      if (to.query.admin_uid) localStorage.setItem('admin_uid', to.query.admin_uid)
      const r = await api.get('/admin_my_permissions.php')
      const j = r.data
      if (j.code === 200 && j.data) {
        const d = j.data
        // 关键：以【后端返回的真实身份】(uid/nickname/role) 为准，不信任 URL 里的 admin_name/admin_role，
        // 避免登录后显示成"管理员"或他人身份
        const realUid = d.uid || to.query.admin_uid
        const realName = d.nickname || d.username || to.query.admin_name || '管理员'
        const realRole = d.role || 'admin'
        if (realUid) localStorage.setItem('admin_uid', String(realUid))
        localStorage.setItem('adminInfo', JSON.stringify({ username: realName, nickname: realName, role: realRole, token_login: true }))
        // 保留 mobile=1 参数（App web-view 嵌入时免二次登录跳转后仍进入移动模式）
        next({ path: '/', query: to.query.mobile === '1' ? { mobile: '1' } : undefined, replace: true })
        return
      }
    } catch (e) { /* 校验失败走下方登出 */ }
    // token 无效：清除本地登录态并跳登录页
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_uid')
    localStorage.removeItem('adminInfo')
    next('/login')
    return
  }
  const admin = localStorage.getItem('adminInfo')
  if (to.path !== '/login' && !admin) {
    next('/login')
  } else {
    next()
  }
})

/**
 * 旧客户端自救（防"点菜单没反应"）
 * 后台每次发版都会换掉分包文件名，仍停留在旧页面的客户端（App 的 web-view
 * 缓存、浏览器没硬刷）点菜单时请求的是已不存在的 chunk，动态 import 失败、
 * 路由不跳转，用户看到的就是"点了没反应"。这里捕获失败后强制刷一次，
 * 拿到新的 index.html 与新分包。20 秒内只刷一次，避免死循环。
 */
const RELOAD_FLAG = 'admin_chunk_reload_at'
function reloadOnce(reason) {
  const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0)
  if (Date.now() - last < 20000) {
    console.warn('[chunk] 刚刷新过，跳过自动重试：', reason)
    return false
  }
  sessionStorage.setItem(RELOAD_FLAG, String(Date.now()))
  console.warn('[chunk] 分包加载失败，自动刷新页面：', reason)
  window.location.reload()
  return true
}
// 自动刷新被限流时（连续两次都失败），给一个明确的“重新加载”入口，
// 不要留一张白屏让用户以为点了没反应
function showStaleNotice() {
  if (document.getElementById('chunk-stale-notice')) return
  const wrap = document.createElement('div')
  wrap.id = 'chunk-stale-notice'
  wrap.innerHTML =
    '<div style="position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.55);display:flex;align-items:center;justify-content:center;padding:24px">' +
    '<div style="background:#fff;border-radius:14px;padding:22px 20px;max-width:320px;text-align:center;width:100%">' +
    '<div style="font-size:16px;font-weight:600;color:#1f2937;margin-bottom:8px">后台已更新</div>' +
    '<div style="font-size:13px;color:#6b7280;line-height:1.6;margin-bottom:16px">当前页面还是旧版本，部分功能点不开。点下面按钮重新加载就好了。</div>' +
    '<button id="chunk-stale-reload" style="width:100%;height:40px;border:none;border-radius:10px;background:linear-gradient(135deg,#1b44a6,#3071f6);color:#fff;font-size:14px;font-weight:600">重新加载</button>' +
    '</div></div>'
  document.body.appendChild(wrap)
  const btn = document.getElementById('chunk-stale-reload')
  if (btn) {
    btn.addEventListener('click', () => {
      sessionStorage.removeItem(RELOAD_FLAG)
      window.location.reload()
    })
  }
}
const isChunkError = (msg) => /dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed|Failed to fetch|Couldn't resolve component/i.test(String(msg || ''))
// Vite 预加载失败会派发该事件（build 产物里带此监听）
window.addEventListener('vite:preloadError', (e) => {
  if (e && e.preventDefault) e.preventDefault()
  if (!reloadOnce('vite:preloadError')) showStaleNotice()
}, true)
router.onError((err) => {
  if (isChunkError(err && err.message)) {
    if (!reloadOnce(err && err.message)) showStaleNotice()
  } else {
    console.error('[router] 路由错误：', err)
  }
})

export default router
