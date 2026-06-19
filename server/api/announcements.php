<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");

try {
    include_once __DIR__ . '/../config/Database.php';
    $database = new Database();
    $db = $database->getConnection();
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
    } else {
        $input = $_GET;
    }
    
    if ($method === 'POST') {
        $action = isset($input['action']) ? $input['action'] : '';
        
        if ($action === 'get_announcements') {
            $query = "SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC";
            $stmt = $db->prepare($query);
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode(array(
                "message" => "获取成功",
                "code" => 200,
                "data" => $result
            ), JSON_UNESCAPED_UNICODE);
        } elseif ($action === 'create_announcement') {
            if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
                http_response_code(401);
                echo json_encode(array("message" => "未授权访问", "code" => 401));
                exit;
            }
            $title = isset($input['title']) ? trim($input['title']) : '';
            $content = isset($input['content']) ? trim($input['content']) : '';
            
            if (empty($title) || empty($content)) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "标题和内容不能为空",
                    "code" => 400
                ), JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $query = "INSERT INTO announcements (title, content, created_at) VALUES (?, ?, NOW())";
            $stmt = $db->prepare($query);
            $stmt->execute([$title, $content]);
            
            http_response_code(201);
            echo json_encode(array(
                "message" => "创建成功",
                "code" => 201
            ), JSON_UNESCAPED_UNICODE);
        } elseif ($action === 'delete_announcement') {
            if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
                http_response_code(401);
                echo json_encode(array("message" => "未授权访问", "code" => 401));
                exit;
            }
            $id = isset($input['id']) ? intval($input['id']) : 0;
            
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(array(
                    "message" => "ID不能为空",
                    "code" => 400
                ), JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            $query = "DELETE FROM announcements WHERE id = ?";
            $stmt = $db->prepare($query);
            $stmt->execute([$id]);
            
            http_response_code(200);
            echo json_encode(array(
                "message" => "删除成功",
                "code" => 200
            ), JSON_UNESCAPED_UNICODE);
        } else {
            http_response_code(400);
            echo json_encode(array(
                "message" => "无效的操作",
                "code" => 400
            ), JSON_UNESCAPED_UNICODE);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "message" => "操作失败",
        "code" => 500,
        "error" => $e->getMessage()
    ), JSON_UNESCAPED_UNICODE);
}
?>
