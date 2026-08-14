/**
 * chat-api.js - 私聊 API 封装（App 端）
 * 自动携带 Bearer token（utils/request.js 全局拦截器注入）
 */

import apiConfig from './api.js'

const BASE = apiConfig.baseUrl + 'messages.php'

function parse(res) {
  if (typeof res.data === 'string') {
    try { return JSON.parse(res.data) } catch (e) { return { code: -1, message: '数据解析失败' } }
  }
  return res.data
}

/** GET 请求（query 对象拼到 URL） */
function get(query) {
  return new Promise((resolve, reject) => {
    const qs = Object.keys(query)
      .filter(k => query[k] !== undefined && query[k] !== null && query[k] !== '')
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
      .join('&')
    uni.request({
      url: BASE + (qs ? '?' + qs : ''),
      method: 'GET',
      success: (res) => {
        const r = parse(res)
        if (r.code === 200) resolve(r)
        else reject(r)
      },
      fail: () => reject({ code: -1, message: '网络异常' })
    })
  })
}

/** POST 请求（form 表单） */
function post(data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE,
      method: 'POST',
      header: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data,
      success: (res) => {
        const r = parse(res)
        if (r.code === 200) resolve(r)
        else reject(r)
      },
      fail: () => reject({ code: -1, message: '网络异常' })
    })
  })
}

const chatApi = {
  /** 会话列表 */
  getConversations: () => get({ action: 'conversations' }),

  /** 某会话消息列表（正序返回） */
  getMessages: (conversationId, page = 1, limit = 20) =>
    get({ action: 'messages', conversation_id: conversationId, page, limit }),

  /** 发送消息 */
  send: (toUserId, content) => post({ action: 'send', to_user_id: toUserId, content }),

  /** 标记已读 */
  markRead: (conversationId) => post({ action: 'read', conversation_id: conversationId }),

  /** 拉黑 */
  block: (userId) => post({ action: 'block', user_id: userId }),

  /** 取消拉黑 */
  unblock: (userId) => post({ action: 'unblock', user_id: userId }),

  /** 举报消息（统一举报接口 report.php） */
  report: (messageId, reason, detail) => {
    const reporterId = uni.getStorageSync('userId') || 0;
    return new Promise((resolve, reject) => {
      uni.request({
        url: apiConfig.baseUrl + 'report.php',
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: {
          reporter_id: reporterId,
          target_type: 'message',
          target_id: messageId,
          reason: reason || '其他',
          detail: detail || ''
        },
        success: (res) => {
          const r = parse(res)
          if (r.code === 200) resolve(r)
          else reject(r)
        },
        fail: () => reject({ code: -1, message: '网络异常' })
      })
    })
  },
}

export default chatApi
