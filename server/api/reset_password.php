<?php
/**
 * 重置密码 API
 * 使用邮箱验证码重置密码
 */
header("Content-Type: application/json; charset=UTF-8");
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

// 速率限制：重置密码（15分钟3次）
$rateLimiter = new RateLimiter($db, 3, 15);
if ($rateLimiter->isRateLimited('reset_password')) {
    http_response_code(429);
    echo json_encode(["message" => "请求过于频繁，请15分钟后再试", "code" => 429], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawData = file_get_contents("php://input");
$data = json_decode($rawData);

if (empty($data->email) || empty($data->code) || empty($data->new_password)) {
    $rateLimiter->recordAttempt('reset_password');
    http_response_code(400);
    echo json_encode(["message" => "参数不完整", "code" => 400]);
    exit;
}

$email = trim($data->email);
$code = trim($data->code);
$newPassword = $data->new_password;

if (strlen($newPassword) < 6) {
    $rateLimiter->recordAttempt('reset_password');
    http_response_code(400);
    echo json_encode(["message" => "密码长度至少6位", "code" => 400], JSON_UNESCAPED_UNICODE);
    exit;
}

// 验证验证码
$userId = verify_code($email, $code, 'password_reset');

if (!$userId) {
    $rateLimiter->recordAttempt('reset_password');
    http_response_code(400);
    echo json_encode(["message" => "验证码错误或已过期", "code" => 400]);
    exit;
}

// 更新密码
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
$stmt = $db->prepare("UPDATE users SET password = :password WHERE id = :id");
$stmt->bindParam(":password", $hashedPassword);
$stmt->bindParam(":id", $userId, PDO::PARAM_INT);
$stmt->execute();

echo json_encode(["message" => "密码重置成功", "code" => 200], JSON_UNESCAPED_UNICODE);
