<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

session_start();
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    http_response_code(401);
    echo json_encode(array("message" => "未授权访问", "code" => 401));
    exit;
}

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 引入数据库连接类
    include_once __DIR__ . '/../config/Database.php';
    
    // 创建数据库实例
    $database = new Database();
    // 获取数据库连接
    $db = $database->getConnection();

    // 获取请求数据
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    // 检查是否提供了ID
    if (!isset($data['id'])) {
        // 返回400错误状态码
        http_response_code(400);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "缺少版本ID",
            "code" => 400
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $id = $data['id'];

    // 准备SQL查询语句，查询版本信息
    $query = "SELECT download_url FROM app_versions WHERE id = ?";
    // 预处理SQL语句
    $stmt = $db->prepare($query);
    // 执行查询
    $stmt->execute([$id]);
    // 获取结果
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        // 返回404错误状态码
        http_response_code(404);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "版本不存在",
            "code" => 404
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $downloadUrl = $result['download_url'];
    $filePath = __DIR__ . '/../downloads/' . basename($downloadUrl);

    // 删除数据库记录
    $query = "DELETE FROM app_versions WHERE id = ?";
    // 预处理SQL语句
    $stmt = $db->prepare($query);
    // 执行删除
    $stmt->execute([$id]);

    // 删除文件
    if (file_exists($filePath)) {
        unlink($filePath);
    }

    // 返回200成功状态码
    http_response_code(200);
    // 返回JSON响应
    echo json_encode(array(
        "message" => "删除成功",
        "code" => 200
    ), JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // 捕获异常
    // 返回500错误状态码
    http_response_code(500);
    // 返回错误信息
    echo json_encode(array(
        "message" => "删除失败",
        "code" => 500,
        "error" => $e->getMessage()
    ), JSON_UNESCAPED_UNICODE);
}
?>
