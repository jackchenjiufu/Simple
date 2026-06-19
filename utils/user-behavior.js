/**
 * 用户行为数据收集工具
 * 用于收集用户在推荐页面的各种行为数据，为智能推荐算法提供数据支持
 */

/**
 * 行为类型定义
 */
const BEHAVIOR_TYPES = {
    // 页面行为
    PAGE_VIEW: 'page_view',       // 页面浏览
    PAGE_STAY: 'page_stay',       // 页面停留时间
    
    // 内容行为
    CONTENT_CLICK: 'content_click', // 内容点击
    CONTENT_VIEW: 'content_view',   // 内容浏览
    CONTENT_STAY: 'content_stay',   // 内容停留时间
    CONTENT_COLLECT: 'content_collect', // 内容收藏
    CONTENT_SHARE: 'content_share',   // 内容分享
    
    // 推荐行为
    RECOMMEND_SHOW: 'recommend_show', // 推荐内容展示
    RECOMMEND_CLICK: 'recommend_click' // 推荐内容点击
};

/**
 * 存储键名
 */
const STORAGE_KEYS = {
    BEHAVIOR_DATA: 'user_behavior_data',     // 行为数据存储键
    USER_PREFERENCES: 'user_preferences'     // 用户偏好存储键
};

/**
 * 行为数据收集类
 * 负责跟踪和分析用户行为，为推荐算法提供数据支持
 */
class UserBehaviorTracker {
    /**
     * 构造函数
     */
    constructor() {
        this.behaviorQueue = [];           // 行为数据队列
        this.pageStartTime = {};           // 页面开始时间记录
        this.contentStartTime = {};        // 内容开始时间记录
        this.batchSize = 10;               // 批量处理大小
        this.maxQueueSize = 100;           // 队列最大大小
        this.init();
    }
    
    /**
     * 初始化
     */
    init() {
        // 加载本地存储的行为数据
        this.loadFromStorage();
        
        // 只在方法存在时添加监听器
        if (typeof uni.onHide === 'function') {
            // 监听页面隐藏事件，保存数据
            uni.onHide(() => {
                this.saveToStorage();
            });
        }
        
        // 只在方法存在时添加监听器
        if (typeof uni.onUnload === 'function') {
            // 监听页面卸载事件，保存数据
            uni.onUnload(() => {
                this.saveToStorage();
            });
        }
    }
    
    /**
     * 记录页面浏览
     * @param {string} pageName - 页面名称
     */
    trackPageView(pageName) {
        const behavior = {
            type: BEHAVIOR_TYPES.PAGE_VIEW,
            page: pageName,
            timestamp: Date.now(),
            deviceInfo: this.getDeviceInfo()
        };
        this.addBehavior(behavior);
        this.pageStartTime[pageName] = Date.now();
    }
    
    /**
     * 记录页面停留时间
     * @param {string} pageName - 页面名称
     */
    trackPageStay(pageName) {
        if (this.pageStartTime[pageName]) {
            const stayTime = Date.now() - this.pageStartTime[pageName];
            const behavior = {
                type: BEHAVIOR_TYPES.PAGE_STAY,
                page: pageName,
                duration: stayTime,
                timestamp: Date.now()
            };
            this.addBehavior(behavior);
            delete this.pageStartTime[pageName];
        }
    }
    
    /**
     * 记录内容点击
     * @param {string|number} contentId - 内容ID
     * @param {string} contentType - 内容类型
     * @param {number} position - 位置
     */
    trackContentClick(contentId, contentType, position = 0) {
        const behavior = {
            type: BEHAVIOR_TYPES.CONTENT_CLICK,
            contentId,
            contentType,
            position,
            timestamp: Date.now()
        };
        this.addBehavior(behavior);
        this.contentStartTime[contentId] = Date.now();
    }
    
    /**
     * 记录内容浏览
     * @param {string|number} contentId - 内容ID
     * @param {string} contentType - 内容类型
     * @param {number} position - 位置
     */
    trackContentView(contentId, contentType, position = 0) {
        const behavior = {
            type: BEHAVIOR_TYPES.CONTENT_VIEW,
            contentId,
            contentType,
            position,
            timestamp: Date.now()
        };
        this.addBehavior(behavior);
    }
    
    /**
     * 记录内容停留时间
     * @param {string|number} contentId - 内容ID
     */
    trackContentStay(contentId) {
        if (this.contentStartTime[contentId]) {
            const stayTime = Date.now() - this.contentStartTime[contentId];
            const behavior = {
                type: BEHAVIOR_TYPES.CONTENT_STAY,
                contentId,
                duration: stayTime,
                timestamp: Date.now()
            };
            this.addBehavior(behavior);
            delete this.contentStartTime[contentId];
        }
    }
    
    /**
     * 记录内容收藏
     * @param {string|number} contentId - 内容ID
     * @param {string} contentType - 内容类型
     * @param {boolean} isCollected - 是否收藏
     */
    trackContentCollect(contentId, contentType, isCollected) {
        const behavior = {
            type: BEHAVIOR_TYPES.CONTENT_COLLECT,
            contentId,
            contentType,
            isCollected,
            timestamp: Date.now()
        };
        this.addBehavior(behavior);
    }
    
    /**
     * 记录内容分享
     * @param {string|number} contentId - 内容ID
     * @param {string} contentType - 内容类型
     * @param {string} platform - 分享平台
     */
    trackContentShare(contentId, contentType, platform) {
        const behavior = {
            type: BEHAVIOR_TYPES.CONTENT_SHARE,
            contentId,
            contentType,
            platform,
            timestamp: Date.now()
        };
        this.addBehavior(behavior);
    }
    
    /**
     * 记录推荐内容展示
     * @param {string} recommendId - 推荐ID
     * @param {Array} contentIds - 内容ID列表
     * @param {string} algorithm - 推荐算法
     */
    trackRecommendShow(recommendId, contentIds, algorithm) {
        const behavior = {
            type: BEHAVIOR_TYPES.RECOMMEND_SHOW,
            recommendId,
            contentIds,
            algorithm,
            timestamp: Date.now()
        };
        this.addBehavior(behavior);
    }
    
    /**
     * 记录推荐内容点击
     * @param {string} recommendId - 推荐ID
     * @param {string|number} contentId - 内容ID
     * @param {number} position - 位置
     */
    trackRecommendClick(recommendId, contentId, position) {
        const behavior = {
            type: BEHAVIOR_TYPES.RECOMMEND_CLICK,
            recommendId,
            contentId,
            position,
            timestamp: Date.now()
        };
        this.addBehavior(behavior);
    }
    
    /**
     * 添加行为数据到队列
     * @param {Object} behavior - 行为数据
     */
    addBehavior(behavior) {
        this.behaviorQueue.push(behavior);
        
        // 控制队列大小，保持性能
        if (this.behaviorQueue.length > this.maxQueueSize) {
            this.behaviorQueue = this.behaviorQueue.slice(-this.maxQueueSize);
        }
        
        // 达到批量大小，保存到存储
        if (this.behaviorQueue.length >= this.batchSize) {
            this.saveToStorage();
        }
    }
    
    /**
     * 从本地存储加载数据
     */
    loadFromStorage() {
        try {
            const storedData = uni.getStorageSync(STORAGE_KEYS.BEHAVIOR_DATA);
            if (storedData && Array.isArray(storedData)) {
                this.behaviorQueue = storedData;
            }
        } catch (error) {
            console.error('加载行为数据失败:', error);
        }
    }
    
    /**
     * 保存数据到本地存储
     */
    saveToStorage() {
        try {
            uni.setStorageSync(STORAGE_KEYS.BEHAVIOR_DATA, this.behaviorQueue);
            // 尝试同步到服务器
            this.syncToServer();
        } catch (error) {
            console.error('保存行为数据失败:', error);
        }
    }
    
    /**
     * 同步行为数据到服务器
     */
    async syncToServer() {
        try {
            const behaviorData = this.getBehaviorData();
            if (behaviorData.length === 0) return;
            
            // 格式化行为数据
            const formattedBehaviors = behaviorData.map(behavior => {
                // 处理不同类型的行为数据
                const formatted = {
                    type: behavior.type,
                    content_id: behavior.contentId || behavior.content_id || '',
                    content_type: behavior.contentType || behavior.content_type || '',
                    position: behavior.position || '',
                    algorithm: behavior.algorithm || '',
                    recommend_id: behavior.recommendId || behavior.recommend_id || '',
                    duration: behavior.duration || 0,
                    timestamp: behavior.timestamp || Date.now()
                };
                
                // 特殊处理推荐行为
                if (behavior.type === BEHAVIOR_TYPES.RECOMMEND_SHOW || behavior.type === BEHAVIOR_TYPES.RECOMMEND_CLICK) {
                    formatted.algorithm = behavior.algorithm || 'hybrid';
                    formatted.recommend_id = behavior.recommendId || behavior.recommend_id || '';
                }
                
                return formatted;
            });
            
            const response = await uni.request({
                url: 'http://139.196.185.197:7070/doo/server/api/user_behavior.php',
                method: 'POST',
                header: {
                    'Content-Type': 'application/json'
                },
                data: {
                    behaviors: formattedBehaviors
                }
            });
            
            if (response.statusCode === 200 && response.data.code === 200) {
                console.log('行为数据同步成功:', response.data.message);
                // 同步成功后清空本地数据
                this.clearBehaviorData();
            } else {
                console.warn('行为数据同步失败:', response.data.message || '网络错误');
            }
        } catch (error) {
            console.error('同步行为数据到服务器失败:', error);
        }
    }
    
    /**
     * 获取设备信息
     * @returns {Object} 设备信息
     */
    getDeviceInfo() {
        try {
            const systemInfo = uni.getSystemInfoSync();
            return {
                platform: systemInfo.platform,
                screenWidth: systemInfo.screenWidth,
                screenHeight: systemInfo.screenHeight,
                devicePixelRatio: systemInfo.devicePixelRatio
            };
        } catch (error) {
            console.error('获取设备信息失败:', error);
            return {};
        }
    }
    
    /**
     * 获取用户行为数据
     * @returns {Array} 行为数据列表
     */
    getBehaviorData() {
        return [...this.behaviorQueue];
    }
    
    /**
     * 清空行为数据
     */
    clearBehaviorData() {
        this.behaviorQueue = [];
        this.saveToStorage();
    }
    
    /**
     * 分析用户偏好
     * @returns {Object} 用户偏好分析结果
     */
    analyzePreferences() {
        const preferences = {
            contentTypes: {},     // 内容类型偏好
            categories: {},        // 分类偏好
            timeDistribution: {},  // 时间分布
            clickRate: 0           // 点击率
        };
        
        const totalViews = this.behaviorQueue.filter(b => b.type === BEHAVIOR_TYPES.CONTENT_VIEW).length;
        const totalClicks = this.behaviorQueue.filter(b => b.type === BEHAVIOR_TYPES.CONTENT_CLICK).length;
        
        if (totalViews > 0) {
            preferences.clickRate = totalClicks / totalViews;
        }
        
        // 分析内容类型偏好
        this.behaviorQueue.forEach(behavior => {
            if (behavior.contentType) {
                preferences.contentTypes[behavior.contentType] = (preferences.contentTypes[behavior.contentType] || 0) + 1;
            }
            
            // 分析时间分布
            const hour = new Date(behavior.timestamp).getHours();
            preferences.timeDistribution[hour] = (preferences.timeDistribution[hour] || 0) + 1;
        });
        
        // 保存用户偏好
        try {
            uni.setStorageSync(STORAGE_KEYS.USER_PREFERENCES, preferences);
        } catch (error) {
            console.error('保存用户偏好失败:', error);
        }
        
        return preferences;
    }
    
    /**
     * 获取用户偏好
     * @returns {Object} 用户偏好
     */
    getPreferences() {
        try {
            const preferences = uni.getStorageSync(STORAGE_KEYS.USER_PREFERENCES);
            return preferences || this.analyzePreferences();
        } catch (error) {
            console.error('获取用户偏好失败:', error);
            return this.analyzePreferences();
        }
    }
}

// 导出单例实例
const userBehaviorTracker = new UserBehaviorTracker();

export {
    /**
     * 用户行为跟踪器实例
     */
    userBehaviorTracker,
    /**
     * 行为类型常量
     */
    BEHAVIOR_TYPES
};
