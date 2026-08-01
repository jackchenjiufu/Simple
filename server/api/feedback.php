<?php
/**
 * 问题反馈 API
 * GET: 获取用户的反馈列表（包含处理结果）
 * POST: 提交新的问题反馈
 */
session_start();
require_once __DIR__ . "/cors_headers.php";

include_once __DIR__ . '/../config/Database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// GET 请求：获取用户的反馈列表（含多轮回复）
if ($method === 'GET') {
    $user_id = intval($_GET['user_id'] ?? $_SESSION['user_id'] ?? 0);

    if (empty($user_id)) {
        http_response_code(400);
        echo json_encode(array("message" => "缺少用户ID", "code" => 400));
        exit;
    }

    try {
        // 分页参数
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? max(1, min(50, (int)$_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;

        // 获取总数
        $countStmt = $db->prepare("SELECT COUNT(*) as total FROM feedback WHERE user_id = :uid");
        $countStmt->bindParam(":uid", $user_id, PDO::PARAM_INT);
        $countStmt->execute();
        $total = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // 获取反馈列表
        $query = "SELECT id, type, content, contact, status, created_at, updated_at
                  FROM feedback
                  WHERE user_id = :user_id
                  ORDER BY created_at DESC
                  LIMIT :lim OFFSET :off";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        $stmt->bindParam(":lim", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":off", $offset, PDO::PARAM_INT);
        $stmt->execute();
        $feedbackList = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 获取所有回复（一次查完减少查询）
        $ids = array_column($feedbackList, 'id');
        $repliesMap = [];
        if (!empty($ids)) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $replyStmt = $db->prepare("SELECT * FROM feedback_replies WHERE feedback_id IN ($placeholders) ORDER BY created_at ASC");
            $replyStmt->execute($ids);
            $allReplies = $replyStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($allReplies as $r) {
                $repliesMap[$r['feedback_id']][] = $r;
            }
        }

        $statusMap = [0 => '待处理', 1 => '已查看', 2 => '已回复', 3 => '已完结'];

        foreach ($feedbackList as &$item) {
            $item['status_text'] = $statusMap[$item['status']] ?? '未知';
            $item['replies'] = $repliesMap[$item['id']] ?? [];
            $item['reply_count'] = count($item['replies']);
            $item['has_reply'] = $item['reply_count'] > 0;
            if ($item['created_at']) {
                $item['created_at_formatted'] = date('Y-m-d H:i', strtotime($item['created_at']));
            }
        }

        http_response_code(200);
        echo json_encode(array(
            "message" => "获取成功",
            "code" => 200,
            "data" => $feedbackList,
            "total" => $total,
            "page" => $page,
            "limit" => $limit
        ), JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array("message" => "服务器错误", "code" => 500));
    }
    exit;
}

// POST 请求：提交新反馈 或 继续追问
if ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    $user_id = intval($input['user_id'] ?? $_SESSION['user_id'] ?? 0);
    if (isset($_SESSION['user_id']) && $user_id !== $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(array("message" => "用户ID不匹配", "code" => 403));
        exit;
    }

    $action = $input['action'] ?? 'new';

    // === 继续追问 ===
    if ($action === 'reply') {
        $feedback_id = intval($input['feedback_id'] ?? 0);
        $content = isset($input['content']) ? trim($input['content']) : '';

        if (empty($feedback_id) || empty($content)) {
            http_response_code(400);
            echo json_encode(array("message" => "参数不完整", "code" => 400));
            exit;
        }

        if (mb_strlen($content) > 500) {
            http_response_code(400);
            echo json_encode(array("message" => "内容不能超过500字", "code" => 400));
            exit;
        }

        // 验证反馈属于该用户且未完结
        $check = $db->prepare("SELECT id, status FROM feedback WHERE id = :id AND user_id = :uid");
        $check->bindParam(":id", $feedback_id, PDO::PARAM_INT);
        $check->bindParam(":uid", $user_id, PDO::PARAM_INT);
        $check->execute();
        $feedbackRow = $check->fetch(PDO::FETCH_ASSOC);
        if (!$feedbackRow) {
            http_response_code(403);
            echo json_encode(array("message" => "无权操作", "code" => 403));
            exit;
        }
        if ((int)$feedbackRow['status'] === 3) {
            http_response_code(400);
            echo json_encode(array("message" => "该反馈已完结，无法继续追问", "code" => 400));
            exit;
        }

        try {
            $stmt = $db->prepare("INSERT INTO feedback_replies (feedback_id, user_id, role, content) VALUES (:fid, :uid, 'user', :content)");
            $stmt->bindParam(":fid", $feedback_id, PDO::PARAM_INT);
            $stmt->bindParam(":uid", $user_id, PDO::PARAM_INT);
            $stmt->bindParam(":content", $content);

            if ($stmt->execute()) {
                // 重置状态为待处理（管理员需要重新查看）
                $db->prepare("UPDATE feedback SET status = 0 WHERE id = :id")->execute([':id' => $feedback_id]);
                http_response_code(200);
                echo json_encode(array("message" => "追问已提交", "code" => 200));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "提交失败", "code" => 500));
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("message" => "服务器错误", "code" => 500));
        }
        exit;
    }

    // === 用户完结反馈 ===
    if ($action === 'close') {
        $feedback_id = intval($input['feedback_id'] ?? 0);

        if (empty($feedback_id)) {
            http_response_code(400);
            echo json_encode(array("message" => "参数不完整", "code" => 400));
            exit;
        }

        // 验证反馈属于该用户且未完结
        $check = $db->prepare("SELECT id, status FROM feedback WHERE id = :id AND user_id = :uid");
        $check->bindParam(":id", $feedback_id, PDO::PARAM_INT);
        $check->bindParam(":uid", $user_id, PDO::PARAM_INT);
        $check->execute();
        $feedbackRow = $check->fetch(PDO::FETCH_ASSOC);
        if (!$feedbackRow) {
            http_response_code(403);
            echo json_encode(array("message" => "无权操作", "code" => 403));
            exit;
        }
        if ((int)$feedbackRow['status'] === 3) {
            http_response_code(400);
            echo json_encode(array("message" => "该反馈已完结", "code" => 400));
            exit;
        }

        try {
            $stmt = $db->prepare("UPDATE feedback SET status = 3, updated_at = NOW() WHERE id = :id");
            $stmt->execute([':id' => $feedback_id]);
            http_response_code(200);
            echo json_encode(array("message" => "反馈已完结", "code" => 200));
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(array("message" => "服务器错误", "code" => 500));
        }
        exit;
    }

    // === 提交新反馈 ===
    $type = isset($input['type']) ? trim($input['type']) : '';
    $content = isset($input['content']) ? trim($input['content']) : '';
    $contact = isset($input['contact']) ? trim($input['contact']) : '';
    $allowedTypes = ['功能建议', '界面反馈', '性能问题', '内容错误', '账号问题', '其他'];
    if (!in_array($type, $allowedTypes)) {
        http_response_code(400);
        echo json_encode(array("message" => "无效的反馈类型", "code" => 400));
        exit;
    }

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
            $newId = $db->lastInsertId();
            http_response_code(200);
            echo json_encode(array("message" => "反馈提交成功", "code" => 200, "id" => intval($newId)));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "提交失败", "code" => 500));
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array("message" => "服务器错误", "code" => 500));
    }
    exit;
}

// 其他方法不允许
http_response_code(405);
echo json_encode(array("message" => "方法不允许", "code" => 405));
exit;
?>
