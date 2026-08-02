/**
 * 后台管理 API 封装（APP 端原生调用）
 * 统一管理后台接口，自动附加 admin_token 鉴权
 */

const BASE_URL = 'http://139.196.185.197:7070/doo/server/api/'

/**
 * 获取管理员 token（优先取后台登录 token，兼容旧 storage）
 */
function getAdminToken() {
  return uni.getStorageSync('adminToken') || uni.getStorageSync('token') || ''
}

/**
 * 统一请求
 * @param {string} endpoint - API 文件名，如 'admin_users.php'
 * @param {object} options - { method, data, query }
 */
function request(endpoint, options = {}) {
  const { method = 'GET', data = {}, query = {}, timeout = 15000 } = options
  const token = getAdminToken()
  if (token) query.admin_token = token

  // 拼 query 到 URL
  let url = BASE_URL + endpoint
  const qs = Object.keys(query)
    .filter(k => query[k] !== undefined && query[k] !== null && query[k] !== '')
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&')
  if (qs) url += (url.includes('?') ? '&' : '?') + qs

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data,
      timeout,
      success: (res) => {
        if (res.statusCode === 401) {
          uni.showToast({ title: '未授权，请重新登录', icon: 'none' })
          reject({ code: 401, message: '未授权' })
          return
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject({ code: res.statusCode, message: res.data?.message || '请求失败' })
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' })
        reject({ code: -1, message: err.errMsg || '网络异常' })
      }
    })
  })
}

/**
 * 后台管理接口集合
 */
const adminApi = {
  // ===== 概览/统计 =====
  getStats: (type = 'overview') => request('admin_stats.php', { query: { type } }),

  // ===== 用户管理 =====
  getUsers: (page = 1, limit = 20) =>
    request('admin_users.php', { query: { page, limit } }),
  createUser: (data) => request('admin_users.php', { method: 'POST', data }),
  updateUser: (id, data) => request('admin_users.php', { method: 'PUT', data: { id, ...data } }),
  deleteUser: (id) => request('admin_users.php', { method: 'DELETE', query: { id } }),

  // ===== 文章管理 =====
  getAdminArticles: (page = 1, limit = 20) =>
    request('admin_articles.php', { query: { page, limit } }),
  createArticle: (data) => request('admin_articles.php', { method: 'POST', data }),
  updateArticle: (id, data) => request('admin_articles.php', { method: 'PUT', data: { id, ...data } }),
  deleteArticle: (id) => request('delete_article.php', { method: 'DELETE', data: { id } }),

  // ===== 反馈管理 =====
  getFeedback: (page = 1, limit = 20, status) =>
    request('admin_feedback.php', { query: { page, limit, ...(status !== undefined ? { status } : {}) } }),
  replyFeedback: (id, reply) =>
    request('admin_feedback.php', { method: 'PUT', data: { id, reply } }),
  setFeedbackStatus: (id, status) =>
    request('admin_feedback.php', { method: 'PUT', data: { id, status } }),
  deleteFeedback: (id) =>
    request('admin_feedback.php', { method: 'DELETE', data: { id } }),

  // ===== 轮播管理 =====
  getCarousels: () => request('admin_carousels.php'),
  saveCarousel: (data) => request('admin_carousels.php', { method: 'POST', data }),
  updateCarousel: (id, data) => request('admin_carousels.php', { method: 'PUT', data: { id, ...data } }),
  deleteCarousel: (id) => request('admin_carousels.php', { method: 'DELETE', data: { id } }),

  // ===== 公告管理 =====
  getAnnouncements: () => request('announcements.php', { method: 'POST', data: { action: 'get_announcements' } }),
  saveAnnouncement: (data) => request('announcements.php', { method: 'POST', data: { action: 'create_announcement', token: getAdminToken() || 'doo_admin_2024', ...data } }),
  deleteAnnouncement: (id) =>
    request('announcements.php', { method: 'POST', data: { action: 'delete_announcement', id } }),

  // ===== 版本管理 =====
  getVersions: () => request('get_versions.php'),
  deleteVersion: (id) => request('delete_version.php', { method: 'POST', data: { id } }),

  // ===== 热搜抓取（手动触发）=====
  crawlWeiboHot: () => request('crawl_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlDouyinHot: () => request('crawl_douyin_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlToutiaoHot: () => request('crawl_toutiao_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlZhihuHot: () => request('crawl_zhihu_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlRednoteHot: () => request('crawl_rednote_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlHNHot: () => request('crawl_hackernews_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlIntlNews: () => request('crawl_intl_news.php', { method: 'GET', timeout: 120000 }),

  // ===== 系统日志 =====
  getLogs: (page = 1, limit = 20, type = '') =>
    request('admin_logs.php', { query: { page, limit, ...(type ? { type } : {}) } }),

  // ===== 权限管理 =====
  getRoles: () => request('admin_permissions.php', { query: { type: 'roles' } }),
  getPermissions: () => request('admin_permissions.php', { query: { type: 'permissions' } }),
  getUserRoles: (userId) => request('admin_permissions.php', { query: { type: 'user', user_id: userId } }),

  // ===== 加班管理 =====
  getOvertime: (type = 'list') => request('admin_overtime.php', { query: { type } }),
  addOvertime: (data) => request('admin_overtime.php', { method: 'POST', data }),
  updateOvertime: (id, data) => request('admin_overtime.php', { method: 'PUT', data: { id, ...data } }),
  deleteOvertime: (id) => request('admin_overtime.php', { method: 'DELETE', data: { id } }),
}

// 导出 baseUrl 供需要直接拼 URL 的场景使用（如手动触发热搜）
adminApi.baseUrl = BASE_URL

export default adminApi
