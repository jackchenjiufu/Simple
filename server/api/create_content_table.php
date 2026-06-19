<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 创建数据库连接
    $database = new Database();
    $db = $database->getConnection();
    
    // 检查content表是否存在
    $checkTableSql = "SHOW TABLES LIKE 'content'";
    $checkTableStmt = $db->prepare($checkTableSql);
    $checkTableStmt->execute();
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if (!$tableExists) {
        // 创建content表
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
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        
        $createTableStmt = $db->prepare($createTableSql);
        $createTableStmt->execute();
        
        // 从images表迁移数据到content表
        $migrateSql = "INSERT INTO content (user_id, title, content, image_url, tags, category, status, created_at)
                      SELECT user_id, title, '', url, tags, category, 'published', NOW()
                      FROM images";
        
        $migrateStmt = $db->prepare($migrateSql);
        $migrateStmt->execute();
        
        $migratedCount = $migrateStmt->rowCount();
        
        // 返回成功响应
        http_response_code(200);
        echo json_encode(array(
            "message" => "content表创建成功并迁移了 {$migratedCount} 条数据",
            "code" => 200
        ), JSON_UNESCAPED_UNICODE);
    } else {
        // 表已存在
        http_response_code(200);
        echo json_encode(array(
            "message" => "content表已存在",
            "code" => 200
        ), JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    // 捕获异常
    http_response_code(500);
    echo json_encode(array(
        "message" => "创建content表失败: " . $e->getMessage(),
        "code" => 500
    ), JSON_UNESCAPED_UNICODE);
}
?>