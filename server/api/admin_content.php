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

// 获取请求方法（GET、POST、PUT、DELETE）
$method = $_SERVER['REQUEST_METHOD'];

// 根据请求方法执行不同操作
switch ($method) {
    // GET请求：获取所有内容列表
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
            $whereClause = " WHERE c.user_id = :user_id";
            $params[":user_id"] = $user_id;
        }
        
        // 准备SQL查询语句，查询所有内容，包括发布者信息
        $query = "SELECT 
                    c.id, 
                    c.user_id, 
                    c.title, 
                    c.content, 
                    c.image_url, 
                    c.likes, 
                    c.comments, 
                    c.created_at,
                    u.username, 
                    u.nickname, 
                    u.avatar
                FROM content c 
                LEFT JOIN users u ON c.user_id = u.id 
                $whereClause
                ORDER BY c.created_at DESC
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
        $countQuery = "SELECT COUNT(*) as total FROM content c $whereClause";
        $countStmt = $db->prepare($countQuery);
        
        // 为总数查询绑定参数
        $countParams = array();
        if ($user_id) {
            $countParams[":user_id"] = $user_id;
        }
        $countStmt->execute($countParams);
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        // 返回200成功状态码
        http_response_code(200);
        // 返回JSON响应
        echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result, "total" => $total, "page" => $page, "limit" => $limit));
        break;

    // DELETE请求：删除内容
    case 'DELETE':
        // 获取内容ID
        $id = isset($_GET['id']) ? $_GET['id'] : 0;
        
        // 验证内容ID是否为空
        if (empty($id)) {
            // 返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "ID不能为空", "code" => 400));
            exit;
        }

        // 准备SQL删除语句，删除内容记录
        $query = "DELETE FROM content WHERE id = :id";
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

    // POST请求：处理图片上传
    case 'POST':
        // 获取action参数
        $action = isset($_GET['action']) ? $_GET['action'] : '';
        
        // 处理图片上传
        if ($action === 'upload_image') {
            // 检查是否有文件上传
            if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
                http_response_code(400);
                echo json_encode(array("message" => "图片上传失败", "code" => 400));
                exit;
            }
            
            // 获取内容ID
            $content_id = isset($_POST['content_id']) ? $_POST['content_id'] : null;
            
            // 处理文件上传
            $uploadDir = __DIR__ . '/../uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            
            $fileName = uniqid() . '_' . basename($_FILES['image']['name']);
            $filePath = $uploadDir . $fileName;
            
            if (move_uploaded_file($_FILES['image']['tmp_name'], $filePath)) {
                // 生成图片URL
                $imageUrl = 'http://139.196.185.197:7070/doo/server/uploads/' . $fileName;
                
                http_response_code(200);
                echo json_encode(array(
                    "message" => "图片上传成功", 
                    "code" => 200, 
                    "data" => array("image_url" => $imageUrl)
                ));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "图片保存失败", "code" => 500));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("message" => "无效的操作", "code" => 400));
        }
        break;
        
    // PUT请求：更新内容
    case 'PUT':
        // 获取请求体数据
        $input = json_decode(file_get_contents('php://input'), true);
        
        // 验证必要参数
        if (!isset($input['id']) || !isset($input['title'])) {
            http_response_code(400);
            echo json_encode(array("message" => "缺少必要参数", "code" => 400));
            exit;
        }
        
        $id = $input['id'];
        $title = $input['title'];
        $content = isset($input['content']) ? $input['content'] : '';
        $image_url = isset($input['image_url']) ? $input['image_url'] : null;
        
        // 准备SQL更新语句
        $query = "UPDATE content SET title = :title, content = :content";
        $params = array(
            ":title" => $title,
            ":content" => $content
        );
        
        // 如果提供了图片URL，添加到更新语句
        if ($image_url) {
            $query .= ", image_url = :image_url";
            $params[":image_url"] = $image_url;
        }
        
        $query .= " WHERE id = :id";
        $params[":id"] = $id;
        
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        
        // 执行更新操作
        if ($stmt->execute($params)) {
            http_response_code(200);
            echo json_encode(array("message" => "更新成功", "code" => 200));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "更新失败", "code" => 503));
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