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

    // 准备SQL查询语句，查询视频信息，关联用户表获取作者信息，按ID降序排列，限制20条
    $query = "SELECT v.id, v.title, v.description, v.video_url, v.cover_url as cover, v.views, v.created_at, u.username as author 
              FROM videos v 
              LEFT JOIN users u ON v.user_id = u.id 
              ORDER BY v.id DESC 
              LIMIT 20";
    // 预处理SQL语句
    $stmt = $db->prepare($query);
    // 执行查询
    $stmt->execute();
    // 获取所有结果
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 遍历结果，格式化播放量
    foreach ($result as &$item) {
        // 将播放量格式化为"X次播放"
        $item['views'] = $item['views'] . '次播放';
    }

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
