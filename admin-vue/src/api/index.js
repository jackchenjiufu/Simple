import axios from 'axios'

const API_BASE = '/doo/server/api'

const api = axios.create({ baseURL: API_BASE, timeout: 15000 })

// 登录
export const login = (username, password) =>
  api.post('/admin_login.php', { username, password })

// 用户管理
export const getUsers = (page, limit) =>
  api.get(`/admin_users.php?page=${page}&limit=${limit}`)

// 内容管理
export const getContent = () =>
  api.post('/content.php', { action: 'get_content', type: 'image', offset: 0, limit: 100 })

// 轮播
export const getCarousels = () =>
  api.post('/admin_carousels.php', { action: 'get_carousels' })
export const saveCarousel = (data) =>
  api.post('/admin_carousels.php', data)

// 公告
export const getAnnouncements = () =>
  api.post('/announcements.php', { action: 'get_announcements' })
export const saveAnnouncement = (data) =>
  api.post('/announcements.php', data)
export const deleteAnnouncement = (id) =>
  api.post('/announcements.php', { action: 'delete_announcement', id, token: 'doo_admin_2024' })

// 文章
export const getArticles = () =>
  api.get('/get_articles.php', { params: { limit: 100 } })

// 反馈
export const getFeedback = () =>
  api.get('/admin_feedback.php')

// 启动页
export const getSplashConfig = () =>
  api.get('/splash_config.php')
export const saveSplashConfig = (data) =>
  api.post('/splash_config.php', data)

// 统计数据
export const getStats = () =>
  api.get('/admin_stats.php')

// 日志
export const getLogs = () =>
  api.get('/admin_logs.php')


// 文章管理
export const getAdminArticles = () =>
  api.get('/admin_articles.php')

// 反馈管理
export const updateFeedback = (id, data) =>
  api.put('/admin_feedback.php', { id, ...data })
export const deleteFeedback = (id) =>
  api.delete('/admin_feedback.php', { data: { id } })

// 轮播删除
export const deleteCarousel = (id) =>
  api.delete('/admin_carousels.php', { data: { id } })

export default api
