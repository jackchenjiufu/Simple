<?php
session_start();
require_once __DIR__ . "/cors_headers.php";

if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    http_response_code(401);
    echo json_encode(array("message" => "未授权访问", "code" => 401));
    exit;
}

include_once __DIR__ . '/../config/Database.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $offset = ($page - 1) * $limit;
        $status = isset($_GET['status']) ? $_GET['status'] : '';

        $whereClause = '';
        $params = array();

        if ($status !== '') {
            $whereClause = " WHERE f.status = :status";
            $params[":status"] = intval($status);
        }

        $query = "SELECT
                    f.id,
                    f.user_id,
                    f.type,
                    f.content,
                    f.contact,
                    f.status,
                    f.created_at,
                    u.username,
                    u.nickname,
                    u.avatar
                FROM feedback f
                LEFT JOIN users u ON f.user_id = u.id
                $whereClause
                ORDER BY f.created_at DESC
                LIMIT :limit OFFSET :offset";
        $stmt = $db->prepare($query);

        if ($status !== '') {
            $stmt->bindParam(":status", $params[":status"], PDO::PARAM_INT);
        }
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);

        $stmt->execute();
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countQuery = "SELECT COUNT(*) as total FROM feedback f $whereClause";
        $countStmt = $db->prepare($countQuery);
        if ($status !== '') {
            $countStmt->bindParam(":status", $params[":status"], PDO::PARAM_INT);
        }
        $countStmt->execute();
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        http_response_code(200);
        echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result, "total" => $total, "page" => $page, "limit" => $limit));
        break;

    case 'PUT':
        $input = json_decode(file_get_contents("php://input"), true);
        $id = isset($input['id']) ? intval($input['id']) : 0;
        $status = isset($input['status']) ? intval($input['status']) : -1;

        if (empty($id) || $status < 0 || $status > 2) {
            http_response_code(400);
            echo json_encode(array("message" => "参数错误", "code" => 400));
            exit;
        }

        $statusMap = ['未读', '已读', '已处理'];
        $query = "UPDATE feedback SET status = :status WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":status", $status, PDO::PARAM_INT);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "已标记为「" . $statusMap[$status] . "」", "code" => 200));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "更新失败", "code" => 503));
        }
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? $_GET['id'] : 0;

        if (empty($id)) {
            http_response_code(400);
            echo json_encode(array("message" => "ID不能为空", "code" => 400));
            exit;
        }

        $query = "DELETE FROM feedback WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $id);

        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "删除成功", "code" => 200));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "删除失败", "code" => 503));
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(array("message" => "方法不允许", "code" => 405));
        break;
}
?>
