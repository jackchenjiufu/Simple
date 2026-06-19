<?php
// 启动session，用于管理员认证
session_start();
require_once __DIR__ . "/cors_headers.php";

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

// 获取请求的原始数据
$rawData = file_get_contents("php://input");
// 解析JSON数据
$data = json_decode($rawData);

// 验证用户名和密码是否为空
if (
    !empty($data->username) &&
    !empty($data->password)
) {
    // 准备SQL查询语句，根据用户名查询用户信息
    $query = "SELECT id, username, password, nickname, avatar, background_image,  role FROM users WHERE username = :username LIMIT 0,1";
    // 预处理SQL语句，防止SQL注入
    $stmt = $db->prepare($query);
    // 绑定参数
    $stmt->bindParam(":username", $data->username);
    // 执行查询
    $stmt->execute();
    // 获取查询结果
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    // 验证密码是否正确
    if ($row && password_verify($data->password, $row['password'])) {
        // 验证用户角色是否为管理员
        if ($row['role'] !== 'admin') {
            // 返回403权限不足状态码
            http_response_code(403);
            echo json_encode(array("message" => "权限不足，仅管理员可登录", "code" => 403));
            exit;
        }

        // 设置管理员session数据
        $_SESSION['admin_id'] = $row['id'];
        $_SESSION['admin_username'] = $row['username'];
        $_SESSION['is_admin'] = true;

        // 移除密码字段，不返回给前端
        unset($row['password']);
        // 返回成功响应
        http_response_code(200);
        echo json_encode(array("message" => "登录成功", "code" => 200, "data" => $row));
    } else {
        // 密码错误，返回401状态码
        http_response_code(401);
        echo json_encode(array("message" => "用户名或密码错误", "code" => 401));
    }
} else {
    // 用户名或密码为空，返回400状态码
    http_response_code(400);
    echo json_encode(array("message" => "用户名和密码不能为空", "code" => 400));
}
?>