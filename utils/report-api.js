/**
 * report-api.js - 统一举报接口封装（App 端）
 * 走 report.php：{ reporter_id, target_type, target_id, reason, detail }
 * target_type 支持: user / message / article / comment
 */

import apiConfig from './api.js'

const BASE = apiConfig.baseUrl + 'report.php'

const DEFAULT_REASONS = ['垃圾广告', '色情低俗', '辱骂攻击', '诈骗信息', '其他']

function parse(res) {
  if (typeof res.data === 'string') {
    try { return JSON.parse(res.data) } catch (e) { return { code: -1, message: '数据解析失败' } }
  }
  return res.data
}

/**
 * 通用举报
 * @param {string} targetType - user/message/article/comment
 * @param {number} targetId
 * @param {string} reason
 * @param {string} detail
 */
function submitReport(targetType, targetId, reason, detail) {
  const reporterId = uni.getStorageSync('userId') || 0
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: {
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
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
}

/**
 * 弹出举报流程（原因选择 + 确认）
 * @param {string} targetType - user/message/article/comment
 * @param {number} targetId
 * @param {string} targetLabel - 举报对象描述，如「这条评论」「这篇文章」
 * @returns {Promise} 提交成功 resolve；用户取消 reject({code:-1, canceled:true})
 */
function showReportFlow(targetType, targetId, targetLabel) {
  return new Promise((resolve, reject) => {
    uni.showActionSheet({
      title: '举报' + (targetLabel || ''),
      itemList: DEFAULT_REASONS,
      success: (res) => {
        const reason = DEFAULT_REASONS[res.tapIndex]
        uni.showModal({
          title: '确认举报',
          content: `将以「${reason}」举报${targetLabel || '该内容'}，管理员会尽快处理。`,
          confirmColor: '#e64340',
          success: (r) => {
            if (!r.confirm) { reject({ code: -1, canceled: true }); return }
            uni.showLoading({ title: '提交中...' })
            submitReport(targetType, targetId, reason, '').then((data) => {
              uni.hideLoading()
              uni.showToast({ title: '已举报', icon: 'success' })
              resolve(data)
            }).catch((e) => {
              uni.hideLoading()
              uni.showToast({ title: (e && e.message) || '举报失败', icon: 'none' })
              reject(e)
            })
          },
          fail: () => reject({ code: -1, canceled: true })
        })
      },
      fail: () => reject({ code: -1, canceled: true })
    })
  })
}

const reportApi = {
  submitReport,
  showReportFlow,
  // 便捷方法
  reportUser: (userId, reason, detail) => submitReport('user', userId, reason, detail),
  reportMessage: (msgId, reason, detail) => submitReport('message', msgId, reason, detail),
  reportArticle: (articleId, reason, detail) => submitReport('article', articleId, reason, detail),
  reportComment: (commentId, reason, detail) => submitReport('comment', commentId, reason, detail),
}

export default reportApi
