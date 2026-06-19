<?php
/**
 * 检查users表结构和数据的脚本
 */

// 设置CORS头
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 创建数据库实例
    $database = new Database();
    // 获取数据库连接
    $db = $database->getConnection();
    
    // 检查users表结构
    $query = "DESCRIBE users";
    $stmt = $db->query($query);
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 检查users表数据
    $query = "SELECT id, username, nickname, created_at FROM users LIMIT 10";
    $stmt = $db->query($query);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 构建响应
    $response = array(
        "message" => "查询成功",
        "code" => 200,
        "data" => array(
            "columns" => $columns,
            "users" => $users
        )
    );
    
    // 返回响应
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    // 处理错误
    $response = array(
        "message" => "查询失败: " . $e->getMessage(),
        "code" => 500
    );
    
    http_response_code(500);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}
?>