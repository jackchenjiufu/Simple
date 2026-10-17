/**
 * 后台管理 API 封装（APP 端原生调用）
 * 统一管理后台接口，自动附加 admin_token 鉴权
 * 内核复用 utils/request.js
 */
import requestModule from './request.js'
import config from './config.js'

// request.js 默认导出是 { request, get, post, ... } 对象，取其中的 request 函数作内核
const request = requestModule.request

/**
 * 获取管理员 token（优先取后台登录 token，兼容旧 storage）
 */
function getAdminToken() {
  return uni.getStorageSync('adminToken') || uni.getStorageSync('token') || ''
}

/**
 * 统一请求（复用 request.js 内核，自动附加 admin_token / admin_uid）
 * @param {string} endpoint - API 文件名，如 'admin_users.php'
 * @param {object} options - { method, data, query, timeout }
 */
function adminRequest(endpoint, options = {}) {
  const { method = 'GET', data = {}, query = {}, timeout = 15000 } = options
  // 鉴权信息走请求头（X-Admin-Token / X-Admin-Uid），避免 token 出现在 URL
  // （URL query 会进入访问日志/代理日志）。后端 admin_auth.php / upload*.php 均支持头读取。
  const token = getAdminToken()
  const header = {}
  if (token) header['X-Admin-Token'] = token
  // 附带用户 ID：后端按用户角色查权限表校验
  const uid = uni.getStorageSync('userId')
  if (uid) header['X-Admin-Uid'] = String(uid)

  return request(endpoint, {
    method,
    data,
    query,
    timeout,
    header,
    retry: 0,
    onUnauthorized: () => {
      uni.showToast({ title: '未授权，请重新登录', icon: 'none' })
    }
  })
}

/**
 * 后台管理接口集合
 */
const adminApi = {
  // ===== 权限 =====
  getMyPermissions: () => adminRequest('admin_my_permissions.php'),

  // ===== 概览/统计 =====
  getStats: (type = 'overview') => adminRequest('admin_stats.php', { query: { type } }),

  // ===== 用户管理 =====
  getUsers: (page = 1, limit = 20) =>
    adminRequest('admin_users.php', { query: { page, limit } }),
  createUser: (data) => adminRequest('admin_users.php', { method: 'POST', data }),
  updateUser: (id, data) => adminRequest('admin_users.php', { method: 'PUT', data: { id, ...data } }),
  deleteUser: (id) => adminRequest('admin_users.php', { method: 'DELETE', query: { id } }),

  // ===== 文章管理 =====
  getAdminArticles: (page = 1, limit = 20) =>
    adminRequest('admin_articles.php', { query: { page, limit } }),
  getArticleAuthors: (search = '') => adminRequest('article_authors.php', { query: { search } }),
  createArticle: (data) => adminRequest('admin_articles.php', { method: 'POST', data }),
  updateArticle: (id, data) => adminRequest('admin_articles.php', { method: 'PUT', data: { id, ...data } }),
  deleteArticle: (id) => adminRequest('admin_articles.php', { method: 'DELETE', query: { id } }),

  // ===== 反馈管理 =====
  getFeedback: (page = 1, limit = 20, status) =>
    adminRequest('admin_feedback.php', { query: { page, limit, ...(status !== undefined ? { status } : {}) } }),
  replyFeedback: (id, reply) =>
    adminRequest('admin_feedback.php', { method: 'PUT', data: { id, reply } }),
  setFeedbackStatus: (id, status) =>
    adminRequest('admin_feedback.php', { method: 'PUT', data: { id, status } }),
  deleteFeedback: (id) =>
    adminRequest('admin_feedback.php', { method: 'DELETE', query: { id } }),

  // ===== 轮播管理 =====
  getCarousels: () => adminRequest('admin_carousels.php'),
  saveCarousel: (data) => adminRequest('admin_carousels.php', { method: 'POST', data }),
  updateCarousel: (id, data) => adminRequest('admin_carousels.php', { method: 'PUT', data: { id, ...data } }),
  deleteCarousel: (id) => adminRequest('admin_carousels.php', { method: 'DELETE', query: { id } }),

  // ===== 评论管理 =====
  getComments: (page = 1, limit = 20, status, search) =>
    adminRequest('admin_comments.php', { query: { page, limit, ...(status !== undefined && status !== -1 ? { status } : {}), ...(search ? { search } : {}) } }),
  setCommentTop: (id, isTop) =>
    adminRequest('admin_comments.php', { method: 'PUT', data: { id, is_top: isTop ? 1 : 0 } }),
  setCommentStatus: (id, status) =>
    adminRequest('admin_comments.php', { method: 'PUT', data: { id, status } }),
  deleteComment: (id) =>
    adminRequest('admin_comments.php', { method: 'DELETE', query: { id } }),

  // ===== 举报管理 =====
  getReports: (page = 1, limit = 20, status, type, search) =>
    adminRequest('admin_reports.php', { query: { page, limit, ...(status !== undefined && status !== -1 ? { status } : {}), ...(type ? { type } : {}), ...(search ? { search } : {}) } }),
  setReportStatus: (id, status) =>
    adminRequest('admin_reports.php', { method: 'PUT', data: { id, status } }),
  deleteReport: (id) =>
    adminRequest('admin_reports.php', { method: 'DELETE', query: { id } }),

  // ===== 公告管理 =====
  getAnnouncements: () => adminRequest('announcements.php', { method: 'POST', data: { action: 'get_announcements' } }),
  saveAnnouncement: (data) => adminRequest('announcements.php', { method: 'POST', data: { action: 'create_announcement', token: getAdminToken(), ...data } }),
  deleteAnnouncement: (id) =>
    adminRequest('announcements.php', { method: 'POST', data: { action: 'delete_announcement', id } }),

  // ===== 版本管理 =====
  getVersions: () => adminRequest('get_versions.php'),
  deleteVersion: (id) => adminRequest('delete_version.php', { method: 'POST', data: { id } }),

  // ===== 热搜抓取（手动触发）=====
  crawlWeiboHot: () => adminRequest('crawl_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlDouyinHot: () => adminRequest('crawl_douyin_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlToutiaoHot: () => adminRequest('crawl_toutiao_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlZhihuHot: () => adminRequest('crawl_zhihu_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlRednoteHot: () => adminRequest('crawl_rednote_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlHNHot: () => adminRequest('crawl_hackernews_hotsearch.php', { method: 'GET', timeout: 120000 }),
  crawlIntlNews: () => adminRequest('crawl_intl_news.php', { method: 'GET', timeout: 120000 }),

  // ===== 系统日志 =====
  getLogs: (page = 1, limit = 20, type = '') =>
    adminRequest('admin_logs.php', { query: { page, limit, ...(type ? { type } : {}) } }),

  // ===== 权限管理 =====
  getRoles: () => adminRequest('admin_permissions.php', { query: { type: 'roles' } }),
  getPermissions: () => adminRequest('admin_permissions.php', { query: { type: 'permissions' } }),
  getUserRoles: (userId) => adminRequest('admin_permissions.php', { query: { type: 'user_roles', user_id: userId } }),
  createRole: (data) => adminRequest('admin_permissions.php', { method: 'POST', data }),
  updateRole: (roleId, data) =>
    adminRequest('admin_permissions.php', { method: 'PUT', data: { role_id: roleId, ...data } }),
  assignUserRole: (userId, roleId) =>
    adminRequest('admin_permissions.php', { method: 'POST', data: { user_id: userId, role_id: roleId } }),

  // ===== 加班管理 =====
  getOvertime: (type = 'list') => adminRequest('admin_overtime.php', { query: { type } }),
  addOvertime: (data) => adminRequest('admin_overtime.php', { method: 'POST', data }),
  updateOvertime: (id, data) => adminRequest('admin_overtime.php', { method: 'PUT', data: { id, ...data } }),
  deleteOvertime: (id) => adminRequest('admin_overtime.php', { method: 'DELETE', data: { id } }),

  // ===== 缓存管理 =====
  getCacheStatus: () => adminRequest('system_cache.php'),
  flushCache: () => adminRequest('system_cache.php', { method: 'POST', data: { action: 'flush' } }),
  forgetCache: (pattern) => adminRequest('system_cache.php', { method: 'POST', data: { action: 'forget', pattern } }),

  // ===== 内容推荐 =====
  getRecommendOverview: () => adminRequest('admin_recommend.php'),
  getRecommendContents: (params = {}) => adminRequest('admin_recommend.php', { query: { action: 'contents', ...params } }),
  getRecommendGroups: () => adminRequest('admin_recommend.php', { query: { action: 'groups' } }),
  getRecommendFingerprints: () => adminRequest('admin_recommend.php', { query: { action: 'fingerprints' } }),
  dedupFingerprintGroup: (groupId) =>
    adminRequest('admin_recommend.php', { method: 'POST', data: { action: 'dedup', group_id: groupId } }),
  dedupFingerprintGroups: (groupIds) =>
    adminRequest('admin_recommend.php', { method: 'POST', data: { action: 'dedup', group_ids: groupIds } }),
  dedupFingerprintAll: () =>
    adminRequest('admin_recommend.php', { method: 'POST', data: { action: 'dedup', all: 1 } }),
  toggleRecommend: (id, recommended) =>
    adminRequest('admin_recommend.php', { method: 'POST', data: { action: 'toggle', id, recommended } }),
  pinContent: (id, pinned) =>
    adminRequest('admin_recommend.php', { method: 'POST', data: { action: 'pin', id, pinned } }),
  tagContent: (id) =>
    adminRequest('admin_recommend.php', { method: 'POST', data: { action: 'tag_one', id } }),
  getAlgoConfig: () => adminRequest('admin_recommend.php', { query: { action: 'algo_config' } }),
  saveAlgoConfig: (data) => adminRequest('admin_recommend.php', { method: 'POST', data: { action: 'save_algo_config', ...data } }),

  // ===== 数据库管理 =====
  getDbOverview: () => adminRequest('admin_database.php'),
  getDbTables: (params = {}) => adminRequest('admin_database.php', { query: { action: 'data', ...params } }),
  getDbStructure: (table) => adminRequest('admin_database.php', { query: { action: 'structure', table } }),

  // ===== 用户行为分析 =====
  getBehaviorUsers: (params = {}) => adminRequest('admin_behaviors.php', { query: { action: 'list', ...params } }),
  getBehaviorDetail: (params = {}) => adminRequest('admin_behaviors.php', { query: { action: 'detail', ...params } }),
  getBehaviorTypes: (params = {}) => adminRequest('admin_behaviors.php', { query: { action: 'types', ...params } }),
  deleteBehavior: (id) => adminRequest('admin_behaviors.php', { method: 'POST', data: { action: 'delete', id } }),
  clearUserBehaviors: (userId) => adminRequest('admin_behaviors.php', { method: 'POST', data: { action: 'clear_user', user_id: userId } }),

  // ===== 系统设置 =====
  getSiteInfo: () => adminRequest('admin_system_config.php'),
  saveSiteInfo: (data) => adminRequest('admin_system_config.php', { method: 'POST', data: { action: 'site', ...data } }),
  getSystemConfig: () => adminRequest('admin_system_config.php', { query: { action: 'config' } }),
  changeAdminPassword: (oldPwd, newPwd) =>
    adminRequest('admin_system_config.php', { method: 'POST', data: { action: 'password', old_password: oldPwd, new_password: newPwd } }),
  flushSystemCache: () => adminRequest('admin_system_config.php', { method: 'POST', data: { action: 'flush' } }),

  // ===== AI 代理（GLM 识图） =====
  getAiConfig: () => adminRequest('ai_proxy.php', { method: 'POST', data: { action: 'get_config' } }),
  saveAiConfig: (data) => adminRequest('ai_proxy.php', { method: 'POST', data: { action: 'save_config', ...data } }),
  testAiVision: (data) => adminRequest('ai_proxy.php', { method: 'POST', data: { action: 'test', mode: 'vision', ...data } }),

  // ===== 启动页管理 =====
  getSplashConfig: () => adminRequest('splash_config.php'),
  saveSplashConfig: (data) => adminRequest('splash_config.php', { method: 'POST', data }),

  // ===== 内容管理（admin_content.php） =====
  getContentList: (params = {}) => adminRequest('admin_content.php', { query: params }),
  updateContentMeta: (data) => adminRequest('admin_content.php', { method: 'POST', query: { action: 'update_meta' }, data }),
  restoreContent: (id) => adminRequest('admin_content.php', { method: 'POST', query: { action: 'restore' }, data: { id } }),
  setContentModeration: (id, moderationStatus) => adminRequest('admin_content.php', { method: 'POST', query: { action: 'set_moderation' }, data: { id, moderation_status: moderationStatus } }),
  deleteContent: (id, hard = false) => adminRequest('admin_content.php', { method: 'DELETE', query: { id, ...(hard ? { hard: '1' } : {}) } }),
  batchContent: (ids, op) => adminRequest('admin_content.php', { method: 'POST', query: { action: 'batch' }, data: { ids, op } }),

  // ===== API 管理 =====
  getApiDocs: () => adminRequest('admin_apis.php'),
  getVersionDocs: () => adminRequest('admin_api_docs.php', { query: { action: 'list' } }),
  getV2Apis: () => adminRequest('admin_v2api.php'),
  createV2Api: (file) => adminRequest('admin_v2api.php', { method: 'POST', data: { action: 'create', file } }),
  deleteV2Api: (file) => adminRequest('admin_v2api.php', { method: 'POST', data: { action: 'delete', file } }),
  getApiVersion: () => adminRequest('admin_api_version.php'),
  switchApiVersion: (version) => adminRequest('admin_api_version.php', { method: 'POST', data: { action: 'switch', version } }),

  // ===== 系统维护 =====
  getSystemMonitor: () => adminRequest('system_monitor.php', { query: { type: 'overview' } }),
  migrateFeedback: () => adminRequest('migrate_feedback.php', { timeout: 60000 }),
}

// 导出 baseUrl 供需要直接拼 URL 的场景使用（如手动触发热搜）
adminApi.baseUrl = config.baseUrl

export default adminApi
