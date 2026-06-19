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

    // 检查并创建 app_versions 表
    $createTableSQL = "CREATE TABLE IF NOT EXISTS app_versions (
        id INT AUTO_INCREMENT PRIMARY KEY COMMENT '版本ID',
        version VARCHAR(20) NOT NULL COMMENT '版本号（格式：X.X.X）',
        description TEXT COMMENT '版本说明',
        download_url VARCHAR(255) NOT NULL COMMENT '下载地址',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='应用版本表'";
    
    // 执行创建表语句
    $db->exec($createTableSQL);

    // 插入一个初始版本记录（可选）
    $checkVersion = "SELECT COUNT(*) FROM app_versions";
    $stmt = $db->query($checkVersion);
    $count = $stmt->fetchColumn();

    if ($count == 0) {
        // 插入初始版本
        $insertSQL = "INSERT INTO app_versions (version, description, download_url) VALUES ('1.0.0', '初始版本', 'http://139.196.185.197/doo/server/downloads/app_v1_0_0.apk')";
        $db->exec($insertSQL);
    }

    // 返回200成功状态码
    http_response_code(200);
    // 返回JSON响应
    echo json_encode(array(
        "message" => "数据库初始化成功",
        "code" => 200,
        "data" => array(
            "tableCreated" => true,
            "initialVersionInserted" => $count == 0
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
