/**
 * API配置文件
 * 统一管理API地址，便于后续维护和更新
 */
import config from './config.js'

const apiConfig = {
    /**
     * API基础地址
     */
    /** 动态跟随 config.baseUrl（后端版本切换后实时生效） */
    get baseUrl() { return config.baseUrl },
    
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
        if (!url) return config.defaultCover;
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
            // 剥离 /api/ 及之后的版本段（兼容 apiVersion=0 与 /api/v2/）
            return this.baseUrl.replace(/\/api\/.*$/, '/') + url.substr(1);
        }
        return config.defaultCover;
    },

    /**
     * 统一修复服务器资源URL（图片/文件，非 API）
     * @param {string} url - 形如 '/server/uploads/xxx.png' 或 'uploads/xxx.png'
     * @returns {string} 完整URL
     */
    getServerUrl(url) {
        if (!url) return config.defaultAvatar;
        url = String(url).trim().replace(/`/g, '');
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/static/')) {
            return url;
        }
        return config.siteUrl + (url.startsWith('/') ? url : '/' + url);
    }
};

export default apiConfig;
