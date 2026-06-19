<?php
/**
 * delete_article.php - 删除文章API接口
 * 
 * 功能：
 * - 根据文章ID删除文章
 * - 提供完整的错误处理和响应
 * 
 * 请求方法：
 * - POST: 删除文章
 */

// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的请求方法
header("Access-Control-Allow-Methods: POST, OPTIONS");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理OPTIONS请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
} catch (Exception $e) {
    echo json_encode(['code' => 500, 'message' => '数据库连接失败']);
    exit;
}

// 处理POST请求
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // 获取请求数据
        $data = json_decode(file_get_contents('php://input'), true);
        
        // 验证数据
        if (!isset($data['id'])) {
            throw new Exception('缺少文章ID');
        }
        
        if (!isset($data['user_id'])) {
            throw new Exception('缺少用户ID');
        }
        
        $id = $data['id'];
        $user_id = $data['user_id'];
        
        // 检查文章是否存在且属于当前用户
        $checkSql = "SELECT * FROM articles WHERE id = ? AND user_id = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute(array($id, $user_id));
        $articleExists = $checkStmt->rowCount() > 0;
        
        if (!$articleExists) {
            http_response_code(404);
            echo json_encode(array(
                "message" => "文章不存在或无权限删除",
                "code" => 404
            ), JSON_UNESCAPED_UNICODE);
            exit;
        }
        
        // 执行删除操作
        $sql = "DELETE FROM articles WHERE id = ? AND user_id = ?";
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute(array($id, $user_id));
        
        if ($result) {
            http_response_code(200);
            echo json_encode(array(
                "message" => "删除文章成功",
                "code" => 200
            ), JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception('删除文章失败');
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(array(
            "message" => $e->getMessage(),
            "code" => 400
        ), JSON_UNESCAPED_UNICODE);
    }
} else {
    http_response_code(405);
    echo json_encode(array(
        "message" => "不支持的请求方法",
        "code" => 405
    ), JSON_UNESCAPED_UNICODE);
}
?>