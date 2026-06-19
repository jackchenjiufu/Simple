<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 创建数据库实例
    $database = new Database();
    // 获取数据库连接
    $db = $database->getConnection();

    // 检查并创建 images 表
    $createTableSQL = "CREATE TABLE IF NOT EXISTS images (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '图片ID',
        title VARCHAR(255) NOT NULL COMMENT '图片标题',
        author VARCHAR(100) NOT NULL COMMENT '作者',
        url VARCHAR(255) NOT NULL COMMENT '图片URL',
        tags TEXT COMMENT '标签，用逗号分隔',
        category VARCHAR(50) DEFAULT 'photography' COMMENT '分类',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='图片表'";
    
    // 执行创建表语句
    $db->exec($createTableSQL);

    // 返回200成功状态码
    http_response_code(200);
    // 返回JSON响应
    echo json_encode(array(
        "message" => "图片表初始化成功",
        "code" => 200,
        "data" => array(
            "tableCreated" => true
        )
    ), JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // 捕获异常
    // 返回500错误状态码
    http_response_code(500);
    // 返回错误信息
    echo json_encode(array(
        "message" => "初始化失败",
        "code" => 500,
        "error" => $e->getMessage()
    ), JSON_UNESCAPED_UNICODE);
}
?>