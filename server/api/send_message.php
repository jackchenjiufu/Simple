<?php
// 启动session，用于用户认证
session_start();
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
// 允许的HTTP方法（POST）
header("Access-Control-Allow-Methods: POST");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

// 验证session中是否存在user_id（用户必须登录才能发送消息）
if (!isset($_SESSION['user_id'])) {
    // 返回401未授权状态码
    http_response_code(401);
    echo json_encode(array("message" => "未登录", "code" => 401), JSON_UNESCAPED_UNICODE);
    exit;
}

// 从session中获取当前用户ID（发送者ID）
$sender_id = $_SESSION['user_id'];

// 获取请求的原始数据
$rawData = file_get_contents("php://input");
// 解析JSON数据
$data = json_decode($rawData);

// 验证接收者ID是否为空
if (empty($data->receiver_id)) {
    // 返回400错误状态码
    http_response_code(400);
    echo json_encode(array("message" => "接收者ID不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
    exit;
}

// 验证消息内容是否为空
if (empty(trim($data->content))) {
    // 返回400错误状态码
    http_response_code(400);
    echo json_encode(array("message" => "消息内容不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
    exit;
}

// 准备SQL插入语句，保存消息
$query = "INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (:sender_id, :receiver_id, :content, NOW())";
$stmt = $db->prepare($query);

// 绑定参数
$stmt->bindParam(":sender_id", $sender_id);
$stmt->bindParam(":receiver_id", $data->receiver_id);
$stmt->bindParam(":content", $data->content);

// 执行插入操作
if ($stmt->execute()) {
    // 返回201成功状态码
    http_response_code(201);
    echo json_encode(array("message" => "消息发送成功", "code" => 201), JSON_UNESCAPED_UNICODE);
} else {
    // 插入失败，返回500错误状态码
    http_response_code(500);
    echo json_encode(array("message" => "消息发送失败", "code" => 500), JSON_UNESCAPED_UNICODE);
}
?>