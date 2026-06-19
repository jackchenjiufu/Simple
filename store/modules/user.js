/**
 * 用户状态管理模块
 * 负责管理用户信息、登录状态、偏好设置和行为数据
 */
import apiConfig from '../../utils/api'

export default {
  namespaced: true,
  state: {
    // 用户基本信息
    userInfo: {
      id: '',           // 用户ID
      username: '',     // 用户名
      nickname: '',     // 昵称
      avatar: '',       // 头像URL
      role: '',         // 用户角色
      email: ''         // 邮箱
    },
    // 登录状态
    isLoggedIn: false,
    // 登录令牌
    token: '',
    // 用户偏好设置
    preferences: {
      theme: 'light',         // 主题（light/dark）
      language: 'zh-CN',      // 语言
      notifications: true     // 通知开关
    },
    // 用户行为数据
    behaviors: {
      likes: [],     // 点赞记录
      comments: [],  // 评论记录
      views: [],     // 浏览记录
      shares: []     // 分享记录
    }
  },
  mutations: {
    /**
     * 设置用户信息
     * @param {Object} state - 状态对象
     * @param {Object} userInfo - 用户信息
     */
    SET_USER_INFO(state, userInfo) {
      state.userInfo = { ...state.userInfo, ...userInfo }
      state.isLoggedIn = true
    },
    
    /**
     * 设置登录令牌
     * @param {Object} state - 状态对象
     * @param {string} token - 登录令牌
     */
    SET_TOKEN(state, token) {
      state.token = token
    },
    
    /**
     * 登出
     * @param {Object} state - 状态对象
     */
    LOGOUT(state) {
      state.userInfo = {
        id: '',
        username: '',
        nickname: '',
        avatar: '',
        role: '',
        email: ''
      }
      state.isLoggedIn = false
      state.token = ''
    },
    
    /**
     * 更新用户偏好设置
     * @param {Object} state - 状态对象
     * @param {Object} preferences - 偏好设置
     */
    UPDATE_PREFERENCES(state, preferences) {
      state.preferences = { ...state.preferences, ...preferences }
    },
    
    /**
     * 添加用户行为
     * @param {Object} state - 状态对象
     * @param {Object} payload - 行为数据
     * @param {string} payload.type - 行为类型
     * @param {Object} payload.data - 行为数据
     */
    ADD_BEHAVIOR(state, { type, data }) {
      if (state.behaviors[type]) {
        state.behaviors[type].push(data)
        // 限制行为数据长度，保持性能
        if (state.behaviors[type].length > 100) {
          state.behaviors[type] = state.behaviors[type].slice(-100)
        }
      }
    },
    
    /**
     * 清空用户行为
     * @param {Object} state - 状态对象
     */
    CLEAR_BEHAVIORS(state) {
      state.behaviors = {
        likes: [],
        comments: [],
        views: [],
        shares: []
      }
    }
  },
  actions: {
    /**
     * 用户登录
     * @param {Object} context - 上下文对象
     * @param {Object} credentials - 登录凭证
     * @param {string} credentials.username - 用户名
     * @param {string} credentials.password - 密码
     * @returns {Promise<Object>} 登录结果
     */
    async login({ commit }, { username, password }) {
      try {
        const response = await fetch(`${apiConfig.baseUrl}login.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        })
        
        const result = await response.json()
        
        if (result.code === 200) {
          // 更新用户信息和令牌
          commit('SET_USER_INFO', result.data.user)
          commit('SET_TOKEN', result.data.token)
          
          // 存储到本地存储
          uni.setStorageSync('userInfo', result.data.user)
          uni.setStorageSync('token', result.data.token)
          
          return { success: true, data: result.data }
        } else {
          return { success: false, message: result.message }
        }
      } catch (error) {
        console.error('登录失败:', error)
        return { success: false, message: '网络错误，请稍后重试' }
      }
    },
    
    /**
     * 用户登出
     * @param {Object} context - 上下文对象
     */
    logout({ commit }) {
      commit('LOGOUT')
      // 清除本地存储
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync('token')
    },
    
    /**
     * 从本地存储恢复用户信息
     * @param {Object} context - 上下文对象
     */
    restoreUserInfo({ commit }) {
      const userInfo = uni.getStorageSync('userInfo')
      const token = uni.getStorageSync('token')
      
      if (userInfo && token) {
        commit('SET_USER_INFO', userInfo)
        commit('SET_TOKEN', token)
      }
    },
    
    /**
     * 更新用户信息
     * @param {Object} context - 上下文对象
     * @param {Object} userInfo - 用户信息
     * @returns {Promise<Object>} 更新结果
     */
    async updateUserInfo({ commit, state }, userInfo) {
      try {
        const response = await fetch(`${apiConfig.baseUrl}update_user.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.token}`
          },
          body: JSON.stringify(userInfo)
        })
        
        const result = await response.json()
        
        if (result.code === 200) {
          // 更新用户信息
          commit('SET_USER_INFO', result.data)
          // 更新本地存储
          uni.setStorageSync('userInfo', result.data)
          return { success: true, data: result.data }
        } else {
          return { success: false, message: result.message }
        }
      } catch (error) {
        console.error('更新用户信息失败:', error)
        return { success: false, message: '网络错误，请稍后重试' }
      }
    },
    
    /**
     * 记录用户行为
     * @param {Object} context - 上下文对象
     * @param {Object} payload - 行为数据
     * @param {string} payload.type - 行为类型
     * @param {Object} payload.data - 行为数据
     */
    recordBehavior({ commit }, { type, data }) {
      commit('ADD_BEHAVIOR', { type, data })
    }
  },
  getters: {
    /**
     * 获取用户信息
     * @param {Object} state - 状态对象
     * @returns {Object} 用户信息
     */
    getUserInfo: state => state.userInfo,
    
    /**
     * 获取登录状态
     * @param {Object} state - 状态对象
     * @returns {boolean} 登录状态
     */
    getIsLoggedIn: state => state.isLoggedIn,
    
    /**
     * 获取用户角色
     * @param {Object} state - 状态对象
     * @returns {string} 用户角色
     */
    getUserRole: state => state.userInfo.role,
    
    /**
     * 获取用户偏好设置
     * @param {Object} state - 状态对象
     * @returns {Object} 偏好设置
     */
    getUserPreferences: state => state.preferences,
    
    /**
     * 获取用户行为统计
     * @param {Object} state - 状态对象
     * @returns {Object} 行为统计
     */
    getUserBehaviorStats: state => {
      return {
        likes: state.behaviors.likes.length,
        comments: state.behaviors.comments.length,
        views: state.behaviors.views.length,
        shares: state.behaviors.shares.length
      }
    }
  }
}