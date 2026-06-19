<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

try {
    // 创建日志表的SQL语句
    $sql = "CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        type VARCHAR(50) NOT NULL COMMENT '日志类型',
        action VARCHAR(100) NOT NULL COMMENT '操作',
        message TEXT NOT NULL COMMENT '日志消息',
        ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';";
    
    // 执行SQL语句
    $db->exec($sql);
    
    // 返回成功响应
    http_response_code(200);
    echo json_encode(array("message" => "logs表创建成功", "code" => 200));
} catch (PDOException $e) {
    // 返回错误响应
    http_response_code(500);
    echo json_encode(array("message" => "创建logs表失败: " . $e->getMessage(), "code" => 500));
}
?>