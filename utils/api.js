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
     * 各个API端点
     * 统一管理所有API地址，便于后续维护和更新
     */
    endpoints: {
        // 轮播图API - 获取轮播图列表
        carousel: 'get_carousels.php',
        // 用户列表API - 获取用户列表
        users: 'get_users.php',
        // 公告API - 获取公告列表
        announcements: 'announcements.php',
        // 登录API - 用户登录
        login: 'login.php',
        // 注册API - 用户注册
        register: 'register.php',
        // 更新用户信息API - 更新用户个人信息
        updateUser: 'update_user.php',
        // 上传文件API - 通用文件上传
        upload: 'upload.php',
        // 更改密码API - 修改用户密码
        changePassword: 'change_password.php',
        // 获取公告详情API - 获取公告详细信息
        announcementDetail: 'get_announcement_detail.php',
        // 关注API - 关注/取消关注用户
        follow: 'follow.php',
        // 检查关注状态API - 检查是否已关注用户
        checkFollow: 'check_follow.php',
        // 发送消息API - 发送消息给用户
        sendMessage: 'send_message.php',
        // 获取聊天记录API - 获取与用户的聊天记录
        chatHistory: 'get_chat_history.php',
        // 消息列表API - 获取消息列表
        messages: 'messages.php',
        // 个性化推荐API - 获取个性化推荐内容
        recommendations: 'user_profile.php?action=recommendations',
        // 内容相似度分析API - 分析内容相似度
        contentSimilarity: 'user_profile.php?action=content_similarity',
        // 用户画像API - 获取用户画像信息
        userProfile: 'user_profile.php?action=profile',
        // 文件管理API - 获取文件列表、删除文件
        files: 'files.php',
        // 文件上传API - 上传文件到服务器
        filesUpload: 'files_upload.php',
        // 文件预览API - 获取文件预览URL
        filesPreview: 'files_preview.php',
        // 用户行为API - 记录用户行为数据
        userBehavior: 'user_behavior.php',
        // 推荐API - 获取推荐内容
        recommend: 'recommend.php',
        // 内容API - 获取内容列表
        content: 'content.php',
        // 获取文章API - 获取文章列表
        getArticles: 'get_articles.php',
        // 删除文章API - 删除文章
        deleteArticle: 'delete_article.php',
        // 上传图片API - 上传图片
        uploadImage: 'upload_image.php',
        // 上传文章API - 上传文章
        uploadArticle: 'upload_article.php',
        // 添加收藏API - 添加内容到收藏
        addCollection: 'add_collection.php',
        // 获取收藏API - 获取用户收藏列表
        getCollections: 'get_collections.php',
        // 检查更新API - 检查应用更新
        checkUpdate: 'check_update.php',
        // 用户文章API - 获取用户文章列表
        userArticles: 'get_articles.php'
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
        // 相对路径
        if (url.startsWith('/')) return this.baseUrl.replace(/api\/$/, '') + url.substr(1);
        return '/static/img/default-cover.png';
    }
};

export default apiConfig;