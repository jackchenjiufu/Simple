<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");


if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(array(
        "message" => "API运行正常",
        "code" => 200,
        "server_info" => array(
            "php_version" => phpversion(),
            "request_method" => $_SERVER['REQUEST_METHOD'],
            "content_type" => $_SERVER['CONTENT_TYPE'] ?? 'not set'
        )
    ));
    exit;
}

include_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../config/RateLimiter.php';

$database = new Database();
$db = $database->getConnection();

// 速率限制：注册（10分钟3次）
$rateLimiter = new RateLimiter($db, 3, 10);
if ($rateLimiter->isRateLimited('register')) {
    http_response_code(429);
    echo json_encode(array("message" => "注册尝试过于频繁，请10分钟后再试", "code" => 429), JSON_UNESCAPED_UNICODE);
    exit;
}

$rawData = file_get_contents("php://input");
$data = json_decode($rawData);

if (!empty($data->username) && !empty($data->password)) {
    // 检查邮箱格式（如提供）
    if (!empty($data->email) && !filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
        $rateLimiter->recordAttempt('register');
        http_response_code(400);
        echo json_encode(array("message" => "邮箱格式不正确", "code" => 400));
        exit;
    }

    $query = "SELECT id FROM users WHERE username = :username LIMIT 0,1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        http_response_code(400);
        echo json_encode(array("message" => "用户名已存在", "code" => 400));
        $rateLimiter->recordAttempt('register');
    } else {
        $email = !empty($data->email) ? $data->email : '';
        $query = "INSERT INTO users SET username=:username, password=:password, nickname=:nickname, email=:email, created_at=NOW()";
        $stmt = $db->prepare($query);

        $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);

        $stmt->bindParam(":username", $data->username);
        $stmt->bindParam(":nickname", $data->username);
        $stmt->bindParam(":password", $hashed_password);
        $stmt->bindParam(":email", $email);

        if ($stmt->execute()) {
            http_response_code(201);
            echo json_encode(array("message" => "注册成功", "code" => 201, "data" => array("username" => $data->username)));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "注册失败", "code" => 503));
            $rateLimiter->recordAttempt('register');
        }
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "用户名和密码不能为空", "code" => 400));
    $rateLimiter->recordAttempt('register');
}
