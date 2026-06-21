<?php
/**
 * 忘记密码 API
 * 发送邮箱验证码
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../config/RateLimiter.php';
require_once __DIR__ . '/../mail.php';

$database = new Database();
$db = $database->getConnection();

// 速率限制：忘记密码（15分钟3次）
$rateLimiter = new RateLimiter($db, 3, 15);
if ($rateLimiter->isRateLimited('forgot_password')) {
    http_response_code(429);
    echo json_encode(["message" => "请求过于频繁，请15分钟后再试", "code" => 429], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawData = file_get_contents("php://input");
$data = json_decode($rawData);

if (empty($data->email)) {
    $rateLimiter->recordAttempt('forgot_password');
    http_response_code(400);
    echo json_encode(["message" => "请输入邮箱", "code" => 400]);
    exit;
}

$email = trim($data->email);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $rateLimiter->recordAttempt('forgot_password');
    http_response_code(400);
    echo json_encode(["message" => "邮箱格式不正确", "code" => 400]);
    exit;
}

// 检查邮箱是否注册
$query = "SELECT id, username FROM users WHERE email = :email LIMIT 1";
$stmt = $db->prepare($query);
$stmt->bindParam(":email", $email);
$stmt->execute();
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    $rateLimiter->recordAttempt('forgot_password');
    http_response_code(404);
    echo json_encode(["message" => "该邮箱未注册", "code" => 404]);
    exit;
}

// 生成验证码并发送邮件
$code = create_verification((int) $user['id'], $email, 'password_reset');
$sent = send_password_reset_mail($email, $user['username'], $code);

if ($sent) {
    // 邮件发送成功（或 fallback），返回验证码方便开发调试
    $resp = ["message" => "验证码已发送到你的邮箱", "code" => 200];
    if (file_exists(__DIR__ . '/../uploads/last_code.txt')) {
        $devCode = trim(file_get_contents(__DIR__ . '/../uploads/last_code.txt'));
        if ($devCode) {
            $resp['dev_code'] = $devCode;
            $resp['message'] = "开发模式 - 验证码：" . $devCode;
        }
    }
    echo json_encode($resp, JSON_UNESCAPED_UNICODE);
} else {
    $rateLimiter->recordAttempt('forgot_password');
    http_response_code(500);
    echo json_encode(["message" => "邮件发送失败，请稍后重试", "code" => 500], JSON_UNESCAPED_UNICODE);
}
