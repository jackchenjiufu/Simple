<?php
/**
 * get_articles.php - 获取文章列表API接口
 */

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
// 允许的请求方法
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理OPTIONS请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
} catch (Exception $e) {
    echo json_encode(['code' => 500, 'message' => '数据库连接失败']);
    exit;
}

// 处理GET请求
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // 获取分页参数
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        
        // 查询文章列表
        $sql = "SELECT * FROM articles ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = $pdo->prepare($sql);
        $stmt->bindParam(1, $limit, PDO::PARAM_INT);
        $stmt->bindParam(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 获取总数
        $countSql = "SELECT COUNT(*) FROM articles";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute();
        $total = $countStmt->fetchColumn();
        
        // 处理标签字段，将字符串转换为数组
        foreach ($articles as &$article) {
            if (!empty($article['tags'])) {
                $article['tags'] = explode(',', $article['tags']);
            } else {
                $article['tags'] = array();
            }
            // 格式化日期
            $article['date'] = date('Y-m-d', strtotime($article['created_at']));
            // 生成摘要
            $article['excerpt'] = mb_substr(strip_tags($article['content']), 0, 100) . '...';
        }
        unset($article);
        
        // 返回成功响应
        http_response_code(200);
        echo json_encode(array(
            "message" => "获取文章列表成功",
            "code" => 200,
            "data" => array(
                "articles" => $articles,
                "total" => $total,
                "limit" => $limit,
                "offset" => $offset
            )
        ), JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(array(
            "message" => $e->getMessage(),
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
