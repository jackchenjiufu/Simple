<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/Database.php';
/**
 * APK 下载代理
 * 解决 nginx 403 禁止访问 APK 文件的问题
 */
$file = $_GET['file'] ?? '';
if (empty($file)) {
    http_response_code(400);
    echo json_encode(['code' => 400, 'message' => '缺少文件名']);
    exit;
}

// 安全校验：防止路径穿越
$file = basename($file);
$filePath = __DIR__ . '/../downloads/' . $file;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['code' => 404, 'message' => '文件不存在']);
    exit;
}

// 设置下载头
header('Content-Type: application/vnd.android.package-archive');
header('Content-Disposition: attachment; filename="' . $file . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: no-cache');
header('Pragma: no-cache');
readfile($filePath);
