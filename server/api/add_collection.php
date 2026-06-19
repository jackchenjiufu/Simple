<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的请求方法
header("Access-Control-Allow-Methods: POST");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 移除请求方法限制，以支持不同的请求方式
    // if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    //     throw new Exception('只支持POST请求');
    // }
    
    // 检查必要的POST参数
    // 同时支持POST和GET参数，以应对不同的请求方式
    $user_id = isset($_POST['user_id']) ? $_POST['user_id'] : (isset($_GET['user_id']) ? $_GET['user_id'] : null);
    $image_id = isset($_POST['image_id']) ? $_POST['image_id'] : (isset($_GET['image_id']) ? $_GET['image_id'] : null);
    
    if (!$user_id || !$image_id) {
        throw new Exception('缺少必要的参数');
    }
    
    // 获取POST参数
    $userId = intval($user_id);
    $imageId = intval($image_id);
    
    // 连接数据库
    $database = new Database();
    $db = $database->getConnection();
    
    // 检查images表是否存在
    $checkImageSql = "SELECT id FROM images WHERE id = ?";
    $checkImageStmt = $db->prepare($checkImageSql);
    $checkImageStmt->execute(array($imageId));
    $imageExists = $checkImageStmt->rowCount() > 0;
    
    if (!$imageExists) {
        throw new Exception('图片不存在');
    }
    
    // 检查collections表是否存在，如果不存在则创建
    $checkTableSql = "SHOW TABLES LIKE 'collections'";
    $checkTableStmt = $db->prepare($checkTableSql);
    $checkTableStmt->execute();
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if (!$tableExists) {
        // 创建collections表
        $createTableSql = "CREATE TABLE collections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            image_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_image (user_id, image_id)
        )";
        $createTableStmt = $db->prepare($createTableSql);
        $createTableStmt->execute();
    }
    
    // 尝试添加收藏
    $sql = "INSERT INTO collections (user_id, image_id) VALUES (?, ?)";
    $stmt = $db->prepare($sql);
    
    try {
        $result = $stmt->execute(array($userId, $imageId));
    } catch (PDOException $e) {
        // 检查是否是唯一约束冲突
        if (strpos($e->getMessage(), 'unique_user_image') !== false) {
            throw new Exception('已经收藏过该图片');
        }
        throw $e;
    }
    
    if (!$result) {
        throw new Exception('添加收藏失败');
    }
    
    // 获取插入的ID
    $collectionId = $db->lastInsertId();
    
    // 返回成功响应
    http_response_code(200);
    echo json_encode(array(
        "message" => "收藏成功",
        "code" => 200,
        "data" => array(
            "id" => $collectionId,
            "user_id" => $userId,
            "image_id" => $imageId
        )
    ), JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // 捕获异常
    http_response_code(400);
    echo json_encode(array(
        "message" => $e->getMessage(),
        "code" => 400
    ), JSON_UNESCAPED_UNICODE);
}
?>