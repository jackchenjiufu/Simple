/**
 * API配置文件
 * 统一管理API地址，便于后续维护和更新
 */

const apiConfig = {
    /**
     * API基础地址
     */
    baseUrl: 'http://139.196.185.197:7070/doo/server/api/',
    
    /**
     * 各个API端点（仅保留实际被引用的）
     * 其余页面直接使用 baseUrl + 'xxx.php' 字符串拼接，不走 endpoints
     */
    endpoints: {
        // 轮播图API - 获取轮播图列表（tabbar-1 首页使用）
        carousel: 'get_carousels.php',
        // 公告API - 获取公告列表（announcement-detail 详情页使用）
        announcements: 'announcements.php'
    },
    
    /**
     * 获取完整的API URL
     * @param {string} endpoint - API端点
     * @returns {string} 完整的API URL
     */
    getUrl(endpoint) {
        return this.baseUrl + endpoint;
    },

    /**
     * 统一修复图片URL：补全端口和协议
     * @param {string} url - 原始图片URL
     * @returns {string} 修复后的完整URL
     */
    getImageUrl(url) {
        if (!url) return '/static/img/default-cover.png';
        url = url.trim().replace(/`/g, '');
        // 已经是完整URL
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        // 前端本地静态资源，直接返回
        if (url.startsWith('/static/')) {
            return url;
        }
        // 服务器相对路径
        if (url.startsWith('/')) {
            return this.baseUrl.replace(/api\/$/, '') + url.substr(1);
        }
        return '/static/img/default-cover.png';
    }
};

export default apiConfig;