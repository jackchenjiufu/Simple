/**
 * 推荐系统状态管理模块
 * 负责管理推荐结果、算法配置、推荐历史和性能指标
 */
import apiConfig from '../../utils/api'

export default {
  namespaced: true,
  state: {
    // 推荐结果列表
    recommendations: [],
    // 推荐算法配置
    algorithmConfig: {
      hybrid: {
        enabled: true,      // 是否启用混合推荐算法
        weight: 0.4         // 混合推荐权重
      },
      popularity: {
        enabled: true,      // 是否启用基于流行度的推荐
        weight: 0.2         // 流行度推荐权重
      },
      content_based: {
        enabled: true,      // 是否启用基于内容的推荐
        weight: 0.2         // 内容推荐权重
      },
      collaborative_filtering: {
        enabled: true,      // 是否启用协同过滤推荐
        weight: 0.2         // 协同过滤权重
      }
    },
    // 推荐历史记录
    recommendationHistory: [],
    // 推荐系统性能指标
    performanceMetrics: {
      cacheHitRate: 0,         // 缓存命中率
      processingTime: 0,        // 处理时间（毫秒）
      averageCtr: 0,            // 平均点击率
      totalRecommendations: 0   // 总推荐次数
    },
    // A/B测试配置
    abTestConfig: {
      enabled: false,            // 是否启用A/B测试
      testGroups: {
        control: 50,           // 对照组占比
        variant1: 25,          // 变体1占比
        variant2: 25           // 变体2占比
      }
    },
    // 加载状态
    loading: false,
    // 错误信息
    error: ''
  },
  mutations: {
    /**
     * 设置推荐结果
     * @param {Object} state - 状态对象
     * @param {Array} recommendations - 推荐结果列表
     */
    SET_RECOMMENDATIONS(state, recommendations) {
      state.recommendations = recommendations
    },
    
    /**
     * 添加推荐结果
     * @param {Object} state - 状态对象
     * @param {Array} recommendations - 要添加的推荐结果
     */
    ADD_RECOMMENDATIONS(state, recommendations) {
      state.recommendations = [...state.recommendations, ...recommendations]
    },
    
    /**
     * 更新算法配置
     * @param {Object} state - 状态对象
     * @param {Object} config - 算法配置
     */
    UPDATE_ALGORITHM_CONFIG(state, config) {
      state.algorithmConfig = { ...state.algorithmConfig, ...config }
    },
    
    /**
     * 记录推荐历史
     * @param {Object} state - 状态对象
     * @param {Object} historyItem - 历史记录项
     */
    ADD_RECOMMENDATION_HISTORY(state, historyItem) {
      state.recommendationHistory.unshift(historyItem)
      // 限制历史记录长度，保持性能
      if (state.recommendationHistory.length > 50) {
        state.recommendationHistory = state.recommendationHistory.slice(0, 50)
      }
    },
    
    /**
     * 设置性能指标
     * @param {Object} state - 状态对象
     * @param {Object} metrics - 性能指标
     */
    SET_PERFORMANCE_METRICS(state, metrics) {
      state.performanceMetrics = { ...state.performanceMetrics, ...metrics }
    },
    
    /**
     * 更新A/B测试配置
     * @param {Object} state - 状态对象
     * @param {Object} config - A/B测试配置
     */
    UPDATE_AB_TEST_CONFIG(state, config) {
      state.abTestConfig = { ...state.abTestConfig, ...config }
    },
    
    /**
     * 设置加载状态
     * @param {Object} state - 状态对象
     * @param {boolean} loading - 加载状态
     */
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    
    /**
     * 设置错误信息
     * @param {Object} state - 状态对象
     * @param {string} error - 错误信息
     */
    SET_ERROR(state, error) {
      state.error = error
    },
    
    /**
     * 清空错误信息
     * @param {Object} state - 状态对象
     */
    CLEAR_ERROR(state) {
      state.error = ''
    }
  },
  actions: {
    /**
     * 获取推荐内容
     * @param {Object} context - 上下文对象
     * @param {Object} params - 请求参数
     * @returns {Promise<Object>} 推荐结果
     */
    async getRecommendations({ commit, rootState }, params = {}) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      
      try {
        // 获取用户ID，未登录用户使用anonymous
        const userId = rootState.user.userInfo.id || 'anonymous'
        
        // 发送请求到推荐API
        const response = await fetch(`${apiConfig.baseUrl}recommend.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            ...params
          })
        })
        
        const result = await response.json()
        
        if (result.code === 200) {
          // 更新推荐结果
          commit('SET_RECOMMENDATIONS', result.data)
          
          // 记录推荐历史
          commit('ADD_RECOMMENDATION_HISTORY', {
            timestamp: new Date().toISOString(),
            userId,
            count: result.data.length,
            algorithm: params.algorithm || 'hybrid'
          })
          
          return { success: true, data: result.data }
        } else {
          // 处理错误
          commit('SET_ERROR', result.message)
          return { success: false, message: result.message }
        }
      } catch (error) {
        console.error('获取推荐失败:', error)
        commit('SET_ERROR', '网络错误，请稍后重试')
        return { success: false, message: '网络错误，请稍后重试' }
      } finally {
        // 无论成功失败，都重置加载状态
        commit('SET_LOADING', false)
      }
    },
    
    /**
     * 获取推荐系统性能指标
     * @param {Object} context - 上下文对象
     * @returns {Promise<Object>} 性能指标
     */
    async getPerformanceMetrics({ commit }) {
      try {
        const response = await fetch(`${apiConfig.baseUrl}admin_recommendations.php?action=metrics`)
        const result = await response.json()
        
        if (result.code === 200) {
          commit('SET_PERFORMANCE_METRICS', result.data)
          return { success: true, data: result.data }
        } else {
          return { success: false, message: result.message }
        }
      } catch (error) {
        console.error('获取性能指标失败:', error)
        return { success: false, message: '网络错误，请稍后重试' }
      }
    },
    
    /**
     * 更新算法配置
     * @param {Object} context - 上下文对象
     * @param {Object} config - 算法配置
     * @returns {Promise<Object>} 更新结果
     */
    async updateAlgorithmConfig({ commit }, config) {
      // 更新本地状态
      commit('UPDATE_ALGORITHM_CONFIG', config)
      
      // 保存配置到后端
      try {
        const response = await fetch(`${apiConfig.baseUrl}admin_recommendations.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_config',
            config
          })
        })
        
        const result = await response.json()
        return { success: result.code === 200, message: result.message }
      } catch (error) {
        console.error('更新算法配置失败:', error)
        return { success: false, message: '网络错误，请稍后重试' }
      }
    },
    
    /**
     * 触发A/B测试
     * @param {Object} context - 上下文对象
     * @param {Object} config - A/B测试配置
     * @returns {Promise<Object>} 测试启动结果
     */
    async startAbTest({ commit }, config) {
      // 更新本地状态，启用A/B测试
      commit('UPDATE_AB_TEST_CONFIG', { ...config, enabled: true })
      
      // 启动A/B测试的后端逻辑
      try {
        const response = await fetch(`${apiConfig.baseUrl}admin_recommendations.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'start_ab_test',
            config
          })
        })
        
        const result = await response.json()
        return { success: result.code === 200, message: result.message }
      } catch (error) {
        console.error('启动A/B测试失败:', error)
        return { success: false, message: '网络错误，请稍后重试' }
      }
    }
  },
  getters: {
    /**
     * 获取推荐结果
     * @param {Object} state - 状态对象
     * @returns {Array} 推荐结果列表
     */
    getRecommendations: state => state.recommendations,
    
    /**
     * 获取算法配置
     * @param {Object} state - 状态对象
     * @returns {Object} 算法配置
     */
    getAlgorithmConfig: state => state.algorithmConfig,
    
    /**
     * 获取推荐历史
     * @param {Object} state - 状态对象
     * @returns {Array} 推荐历史记录
     */
    getRecommendationHistory: state => state.recommendationHistory,
    
    /**
     * 获取性能指标
     * @param {Object} state - 状态对象
     * @returns {Object} 性能指标
     */
    getPerformanceMetrics: state => state.performanceMetrics,
    
    /**
     * 获取A/B测试配置
     * @param {Object} state - 状态对象
     * @returns {Object} A/B测试配置
     */
    getAbTestConfig: state => state.abTestConfig,
    
    /**
     * 获取加载状态
     * @param {Object} state - 状态对象
     * @returns {boolean} 加载状态
     */
    getLoading: state => state.loading,
    
    /**
     * 获取错误信息
     * @param {Object} state - 状态对象
     * @returns {string} 错误信息
     */
    getError: state => state.error,
    
    /**
     * 获取启用的算法
     * @param {Object} state - 状态对象
     * @returns {Array} 启用的算法名称列表
     */
    getEnabledAlgorithms: state => {
      return Object.entries(state.algorithmConfig)
        .filter(([_, config]) => config.enabled)
        .map(([name, _]) => name)
    }
  }
}