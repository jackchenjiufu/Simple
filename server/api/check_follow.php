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

// 验证session中是否存在user_id（用户必须登录才能使用关注功能）
if (!isset($_SESSION['user_id'])) {
    // 返回401未授权状态码
    http_response_code(401);
    echo json_encode(array("message" => "未登录", "code" => 401), JSON_UNESCAPED_UNICODE);
    exit;
}

// 从session中获取当前用户ID
$current_user_id = $_SESSION['user_id'];

// 获取目标用户ID
$target_user_id = isset($_GET['user_id']) ? $_GET['user_id'] : 0;

// 验证目标用户ID是否为空
if (empty($target_user_id)) {
    // 返回400错误状态码
    http_response_code(400);
    echo json_encode(array("message" => "用户ID不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
    exit;
}

// 准备SQL查询，检查当前用户是否关注目标用户
$query1 = "SELECT COUNT(*) as count FROM follows WHERE follower_id = :current_user_id AND following_id = :target_user_id";
$stmt1 = $db->prepare($query1);
$stmt1->bindParam(":current_user_id", $current_user_id);
$stmt1->bindParam(":target_user_id", $target_user_id);
$stmt1->execute();
$result1 = $stmt1->fetch(PDO::FETCH_ASSOC);
$is_following = $result1['count'] > 0;

// 准备SQL查询，检查目标用户是否关注当前用户
$query2 = "SELECT COUNT(*) as count FROM follows WHERE follower_id = :target_user_id AND following_id = :current_user_id";
$stmt2 = $db->prepare($query2);
$stmt2->bindParam(":target_user_id", $target_user_id);
$stmt2->bindParam(":current_user_id", $current_user_id);
$stmt2->execute();
$result2 = $stmt2->fetch(PDO::FETCH_ASSOC);
$is_followed_by = $result2['count'] > 0;

// 判断是否相互关注
$is_mutual = $is_following && $is_followed_by;

// 返回成功响应
http_response_code(200);
echo json_encode(array(
    "message" => "获取成功", 
    "code" => 200, 
    "data" => array(
        "is_following" => $is_following,
        "is_followed_by" => $is_followed_by,
        "is_mutual" => $is_mutual
    )
), JSON_UNESCAPED_UNICODE);
?>