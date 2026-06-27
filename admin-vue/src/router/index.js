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
      { path: 'content', component: () => import('@/views/Content.vue') },
      { path: 'carousel', component: () => import('@/views/Carousel.vue') },
      { path: 'announcement', component: () => import('@/views/Announcement.vue') },
      { path: 'article', component: () => import('@/views/Article.vue') },
      { path: 'feedback', component: () => import('@/views/Feedback.vue') },
      { path: 'splash', component: () => import('@/views/Splash.vue') },
      { path: 'stats', component: () => import('@/views/Stats.vue') },
      { path: 'logs', component: () => import('@/views/Logs.vue') },
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const admin = localStorage.getItem('adminInfo')
  if (to.path !== '/login' && !admin) {
    next('/login')
  } else {
    next()
  }
})

export default router
