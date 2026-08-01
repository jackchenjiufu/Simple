import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'users', component: () => import('@/views/Users.vue') },
      { path: 'carousel', component: () => import('@/views/Carousel.vue') },
      { path: 'announcement', component: () => import('@/views/Announcement.vue') },
      { path: 'article', component: () => import('@/views/Article.vue') },
      { path: 'feedback', component: () => import('@/views/Feedback.vue') },
      { path: 'version', component: () => import('@/views/Version.vue') },
      { path: 'splash', component: () => import('@/views/Splash.vue') },
      { path: 'stats', component: () => import('@/views/Stats.vue') },
      { path: 'logs', component: () => import('@/views/Logs.vue') },
      { path: 'permissions', component: () => import('@/views/Permissions.vue') },
      { path: 'overtime', component: () => import('@/views/Overtime.vue') },
      { path: 'apis', component: () => import('@/views/ApiList.vue') },
      { path: 'system', component: () => import('@/views/SystemSettings.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  // App 内鉴权通过后携带 token 进入（?admin_token=xxx），免二次登录
  const tk = to.query.admin_token
  if (tk) {
    localStorage.setItem('admin_token', tk)
    const name = to.query.admin_name || '管理员'
    localStorage.setItem('adminInfo', JSON.stringify({ username: name, role: 'admin', token_login: true }))
    next({ path: '/', replace: true })
    return
  }
  const admin = localStorage.getItem('adminInfo')
  if (to.path !== '/login' && !admin) {
    next('/login')
  } else {
    next()
  }
})

export default router
