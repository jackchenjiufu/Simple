<?php
/**
 * upload_file.php - 通用文件上传（无类型限制）
 */
header('Content-Type: application/json; charset=UTF-8');

define('TOKEN', 'doo_deploy_2024');
$token = $_POST['token'] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
if ($token !== TOKEN) {
    http_response_code(403);
    echo json_encode(['code' => 403, 'message' => '无权限']);
    exit;
}

$action = $_POST['action'] ?? '';
$uploadDir = __DIR__ . '/../downloads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

if ($action === 'upload' && isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $destPath = $uploadDir . $_FILES['file']['name'];
    if (move_uploaded_file($_FILES['file']['tmp_name'], $destPath)) {
        echo json_encode([
            'code' => 200,
            'message' => '上传成功',
            'data' => [
                'name' => $_FILES['file']['name'],
                'size' => filesize($destPath),
                'path' => '/doo/server/downloads/' . $_FILES['file']['name']
            ]
        ]);
    } else {
        echo json_encode(['code' => 500, 'message' => '保存失败']);
    }
} elseif ($action === 'write' && isset($_POST['path']) && isset($_POST['content_b64'])) {
    // 支持 base64 写入
    $path = $_POST['path'];
    $content = base64_decode($_POST['content_b64']);
    $dir = dirname($path);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    if (file_put_contents($path, $content) !== false) {
        echo json_encode(['code' => 200, 'message' => '写入成功', 'size' => strlen($content)]);
    } else {
        echo json_encode(['code' => 500, 'message' => '写入失败']);
    }
} elseif ($action === 'exec_sql' && isset($_POST['sql'])) {
    // 执行 SQL
    $dbConfig = require __DIR__ . '/../config/Database.php';
    // Try direct MySQL
    $sql = $_POST['sql'];
    $escaped = escapeshellarg($sql);
    $output = shell_exec("mysql -u root -p320722 doo-app -e $escaped 2>/dev/null");
    echo json_encode(['code' => 200, 'message' => 'SQL执行', 'output' => trim($output ?? '')]);
} else {
    echo json_encode(['code' => 400, 'message' => '参数错误', 'action' => $action]);
}
