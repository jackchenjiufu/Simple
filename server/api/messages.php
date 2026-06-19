<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

include_once __DIR__ . '/../config/Database.php';

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

        if ($action == 'get_messages') {
            $query = "SELECT
                        m.id,
                        CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
                        CASE WHEN m.sender_id = ? THEN r.nickname ELSE s.nickname END as sender,
                        CASE WHEN m.sender_id = ? THEN r.avatar ELSE s.avatar END as avatar,
                        m.content, m.created_at,
                        COUNT(CASE WHEN m2.receiver_id = ? THEN 1 END) as unread
                    FROM messages m
                    INNER JOIN (
                        SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user,
                               MAX(created_at) as last_message_time
                        FROM messages
                        WHERE receiver_id = ? OR sender_id = ?
                        GROUP BY other_user
                    ) latest ON latest.other_user = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
                        AND latest.last_message_time = m.created_at
                    LEFT JOIN users s ON m.sender_id = s.id
                    LEFT JOIN users r ON m.receiver_id = r.id
                    LEFT JOIN messages m2 ON
                        (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) =
                        (CASE WHEN m2.sender_id = ? THEN m2.receiver_id ELSE m2.sender_id END)
                    WHERE m.receiver_id = ? OR m.sender_id = ?
                    GROUP BY other_user_id, m.id, m.content, m.created_at, s.nickname, r.nickname, s.avatar, r.avatar
                    ORDER BY m.created_at DESC LIMIT 50";
            $stmt = $db->prepare($query);
            $paramCount = substr_count($query, '?');
            for ($i = 1; $i <= $paramCount; $i++) {
                $stmt->bindValue($i, $user_id);
            }
            if ($stmt->execute()) {
                $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
                http_response_code(200);
                echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result), JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "查询失败", "code" => 500), JSON_UNESCAPED_UNICODE);
            }
        } else {
            $query = "SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at,
                             s.username as sender_name, s.nickname as sender_nickname, s.avatar as sender_avatar,
                             r.username as receiver_name, r.nickname as receiver_nickname, r.avatar as receiver_avatar
                      FROM messages m
                      LEFT JOIN users s ON m.sender_id = s.id
                      LEFT JOIN users r ON m.receiver_id = r.id
                      WHERE m.receiver_id = :user_id OR m.sender_id = :user_id
                      ORDER BY m.created_at DESC LIMIT 50";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            if ($stmt->execute()) {
                $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
                http_response_code(200);
                echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result), JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "查询失败", "code" => 500), JSON_UNESCAPED_UNICODE);
            }
        }
        break;

    case 'POST':
        $rawData = file_get_contents("php://input");
        $data = json_decode($rawData);

        if (isset($data->action)) {
            switch ($data->action) {
                case 'get_messages':
                    $query = "SELECT
                                m.id,
                                CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
                                CASE WHEN m.sender_id = ? THEN r.nickname ELSE s.nickname END as sender,
                                CASE WHEN m.sender_id = ? THEN r.avatar ELSE s.avatar END as avatar,
                                m.content, m.created_at,
                                COUNT(CASE WHEN m2.receiver_id = ? THEN 1 END) as unread
                            FROM messages m
                            INNER JOIN (
                                SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user,
                                       MAX(created_at) as last_message_time
                                FROM messages WHERE receiver_id = ? OR sender_id = ?
                                GROUP BY other_user
                            ) latest ON latest.other_user = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
                                AND latest.last_message_time = m.created_at
                            LEFT JOIN users s ON m.sender_id = s.id
                            LEFT JOIN users r ON m.receiver_id = r.id
                            LEFT JOIN messages m2 ON
                                (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) =
                                (CASE WHEN m2.sender_id = ? THEN m2.receiver_id ELSE m2.sender_id END)
                            WHERE m.receiver_id = ? OR m.sender_id = ?
                            GROUP BY other_user_id, m.id, m.content, m.created_at, s.nickname, r.nickname, s.avatar, r.avatar
                            ORDER BY m.created_at DESC LIMIT 50";
                    $stmt = $db->prepare($query);
                    $paramCount = substr_count($query, '?');
                    for ($i = 1; $i <= $paramCount; $i++) {
                        $stmt->bindValue($i, $user_id);
                    }
                    $stmt->execute();
                    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    http_response_code(200);
                    echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result), JSON_UNESCAPED_UNICODE);
                    break;

                case 'send_message':
                    if (empty($data->receiver_id) || empty($data->content)) {
                        http_response_code(400);
                        echo json_encode(array("message" => "接收者ID和内容不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
                        exit;
                    }
                    $query = "INSERT INTO messages (sender_id, receiver_id, content) VALUES (:sender_id, :receiver_id, :content)";
                    $stmt = $db->prepare($query);
                    $stmt->bindParam(":sender_id", $user_id);
                    $stmt->bindParam(":receiver_id", $data->receiver_id);
                    $stmt->bindParam(":content", $data->content);
                    if ($stmt->execute()) {
                        http_response_code(201);
                        echo json_encode(array("message" => "发送成功", "code" => 201), JSON_UNESCAPED_UNICODE);
                    } else {
                        http_response_code(500);
                        echo json_encode(array("message" => "发送失败", "code" => 500), JSON_UNESCAPED_UNICODE);
                    }
                    break;

                default:
                    http_response_code(400);
                    echo json_encode(array("message" => "未知操作", "code" => 400), JSON_UNESCAPED_UNICODE);
                    break;
            }
        } else {
            if (empty($data->receiver_id) || empty($data->content)) {
                http_response_code(400);
                echo json_encode(array("message" => "接收者ID和内容不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
                exit;
            }
            $query = "INSERT INTO messages (sender_id, receiver_id, content) VALUES (:sender_id, :receiver_id, :content)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":sender_id", $user_id);
            $stmt->bindParam(":receiver_id", $data->receiver_id);
            $stmt->bindParam(":content", $data->content);
            if ($stmt->execute()) {
                http_response_code(201);
                echo json_encode(array("message" => "发送成功", "code" => 201), JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "发送失败", "code" => 500), JSON_UNESCAPED_UNICODE);
            }
        }
        break;

    case 'PUT':
        http_response_code(501);
        echo json_encode(array("message" => "标记消息已读功能暂不支持", "code" => 501), JSON_UNESCAPED_UNICODE);
        break;

    case 'DELETE':
        $message_id = isset($_GET['id']) ? $_GET['id'] : 0;
        if (empty($message_id)) {
            http_response_code(400);
            echo json_encode(array("message" => "消息ID不能为空", "code" => 400), JSON_UNESCAPED_UNICODE);
            exit;
        }
        $query = "DELETE FROM messages WHERE id = :id AND (sender_id = :user_id OR receiver_id = :user_id)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $message_id);
        $stmt->bindParam(":user_id", $user_id);
        if ($stmt->execute()) {
            if ($stmt->rowCount() > 0) {
                http_response_code(200);
                echo json_encode(array("message" => "删除成功", "code" => 200), JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode(array("message" => "消息不存在或无权限删除", "code" => 404), JSON_UNESCAPED_UNICODE);
            }
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "删除失败", "code" => 500), JSON_UNESCAPED_UNICODE);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(array("message" => "方法不允许", "code" => 405), JSON_UNESCAPED_UNICODE);
        break;
}
