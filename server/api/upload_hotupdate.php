<?php
// upload_hotupdate.php - WGT 热更新包上传接口
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config.php';

$response = ['code' => 0, 'message' => 'ok'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response = ['code' => -1, 'message' => '仅支持POST'];
    echo json_encode($response);
    exit;
}

// 验证Token
$token = isset($_SERVER['HTTP_X_AUTH_TOKEN']) ? $_SERVER['HTTP_X_AUTH_TOKEN'] : '';
if ($token !== 'doo_upload_2024') {
    http_response_code(403);
    $response = ['code' => 403, 'message' => 'Token无效'];
    echo json_encode($response);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $response = ['code' => -2, 'message' => '文件上传失败: ' . ($_FILES['file']['error'] ?? 'no file')];
    echo json_encode($response);
    exit;
}

$uploadDir = __DIR__ . '/../downloads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$file = $_FILES['file'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if ($ext !== 'wgt') {
    $response = ['code' => -3, 'message' => '仅支持wgt文件'];
    echo json_encode($response);
    exit;
}

$destPath = $uploadDir . $file['name'];
if (move_uploaded_file($file['tmp_name'], $destPath)) {
    $fileSize = filesize($destPath);
    $fileUrl = '/doo/server/downloads/' . $file['name'];
    
    $response = [
        'code' => 0,
        'message' => '上传成功',
        'data' => [
            'file_name' => $file['name'],
            'file_size' => $fileSize,
            'file_url' => $fileUrl
        ]
    ];
} else {
    $response = ['code' => -4, 'message' => '文件保存失败'];
}

echo json_encode($response);
