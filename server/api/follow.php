<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once __DIR__ . '/../config/Database.php';
include_once __DIR__ . '/log_helper.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// 从session获取当前用户ID（唯一可信来源）
$user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

if (empty($user_id)) {
    http_response_code(401);
    echo json_encode(array("message" => "未登录", "code" => 401), JSON_UNESCAPED_UNICODE);
    exit;
}

switch ($method) {
    case 'GET':
        $action = isset($_GET['action']) ? $_GET['action'] : '';

        if ($action === 'following') {
            $query = "SELECT u.id, u.username, u.nickname, u.avatar
                      FROM follows f
                      LEFT JOIN users u ON f.following_id = u.id
                      WHERE f.follower_id = :user_id
                      ORDER BY f.created_at DESC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result), JSON_UNESCAPED_UNICODE);

        } else if ($action === 'followers') {
            $query = "SELECT u.id, u.username, u.nickname, u.avatar
                      FROM follows f
                      LEFT JOIN users u ON f.follower_id = u.id
                      WHERE f.following_id = :user_id
                      ORDER BY f.created_at DESC";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            http_response_code(200);
            echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result), JSON_UNESCAPED_UNICODE);

    } else if ($action === 'check') {
        $target_id = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
        $query = "SELECT COUNT(*) as count FROM follows WHERE follower_id = :user_id AND following_id = :target_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":target_id", $target_id);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $is_following = $result['count'] > 0;
            http_response_code(200);
            echo json_encode(array("message" => "获取成功", "code" => 200, "data" => array("is_following" => $is_following)), JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'POST':
        $rawData = file_get_contents("php://input");
        $data = json_decode($rawData);

        if (empty($data->user_id)) {
            http_response_code(400);
            echo json_encode(array("message" => "用户ID不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
            exit;
        }

        $query = "SELECT COUNT(*) as count FROM follows WHERE follower_id = :user_id AND following_id = :target_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":target_id", $data->user_id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result['count'] > 0) {
            http_response_code(400);
            echo json_encode(array("message" => "已经关注", "code" => 400), JSON_UNESCAPED_UNICODE);
            exit;
        }

        $query = "INSERT INTO follows (follower_id, following_id) VALUES (:follower_id, :following_id)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":follower_id", $user_id);
        $stmt->bindParam(":following_id", $data->user_id);

        if ($stmt->execute()) {
// followers/following columns removed

            $ip_address = getClientIp();
            logAction($db, $user_id, 'follow', '关注用户', "用户 {$user_id} 关注了用户 {$data->user_id}", $ip_address);

            http_response_code(201);
            echo json_encode(array("message" => "关注成功", "code" => 201), JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "关注失败", "code" => 500), JSON_UNESCAPED_UNICODE);
        }
        break;

    case 'DELETE':
        $target_id = isset($_GET['user_id']) ? $_GET['user_id'] : 0;

        if (empty($target_id)) {
            http_response_code(400);
            echo json_encode(array("message" => "用户ID不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
            exit;
        }

        $query = "DELETE FROM follows WHERE follower_id = :user_id AND following_id = :target_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":target_id", $target_id);

        if ($stmt->execute()) {
// followers/following columns removed

            $ip_address = getClientIp();
            logAction($db, $user_id, 'follow', '取消关注', "用户 {$user_id} 取消关注了用户 {$target_id}", $ip_address);

            http_response_code(200);
            echo json_encode(array("message" => "取消关注成功", "code" => 200), JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "取消关注失败", "code" => 500), JSON_UNESCAPED_UNICODE);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(array("message" => "方法不允许", "code" => 405), JSON_UNESCAPED_UNICODE);
        break;
}
