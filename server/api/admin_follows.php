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
    // GET请求：获取所有关注关系列表
    case 'GET':
        // 获取查询参数
        $follower_id = isset($_GET['follower_id']) ? $_GET['follower_id'] : null;
        $following_id = isset($_GET['following_id']) ? $_GET['following_id'] : null;
        
        // 构建查询条件
        $whereClause = '';
        $params = array();
        
        if ($follower_id) {
            $whereClause = " WHERE f.follower_id = :follower_id";
            $params[":follower_id"] = $follower_id;
        }
        
        if ($following_id) {
            $whereClause .= $whereClause ? " AND f.following_id = :following_id" : " WHERE f.following_id = :following_id";
            $params[":following_id"] = $following_id;
        }
        
        // 准备SQL查询语句，查询所有关注关系，包括关注者和被关注者的详细信息
        $query = "SELECT 
                    f.id, 
                    f.follower_id, 
                    f.following_id, 
                    f.created_at,
                    follower.username as follower_username,
                    follower.nickname as follower_nickname,
                    follower.avatar as follower_avatar,
                    following.username as following_username,
                    following.nickname as following_nickname,
                    following.avatar as following_avatar
                FROM follows f 
                LEFT JOIN users follower ON f.follower_id = follower.id 
                LEFT JOIN users following ON f.following_id = following.id 
                $whereClause
                ORDER BY f.created_at DESC";
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        // 执行查询
        $stmt->execute($params);
        // 获取所有结果
        $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 返回200成功状态码
        http_response_code(200);
        // 返回JSON响应
        echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result));
        break;

    // DELETE请求：删除关注关系
    case 'DELETE':
        // 获取关注关系ID
        $id = isset($_GET['id']) ? $_GET['id'] : 0;
        
        // 验证关注关系ID是否为空
        if (empty($id)) {
            // 返回400错误状态码
            http_response_code(400);
            // 返回JSON响应
            echo json_encode(array("message" => "ID不能为空", "code" => 400));
            exit;
        }
        
        // 先获取关注关系的详细信息，用于更新用户的关注数和粉丝数
        $query = "SELECT follower_id, following_id FROM follows WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $id);
        $stmt->execute();
        $follow_info = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$follow_info) {
            http_response_code(404);
            echo json_encode(array("message" => "关注关系不存在", "code" => 404));
            exit;
        }
        
        // 准备SQL删除语句，删除关注关系
        $query = "DELETE FROM follows WHERE id = :id";
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        // 绑定参数
        $stmt->bindParam(":id", $id);

        // 执行删除操作
        if ($stmt->execute()) {
            // 更新被关注者的粉丝数（-1）
            // followers column removed
            $stmt = $db->prepare($query);
            $stmt->bindParam(":following_id", $follow_info['following_id']);
            $stmt->execute();

            // 更新关注者的关注数（-1）
            // followers column removed
            $stmt = $db->prepare($query);
            $stmt->bindParam(":follower_id", $follow_info['follower_id']);
            $stmt->execute();
            
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