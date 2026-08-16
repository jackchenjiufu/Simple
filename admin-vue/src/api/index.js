import axios from 'axios'

const API_BASE = '/doo/server/api/v2'

const api = axios.create({ baseURL: API_BASE, timeout: 15000 })

// 登录
export const login = (username, password) =>
  api.post('/admin_login.php', { username, password })

// 用户管理
export const getUsers = (page, limit) =>
  api.get(`/admin_users.php?page=${page}&limit=${limit}`)


// 公告
export const getAnnouncements = () =>
  api.post('/announcements.php', { action: 'get_announcements' })
export const saveAnnouncement = (data) =>
  api.post('/announcements.php', data)
export const deleteAnnouncement = (id) =>
  api.post('/announcements.php', { action: 'delete_announcement', id, token: localStorage.getItem('admin_token') || '' })

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

// 版本管理
export const getVersions = () =>
  api.get('/get_versions.php')
export const uploadVersion = (formData) =>
  api.post('/upload_version.php', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteVersion = (id) =>
  api.post('/delete_version.php', { id })

// 轮播删除（后端 DELETE 读取 $_GET['id']）
export const deleteCarousel = (id) =>
  api.delete('/admin_carousels.php', { params: { id } })

// 当前登录管理员角色与权限列表（前端菜单按权限过滤）
export const getMyPermissions = () =>
  api.get('/admin_my_permissions.php')

// API 版本切换（后端全局生效，App 端启动自动跟随）
export const getApiVersion = () =>
  api.get('/admin_api_version.php')
export const switchApiVersion = (version) =>
  api.post('/admin_api_version.php', { action: 'switch', version })


// 添加管理员 Token + 用户 ID（admin_auth.php 权限校验需要识别用户）
// 必须同时带 admin_token（鉴权）+ admin_uid（识别角色查权限表），缺一即 401
api.interceptors.request.use(config => {
  config.params = config.params || {}
  const adminUid = localStorage.getItem('admin_uid')
  if (adminUid) config.params.admin_uid = adminUid
  const adminToken = localStorage.getItem('admin_token')
  if (adminToken) config.params.admin_token = adminToken
  return config
})


export default api
