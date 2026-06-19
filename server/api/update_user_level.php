<?php
/**
 * update_user_level.php - 更新用户表结构，添加等级相关字段
 * 
 * 功能：
 * - 向users表添加用户等级相关字段
 * - 支持等级、经验值、积分等字段
 */

// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 创建数据库连接
    $database = new Database();
    $db = $database->getConnection();
    
    // 检查users表是否存在
    $checkTableSql = "SHOW TABLES LIKE 'users'";
    $checkTableStmt = $db->prepare($checkTableSql);
    $checkTableStmt->execute();
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if (!$tableExists) {
        throw new Exception('users表不存在');
    }
    
    // 检查level字段是否存在
    $checkLevelSql = "SHOW COLUMNS FROM users LIKE 'level'";
    $checkLevelStmt = $db->prepare($checkLevelSql);
    $checkLevelStmt->execute();
    $levelExists = $checkLevelStmt->rowCount() > 0;
    
    if (!$levelExists) {
        // 添加用户等级相关字段
        $alterTableSql = "ALTER TABLE users ADD COLUMN level INT DEFAULT 1, ADD COLUMN experience INT DEFAULT 0, ADD COLUMN points INT DEFAULT 0, ADD COLUMN level_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
        $alterTableStmt = $db->prepare($alterTableSql);
        $alterTableStmt->execute();
        
        http_response_code(200);
        echo json_encode(array(
            "message" => "用户表结构更新成功，添加了等级相关字段",
            "code" => 200
        ), JSON_UNESCAPED_UNICODE);
    } else {
        http_response_code(200);
        echo json_encode(array(
            "message" => "用户表结构已包含等级相关字段",
            "code" => 200
        ), JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(array(
        "message" => $e->getMessage(),
        "code" => 400
    ), JSON_UNESCAPED_UNICODE);
}
?>