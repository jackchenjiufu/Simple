<?php
/**
 * 部署接口 - 专用于更新服务端文件
 * POST /api/deploy.php
 * 参数: token, path, content(base64)
 *
 * 不写版本管理、不留垃圾记录
 */

// 安全 token（请修改为随机字符串）
define('DEPLOY_TOKEN', 'doo_deploy_2024');

// 允许写入的目录
$allowedDirs = [
    '/www/wwwroot/139.196.185.197_7070/doo/server/api/',
    '/www/wwwroot/139.196.185.197_7070/doo/admin-web/',
];

header('Content-Type: application/json; charset=UTF-8');

// 验证 token
$token = $_POST['token'] ?? '';
if ($token !== DEPLOY_TOKEN) {
    http_response_code(403);
    echo json_encode(['code' => 403, 'message' => '无权限']);
    exit;
}

$path = $_POST['path'] ?? '';
$content = isset($_POST['content']) ? base64_decode($_POST['content']) : '';

if (!$path || !$content) {
    http_response_code(400);
    echo json_encode(['code' => 400, 'message' => '缺少 path 或 content']);
    exit;
}

// 安全校验：只允许写入允许的目录
$allowed = false;
$realPath = realpath(dirname($path));
foreach ($allowedDirs as $dir) {
    $realDir = realpath($dir);
    if ($realPath && $realDir && strpos($realPath, $realDir) === 0) {
        $allowed = true;
        break;
    }
}

if (!$allowed) {
    http_response_code(403);
    echo json_encode(['code' => 403, 'message' => '禁止写入此路径']);
    exit;
}

if (file_put_contents($path, $content) !== false) {
    echo json_encode(['code' => 200, 'message' => basename($path) . ' 部署成功']);
} else {
    http_response_code(500);
    echo json_encode(['code' => 500, 'message' => '写入失败']);
}
