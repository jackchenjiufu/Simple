<?php
/**
 * 文件管理 API
 * 处理文件列表获取和文件删除操作
 * 
 * API 端点：
 * - GET /api/files - 获取文件列表（支持分页和搜索）
 * - DELETE /api/files/{id} - 删除指定文件
 */

// 设置 CORS 头信息
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 开启错误报告

// 启动session
session_start();

// 引入数据库配置
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../config/Database.php';

/**
 * 处理 GET 请求 - 获取文件列表
 * 支持分页和关键词搜索
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // 获取请求参数
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $pageSize = isset($_GET['pageSize']) ? intval($_GET['pageSize']) : 10;
    $keyword = isset($_GET['keyword']) ? $_GET['keyword'] : '';
    
    try {
        // 初始化数据库连接
        $database = new Database();
        $conn = $database->getConnection();
        
        // 从session中获取用户ID
        $userId = $_SESSION['user_id'] ?? null;
        
        // 如果session中没有用户ID，尝试从Authorization头获取
        if (empty($userId) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
            // 简单的token解析，实际项目中应该使用JWT等标准方案
            if (strpos($authHeader, 'Bearer ') === 0) {
                $token = substr($authHeader, 7);
                // 验证token是否与session中的token匹配
                if (isset($_SESSION['token']) && $_SESSION['token'] === $token) {
                    // 如果token匹配，使用session中的用户ID
                    $userId = $_SESSION['user_id'] ?? null;
                }
            }
        }
        
        // 验证用户是否登录
        if (empty($userId)) {
            $response = array(
                "code" => 401,
                "message" => "未登录"
            );
            http_response_code(401);
            echo json_encode($response);
            exit;
        }
        
        // 构建查询语句
        $query = "SELECT * FROM files WHERE user_id = :user_id";
        $params = array(':user_id' => $userId);
        
        // 添加关键词过滤条件
        if (!empty($keyword)) {
            $query .= " AND (name LIKE :keyword OR original_name LIKE :keyword)";
            $params[':keyword'] = '%' . $keyword . '%';
        }
        
        // 添加排序
        $query .= " ORDER BY created_at DESC";
        
        // 获取总数
        $countQuery = "SELECT COUNT(*) as total FROM files WHERE user_id = :user_id";
        if (!empty($keyword)) {
            $countQuery .= " AND (name LIKE :keyword OR original_name LIKE :keyword)";
        }
        $countStmt = $conn->prepare($countQuery);
        $countStmt->execute($params);
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // 添加分页
        $offset = ($page - 1) * $pageSize;
        $query .= " LIMIT :offset, :pageSize";
        $params[':offset'] = $offset;
        $params[':pageSize'] = $pageSize;
        
        // 准备并执行查询
        $stmt = $conn->prepare($query);
        
        // 绑定参数
        foreach ($params as $key => &$value) {
            $stmt->bindParam($key, $value);
        }
        
        $stmt->execute();
        $files = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 格式化返回数据
        $formattedFiles = array();
        foreach ($files as $file) {
            $formattedFiles[] = array(
                'id' => $file['id'],
                'name' => $file['original_name'],
                'size' => $file['size'],
                'type' => $file['type'],
                'url' => $file['url'],
                'ossUrl' => $file['url'],
                'uploadDate' => $file['created_at'],
                'status' => $file['status']
            );
        }
        
        // 构建响应
        $response = array(
            "code" => 200,
            "message" => "获取文件列表成功",
            "data" => $formattedFiles,
            "total" => $total,
            "page" => $page,
            "pageSize" => $pageSize
        );
        
        // 返回响应
        http_response_code(200);
        echo json_encode($response);
    } catch (Exception $e) {
        // 处理异常
        $response = array(
            "code" => 500,
            "message" => "数据库查询失败: " . $e->getMessage()
        );
        http_response_code(500);
        echo json_encode($response);
    }
    exit;
}

/**
 * 处理 DELETE 请求 - 删除文件
 * 从数据库和服务器中删除文件
 */
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // 从URL中获取文件ID
    $path = $_SERVER['REQUEST_URI'];
    $parts = explode('/', $path);
    $fileId = end($parts);
    
    try {
        // 初始化数据库连接
        $database = new Database();
        $conn = $database->getConnection();
        
        // 从session中获取用户ID
        $userId = $_SESSION['user_id'] ?? null;
        
        // 如果session中没有用户ID，尝试从Authorization头获取
        if (empty($userId) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
            // 简单的token解析，实际项目中应该使用JWT等标准方案
            if (strpos($authHeader, 'Bearer ') === 0) {
                $token = substr($authHeader, 7);
                // 验证token是否与session中的token匹配
                if (isset($_SESSION['token']) && $_SESSION['token'] === $token) {
                    // 如果token匹配，使用session中的用户ID
                    $userId = $_SESSION['user_id'] ?? null;
                }
            }
        }
        
        // 验证用户是否登录
        if (empty($userId)) {
            $response = array(
                "code" => 401,
                "message" => "未登录"
            );
            http_response_code(401);
            echo json_encode($response);
            exit;
        }
        
        // 先获取文件信息，用于删除物理文件
        $query = "SELECT * FROM files WHERE id = :id AND user_id = :user_id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $fileId);
        $stmt->bindParam(':user_id', $userId);
        $stmt->execute();
        $file = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($file) {
            // 删除物理文件
            $filePath = __DIR__ . '/../uploads/' . ($file['folder'] ? $file['folder'] . '/' : '') . $file['name'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }
            
            // 从数据库中删除
            $deleteQuery = "DELETE FROM files WHERE id = :id AND user_id = :user_id";
            $deleteStmt = $conn->prepare($deleteQuery);
            $deleteStmt->bindParam(':id', $fileId);
            $deleteStmt->bindParam(':user_id', $userId);
            
            if ($deleteStmt->execute()) {
                $response = array(
                    "success" => true,
                    "message" => "文件删除成功"
                );
                http_response_code(200);
            } else {
                $response = array(
                    "success" => false,
                    "message" => "数据库删除失败"
                );
                http_response_code(500);
            }
        } else {
            $response = array(
                "success" => false,
                "message" => "文件不存在"
            );
            http_response_code(404);
        }
        
        echo json_encode($response);
    } catch (Exception $e) {
        $response = array(
            "success" => false,
            "message" => "数据库操作失败: " . $e->getMessage()
        );
        http_response_code(500);
        echo json_encode($response);
    }
    exit;
}

// 处理其他请求方法
$response = array(
    "code" => 405,
    "message" => "方法不允许"
);

http_response_code(405);
echo json_encode($response);
