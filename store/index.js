// #ifdef VUE3
import { createStore } from 'vuex'

/**
 * 用户登录态模块
 * state 与 uni storage 双向同步：storage 是持久层，store 是运行时层
 */
const user = {
  namespaced: true,
  state: () => ({
    token: uni.getStorageSync('token') || '',
    userInfo: uni.getStorageSync('userInfo') || null,
    isLoggedIn: !!uni.getStorageSync('isLoggedIn')
  }),
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token || ''
      uni.setStorageSync('token', state.token)
    },
    SET_USER_INFO(state, userInfo) {
      state.userInfo = userInfo || null
      uni.setStorageSync('userInfo', state.userInfo)
    },
    SET_LOGIN(state, loggedIn) {
      state.isLoggedIn = !!loggedIn
      uni.setStorageSync('isLoggedIn', state.isLoggedIn)
    },
    LOGOUT(state) {
      state.token = ''
      state.userInfo = null
      state.isLoggedIn = false
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync('isLoggedIn')
      uni.removeStorageSync('adminToken')
      uni.removeStorageSync('adminUid')
      uni.removeStorageSync('admin_uid')
    }
  },
  actions: {
    /**
     * 登录成功写入（兼容旧 storage 键名 userId）
     * @param {object} payload { token, userInfo }
     */
    login({ commit }, { token, userInfo }) {
      commit('SET_TOKEN', token)
      commit('SET_USER_INFO', userInfo)
      commit('SET_LOGIN', true)
      if (userInfo && userInfo.id) uni.setStorageSync('userId', userInfo.id)
    },
    logout({ commit }) {
      commit('LOGOUT')
      uni.removeStorageSync('userId')
    }
  },
  getters: {
    isLoggedIn: (s) => s.isLoggedIn,
    token: (s) => s.token,
    userInfo: (s) => s.userInfo,
    userId: (s) => (s.userInfo && s.userInfo.id) || uni.getStorageSync('userId') || 0
  }
}

export default createStore({
  strict: process.env.NODE_ENV !== 'production',
  modules: { user }
})
// #endif
