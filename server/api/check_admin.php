<?php
header("Content-Type: application/json; charset=UTF-8");

include_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $input = json_decode(file_get_contents('php://input'), true);
    $userId = isset($input['user_id']) ? intval($input['user_id']) : 0;

    if ($userId <= 0) {
        echo json_encode([
            "code" => 400,
            "message" => "用户ID不能为空"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $query = "SELECT role FROM users WHERE id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            "code" => 404,
            "message" => "用户不存在"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $isAdmin = isset($user['role']) && $user['role'] === 'admin';

    echo json_encode([
        "code" => 200,
        "message" => "检查成功",
        "data" => [
            "is_admin" => $isAdmin,
            "role" => isset($user['role']) ? $user['role'] : 'user'
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        "code" => 500,
        "message" => "服务器错误",
        "error" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>