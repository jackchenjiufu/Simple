<?php
/**
 * 内容数据访问层
 * 处理内容相关的数据库操作
 */
class ContentRepository {
    /**
     * 数据库连接
     * @var PDO
     */
    private $db;
    
    /**
     * 构造函数
     * @param PDO $db 数据库连接
     */
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * 获取轮播图数据
     * @param int $limit 限制数量
     * @return array 轮播图数据
     */
    public function getCarousels($limit = 5) {
        $query = "SELECT * FROM carousels ORDER BY order_num ASC LIMIT :limit";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 获取内容列表
     * @param array $filters 过滤条件
     * @param int $limit 限制数量
     * @param int $offset 偏移量
     * @return array 内容列表
     */
    public function getContentList($filters = [], $limit = 10, $offset = 0) {
        // 构建查询条件
        $whereClause = [];
        $params = [':limit' => $limit, ':offset' => $offset];
        
        if (!empty($filters['type'])) {
            $whereClause[] = "type = :type";
            $params[':type'] = $filters['type'];
        }
        
        if (!empty($filters['user_id'])) {
            $whereClause[] = "user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }
        
        if (!empty($filters['category'])) {
            $whereClause[] = "category = :category";
            $params[':category'] = $filters['category'];
        }
        
        // 构建完整查询
        $query = "SELECT * FROM content";
        
        if (!empty($whereClause)) {
            $query .= " WHERE " . implode(" AND ", $whereClause);
        }
        
        $query .= " ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $this->db->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 根据ID获取内容详情
     * @param int $id 内容ID
     * @return array|null 内容详情或null
     */
    public function getContentById($id) {
        $query = "SELECT * FROM content WHERE id = :id LIMIT 0,1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * 创建新内容
     * @param array $contentData 内容数据
     * @return int|null 创建的内容ID或null
     */
    public function createContent($contentData) {
        // 构建插入字段和值
        $fields = array_keys($contentData);
        $placeholders = array_map(function($field) {
            return ":{$field}";
        }, $fields);
        
        $query = sprintf(
            "INSERT INTO content (%s) VALUES (%s)",
            implode(", ", $fields),
            implode(", ", $placeholders)
        );
        
        $stmt = $this->db->prepare($query);
        
        foreach ($contentData as $field => $value) {
            $stmt->bindValue(":{$field}", $value);
        }
        
        if ($stmt->execute()) {
            return $this->db->lastInsertId();
        }
        
        return null;
    }
    
    /**
     * 更新内容
     * @param int $id 内容ID
     * @param array $contentData 内容数据
     * @return bool 是否更新成功
     */
    public function updateContent($id, $contentData) {
        // 构建更新字段
        $updateFields = [];
        $params = [':id' => $id];
        
        foreach ($contentData as $key => $value) {
            $updateFields[] = "{$key}=:{$key}";
            $params[":{$key}"] = $value;
        }
        
        if (empty($updateFields)) {
            return false;
        }
        
        $query = "UPDATE content SET " . implode(", ", $updateFields) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }
    
    /**
     * 删除内容
     * @param int $id 内容ID
     * @return bool 是否删除成功
     */
    public function deleteContent($id) {
        $query = "DELETE FROM content WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
    
    /**
     * 获取推荐内容
     * @param int $limit 限制数量
     * @param int $offset 偏移量
     * @return array 推荐内容
     */
    public function getRecommendedContent($limit = 10, $offset = 0) {
        $query = "SELECT * FROM content WHERE recommended = 1 ORDER BY recommend_score DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>