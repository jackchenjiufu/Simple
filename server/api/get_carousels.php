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

    // 准备SQL查询语句，查询所有启用的轮播图，按排序字段升序排列
    $query = "SELECT id, title, author, image_url as image, sort_order as sort FROM carousels WHERE is_active = 1 ORDER BY sort_order ASC";
    // 预处理SQL语句
    $stmt = $db->prepare($query);
    // 执行查询
    $stmt->execute();
    // 获取所有结果
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 返回200成功状态码
    http_response_code(200);
    // 返回JSON响应
    echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result), JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // 捕获异常
    // 返回500错误状态码
    http_response_code(500);
    // 返回错误信息
    echo json_encode(array("message" => "获取失败", "code" => 500, "error" => $e->getMessage()), JSON_UNESCAPED_UNICODE);
}
?>