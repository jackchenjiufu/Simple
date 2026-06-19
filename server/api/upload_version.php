<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

session_start();
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    http_response_code(401);
    echo json_encode(array("message" => "未授权访问", "code" => 401));
    exit;
}

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 上传目录
$uploadDir = __DIR__ . '/../downloads/';

try {
    // 创建数据库实例
    $database = new Database();
    // 获取数据库连接
    $db = $database->getConnection();

    // 检查上传目录是否存在，不存在则创建
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // 检查是否有文件上传
    if (!isset($_FILES['apk_file'])) {
        // 返回400错误状态码
        http_response_code(400);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "请选择APK文件",
            "code" => 400
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $file = $_FILES['apk_file'];
    
    // 验证文件类型
    $allowedTypes = ['application/vnd.android.package-archive', 'application/octet-stream'];
    if (!in_array($file['type'], $allowedTypes)) {
        // 返回400错误状态码
        http_response_code(400);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "文件类型不正确，请上传APK文件",
            "code" => 400
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 验证文件大小（最大50MB）
    $maxSize = 50 * 1024 * 1024;
    if ($file['size'] > $maxSize) {
        // 返回400错误状态码
        http_response_code(400);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "文件大小超过限制（最大50MB）",
            "code" => 400
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 获取版本号和描述
    $version = $_POST['version'] ?? '';
    $description = $_POST['description'] ?? '';

    // 验证版本号格式
    if (!preg_match('/^\d+\.\d+\.\d+$/', $version)) {
        // 返回400错误状态码
        http_response_code(400);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "版本号格式不正确，请使用X.X.X格式",
            "code" => 400
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 生成文件名
    $fileExtension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $fileName = 'app_v' . str_replace('.', '_', $version) . '.' . $fileExtension;
    $filePath = $uploadDir . $fileName;

    // 移动上传的文件
    if (move_uploaded_file($file['tmp_name'], $filePath)) {
        // 插入版本信息到数据库
        $query = "INSERT INTO app_versions (version, description, download_url, created_at) VALUES (?, ?, ?, NOW())";
        $stmt = $db->prepare($query);
        $stmt->execute([$version, $description, $fileName]);

        // 返回200成功状态码
        http_response_code(200);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "上传成功",
            "code" => 200,
            "data" => array(
                "version" => $version,
                "description" => $description,
                "fileName" => $fileName,
                "downloadUrl" => "http://139.196.185.197:7070/doo/server/downloads/" . $fileName
            )
        ), JSON_UNESCAPED_UNICODE);
    } else {
        // 返回500错误状态码
        http_response_code(500);
        // 返回JSON响应
        echo json_encode(array(
            "message" => "文件上传失败",
            "code" => 500
        ), JSON_UNESCAPED_UNICODE);
    }

} catch (Exception $e) {
    // 捕获异常
    // 返回500错误状态码
    http_response_code(500);
    // 返回错误信息
    echo json_encode(array(
        "message" => "上传失败",
        "code" => 500,
        "error" => $e->getMessage()
    ), JSON_UNESCAPED_UNICODE);
}
?>
