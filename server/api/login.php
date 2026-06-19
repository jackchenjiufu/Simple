<?php
// 启动session，用于用户认证
session_start();
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的HTTP方法
header("Access-Control-Allow-Methods: POST");
// 预检请求缓存时间（秒）
header("Access-Control-Max-Age: 3600");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';
// 引入日志辅助函数
include_once __DIR__ . '/log_helper.php';
// 引入速率限制
require_once __DIR__ . '/../config/RateLimiter.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

// 速率限制：登录
$rateLimiter = new RateLimiter($db, 5, 5); // 5分钟5次
if ($rateLimiter->isRateLimited('login')) {
    http_response_code(429);
    echo json_encode(array("message" => "登录尝试过于频繁，请5分钟后再试", "code" => 429), JSON_UNESCAPED_UNICODE);
    exit;
}

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
    $query = "SELECT id, username, password, nickname, avatar, background_image, email, created_at FROM users WHERE username = :username LIMIT 0,1";
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
        // 设置session数据
        $_SESSION['user_id'] = $row['id'];
        $_SESSION['username'] = $row['username'];
        $_SESSION['nickname'] = $row['nickname'];
        
        // 获取客户端IP地址
        $ip_address = getClientIp();
        // 记录登录成功日志
        logAction($db, $row['id'], 'login', '登录成功', "用户 {$row['username']} 登录成功", $ip_address);
        
        // 移除密码字段，不返回给前端
        unset($row['password']);
        
        // 生成安全的token（使用更安全的方法）
        $token = bin2hex(random_bytes(32));
        
        // 将token存储到session中
        $_SESSION['token'] = $token;
        
        // 确保created_at字段存在
        if (!isset($row['created_at'])) {
            $row['created_at'] = date('Y-m-d H:i:s');
        }
        
        // 构建返回数据
        $responseData = array(
            'user' => $row,
            'token' => $token
        );
        
        // 返回成功响应
        http_response_code(200);
        echo json_encode(array("message" => "登录成功", "code" => 200, "data" => $responseData), JSON_UNESCAPED_UNICODE);
    } else {
        // 获取客户端IP地址
        // 记录登录失败日志
        $ip_address = getClientIp();
        $username = $data->username ?? '未知用户';
        logAction($db, 0, 'login', '登录失败', "用户 {$username} 登录失败，用户名或密码错误", $ip_address);
        $rateLimiter->recordAttempt('login');
        
        // 密码错误，返回401状态码
        http_response_code(401);
        echo json_encode(array("message" => "用户名或密码错误", "code" => 401), JSON_UNESCAPED_UNICODE);
    }
} else {
    // 获取客户端IP地址
    $ip_address = getClientIp();
    // 记录登录失败日志
    logAction($db, 0, 'login', '登录失败', "登录失败，用户名或密码为空", $ip_address);
    $rateLimiter->recordAttempt('login');
    
    // 用户名或密码为空，返回400状态码
    http_response_code(400);
    echo json_encode(array("message" => "用户名和密码不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
}
?>