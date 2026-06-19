<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 预检请求直接返回
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 只接受POST请求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("message" => "方法不允许", "code" => 405));
    exit;
}

include_once __DIR__ . '/../config/Database.php';

$database = new Database();
$db = $database->getConnection();

// 获取POST数据
$input = json_decode(file_get_contents("php://input"), true);

$user_id = isset($input['user_id']) ? intval($input['user_id']) : 0;
$type = isset($input['type']) ? trim($input['type']) : '';
$content = isset($input['content']) ? trim($input['content']) : '';
$contact = isset($input['contact']) ? trim($input['contact']) : '';

// 验证必填字段
if (empty($user_id) || empty($type) || empty($content)) {
    http_response_code(400);
    echo json_encode(array("message" => "请填写完整的反馈信息", "code" => 400));
    exit;
}

if (mb_strlen($content) > 500) {
    http_response_code(400);
    echo json_encode(array("message" => "反馈内容不能超过500字", "code" => 400));
    exit;
}

try {
    $query = "INSERT INTO feedback (user_id, type, content, contact, status, created_at)
              VALUES (:user_id, :type, :content, :contact, 0, NOW())";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
    $stmt->bindParam(":type", $type);
    $stmt->bindParam(":content", $content);
    $stmt->bindParam(":contact", $contact);

    if ($stmt->execute()) {
        http_response_code(200);
        echo json_encode(array("message" => "反馈提交成功，感谢您的支持！", "code" => 200));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "提交失败，请稍后重试", "code" => 500));
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("message" => "服务器错误，请稍后重试", "code" => 500));
}
?>
