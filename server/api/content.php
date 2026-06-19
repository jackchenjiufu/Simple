<?php
/**
 * content.php - 内容管理API接口
 * 
 * 功能：
 * - 提供内容的创建、读取、更新、删除操作
 * - 支持内容列表查询和分页
 * - 自动检查并创建content表结构
 * - 提供完整的错误处理和响应
 * 
 * 请求方法：
 * - GET: 获取内容列表或单个内容
 * - POST: 创建新内容
 * - PUT: 更新内容
 * - DELETE: 删除内容
 * - OPTIONS: 处理预检请求
 */

// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的请求方法
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理OPTIONS请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    /**
     * 数据库连接和表结构检查
     */
    // 创建数据库连接
    $database = new Database();
    $db = $database->getConnection();
    
    // 检查content表是否存在，如果不存在则创建
    $checkTableSql = "SHOW TABLES LIKE 'content'";
    $checkTableStmt = $db->prepare($checkTableSql);
    $checkTableStmt->execute();
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if (!$tableExists) {
        /**
         * 创建content表结构
         * 字段说明：
         * - id: 自增主键
         * - user_id: 用户ID，外键
         * - title: 内容标题
         * - content: 内容详情
         * - image_url: 图片URL
         * - video_url: 视频URL
         * - likes: 点赞数
         * - comments: 评论数
         * - status: 内容状态（草稿、已发布、已删除）
         * - tags: 标签
         * - category: 分类
         * - created_at: 创建时间
         * - updated_at: 更新时间
         */
        $createTableSql = "CREATE TABLE content (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            image_url VARCHAR(255),
            video_url VARCHAR(255),
            likes INT DEFAULT 0,
            comments INT DEFAULT 0,
            status ENUM('draft', 'published', 'deleted') DEFAULT 'published',
            tags VARCHAR(255),
            category VARCHAR(100) DEFAULT 'photography',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $createTableStmt = $db->prepare($createTableSql);
        $createTableStmt->execute();
    }
    
    // 获取请求方法
    $method = $_SERVER['REQUEST_METHOD'];
    
    /**
     * 处理不同的请求方法
     */
    switch ($method) {
        case 'GET':
            /**
             * GET请求处理
             * 功能：获取内容列表或单个内容
             * 
             * 单个内容请求：
             * - URL: /content.php?id=1
             * - 返回：单个内容详情
             * 
             * 内容列表请求：
             * - URL: /content.php?limit=20&offset=0&status=published
             * - 参数：
             *   - limit: 每页数量，默认20
             *   - offset: 偏移量，默认0
             *   - status: 内容状态，默认published
             * - 返回：内容列表，包含总数、分页信息
             */
            if (isset($_GET['id'])) {
                // 获取单个内容
                $id = $_GET['id'];
                // 关联查询users表，获取真实的用户名
                $sql = "SELECT c.*, u.username AS author FROM content c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute(array($id));
                $content = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($content) {
                    http_response_code(200);
                    echo json_encode(array(
                        "message" => "获取内容成功",
                        "code" => 200,
                        "data" => $content
                    ), JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(404);
                    echo json_encode(array(
                        "message" => "内容不存在",
                        "code" => 404
                    ), JSON_UNESCAPED_UNICODE);
                }
            } else {
                // 获取内容列表
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
                $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
                $status = isset($_GET['status']) ? $_GET['status'] : 'published';
                
                // 关联查询users表，获取真实的用户名
                $sql = "SELECT c.*, u.username AS author FROM content c LEFT JOIN users u ON c.user_id = u.id WHERE c.status = ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
                $stmt = $db->prepare($sql);
                $stmt->execute(array($status, $limit, $offset));
                $contents = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // 获取总数
                $countSql = "SELECT COUNT(*) FROM content WHERE status = ?";
                $countStmt = $db->prepare($countSql);
                $countStmt->execute(array($status));
                $total = $countStmt->fetchColumn();
                
                http_response_code(200);
                echo json_encode(array(
                    "message" => "获取内容列表成功",
                    "code" => 200,
                    "data" => array(
                        "contents" => $contents,
                        "total" => $total,
                        "limit" => $limit,
                        "offset" => $offset
                    )
                ), JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'POST':
            /**
             * POST请求处理
             * 功能：创建新内容
             * 
             * 请求体：
             * {
             *   "user_id": 1,
             *   "title": "内容标题",
             *   "content": "内容详情",
             *   "image_url": "图片URL",
             *   "video_url": "视频URL",
             *   "tags": "标签1,标签2",
             *   "category": "分类",
             *   "status": "published"
             * }
             * 
             * 必需参数：
             * - user_id: 用户ID
             * - title: 内容标题
             * 
             * 可选参数：
             * - content: 内容详情
             * - image_url: 图片URL
             * - video_url: 视频URL
             * - tags: 标签
             * - category: 分类，默认photography
             * - status: 状态，默认published
             */
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['title']) || !isset($data['user_id'])) {
                throw new Exception('缺少必要的参数');
            }
            
            $user_id = $data['user_id'];
            $title = $data['title'];
            $content = isset($data['content']) ? $data['content'] : '';
            $image_url = isset($data['image_url']) ? $data['image_url'] : '';
            $video_url = isset($data['video_url']) ? $data['video_url'] : '';
            $tags = isset($data['tags']) ? $data['tags'] : '';
            $category = isset($data['category']) ? $data['category'] : 'photography';
            $status = isset($data['status']) ? $data['status'] : 'published';
            
            $sql = "INSERT INTO content (user_id, title, content, image_url, video_url, tags, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $db->prepare($sql);
            $result = $stmt->execute(array($user_id, $title, $content, $image_url, $video_url, $tags, $category, $status));
            
            if ($result) {
                $id = $db->lastInsertId();
                
                // 获取创建的内容
                $getSql = "SELECT * FROM content WHERE id = ?";
                $getStmt = $db->prepare($getSql);
                $getStmt->execute(array($id));
                $createdContent = $getStmt->fetch(PDO::FETCH_ASSOC);
                
                http_response_code(201);
                echo json_encode(array(
                    "message" => "创建内容成功",
                    "code" => 201,
                    "data" => $createdContent
                ), JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('创建内容失败');
            }
            break;
            
        case 'PUT':
            /**
             * PUT请求处理
             * 功能：更新内容
             * 
             * URL: /content.php?id=1
             * 
             * 请求体：
             * {
             *   "title": "新标题",
             *   "content": "新内容",
             *   "status": "published"
             * }
             * 
             * 可选更新字段：
             * - title: 内容标题
             * - content: 内容详情
             * - image_url: 图片URL
             * - video_url: 视频URL
             * - likes: 点赞数
             * - comments: 评论数
             * - status: 内容状态
             * - tags: 标签
             * - category: 分类
             */
            if (!isset($_GET['id'])) {
                throw new Exception('缺少内容ID');
            }
            
            $id = $_GET['id'];
            $data = json_decode(file_get_contents('php://input'), true);
            
            // 构建更新字段
            $updateFields = array();
            $params = array();
            
            if (isset($data['title'])) {
                $updateFields[] = "title = ?";
                $params[] = $data['title'];
            }
            if (isset($data['content'])) {
                $updateFields[] = "content = ?";
                $params[] = $data['content'];
            }
            if (isset($data['image_url'])) {
                $updateFields[] = "image_url = ?";
                $params[] = $data['image_url'];
            }
            if (isset($data['video_url'])) {
                $updateFields[] = "video_url = ?";
                $params[] = $data['video_url'];
            }
            if (isset($data['likes'])) {
                $updateFields[] = "likes = ?";
                $params[] = $data['likes'];
            }
            if (isset($data['comments'])) {
                $updateFields[] = "comments = ?";
                $params[] = $data['comments'];
            }
            if (isset($data['status'])) {
                $updateFields[] = "status = ?";
                $params[] = $data['status'];
            }
            if (isset($data['tags'])) {
                $updateFields[] = "tags = ?";
                $params[] = $data['tags'];
            }
            if (isset($data['category'])) {
                $updateFields[] = "category = ?";
                $params[] = $data['category'];
            }
            
            if (empty($updateFields)) {
                throw new Exception('没有需要更新的字段');
            }
            
            $params[] = $id;
            $sql = "UPDATE content SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result) {
                // 获取更新后的内容
                $getSql = "SELECT * FROM content WHERE id = ?";
                $getStmt = $db->prepare($getSql);
                $getStmt->execute(array($id));
                $updatedContent = $getStmt->fetch(PDO::FETCH_ASSOC);
                
                http_response_code(200);
                echo json_encode(array(
                    "message" => "更新内容成功",
                    "code" => 200,
                    "data" => $updatedContent
                ), JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('更新内容失败');
            }
            break;
            
        case 'DELETE':
            /**
             * DELETE请求处理
             * 功能：删除内容
             * 
             * URL: /content.php?id=1
             * 
             * 参数：
             * - id: 内容ID
             */
            if (!isset($_GET['id'])) {
                throw new Exception('缺少内容ID');
            }
            
            $id = $_GET['id'];
            
            // 检查内容是否存在
            $checkSql = "SELECT * FROM content WHERE id = ?";
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->execute(array($id));
            $contentExists = $checkStmt->rowCount() > 0;
            
            if (!$contentExists) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "内容不存在",
                    "code" => 404
                ), JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // 执行删除操作
            $sql = "DELETE FROM content WHERE id = ?";
            $stmt = $db->prepare($sql);
            $result = $stmt->execute(array($id));
            
            if ($result) {
                http_response_code(200);
                echo json_encode(array(
                    "message" => "删除内容成功",
                    "code" => 200
                ), JSON_UNESCAPED_UNICODE);
            } else {
                throw new Exception('删除内容失败');
            }
            break;
            
        default:
            throw new Exception('不支持的请求方法');
    }
    
} catch (Exception $e) {
    /**
     * 异常处理
     * 捕获所有执行过程中的异常，并返回统一的错误响应格式
     * 
     * 响应格式：
     * {
     *   "message": "错误信息",
     *   "code": 400
     * }
     */
    http_response_code(400);
    echo json_encode(array(
        "message" => $e->getMessage(),
        "code" => 400
    ), JSON_UNESCAPED_UNICODE);
}
?>