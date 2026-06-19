<?php
/**
 * 更新users表中现有用户的created_at字段
 */

// 设置CORS头
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 创建数据库实例
    $database = new Database();
    // 获取数据库连接
    $db = $database->getConnection();
    
    // 检查users表是否有created_at字段
    $query = "DESCRIBE users";
    $stmt = $db->query($query);
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $hasCreatedAt = false;
    foreach ($columns as $column) {
        if ($column['Field'] === 'created_at') {
            $hasCreatedAt = true;
            break;
        }
    }
    
    if (!$hasCreatedAt) {
        // 如果没有created_at字段，添加它
        $query = "ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT NOW()";
        $db->exec($query);
        $response = array(
            "message" => "已添加created_at字段",
            "code" => 200
        );
    } else {
        // 更新所有没有created_at值的用户
        $query = "UPDATE users SET created_at = NOW() WHERE created_at IS NULL OR created_at = '0000-00-00 00:00:00'";
        $affectedRows = $db->exec($query);
        
        $response = array(
            "message" => "已更新 {$affectedRows} 个用户的created_at字段"
            "code" => 200,
            "data" => array(
                "affected_rows" => $affectedRows
            )
        );
    }
    
    // 返回响应
    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    // 处理错误
    $response = array(
        "message" => "更新失败: " . $e->getMessage(),
        "code" => 500
    );
    
    http_response_code(500);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}
?>