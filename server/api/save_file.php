<?php
/**
 * save_file.php - 中转上传脚本
 * 通过 deploy.php 部署到服务器后，接收 base64 数据写入任意路径
 * POST 参数: token, path, content(base64)
 */
header('Content-Type: application/json; charset=UTF-8');

define('TOKEN', 'doo_deploy_2024');
$token = $_POST['token'] ?? '';
if ($token !== TOKEN) {
    http_response_code(403);
    echo json_encode(['code' => 403, 'message' => '无权限']);
    exit;
}

$path = $_POST['path'] ?? '';
$content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';

if (!$path || $content === false || $content === '') {
    http_response_code(400);
    echo json_encode(['code' => 400, 'message' => '参数错误']);
    exit;
}

// 创建目录
$dir = dirname($path);
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}

if (file_put_contents($path, $content) !== false) {
    echo json_encode(['code' => 200, 'message' => '写入成功', 'size' => strlen($content)]);
} else {
    http_response_code(500);
    echo json_encode(['code' => 500, 'message' => '写入失败']);
}
