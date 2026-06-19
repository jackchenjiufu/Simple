<?php
/**
 * user_level.php - 用户等级管理API接口
 * 
 * 功能：
 * - 提供用户等级的更新和查询操作
 * - 支持经验值和积分的管理
 * - 实现等级自动计算
 */

// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的请求方法
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理OPTIONS请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 创建数据库连接
    $database = new Database();
    $db = $database->getConnection();
    
    // 获取请求方法
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            /**
             * GET请求处理
             * 功能：获取用户等级信息
             * 
             * URL: /user_level.php?user_id=1
             * 参数：
             * - user_id: 用户ID
             */
            if (isset($_GET['user_id'])) {
                $user_id = $_GET['user_id'];
                
                $sql = "SELECT id, username, level, experience, points FROM users WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute(array($user_id));
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user) {
                    http_response_code(200);
                    echo json_encode(array(
                        "message" => "获取用户等级信息成功",
                        "code" => 200,
                        "data" => $user
                    ), JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(404);
                    echo json_encode(array(
                        "message" => "用户不存在",
                        "code" => 404
                    ), JSON_UNESCAPED_UNICODE);
                }
            } else {
                // 获取所有用户等级信息
                $sql = "SELECT id, username, level, experience, points FROM users ORDER BY level DESC, experience DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute();
                $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                http_response_code(200);
                echo json_encode(array(
                    "message" => "获取用户等级列表成功",
                    "code" => 200,
                    "data" => $users
                ), JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'POST':
            /**
             * POST请求处理
             * 功能：更新用户经验值和积分
             * 
             * 请求体：
             * {
             *   "user_id": 1,
             *   "experience": 10,
             *   "points": 5
             * }
             */
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['user_id'])) {
                throw new Exception('缺少用户ID');
            }
            
            $user_id = $data['user_id'];
            $experience = isset($data['experience']) ? $data['experience'] : 0;
            $points = isset($data['points']) ? $data['points'] : 0;
            
            // 检查用户是否存在
            $checkSql = "SELECT * FROM users WHERE id = ?";
            $checkStmt = $db->prepare($checkSql);
            $checkStmt->execute(array($user_id));
            $userExists = $checkStmt->rowCount() > 0;
            
            if (!$userExists) {
                http_response_code(404);
                echo json_encode(array(
                    "message" => "用户不存在",
                    "code" => 404
                ), JSON_UNESCAPED_UNICODE);
                exit;
            }
            
            // 更新用户经验值和积分
            $updateSql = "UPDATE users SET experience = experience + ?, points = points + ? WHERE id = ?";
            $updateStmt = $db->prepare($updateSql);
            $updateStmt->execute(array($experience, $points, $user_id));
            
            // 重新计算用户等级
            $calculateLevelSql = "UPDATE users SET level = FLOOR((experience / 1000)) + 1 WHERE id = ?";
            $calculateLevelStmt = $db->prepare($calculateLevelSql);
            $calculateLevelStmt->execute(array($user_id));
            
            // 获取更新后的用户信息
            $getSql = "SELECT id, username, level, experience, points FROM users WHERE id = ?";
            $getStmt = $db->prepare($getSql);
            $getStmt->execute(array($user_id));
            $updatedUser = $getStmt->fetch(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode(array(
                "message" => "更新用户等级信息成功",
                "code" => 200,
                "data" => $updatedUser
            ), JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            throw new Exception('不支持的请求方法');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(array(
        "message" => $e->getMessage(),
        "code" => 400
    ), JSON_UNESCAPED_UNICODE);
}
?>