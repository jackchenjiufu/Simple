<?php
/**
 * 内容服务层
 * 处理内容相关的业务逻辑
 */
require_once __DIR__ . '/../repositories/ContentRepository.php';

class ContentService {
    /**
     * 内容数据访问层
     * @var ContentRepository
     */
    private $contentRepository;
    
    /**
     * 构造函数
     * @param PDO $db 数据库连接
     */
    public function __construct($db) {
        $this->contentRepository = new ContentRepository($db);
    }
    
    /**
     * 获取轮播图数据
     * @param int $limit 限制数量
     * @return array 轮播图数据
     */
    public function getCarousels($limit = 5) {
        return $this->contentRepository->getCarousels($limit);
    }
    
    /**
     * 获取内容列表
     * @param array $filters 过滤条件
     * @param int $page 页码
     * @param int $pageSize 每页数量
     * @return array 内容列表和分页信息
     */
    public function getContentList($filters = [], $page = 1, $pageSize = 10) {
        // 计算偏移量
        $offset = ($page - 1) * $pageSize;
        
        // 获取内容列表
        $contentList = $this->contentRepository->getContentList($filters, $pageSize, $offset);
        
        // 这里可以添加获取总内容数的逻辑，用于分页
        
        return [
            'contentList' => $contentList,
            'pagination' => [
                'page' => $page,
                'pageSize' => $pageSize,
                'total' => count($contentList) // 临时使用，实际应该从数据库获取
            ]
        ];
    }
    
    /**
     * 获取内容详情
     * @param int $contentId 内容ID
     * @return array|null 内容详情或null
     */
    public function getContentDetail($contentId) {
        return $this->contentRepository->getContentById($contentId);
    }
    
    /**
     * 创建内容
     * @param array $contentData 内容数据
     * @param int $userId 用户ID
     * @return array|null 创建的内容或null
     */
    public function createContent($contentData, $userId) {
        // 添加创建时间和用户ID
        $contentData['user_id'] = $userId;
        $contentData['created_at'] = date('Y-m-d H:i:s');
        $contentData['updated_at'] = date('Y-m-d H:i:s');
        
        // 创建内容
        $contentId = $this->contentRepository->createContent($contentData);
        
        if ($contentId) {
            // 获取创建的内容详情
            $content = $this->contentRepository->getContentById($contentId);
            return $content;
        }
        
        return null;
    }
    
    /**
     * 更新内容
     * @param int $contentId 内容ID
     * @param array $contentData 内容数据
     * @param int $userId 用户ID
     * @return bool 是否更新成功
     */
    public function updateContent($contentId, $contentData, $userId) {
        // 添加更新时间
        $contentData['updated_at'] = date('Y-m-d H:i:s');
        
        // 验证内容是否存在且属于该用户
        $content = $this->contentRepository->getContentById($contentId);
        if (!$content || $content['user_id'] != $userId) {
            return false;
        }
        
        // 更新内容
        return $this->contentRepository->updateContent($contentId, $contentData);
    }
    
    /**
     * 删除内容
     * @param int $contentId 内容ID
     * @param int $userId 用户ID
     * @return bool 是否删除成功
     */
    public function deleteContent($contentId, $userId) {
        // 验证内容是否存在且属于该用户
        $content = $this->contentRepository->getContentById($contentId);
        if (!$content || $content['user_id'] != $userId) {
            return false;
        }
        
        // 删除内容
        return $this->contentRepository->deleteContent($contentId);
    }
    
    /**
     * 获取推荐内容
     * @param int $limit 限制数量
     * @param int $offset 偏移量
     * @return array 推荐内容
     */
    public function getRecommendedContent($limit = 10, $offset = 0) {
        return $this->contentRepository->getRecommendedContent($limit, $offset);
    }
}
?>