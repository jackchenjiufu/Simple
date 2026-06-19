<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
try {
    $pdo = $database->getConnection();
    
    // 测试查询
    $query = "SELECT * FROM articles LIMIT 5";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(array(
        "code" => 200,
        "message" => "测试成功",
        "data" => $result,
        "count" => count($result)
    ));
} catch (Exception $e) {
    echo json_encode(array(
        "code" => 500,
        "message" => "测试失败: " . $e->getMessage()
    ));
}
?>