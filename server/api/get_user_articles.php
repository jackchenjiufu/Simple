<?php
/**
 * get_user_articles.php - 获取用户文章列表 API 接口
 * 
 * 功能：
 * - 提供指定用户的文章列表查询和分页
 * - 支持按创建时间排序
 * - 提供完整的错误处理和响应
 * 
 * 请求方法：
 * - GET: 获取用户文章列表
 * 
 * 请求参数：
 * - user_id: 用户 ID（必填）
 * - page: 页码（可选，默认 1）
 * - page_size: 每页数量（可选，默认 10）
 */

// 设置 CORS 头，允许跨域请求
// 设置响应内容类型为 JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的请求方法
header("Access-Control-Allow-Methods: GET, OPTIONS");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理 OPTIONS 请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 数据库配置
$host = 'localhost';
$dbname = 'doo-app';
$username = 'root';
$password = '320722';

// 连接数据库
try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['code' => 500, 'message' => '数据库连接失败：' . $e->getMessage()]);
    exit;
}

// 处理 GET 请求
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // 获取用户 ID
        $user_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        
        // 验证用户 ID
        if ($user_id <= 0) {
            http_response_code(400);
            echo json_encode(array(
                "message" => "用户 ID 无效",
                "code" => 400
            ), JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // 获取分页参数
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $page_size = isset($_GET['page_size']) ? (int)$_GET['page_size'] : 10;
        $offset = ($page - 1) * $page_size;
        
        // 查询用户文章列表
        $sql = "SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(1, $user_id, PDO::PARAM_INT);
        $stmt->bindParam(2, $page_size, PDO::PARAM_INT);
        $stmt->bindParam(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 获取总数
        $countSql = "SELECT COUNT(*) FROM articles WHERE user_id = ?";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->bindParam(1, $user_id, PDO::PARAM_INT);
        $countStmt->execute();
        $total = $countStmt->fetchColumn();
        
        // 处理文章数据
        foreach ($articles as &$article) {
            // 处理标签字段，将字符串转换为数组
            if (!empty($article['tags'])) {
                $article['tags'] = explode(',', $article['tags']);
            } else {
                $article['tags'] = array();
            }
            
            // 生成摘要
            if (empty($article['summary']) && !empty($article['content'])) {
                $article['summary'] = mb_substr(strip_tags($article['content']), 0, 100) . '...';
            }
            
            // 确保有 created_at 字段
            if (!isset($article['created_at']) && isset($article['date'])) {
                $article['created_at'] = $article['date'];
            }
        }
        
        // 返回成功响应
        http_response_code(200);
        echo json_encode(array(
            "message" => "获取用户文章列表成功",
            "code" => 200,
            "success" => true,
            "data" => array(
                "list" => $articles,
                "total" => $total,
                "page" => $page,
                "page_size" => $page_size
            )
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(array(
            "message" => "获取用户文章列表失败：" . $e->getMessage(),
            "code" => 400
        ), JSON_UNESCAPED_UNICODE);
    }
} else {
    http_response_code(405);
    echo json_encode(array(
        "message" => "不支持的请求方法",
        "code" => 405
    ), JSON_UNESCAPED_UNICODE);
}
?>
