<?php
/**
 * 问题反馈 API
 * GET: 获取用户的反馈列表（包含处理结果）
 * POST: 提交新的问题反馈
 */
session_start();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 预检请求直接返回
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once __DIR__ . '/../config/Database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

// GET 请求：获取用户的反馈列表
if ($method === 'GET') {
    // 获取用户ID（支持 Session 和 URL 参数）
    $user_id = intval($input['user_id'] ?? $_SESSION['user_id'] ?? 0);

    if (empty($user_id)) {
        http_response_code(400);
        echo json_encode(array("message" => "缺少用户ID", "code" => 400));
        exit;
    }

    try {
        // 查询用户的反馈列表，包含回复内容
        $query = "SELECT id, type, content, contact, status, reply, created_at, updated_at
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
            $item['has_reply'] = !empty($item['reply']);
            // 格式化时间
            $item['created_at_formatted'] = date('Y-m-d H:i', strtotime($item['created_at']));
            if ($item['updated_at']) {
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
        echo json_encode(array("message" => "服务器错误：" . $e->getMessage(), "code" => 500));
    }
    exit;
}

// POST 请求：提交新的反馈
if ($method === 'POST') {
    // 获取POST数据
    $input = json_decode(file_get_contents("php://input"), true);

    $user_id = intval($input['user_id'] ?? $_SESSION['user_id'] ?? 0);
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
    exit;
}

// 其他方法不允许
http_response_code(405);
echo json_encode(array("message" => "方法不允许", "code" => 405));
exit;
?>
