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

// 获取请求方法（GET）
$method = $_SERVER['REQUEST_METHOD'];

// 根据请求方法执行不同操作
switch ($method) {
    // GET请求：获取统计数据
    case 'GET':
        // 获取查询参数
        $type = isset($_GET['type']) ? $_GET['type'] : 'overview';
        
        $result = array();
        
        if ($type === 'overview') {
            // 获取用户总数
            try {
                $userQuery = "SELECT COUNT(*) as total_users FROM users";
                $userStmt = $db->prepare($userQuery);
                $userStmt->execute();
                $totalUsers = $userStmt->fetch(PDO::FETCH_ASSOC)['total_users'];
            } catch (PDOException $e) {
                $totalUsers = 0;
            }
            
            // 获取关注关系总数
            try {
                $followQuery = "SELECT COUNT(*) as total_follows FROM follows";
                $followStmt = $db->prepare($followQuery);
                $followStmt->execute();
                $totalFollows = $followStmt->fetch(PDO::FETCH_ASSOC)['total_follows'];
            } catch (PDOException $e) {
                $totalFollows = 0;
            }
            
            // 获取内容总数
            try {
                $contentQuery = "SELECT COUNT(*) as total_content FROM content";
                $contentStmt = $db->prepare($contentQuery);
                $contentStmt->execute();
                $totalContent = $contentStmt->fetch(PDO::FETCH_ASSOC)['total_content'];
            } catch (PDOException $e) {
                $totalContent = 0;
            }
            
            // 获取消息总数
            try {
                $messageQuery = "SELECT COUNT(*) as total_messages FROM messages";
                $messageStmt = $db->prepare($messageQuery);
                $messageStmt->execute();
                $totalMessages = $messageStmt->fetch(PDO::FETCH_ASSOC)['total_messages'];
            } catch (PDOException $e) {
                $totalMessages = 0;
            }
            
            // 获取今日新增用户
            try {
                $todayUsersQuery = "SELECT COUNT(*) as today_users FROM users WHERE DATE(created_at) = CURDATE()";
                $todayUsersStmt = $db->prepare($todayUsersQuery);
                $todayUsersStmt->execute();
                $todayUsers = $todayUsersStmt->fetch(PDO::FETCH_ASSOC)['today_users'];
            } catch (PDOException $e) {
                $todayUsers = 0;
            }
            
            // 获取近7天用户增长数据
            try {
                $userGrowthQuery = "SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date";
                $userGrowthStmt = $db->prepare($userGrowthQuery);
                $userGrowthStmt->execute();
                $userGrowth = $userGrowthStmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                $userGrowth = array();
            }
            
            // 构建结果
            $result = array(
                "total_users" => $totalUsers,
                "total_follows" => $totalFollows,
                "total_content" => $totalContent,
                "total_messages" => $totalMessages,
                "today_users" => $todayUsers,
                "user_growth" => $userGrowth
            );
        } 
        // 获取活跃用户数据
        else if ($type === 'active_users') {
            // 获取近30天活跃用户
            try {
                $activeUsersQuery = "SELECT 
                                        DATE(created_at) as date, 
                                        COUNT(DISTINCT user_id) as active_users 
                                    FROM content 
                                    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
                                    GROUP BY DATE(created_at) 
                                    ORDER BY date";
                $activeUsersStmt = $db->prepare($activeUsersQuery);
                $activeUsersStmt->execute();
                $result = $activeUsersStmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                $result = array();
            }
        } 
        // 获取内容类型统计
        else if ($type === 'content_types') {
            // 获取内容类型分布
            try {
                $contentTypesQuery = "SELECT 
                                        type, 
                                        COUNT(*) as count 
                                    FROM content 
                                    GROUP BY type 
                                    ORDER BY count DESC";
                $contentTypesStmt = $db->prepare($contentTypesQuery);
                $contentTypesStmt->execute();
                $result = $contentTypesStmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                $result = array();
            }
        }
        
        // 返回200成功状态码
        http_response_code(200);
        // 返回JSON响应
        echo json_encode(array("message" => "获取成功", "code" => 200, "data" => $result));
        break;

    // 其他请求方法：返回405方法不允许
    default:
        http_response_code(405);
        // 返回JSON响应
        echo json_encode(array("message" => "方法不允许", "code" => 405));
        break;
}
?>