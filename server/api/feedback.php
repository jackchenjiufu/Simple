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

// GET 请求：获取用户的反馈列表
if ($method === 'GET') {
    // 获取用户ID（支持 Session 和 URL 参数）
    $user_id = intval($_GET['user_id'] ?? $_SESSION['user_id'] ?? 0);

    if (empty($user_id)) {
        http_response_code(400);
        echo json_encode(array("message" => "缺少用户ID", "code" => 400));
        exit;
    }

    try {
        // 检测 feedback 表是否有 reply 和 updated_at 列
        // 自适应查询避免因缺少迁移列导致崩溃
        $columns = [];
        $colStmt = $db->prepare("SHOW COLUMNS FROM feedback");
        $colStmt->execute();
        while ($col = $colStmt->fetch(PDO::FETCH_ASSOC)) {
            $columns[] = $col['Field'];
        }

        $selectCols = ['id', 'type', 'content', 'contact', 'status', 'created_at'];
        if (in_array('reply', $columns)) $selectCols[] = 'reply';
        if (in_array('updated_at', $columns)) $selectCols[] = 'updated_at';

        $query = "SELECT " . implode(', ', $selectCols) . "
                  FROM feedback
                  WHERE user_id = :user_id
                  ORDER BY created_at DESC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        $stmt->execute();

        $feedbackList = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 状态文本映射
        $statusMap = [
            0 => '待处理',
            1 => '已查看',
            2 => '已回复'
        ];

        // 格式化输出
        foreach ($feedbackList as &$item) {
            $item['status_text'] = $statusMap[$item['status']] ?? '未知';
            $item['has_reply'] = isset($item['reply']) && !empty($item['reply']);
            if (isset($item['created_at'])) {
                $item['created_at_formatted'] = date('Y-m-d H:i', strtotime($item['created_at']));
            }
            if (isset($item['updated_at']) && $item['updated_at']) {
                $item['updated_at_formatted'] = date('Y-m-d H:i', strtotime($item['updated_at']));
            }
        }

        http_response_code(200);
        echo json_encode(array(
            "message" => "获取成功",
            "code" => 200,
            "data" => $feedbackList,
            "total" => count($feedbackList)
        ), JSON_UNESCAPED_UNICODE);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(array("message" => "服务器错误，请稍后重试", "code" => 500));
    }
    exit;
}

// POST 请求：提交新的反馈
if ($method === 'POST') {
    // 获取POST数据
    $input = json_decode(file_get_contents("php://input"), true);

    $user_id = intval($input['user_id'] ?? $_SESSION['user_id'] ?? 0);
    // If user is logged in via session, enforce the user_id matches
    if (isset($_SESSION['user_id']) && $user_id !== $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(array("message" => "用户ID不匹配", "code" => 403));
        exit;
    }
    $type = isset($input['type']) ? trim($input['type']) : '';
    $content = isset($input['content']) ? trim($input['content']) : '';
    $contact = isset($input['contact']) ? trim($input['contact']) : '';
    $allowedTypes = ['功能建议', '界面反馈', '性能问题', '内容错误', '账号问题', '其他'];
    if (!in_array($type, $allowedTypes)) {
        http_response_code(400);
        echo json_encode(array("message" => "无效的反馈类型", "code" => 400));
        exit;
    }

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
    exit;
}

// 其他方法不允许
http_response_code(405);
echo json_encode(array("message" => "方法不允许", "code" => 405));
exit;
?>
