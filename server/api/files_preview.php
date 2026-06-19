<?php
/**
 * 文件预览 API
 * 处理文件预览操作，返回文件的预览URL
 * 
 * API 端点：
 * - GET /api/files/{id}/preview - 获取文件预览URL
 */

// 设置 CORS 头信息
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 开启错误报告

// 启动session
session_start();

// 引入数据库配置
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../config/Database.php';

/**
 * 检查请求方法
 * 只允许 GET 请求
 */
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $response = array(
        "code" => 405,
        "message" => "方法不允许"
    );
    http_response_code(405);
    echo json_encode($response);
    exit;
}

// 从URL中获取文件ID
$fileId = isset($_GET['id']) ? $_GET['id'] : null;
if (!$fileId) {
    // 尝试从URL路径中获取
    $path = $_SERVER['REQUEST_URI'];
    $parts = explode('/', $path);
    $fileId = end($parts);
}

// 验证文件ID是否存在
if (!$fileId) {
    $response = array(
        "code" => 400,
        "message" => "缺少文件ID"
    );
    http_response_code(400);
    echo json_encode($response);
    exit;
}

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
    
    // 从数据库中获取文件信息
    $query = "SELECT * FROM files WHERE id = :id AND user_id = :user_id";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(':id', $fileId);
    $stmt->bindParam(':user_id', $userId);
    $stmt->execute();
    
    $file = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($file) {
        // 返回文件的URL作为预览URL
        $previewUrl = $file['url'];
        
        $response = array(
            "code" => 200,
            "message" => "获取预览URL成功",
            "url" => $previewUrl
        );
        
        http_response_code(200);
    } else {
        $response = array(
            "code" => 404,
            "message" => "文件不存在"
        );
        
        http_response_code(404);
    }
} catch (Exception $e) {
    $response = array(
        "code" => 500,
        "message" => "数据库查询失败: " . $e->getMessage()
    );
    
    http_response_code(500);
}

echo json_encode($response);
