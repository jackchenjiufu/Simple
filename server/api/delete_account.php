<?php
/**
 * 注销账号API
 * 处理用户账号注销，删除用户相关的所有数据
 * 必须登录后才能操作
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

// 从session获取当前登录用户ID
$userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

if (empty($userId)) {
    echo json_encode([
        'code' => 401,
        'message' => '请先登录'
    ]);
    exit;
}

require_once __DIR__ . '/../config/Database.php';

$database = new Database();
$pdo = $database->getConnection();

try {
    $pdo->beginTransaction();

    // 删除用户相关的所有数据
    $stmt = $pdo->prepare("DELETE FROM collections WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("DELETE FROM follows WHERE follower_id = ? OR following_id = ?");
    $stmt->execute([$userId, $userId]);

    $stmt = $pdo->prepare("DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?");
    $stmt->execute([$userId, $userId]);

    $stmt = $pdo->prepare("DELETE FROM user_behavior WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("DELETE FROM contents WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("DELETE FROM recommendations WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("DELETE FROM feedback WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("DELETE FROM admin_logs WHERE user_id = ?");
    $stmt->execute([$userId]);

    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);

    $pdo->commit();

    // 清除session
    session_destroy();

    echo json_encode([
        'code' => 200,
        'message' => '账号注销成功'
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    echo json_encode([
        'code' => 500,
        'message' => '注销失败，请稍后重试'
    ]);
}
