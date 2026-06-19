<?php
// 启动session，用于用户认证
session_start();
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
// 允许的HTTP方法（GET）
header("Access-Control-Allow-Methods: GET");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

// 验证session中是否存在user_id（用户必须登录才能获取聊天记录）
if (!isset($_SESSION['user_id'])) {
    // 返回401未授权状态码
    http_response_code(401);
    echo json_encode(array("message" => "未登录", "code" => 401), JSON_UNESCAPED_UNICODE);
    exit;
}

// 从session中获取当前用户ID
$current_user_id = $_SESSION['user_id'];

// 获取聊天对象ID
$chat_user_id = isset($_GET['user_id']) ? $_GET['user_id'] : 0;

// 验证聊天对象ID是否为空
if (empty($chat_user_id)) {
    // 返回400错误状态码
    http_response_code(400);
    echo json_encode(array("message" => "聊天对象ID不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
    exit;
}

// 准备SQL查询，获取两个用户之间的聊天记录
$query = "SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
              us.username as sender_name, us.nickname as sender_nickname, us.avatar as sender_avatar,
              ur.username as receiver_name, ur.nickname as receiver_nickname, ur.avatar as receiver_avatar
          FROM messages m
          LEFT JOIN users us ON m.sender_id = us.id
          LEFT JOIN users ur ON m.receiver_id = ur.id
          WHERE (m.sender_id = :current_user_id AND m.receiver_id = :chat_user_id) 
              OR (m.sender_id = :chat_user_id AND m.receiver_id = :current_user_id)
          ORDER BY m.created_at ASC";

// 预处理SQL语句
$stmt = $db->prepare($query);

// 绑定参数
$stmt->bindParam(":current_user_id", $current_user_id);
$stmt->bindParam(":chat_user_id", $chat_user_id);

// 执行查询
$stmt->execute();

// 获取所有结果
$chat_history = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 返回成功响应
http_response_code(200);
echo json_encode(array(
    "message" => "获取聊天记录成功", 
    "code" => 200, 
    "data" => $chat_history
), JSON_UNESCAPED_UNICODE);
?>