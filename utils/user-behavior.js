/**
 * 用户行为数据收集工具
 * 用于收集用户在推荐页面的各种行为数据，为智能推荐算法提供数据支持
 */
import apiConfig from './api.js';

/**
 * 存储键名
 */
const STORAGE_KEYS = {
    BEHAVIOR_DATA: 'user_behavior_data'     // 行为数据存储键
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

    }

    /**
     * 记录内容点击
     * @param {string|number} contentId - 内容ID
     * @param {string} contentType - 内容类型
     * @param {number} position - 位置
     */
    trackContentClick(contentId, contentType, position = 0) {
        const behavior = {
            type: 'content_click',
            contentId,
            contentType,
            position,
            timestamp: Date.now()
        };
        this.addBehavior(behavior);
        this.contentStartTime[contentId] = Date.now();
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
            const behaviorData = this.behaviorQueue;
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
                if (behavior.type === 'recommend_show' || behavior.type === 'recommend_click') {
                    formatted.algorithm = behavior.algorithm || 'hybrid';
                    formatted.recommend_id = behavior.recommendId || behavior.recommend_id || '';
                }

                return formatted;
            });

            const response = await uni.request({
                url: apiConfig.baseUrl + 'user_behavior.php',
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
                this.behaviorQueue = [];
                this.saveToStorage();
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
}

// 导出单例实例
const userBehaviorTracker = new UserBehaviorTracker();

export {
    /**
     * 用户行为跟踪器实例
     */
    userBehaviorTracker
};
