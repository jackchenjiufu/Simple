<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
// 允许的请求方法
header("Access-Control-Allow-Methods: GET");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 初始化收藏数组
$collections = array();

try {
    // 检查请求方法
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('只支持GET请求');
    }
    
    // 获取查询参数
    $userId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($userId <= 0) {
        throw new Exception('缺少必要的用户ID参数');
    }
    
    // 连接数据库
    $database = new Database();
    $db = $database->getConnection();
    
    // 检查collections表是否存在
    $checkTableSql = "SHOW TABLES LIKE 'collections'";
    $checkTableStmt = $db->prepare($checkTableSql);
    $checkTableStmt->execute();
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if (!$tableExists) {
        // 如果表不存在，返回空数组
        http_response_code(200);
        echo json_encode(array(
            "message" => "获取收藏列表成功",
            "code" => 200,
            "data" => $collections,
            "total" => 0
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // 构建SQL查询，获取用户的收藏列表及其关联的图片信息
    $sql = "SELECT c.id as collection_id, c.created_at as collected_at, i.* 
            FROM collections c 
            JOIN images i ON c.image_id = i.id 
            WHERE c.user_id = ? 
            ORDER BY c.created_at DESC";
    
    // 准备并执行查询
    $stmt = $db->prepare($sql);
    $stmt->execute(array($userId));
    
    // 获取结果
    $collections = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 处理标签字段，转换为数组
    foreach ($collections as &$item) {
        if (!empty($item['tags'])) {
            $item['tags'] = explode(',', $item['tags']);
        } else {
            $item['tags'] = array();
        }
        // 添加额外字段
        $item['type'] = 'image';
        $item['cover'] = $item['url'];
    }
    
} catch (Exception $e) {
    // 捕获异常
    error_log('Database error: ' . $e->getMessage());
    // 继续执行，使用空数组
    $collections = array();
}

// 获取总记录数
$total = count($collections);

// 返回成功响应
http_response_code(200);
echo json_encode(array(
    "message" => "获取收藏列表成功",
    "code" => 200,
    "data" => $collections,
    "total" => $total
), JSON_UNESCAPED_UNICODE);
?>