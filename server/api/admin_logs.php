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

// 检查并创建logs表
$checkTableQuery = "SHOW TABLES LIKE 'logs'";
$tableExists = $db->query($checkTableQuery)->rowCount() > 0;

if (!$tableExists) {
    // 创建logs表
    $createTableQuery = "CREATE TABLE logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        type VARCHAR(50) NOT NULL COMMENT '日志类型',
        action VARCHAR(100) NOT NULL COMMENT '操作',
        message TEXT NOT NULL COMMENT '日志消息',
        ip_address VARCHAR(45) NOT NULL COMMENT 'IP地址',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        INDEX idx_user_id (user_id),
        INDEX idx_type (type),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统日志表';";
    $db->exec($createTableQuery);
}

// 检查logs表是否为空，如果为空则插入测试数据
$checkEmptyQuery = "SELECT COUNT(*) as count FROM logs";
$emptyResult = $db->query($checkEmptyQuery)->fetch(PDO::FETCH_ASSOC);

if ($emptyResult['count'] == 0) {
    // 插入测试数据
    $insertTestDataQuery = "INSERT INTO logs (user_id, type, action, message, ip_address, created_at) VALUES
        (1, 'login', '登录', '用户123登录成功', '127.0.0.1', NOW() - INTERVAL 1 HOUR),
        (3, 'admin', '访问管理页面', '管理员访问用户管理页面', '192.168.1.100', NOW() - INTERVAL 30 MINUTE),
        (6, 'content', '发布内容', 'DOO官方账号发布了新内容', '127.0.0.1', NOW() - INTERVAL 15 MINUTE),
        (1, 'follow', '关注用户', '用户123关注了用户4', '127.0.0.1', NOW() - INTERVAL 10 MINUTE),
        (3, 'admin', '查看日志', '管理员查看系统日志', '192.168.1.100', NOW() - INTERVAL 5 MINUTE);";
    $db->exec($insertTestDataQuery);
}

// 获取请求方法（GET）
$method = $_SERVER['REQUEST_METHOD'];

// 根据请求方法执行不同操作
switch ($method) {
    // GET请求：获取日志列表
    case 'GET':
        // 获取查询参数
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $offset = ($page - 1) * $limit;
        $type = isset($_GET['type']) ? $_GET['type'] : null;
        $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
        
        // 构建查询条件
        $whereClause = '';
        $params = array();
        
        $conditions = array();
        if ($type) {
            $conditions[] = "l.type = :type";
            $params[":type"] = $type;
        }
        if ($user_id) {
            $conditions[] = "l.user_id = :user_id";
            $params[":user_id"] = $user_id;
        }
        
        if (!empty($conditions)) {
            $whereClause = " WHERE " . implode(" AND ", $conditions);
        }
        
        // 准备SQL查询语句，查询所有日志
        $query = "SELECT 
                    l.id, 
                    l.user_id, 
                    l.type, 
                    l.action, 
                    l.message, 
                    l.ip_address, 
                    l.created_at,
                    u.username, 
                    u.nickname
                FROM logs l 
                LEFT JOIN users u ON l.user_id = u.id 
                $whereClause
                ORDER BY l.created_at DESC
                LIMIT :limit OFFSET :offset";
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        
        // 显式绑定参数类型，确保limit和offset被当作整数处理
        if ($type) {
            $stmt->bindParam(":type", $type);
        }
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
        $countQuery = "SELECT COUNT(*) as total FROM logs l $whereClause";
        $countStmt = $db->prepare($countQuery);
        
        // 为总数查询绑定参数
        $countParams = array();
        if ($type) {
            $countParams[":type"] = $type;
        }
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

    // 其他请求方法：返回405方法不允许
    default:
        http_response_code(405);
        // 返回JSON响应
        echo json_encode(array("message" => "方法不允许", "code" => 405));
        break;
}
?>