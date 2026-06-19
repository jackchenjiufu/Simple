<?php
// 启动session，用于管理员认证
session_start();
require_once __DIR__ . "/cors_headers.php";

// 验证session中是否存在管理员标识（必须登录才能使用管理功能）
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    // 返回401未授权状态码
    http_response_code(401);
    echo json_encode(array("message" => "未授权访问", "code" => 401));
    exit;
}

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

// 获取请求方法（GET、DELETE）
$method = $_SERVER['REQUEST_METHOD'];

// 根据请求方法执行不同操作
switch ($method) {
    // GET请求：获取所有消息列表
    case 'GET':
        // 获取查询参数
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $offset = ($page - 1) * $limit;
        
        // 构建查询条件
        $whereClause = '';
        $params = array();
        
        if ($user_id) {
            $whereClause = " WHERE m.sender_id = :user_id OR m.receiver_id = :user_id";
            $params[":user_id"] = $user_id;
        }
        
        // 准备SQL查询语句，查询所有消息，包括发送者和接收者信息
        $query = "SELECT 
                    m.id, 
                    m.sender_id, 
                    m.receiver_id, 
                    m.content, 
                    m.created_at,
                    sender.username as sender_username, 
                    sender.nickname as sender_nickname, 
                    sender.avatar as sender_avatar,
                    receiver.username as receiver_username, 
                    receiver.nickname as receiver_nickname, 
                    receiver.avatar as receiver_avatar
                FROM messages m 
                LEFT JOIN users sender ON m.sender_id = sender.id 
                LEFT JOIN users receiver ON m.receiver_id = receiver.id 
                $whereClause
                ORDER BY m.created_at DESC
                LIMIT :limit OFFSET :offset";
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        
        // 显式绑定参数类型，确保limit和offset被当作整数处理
        if ($user_id) {
            $stmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        }
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        
        // 执行查询
        $stmt->execute();
        // 获取所有结果
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 获取总数
        $countQuery = "SELECT COUNT(*) as total FROM messages m $whereClause";
        $countStmt = $db->prepare($countQuery);
        
        // 为总数查询绑定参数
        if ($user_id) {
            $countStmt->bindParam(":user_id", $user_id, PDO::PARAM_INT);
        }
        $countStmt->execute();
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // 返回200成功状态码
        http_response_code(200);
        // 返回JSON响应
        echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result, "total" => $total, "page" => $page, "limit" => $limit));
        break;

    // DELETE请求：删除消息
    case 'DELETE':
        // 获取消息ID
        $id = isset($_GET['id']) ? $_GET['id'] : 0;
        
        // 验证消息ID是否为空
        if (empty($id)) {
            // 返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "ID不能为空", "code" => 400));
            exit;
        }

        // 准备SQL删除语句，删除消息记录
        $query = "DELETE FROM messages WHERE id = :id";
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        // 绑定参数
        $stmt->bindParam(":id", $id);

        // 执行删除操作
        if ($stmt->execute()) {
            // 返回200成功状态码
            http_response_code(200);
            // 返回JSON响应
            echo json_encode(array("message" => "删除成功", "code" => 200));
        } else {
            // 删除失败，返回503错误状态码
            http_response_code(503);
            // 返回JSON响应
            echo json_encode(array("message" => "删除失败", "code" => 503));
        }
        break;

    // 其他请求方法：返回405方法不允许
    default:
        http_response_code(405);
        // 返回JSON响应
        echo json_encode(array("message" => "方法不允许", "code" => 405));
        break;
}
?>