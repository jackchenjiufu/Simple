/**
 * 推荐算法工具
 * 基于用户行为数据实现智能推荐功能
 */

import { userBehaviorTracker } from './user-behavior.js';

// 推荐算法类型
const ALGORITHM_TYPES = {
    COLLABORATIVE_FILTERING: 'collaborative_filtering', // 协同过滤
    CONTENT_BASED: 'content_based', // 基于内容
    POPULARITY: 'popularity', // 基于流行度
    HYBRID: 'hybrid' // 混合推荐
};

// 推荐权重配置
const RECOMMENDATION_WEIGHTS = {
    CLICK: 3,
    VIEW: 1,
    STAY: 0.1,
    COLLECT: 5,
    SHARE: 4
};

// 时间衰减配置
const TIME_DECAY = {
    HALF_LIFE_HOURS: 24, // 半衰期24小时
    DECAY_FACTOR: 0.5
};

// 多样性配置
const DIVERSITY_CONFIG = {
    CATEGORY_DIVERSITY: 0.3,
    AUTHOR_DIVERSITY: 0.2
};

// 缓存配置
const CACHE_CONFIG = {
    MAX_SIZE: 1000,
    EXPIRY_TIME: 3600000, // 1小时
    CACHE_KEY_PREFIX: 'rec_cache_'
};

// 插件系统类
class PluginSystem {
    constructor() {
        this.plugins = {};
    }
    
    // 注册插件
    registerPlugin(name, plugin) {
        this.plugins[name] = plugin;
    }
    
    // 获取插件
    getPlugin(name) {
        return this.plugins[name];
    }
    
    // 执行插件方法
    executePlugin(name, method, ...args) {
        const plugin = this.getPlugin(name);
        if (plugin && plugin[method]) {
            return plugin[method](...args);
        }
        return null;
    }
    
    // 获取所有插件
    getAllPlugins() {
        return { ...this.plugins };
    }
}

// 推荐算法类
class RecommendationEngine {
    constructor() {
        this.algorithmType = ALGORITHM_TYPES.HYBRID;
        this.recommendHistory = [];
        this.maxHistorySize = 50;
        this.similarityThreshold = 0.3;
        this.coldStartEnabled = true;
        this.cache = new Map();
        this.userInterestModel = {};
        this.pluginSystem = new PluginSystem();
        this.init();
    }
    
    // 初始化
    init() {
        this.loadCache();
        this.loadUserInterestModel();
        this.loadAlgorithmConfig();
        this.registerDefaultPlugins();
    }
    
    // 加载缓存
    loadCache() {
        try {
            const cacheData = uni.getStorageSync('recommendation_cache');
            if (cacheData) {
                this.cache = new Map(JSON.parse(cacheData));
            }
        } catch (error) {
            console.error('加载缓存失败:', error);
        }
    }
    
    // 保存缓存
    saveCache() {
        try {
            const cacheData = JSON.stringify(Array.from(this.cache.entries()));
            uni.setStorageSync('recommendation_cache', cacheData);
        } catch (error) {
            console.error('保存缓存失败:', error);
        }
    }
    
    // 获取缓存
    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.EXPIRY_TIME) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    // 设置缓存
    setCache(key, data) {
        if (this.cache.size > CACHE_CONFIG.MAX_SIZE) {
            // 清理最旧的缓存
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        this.saveCache();
    }
    
    // 加载用户兴趣模型
    loadUserInterestModel() {
        try {
            const interestModel = uni.getStorageSync('user_interest_model');
            if (interestModel) {
                this.userInterestModel = interestModel;
            }
        } catch (error) {
            console.error('加载用户兴趣模型失败:', error);
        }
    }
    
    // 保存用户兴趣模型
    saveUserInterestModel() {
        try {
            uni.setStorageSync('user_interest_model', this.userInterestModel);
        } catch (error) {
            console.error('保存用户兴趣模型失败:', error);
        }
    }
    
    // 更新用户兴趣模型
    updateUserInterestModel(behaviorData) {
        if (!behaviorData || behaviorData.length === 0) return;
        
        behaviorData.forEach(behavior => {
            if (behavior.contentId && behavior.contentType) {
                if (!this.userInterestModel.contentTypes) {
                    this.userInterestModel.contentTypes = {};
                }
                this.userInterestModel.contentTypes[behavior.contentType] = 
                    (this.userInterestModel.contentTypes[behavior.contentType] || 0) + 1;
            }
        });
        
        this.saveUserInterestModel();
    }
    
    // 注册默认插件
    registerDefaultPlugins() {
        this.pluginSystem.registerPlugin('contentEnhancer', {
            enhance: (content) => {
                // 内容增强插件
                if (content && !content.features) {
                    content.features = this.extractContentFeatures(content);
                }
                return content;
            }
        });
        
        this.pluginSystem.registerPlugin('contextAware', {
            getContext: () => {
                // 上下文感知插件
                return {
                    time: new Date().getHours(),
                    day: new Date().getDay(),
                    device: this.getDeviceContext()
                };
            }
        });
    }
    
    // 提取内容特征
    extractContentFeatures(content) {
        const features = {
            tags: content.tags || [],
            category: content.category || 'unknown',
            author: content.author || 'unknown',
            type: content.type || 'unknown',
            length: content.content ? content.content.length : 0
        };
        return features;
    }
    
    // 获取设备上下文
    getDeviceContext() {
        try {
            const systemInfo = uni.getSystemInfoSync();
            return {
                platform: systemInfo.platform,
                screenWidth: systemInfo.screenWidth,
                screenHeight: systemInfo.screenHeight
            };
        } catch (error) {
            return { platform: 'unknown' };
        }
    }
    
    // 计算时间衰减因子
    calculateTimeDecay(timestamp) {
        const now = Date.now();
        const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
        const decay = Math.pow(TIME_DECAY.DECAY_FACTOR, hoursDiff / TIME_DECAY.HALF_LIFE_HOURS);
        return decay;
    }
    
    // 设置推荐算法类型
    setAlgorithmType(type) {
        if (Object.values(ALGORITHM_TYPES).includes(type)) {
            this.algorithmType = type;
        }
    }
    
    // 计算内容相似度
    calculateSimilarity(content1, content2) {
        if (!content1 || !content2) return 0;
        
        let similarity = 0;
        let factors = 0;
        
        // 基于标签相似度
        if (content1.tags && content2.tags) {
            const commonTags = content1.tags.filter(tag => 
                content2.tags.includes(tag)
            );
            similarity += commonTags.length / Math.max(content1.tags.length, content2.tags.length);
            factors++;
        }
        
        // 基于类别相似度
        if (content1.category && content2.category) {
            similarity += content1.category === content2.category ? 1 : 0;
            factors++;
        }
        
        // 基于作者相似度
        if (content1.author && content2.author) {
            similarity += content1.author === content2.author ? 0.5 : 0;
            factors++;
        }
        
        // 基于内容类型相似度
        if (content1.type && content2.type) {
            similarity += content1.type === content2.type ? 0.5 : 0;
            factors++;
        }
        
        return factors > 0 ? similarity / factors : 0;
    }
    
    // 计算多样性得分
    calculateDiversityScore(recommendations, newContent) {
        if (!recommendations || recommendations.length === 0) {
            return 1; // 第一个内容多样性得分最高
        }
        
        let diversityScore = 0;
        let categoryDiversity = 0;
        let authorDiversity = 0;
        
        // 计算类别多样性
        const categories = recommendations.map(item => item.category);
        if (!categories.includes(newContent.category)) {
            categoryDiversity = 1;
        } else {
            // 计算类别出现频率
            const categoryCount = categories.filter(cat => cat === newContent.category).length;
            categoryDiversity = 1 / (categoryCount + 1);
        }
        
        // 计算作者多样性
        const authors = recommendations.map(item => item.author);
        if (!authors.includes(newContent.author)) {
            authorDiversity = 1;
        } else {
            // 计算作者出现频率
            const authorCount = authors.filter(auth => auth === newContent.author).length;
            authorDiversity = 1 / (authorCount + 1);
        }
        
        // 加权计算总多样性得分
        diversityScore = 
            categoryDiversity * DIVERSITY_CONFIG.CATEGORY_DIVERSITY +
            authorDiversity * DIVERSITY_CONFIG.AUTHOR_DIVERSITY;
        
        return diversityScore;
    }
    
    // 基于用户行为的内容推荐
    recommendBasedOnBehavior(contentList, limit = 10, context = null) {
        if (!contentList || contentList.length === 0) return [];
        
        // 获取用户行为数据
        const behaviorData = userBehaviorTracker.getBehaviorData();
        const userPreferences = userBehaviorTracker.getPreferences();
        
        // 计算内容得分
        const scoredContent = contentList.map(content => {
            let score = 0;
            
            // 基于用户行为计算得分
            behaviorData.forEach(behavior => {
                if (behavior.contentId === content.id) {
                    // 计算时间衰减因子
                    const timeDecay = this.calculateTimeDecay(behavior.timestamp);
                    
                    switch (behavior.type) {
                        case 'content_click':
                            score += RECOMMENDATION_WEIGHTS.CLICK * timeDecay;
                            break;
                        case 'content_view':
                            score += RECOMMENDATION_WEIGHTS.VIEW * timeDecay;
                            break;
                        case 'content_stay':
                            score += (behavior.duration || 0) * RECOMMENDATION_WEIGHTS.STAY * timeDecay;
                            break;
                        case 'content_collect':
                            score += RECOMMENDATION_WEIGHTS.COLLECT * timeDecay;
                            break;
                        case 'content_share':
                            score += RECOMMENDATION_WEIGHTS.SHARE * timeDecay;
                            break;
                    }
                }
            });
            
            // 基于用户偏好调整得分
            if (content.type && userPreferences.contentTypes[content.type]) {
                score *= (1 + userPreferences.contentTypes[content.type] / 10);
            }
            
            // 基于用户兴趣模型调整得分
            if (this.userInterestModel.contentTypes && this.userInterestModel.contentTypes[content.type]) {
                score *= (1 + this.userInterestModel.contentTypes[content.type] / 50);
            }
            
            return {
                ...content,
                score
            };
        });
        
        // 排序并返回推荐结果
        return scoredContent
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => ({
                ...item,
                recommendedBy: 'behavior_based'
            }));
    }
    
    // 基于内容相似度的推荐
    recommendBasedOnSimilarity(contentList, targetContent, limit = 10) {
        if (!contentList || contentList.length === 0 || !targetContent) return [];
        
        // 计算相似度并排序
        const similarContent = contentList
            .filter(content => content.id !== targetContent.id)
            .map(content => ({
                ...content,
                similarity: this.calculateSimilarity(targetContent, content)
            }))
            .filter(item => item.similarity >= this.similarityThreshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(item => ({
                ...item,
                recommendedBy: 'similarity_based'
            }));
        
        return similarContent;
    }
    
    // 基于流行度的推荐
    recommendBasedOnPopularity(contentList, limit = 10, context = null) {
        if (!contentList || contentList.length === 0) return [];
        
        // 获取用户行为数据
        const behaviorData = userBehaviorTracker.getBehaviorData();
        
        // 计算内容流行度得分
        const popularityScores = {};
        
        behaviorData.forEach(behavior => {
            if (behavior.contentId) {
                if (!popularityScores[behavior.contentId]) {
                    popularityScores[behavior.contentId] = 0;
                }
                
                // 计算时间衰减因子
                const timeDecay = this.calculateTimeDecay(behavior.timestamp);
                
                switch (behavior.type) {
                    case 'content_click':
                        popularityScores[behavior.contentId] += RECOMMENDATION_WEIGHTS.CLICK * timeDecay;
                        break;
                    case 'content_view':
                        popularityScores[behavior.contentId] += RECOMMENDATION_WEIGHTS.VIEW * timeDecay;
                        break;
                    case 'content_collect':
                        popularityScores[behavior.contentId] += RECOMMENDATION_WEIGHTS.COLLECT * timeDecay;
                        break;
                    case 'content_share':
                        popularityScores[behavior.contentId] += RECOMMENDATION_WEIGHTS.SHARE * timeDecay;
                        break;
                }
            }
        });
        
        // 排序并返回推荐结果
        const popularContent = contentList
            .map(content => ({
                ...content,
                popularity: popularityScores[content.id] || 0
            }))
            .sort((a, b) => b.popularity - a.popularity)
            .slice(0, limit)
            .map(item => ({
                ...item,
                recommendedBy: 'popularity_based'
            }));
        
        return popularContent;
    }
    
    // 混合推荐
    recommendHybrid(contentList, limit = 10, context = null) {
        if (!contentList || contentList.length === 0) return [];
        
        // 获取不同算法的推荐结果
        const behaviorRecommendations = this.recommendBasedOnBehavior(contentList, limit * 2, context);
        const popularityRecommendations = this.recommendBasedOnPopularity(contentList, limit * 2, context);
        
        // 合并推荐结果，去重
        const mergedRecommendations = {};
        
        // 先添加基于行为的推荐
        behaviorRecommendations.forEach(item => {
            mergedRecommendations[item.id] = {
                ...item,
                finalScore: item.score * 0.7 // 行为推荐权重更高
            };
        });
        
        // 再添加基于流行度的推荐
        popularityRecommendations.forEach(item => {
            if (!mergedRecommendations[item.id]) {
                mergedRecommendations[item.id] = {
                    ...item,
                    finalScore: item.popularity * 0.3
                };
            } else {
                // 如果已经存在，增加流行度得分
                mergedRecommendations[item.id].finalScore += item.popularity * 0.3;
            }
        });
        
        // 应用多样性控制
        const diverseRecommendations = this.applyDiversityControl(
            Object.values(mergedRecommendations),
            limit
        );
        
        // 应用上下文调整
        const contextAdjustedRecommendations = context ? 
            this.applyContextAdjustment(diverseRecommendations, context) : 
            diverseRecommendations;
        
        return contextAdjustedRecommendations.map(item => ({
            ...item,
            recommendedBy: 'hybrid'
        }));
    }
    
    // 应用多样性控制
    applyDiversityControl(recommendations, limit = 10) {
        if (!recommendations || recommendations.length === 0) return [];
        
        const selected = [];
        const remaining = [...recommendations].sort((a, b) => b.finalScore - a.finalScore);
        
        // 选择第一个内容（得分最高）
        if (remaining.length > 0) {
            selected.push(remaining.shift());
        }
        
        // 基于得分和多样性选择剩余内容
        while (selected.length < limit && remaining.length > 0) {
            // 为每个剩余内容计算综合得分（考虑多样性）
            const scoredRemaining = remaining.map(item => {
                const diversityScore = this.calculateDiversityScore(selected, item);
                const compositeScore = item.finalScore * (0.7 + diversityScore * 0.3);
                return {
                    ...item,
                    compositeScore
                };
            });
            
            // 选择综合得分最高的内容
            scoredRemaining.sort((a, b) => b.compositeScore - a.compositeScore);
            const nextItem = scoredRemaining[0];
            
            if (nextItem) {
                selected.push(nextItem);
                // 从剩余列表中移除
                const index = remaining.findIndex(item => item.id === nextItem.id);
                if (index > -1) {
                    remaining.splice(index, 1);
                }
            }
        }
        
        return selected;
    }
    
    // 生成推荐结果
    generateRecommendations(contentList, options = {}) {
        const {
            limit = 10,
            algorithm = this.algorithmType,
            targetContent = null,
            excludeIds = [],
            userId = null
        } = options;
        
        // 生成缓存键
        const cacheKey = `${CACHE_CONFIG.CACHE_KEY_PREFIX}${algorithm}_${limit}_${userId || 'anonymous'}_${targetContent ? targetContent.id : 'none'}`;
        
        // 尝试从缓存获取
        const cachedResult = this.getCache(cacheKey);
        if (cachedResult) {
            console.log('从缓存获取推荐结果');
            return cachedResult;
        }
        
        let recommendations = [];
        
        // 增强内容数据
        const enhancedContentList = contentList.map(content => 
            this.pluginSystem.executePlugin('contentEnhancer', 'enhance', content)
        );
        
        // 获取上下文信息
        const context = this.pluginSystem.executePlugin('contextAware', 'getContext');
        
        // 检查是否需要冷启动策略
        const behaviorData = userBehaviorTracker.getBehaviorData();
        const isColdStart = behaviorData.length < 5; // 行为数据少于5条时使用冷启动
        
        // 更新用户兴趣模型
        this.updateUserInterestModel(behaviorData);
        
        // 根据算法类型生成推荐
        if (isColdStart && this.coldStartEnabled) {
            // 使用冷启动策略
            recommendations = this.recommendForColdStart(enhancedContentList, limit * 2, context);
        } else {
            // 使用正常推荐算法
            switch (algorithm) {
                case ALGORITHM_TYPES.COLLABORATIVE_FILTERING:
                case ALGORITHM_TYPES.CONTENT_BASED:
                    recommendations = this.recommendBasedOnBehavior(enhancedContentList, limit * 2, context);
                    break;
                case ALGORITHM_TYPES.POPULARITY:
                    recommendations = this.recommendBasedOnPopularity(enhancedContentList, limit * 2, context);
                    break;
                case ALGORITHM_TYPES.HYBRID:
                default:
                    recommendations = this.recommendHybrid(enhancedContentList, limit * 2, context);
                    break;
            }
        }
        
        // 如果指定了目标内容，添加基于相似度的推荐
        if (targetContent) {
            const similarityRecommendations = this.recommendBasedOnSimilarity(
                enhancedContentList,
                targetContent,
                limit
            );
            // 合并相似度推荐，去重
            const existingIds = new Set(recommendations.map(item => item.id));
            const newSimilarityRecommendations = similarityRecommendations.filter(
                item => !existingIds.has(item.id)
            );
            recommendations = [...recommendations, ...newSimilarityRecommendations];
        }
        
        // 排除指定的内容ID
        if (excludeIds && excludeIds.length > 0) {
            recommendations = recommendations.filter(
                item => !excludeIds.includes(item.id)
            );
        }
        
        // 应用上下文感知调整
        recommendations = this.applyContextAdjustment(recommendations, context);
        
        // 限制返回数量
        recommendations = recommendations.slice(0, limit);
        
        // 记录推荐历史
        this.recordRecommendationHistory(recommendations);
        
        // 缓存结果
        this.setCache(cacheKey, recommendations);
        
        return recommendations;
    }
    
    // 应用上下文感知调整
    applyContextAdjustment(recommendations, context) {
        if (!context || !recommendations.length) return recommendations;
        
        return recommendations.map(item => {
            let scoreAdjustment = 1;
            
            // 时间上下文调整
            if (context.time >= 6 && context.time <= 12) {
                // 早晨推荐更积极
                scoreAdjustment += 0.2;
            } else if (context.time >= 12 && context.time <= 18) {
                // 下午推荐适中
                scoreAdjustment += 0.1;
            } else if (context.time >= 18 && context.time <= 23) {
                // 晚上推荐更个性化
                scoreAdjustment += 0.3;
            }
            
            // 设备上下文调整
            if (context.device && context.device.platform === 'ios') {
                // iOS用户可能更喜欢高质量内容
                scoreAdjustment += 0.1;
            }
            
            return {
                ...item,
                finalScore: (item.finalScore || item.score || item.popularity || 0) * scoreAdjustment
            };
        }).sort((a, b) => b.finalScore - a.finalScore);
    }
    
    // 冷启动推荐策略
    recommendForColdStart(contentList, limit = 10, context = null) {
        if (!contentList || contentList.length === 0) return [];
        
        // 冷启动策略：混合使用流行度和多样性
        const popularityRecommendations = this.recommendBasedOnPopularity(contentList, limit * 2, context);
        
        // 应用多样性控制，确保初始推荐内容丰富多样
        const diverseRecommendations = this.applyDiversityControl(
            popularityRecommendations,
            limit
        );
        
        // 应用上下文调整
        const contextAdjustedRecommendations = context ? 
            this.applyContextAdjustment(diverseRecommendations, context) : 
            diverseRecommendations;
        
        return contextAdjustedRecommendations.map(item => ({
            ...item,
            recommendedBy: 'cold_start'
        }));
    }
    
    // 记录推荐历史
    recordRecommendationHistory(recommendations) {
        const historyItem = {
            id: `rec_${Date.now()}`,
            timestamp: Date.now(),
            algorithm: this.algorithmType,
            contentIds: recommendations.map(item => item.id),
            recommendations: recommendations
        };
        
        this.recommendHistory.push(historyItem);
        
        // 控制历史记录大小
        if (this.recommendHistory.length > this.maxHistorySize) {
            this.recommendHistory = this.recommendHistory.slice(-this.maxHistorySize);
        }
        
        // 记录推荐展示行为
        userBehaviorTracker.trackRecommendShow(
            historyItem.id,
            historyItem.contentIds,
            historyItem.algorithm
        );
    }
    
    // 获取推荐历史
    getRecommendationHistory() {
        return [...this.recommendHistory];
    }
    
    // 计算推荐效果
    calculateRecommendationEffectiveness() {
        const behaviorData = userBehaviorTracker.getBehaviorData();
        
        // 统计推荐展示和点击次数
        const showCount = behaviorData.filter(
            item => item.type === 'recommend_show'
        ).length;
        
        const clickCount = behaviorData.filter(
            item => item.type === 'recommend_click'
        ).length;
        
        // 计算点击率
        const clickThroughRate = showCount > 0 ? clickCount / showCount : 0;
        
        // 统计不同算法的效果
        const algorithmEffectiveness = {};
        
        behaviorData.forEach(item => {
            if (item.type === 'recommend_show' && item.algorithm) {
                if (!algorithmEffectiveness[item.algorithm]) {
                    algorithmEffectiveness[item.algorithm] = {
                        shows: 0,
                        clicks: 0,
                        ctr: 0
                    };
                }
                algorithmEffectiveness[item.algorithm].shows++;
            } else if (item.type === 'recommend_click' && item.algorithm) {
                if (algorithmEffectiveness[item.algorithm]) {
                    algorithmEffectiveness[item.algorithm].clicks++;
                }
            }
        });
        
        // 计算每种算法的点击率
        Object.keys(algorithmEffectiveness).forEach(algorithm => {
            const data = algorithmEffectiveness[algorithm];
            data.ctr = data.shows > 0 ? data.clicks / data.shows : 0;
        });
        
        return {
            overall: {
                shows: showCount,
                clicks: clickCount,
                ctr: clickThroughRate
            },
            byAlgorithm: algorithmEffectiveness
        };
    }
    
    // 优化推荐算法参数
    optimizeAlgorithmParameters() {
        const effectiveness = this.calculateRecommendationEffectiveness();
        
        // 基于历史效果数据优化参数
        // 这里可以实现更复杂的参数优化逻辑
        // 例如，根据不同算法的点击率调整权重
        
        console.log('推荐算法效果分析:', effectiveness);
        
        // 返回优化建议
        return {
            optimalAlgorithm: this.getOptimalAlgorithm(effectiveness),
            suggestedWeights: this.calculateSuggestedWeights(effectiveness),
            insights: this.generateInsights(effectiveness)
        };
    }
    
    // 获取最优算法
    getOptimalAlgorithm(effectiveness) {
        const algorithms = Object.keys(effectiveness.byAlgorithm);
        if (algorithms.length === 0) return ALGORITHM_TYPES.HYBRID;
        
        let bestAlgorithm = algorithms[0];
        let bestCtr = effectiveness.byAlgorithm[bestAlgorithm].ctr;
        
        algorithms.forEach(algorithm => {
            const ctr = effectiveness.byAlgorithm[algorithm].ctr;
            if (ctr > bestCtr) {
                bestAlgorithm = algorithm;
                bestCtr = ctr;
            }
        });
        
        return bestAlgorithm;
    }
    
    // 计算建议权重
    calculateSuggestedWeights(effectiveness) {
        // 基于算法效果计算建议权重
        const weights = {
            behavior: 0.7,
            popularity: 0.3
        };
        
        // 这里可以根据实际效果调整权重
        
        return weights;
    }
    
    // 生成洞察
    generateInsights(effectiveness) {
        const insights = [];
        
        if (effectiveness.overall.ctr < 0.1) {
            insights.push('推荐点击率较低，建议优化推荐算法或内容质量');
        }
        
        // 分析不同算法的表现
        Object.keys(effectiveness.byAlgorithm).forEach(algorithm => {
            const data = effectiveness.byAlgorithm[algorithm];
            if (data.ctr > 0.2) {
                insights.push(`${algorithm} 算法表现优秀，点击率为 ${(data.ctr * 100).toFixed(2)}%`);
            }
        });
        
        return insights;
    }
    
    // 参数配置管理
    getAlgorithmConfig() {
        return {
            algorithmType: this.algorithmType,
            weights: RECOMMENDATION_WEIGHTS,
            timeDecay: TIME_DECAY,
            diversityConfig: DIVERSITY_CONFIG,
            similarityThreshold: this.similarityThreshold,
            coldStartEnabled: this.coldStartEnabled
        };
    }
    
    // 更新算法配置
    updateAlgorithmConfig(config) {
        if (config.algorithmType && Object.values(ALGORITHM_TYPES).includes(config.algorithmType)) {
            this.algorithmType = config.algorithmType;
        }
        
        if (config.similarityThreshold) {
            this.similarityThreshold = config.similarityThreshold;
        }
        
        if (config.coldStartEnabled !== undefined) {
            this.coldStartEnabled = config.coldStartEnabled;
        }
        
        // 持久化配置
        this.saveAlgorithmConfig();
        
        return this.getAlgorithmConfig();
    }
    
    // 保存算法配置
    saveAlgorithmConfig() {
        try {
            const config = this.getAlgorithmConfig();
            uni.setStorageSync('recommendation_config', config);
        } catch (error) {
            console.error('保存算法配置失败:', error);
        }
    }
    
    // 加载算法配置
    loadAlgorithmConfig() {
        try {
            const config = uni.getStorageSync('recommendation_config');
            if (config) {
                this.updateAlgorithmConfig(config);
            }
        } catch (error) {
            console.error('加载算法配置失败:', error);
        }
    }
    
    // 重置算法配置
    resetAlgorithmConfig() {
        this.algorithmType = ALGORITHM_TYPES.HYBRID;
        this.similarityThreshold = 0.3;
        this.coldStartEnabled = true;
        this.saveAlgorithmConfig();
        return this.getAlgorithmConfig();
    }
    
    // 获取推荐算法性能指标
    getPerformanceMetrics() {
        const history = this.getRecommendationHistory();
        const effectiveness = this.calculateRecommendationEffectiveness();
        
        return {
            totalRecommendations: history.length,
            averageCtr: effectiveness.overall.ctr,
            algorithmPerformance: effectiveness.byAlgorithm,
            cacheHitRate: this.calculateCacheHitRate(),
            processingTime: this.calculateProcessingTime()
        };
    }
    
    // 计算缓存命中率
    calculateCacheHitRate() {
        // 这里可以实现缓存命中率的计算
        return 0.7; // 模拟值
    }
    
    // 计算处理时间
    calculateProcessingTime() {
        // 这里可以实现处理时间的计算
        return 150; // 模拟值，单位毫秒
    }
    
    // 增强的数据分析功能
    analyzeRecommendationData() {
        const history = this.getRecommendationHistory();
        const behaviorData = userBehaviorTracker.getBehaviorData();
        
        // 分析推荐趋势
        const trendAnalysis = this.analyzeRecommendationTrends(history);
        
        // 分析用户行为模式
        const behaviorPatterns = this.analyzeUserBehaviorPatterns(behaviorData);
        
        // 分析推荐多样性
        const diversityAnalysis = this.analyzeRecommendationDiversity(history);
        
        // 分析算法性能比较
        const algorithmComparison = this.compareAlgorithmPerformance(history);
        
        return {
            trends: trendAnalysis,
            behaviorPatterns: behaviorPatterns,
            diversity: diversityAnalysis,
            algorithmComparison: algorithmComparison
        };
    }
    
    // 分析推荐趋势
    analyzeRecommendationTrends(history) {
        const trends = {
            hourly: {},
            daily: {},
            algorithmUsage: {}
        };
        
        history.forEach(item => {
            const hour = new Date(item.timestamp).getHours();
            const day = new Date(item.timestamp).getDate();
            
            trends.hourly[hour] = (trends.hourly[hour] || 0) + 1;
            trends.daily[day] = (trends.daily[day] || 0) + 1;
            trends.algorithmUsage[item.algorithm] = (trends.algorithmUsage[item.algorithm] || 0) + 1;
        });
        
        return trends;
    }
    
    // 分析用户行为模式
    analyzeUserBehaviorPatterns(behaviorData) {
        const patterns = {
            contentTypes: {},
            timeDistribution: {},
            interactionPatterns: {}
        };
        
        behaviorData.forEach(behavior => {
            if (behavior.contentType) {
                patterns.contentTypes[behavior.contentType] = (patterns.contentTypes[behavior.contentType] || 0) + 1;
            }
            
            const hour = new Date(behavior.timestamp).getHours();
            patterns.timeDistribution[hour] = (patterns.timeDistribution[hour] || 0) + 1;
            
            patterns.interactionPatterns[behavior.type] = (patterns.interactionPatterns[behavior.type] || 0) + 1;
        });
        
        return patterns;
    }
    
    // 分析推荐多样性
    analyzeRecommendationDiversity(history) {
        const diversityMetrics = {
            categoryDiversity: 0,
            authorDiversity: 0,
            overallDiversity: 0
        };
        
        let totalCategories = new Set();
        let totalAuthors = new Set();
        let totalItems = 0;
        
        history.forEach(item => {
            item.recommendations.forEach(rec => {
                if (rec.category) totalCategories.add(rec.category);
                if (rec.author) totalAuthors.add(rec.author);
                totalItems++;
            });
        });
        
        if (totalItems > 0) {
            diversityMetrics.categoryDiversity = totalCategories.size / totalItems;
            diversityMetrics.authorDiversity = totalAuthors.size / totalItems;
            diversityMetrics.overallDiversity = (totalCategories.size + totalAuthors.size) / (2 * totalItems);
        }
        
        return diversityMetrics;
    }
    
    // 比较算法性能
    compareAlgorithmPerformance(history) {
        const performance = {};
        
        history.forEach(item => {
            if (!performance[item.algorithm]) {
                performance[item.algorithm] = {
                    total: 0,
                    items: 0
                };
            }
            performance[item.algorithm].total++;
            performance[item.algorithm].items += item.recommendations.length;
        });
        
        return performance;
    }
    
    // 异常检测和预警
    detectAnomalies() {
        const metrics = this.getPerformanceMetrics();
        const anomalies = [];
        
        // 检测点击率异常
        if (metrics.averageCtr < 0.05) {
            anomalies.push({
                type: 'low_ctr',
                severity: 'high',
                message: '推荐点击率异常偏低',
                value: metrics.averageCtr
            });
        }
        
        // 检测处理时间异常
        if (metrics.processingTime > 500) {
            anomalies.push({
                type: 'high_latency',
                severity: 'medium',
                message: '推荐处理时间异常偏高',
                value: metrics.processingTime
            });
        }
        
        // 检测缓存命中率异常
        if (metrics.cacheHitRate < 0.3) {
            anomalies.push({
                type: 'low_cache_hit',
                severity: 'low',
                message: '缓存命中率异常偏低',
                value: metrics.cacheHitRate
            });
        }
        
        return anomalies;
    }
    
    // 生成详细的分析报告
    generateAnalysisReport() {
        const metrics = this.getPerformanceMetrics();
        const analysis = this.analyzeRecommendationData();
        const anomalies = this.detectAnomalies();
        const insights = this.generateInsights(this.calculateRecommendationEffectiveness());
        
        return {
            timestamp: Date.now(),
            metrics: metrics,
            analysis: analysis,
            anomalies: anomalies,
            insights: insights,
            recommendations: this.generateImprovementRecommendations(anomalies, metrics)
        };
    }
    
    // 生成改进建议
    generateImprovementRecommendations(anomalies, metrics) {
        const recommendations = [];
        
        if (anomalies.length > 0) {
            recommendations.push('检测到异常，建议检查推荐算法配置');
        }
        
        if (metrics.averageCtr < 0.1) {
            recommendations.push('建议优化推荐算法的个性化程度');
        }
        
        if (metrics.processingTime > 300) {
            recommendations.push('建议优化推荐算法性能，考虑增加缓存容量');
        }
        
        return recommendations;
    }
    
    // 导出分析数据
    exportAnalysisData() {
        const report = this.generateAnalysisReport();
        return JSON.stringify(report, null, 2);
    }
}

// 导出单例实例
const recommendationEngine = new RecommendationEngine();

export {
    recommendationEngine,
    ALGORITHM_TYPES
};
