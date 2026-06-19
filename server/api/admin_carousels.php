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
    // GET请求：获取轮播图列表
    case 'GET':
        // 准备SQL查询语句，查询所有轮播图，按排序字段升序排列
        $query = "SELECT id, title, author, image_url, sort_order, is_active, created_at FROM carousels ORDER BY sort_order ASC";
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

    // POST请求：添加轮播图
    case 'POST':
        // 获取请求的原始数据
        $rawData = file_get_contents("php://input");
        // 解析JSON数据
        $data = json_decode($rawData);

        // 验证必填字段是否为空
        if (
            !empty($data->title) &&
            !empty($data->image_url)
        ) {
            // 准备SQL插入语句，插入轮播图记录
            $query = "INSERT INTO carousels SET title=:title, author=:author, image_url=:image_url, sort_order=:sort_order, is_active=:is_active";
            // 预处理SQL语句
            $stmt = $db->prepare($query);

            // 绑定参数
            $stmt->bindParam(":title", $data->title);
            $stmt->bindParam(":author", $data->author);
            $stmt->bindParam(":image_url", $data->image_url);
            $stmt->bindParam(":sort_order", $data->sort_order);
            $stmt->bindParam(":is_active", $data->is_active);

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

    // PUT请求：更新轮播图
    case 'PUT':
        // 获取请求的原始数据
        $rawData = file_get_contents("php://input");
        // 解析JSON数据
        $data = json_decode($rawData);

        // 验证轮播图ID是否为空
        if (!empty($data->id)) {
            // 准备SQL更新语句，更新轮播图信息
            $query = "UPDATE carousels SET title=:title, author=:author, image_url=:image_url, sort_order=:sort_order, is_active=:is_active WHERE id=:id";
            // 预处理SQL语句
            $stmt = $db->prepare($query);

            // 绑定参数
            $stmt->bindParam(":title", $data->title);
            $stmt->bindParam(":author", $data->author);
            $stmt->bindParam(":image_url", $data->image_url);
            $stmt->bindParam(":sort_order", $data->sort_order);
            $stmt->bindParam(":is_active", $data->is_active);
            $stmt->bindParam(":id", $data->id);

            // 执行更新操作
            if ($stmt->execute()) {
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
            // 轮播图ID为空，返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "缺少ID", "code" => 400));
        }
        break;

    // DELETE请求：删除轮播图
    case 'DELETE':
        // 获取轮播图ID
        $id = isset($_GET['id']) ? $_GET['id'] : 0;
        
        // 验证轮播图ID是否为空
        if (empty($id)) {
            // 返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "ID不能为空", "code" => 400));
            exit;
        }

        // 准备SQL删除语句，删除轮播图记录
        $query = "DELETE FROM carousels WHERE id = :id";
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
        echo json_encode(array("message" => "方法不允许", "code" => 405));
        break;
}
?>