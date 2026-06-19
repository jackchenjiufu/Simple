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
    // GET请求：获取用户列表
    case 'GET':
        // 准备SQL查询语句，查询所有用户信息，按ID降序排列
        $query = "SELECT id, username, nickname, avatar, background_image,  role, created_at FROM users ORDER BY id DESC";
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        // 执行查询
        $stmt->execute();
        // 获取所有结果
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 返回200成功状态码
        http_response_code(200);
        // 返回JSON响应
        echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result));
        break;

    // POST请求：添加用户
    case 'POST':
        // 获取请求的原始数据
        $rawData = file_get_contents("php://input");
        // 解析JSON数据
        $data = json_decode($rawData);

        // 验证必填字段是否为空
        if (
            !empty($data->username) &&
            !empty($data->password)
        ) {
            // 使用password_hash加密密码
            $hashedPassword = password_hash($data->password, PASSWORD_DEFAULT);
            // 准备SQL插入语句，插入用户记录
            $query = "INSERT INTO users SET username=:username, password=:password, nickname=:nickname, role=:role";
            // 预处理SQL语句
            $stmt = $db->prepare($query);

            // 绑定参数
            $stmt->bindParam(":username", $data->username);
            $stmt->bindParam(":password", $hashedPassword);
            $stmt->bindParam(":nickname", $data->nickname);
            $stmt->bindParam(":role", $data->role);

            // 执行插入操作
            if ($stmt->execute()) {
                // 返回201成功状态码
                http_response_code(201);
                // 返回JSON响应
                echo json_encode(array("message" => "创建成功", "code" => 201));
            } else {
                // 插入失败，返回503错误状态码
                http_response_code(503);
                // 返回JSON响应
                echo json_encode(array("message" => "创建失败", "code" => 503));
            }
        } else {
            // 必填字段为空，返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "数据不完整", "code" => 400));
        }
        break;

    // PUT请求：更新用户
    case 'PUT':
        // 获取请求的原始数据
        $rawData = file_get_contents("php://input");
        // 解析JSON数据
        $data = json_decode($rawData);

        // 验证用户ID是否为空
        if (!empty($data->id)) {
            // 构建动态更新字段
            $updateFields = [];
            $params = [];
            
            // 基础字段
            if (isset($data->username)) {
                $updateFields[] = "username=:username";
                $params[":username"] = $data->username;
            }
            if (isset($data->nickname)) {
                $updateFields[] = "nickname=:nickname";
                $params[":nickname"] = $data->nickname;
            }
            if (isset($data->role)) {
                $updateFields[] = "role=:role";
                $params[":role"] = $data->role;
            }
            
            // 新增的头像和背景图片字段
            if (isset($data->avatar)) {
                $updateFields[] = "avatar=:avatar";
                $params[":avatar"] = $data->avatar;
            }
            if (isset($data->background_image)) {
                $updateFields[] = "background_image=:background_image";
                $params[":background_image"] = $data->background_image;
            }
            
            // 如果没有要更新的字段，返回错误
            if (empty($updateFields)) {
                http_response_code(400);
                echo json_encode(array("message" => "没有要更新的字段", "code" => 400));
                exit;
            }
            
            // 准备SQL更新语句，动态生成要更新的字段
            $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id=:id";
            $params[":id"] = $data->id;
            
            // 预处理SQL语句
            $stmt = $db->prepare($query);
            
            // 执行更新操作
            if ($stmt->execute($params)) {
                // 返回200成功状态码
                http_response_code(200);
                // 返回JSON响应
                echo json_encode(array("message" => "更新成功", "code" => 200));
            } else {
                // 更新失败，返回503错误状态码
                http_response_code(503);
                // 返回JSON响应
                echo json_encode(array("message" => "更新失败", "code" => 503));
            }
        } else {
            // 用户ID为空，返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "缺少ID", "code" => 400));
        }
        break;

    // DELETE请求：删除用户
    case 'DELETE':
        // 获取用户ID
        $id = isset($_GET['id']) ? $_GET['id'] : 0;
        
        // 验证用户ID是否为空
        if (empty($id)) {
            // 返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "ID不能为空", "code" => 400));
            exit;
        }

        // 准备SQL删除语句，删除用户记录
        $query = "DELETE FROM users WHERE id = :id";
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