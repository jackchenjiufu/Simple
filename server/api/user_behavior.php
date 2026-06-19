<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    echo json_encode(['code' => 200, 'message' => 'OK']);
    exit;
}

session_start();
require_once '../config/Database.php';
require_once 'log_helper.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // 检查并创建行为数据表
    $checkTableQuery = "SHOW TABLES LIKE 'user_behaviors'";
    $tableExists = $conn->query($checkTableQuery)->rowCount() > 0;
    
    if (!$tableExists) {
        $createTableQuery = "CREATE TABLE user_behaviors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            type VARCHAR(50) NOT NULL,
            content_id VARCHAR(255),
            content_type VARCHAR(50),
            position VARCHAR(50),
            algorithm VARCHAR(100),
            recommend_id VARCHAR(255),
            duration INT,
            timestamp BIGINT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_type (type),
            INDEX idx_content_id (content_id),
            INDEX idx_timestamp (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $conn->exec($createTableQuery);
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    // 处理POST请求 - 保存行为数据
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['behaviors']) || !is_array($data['behaviors'])) {
            echo json_encode([
                'code' => 400,
                'message' => '缺少行为数据'
            ]);
            exit;
        }
        
        $user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0;
        $ip_address = getClientIp();
        
        $inserted = 0;
        foreach ($data['behaviors'] as $behavior) {
            // 设置默认值
            $type = $behavior['type'] ?? '';
            $contentId = $behavior['contentId'] ?? '';
            $contentType = $behavior['contentType'] ?? '';
            $position = $behavior['position'] ?? '';
            $algorithm = $behavior['algorithm'] ?? '';
            $recommendId = $behavior['recommendId'] ?? '';
            $duration = $behavior['duration'] ?? 0;
            $timestamp = $behavior['timestamp'] ?? time();
            
            // 修复page_stay类型的特殊处理
            if ($type === 'page_stay') {
                // 确保字段值正确
                if (empty($algorithm) && !empty($duration)) {
                    // 修正字段值
                    $algorithm = '';
                }
            }
            
            $sql = "INSERT INTO user_behaviors (user_id, type, content_id, content_type, position, algorithm, recommend_id, duration, timestamp) 
                    VALUES (:user_id, :type, :content_id, :content_type, :position, :algorithm, :recommend_id, :duration, :timestamp)";
            $stmt = $conn->prepare($sql);
            
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':type', $type);
            $stmt->bindParam(':content_id', $contentId);
            $stmt->bindParam(':content_type', $contentType);
            $stmt->bindParam(':position', $position);
            $stmt->bindParam(':algorithm', $algorithm);
            $stmt->bindParam(':recommend_id', $recommendId);
            $stmt->bindParam(':duration', $duration);
            $stmt->bindParam(':timestamp', $timestamp);
            
            if ($stmt->execute()) {
                $inserted++;
            }
        }
        
        // 记录行为数据同步日志
        logAction($conn, $user_id, 'behavior', '同步行为数据', "成功同步 {$inserted} 条行为数据", $ip_address);
        
        echo json_encode([
            'code' => 200,
            'message' => "成功同步 {$inserted} 条行为数据"
        ]);
    }
    
    // 处理GET请求 - 获取行为数据统计
    elseif ($method === 'GET') {
        // 验证管理员权限
        if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
            echo json_encode([
                'code' => 401,
                'message' => '未授权访问'
            ]);
            exit;
        }
        
        // 获取行为数据统计
        $sql = "SELECT 
                    type, 
                    COUNT(*) as count, 
                    COUNT(DISTINCT user_id) as unique_users,
                    AVG(duration) as avg_duration
                FROM user_behaviors 
                GROUP BY type 
                ORDER BY count DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 获取最近的行为数据
        $recentSql = "SELECT 
                        id, user_id, type, content_id, content_type, position, timestamp, created_at 
                    FROM user_behaviors 
                    ORDER BY created_at DESC 
                    LIMIT 50";
        $recentStmt = $conn->prepare($recentSql);
        $recentStmt->execute();
        $recentBehaviors = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'code' => 200,
            'message' => '获取行为数据统计成功',
            'data' => [
                'stats' => $stats,
                'recent_behaviors' => $recentBehaviors
            ]
        ]);
    }
    
    else {
        echo json_encode([
            'code' => 405,
            'message' => '方法不允许'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'code' => 500,
        'message' => '服务器内部错误: ' . $e->getMessage()
    ]);
}
?>