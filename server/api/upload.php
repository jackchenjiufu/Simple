<?php
/**
 * 文件上传API
 */
require_once __DIR__ . '/../config/Database.php';

// 设置CORS头
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 开启错误报告

// 处理GET请求（用于测试API是否正常）
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $uploadDir = __DIR__ . '/../uploads/';
    $exists = file_exists($uploadDir);
    $writable = is_writable($uploadDir);
    
    $response = array(
        "message" => "上传API运行正常",
        "code" => 200,
        "server_info" => array(
            "php_version" => phpversion(),
            "upload_dir" => $uploadDir,
            "dir_exists" => $exists,
            "dir_writable" => $writable,
            "request_method" => $_SERVER['REQUEST_METHOD']
        )
    );
    
    echo json_encode($response);
    exit;
}

// 上传目录
$uploadDir = __DIR__ . '/../uploads/';

// 如果上传目录不存在，创建它
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// 处理文件上传
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $fileTmpPath = $_FILES['file']['tmp_name']; // 临时文件路径
    $fileName = $_FILES['file']['name']; // 原始文件名
    $fileSize = $_FILES['file']['size']; // 文件大小
    $fileType = $_FILES['file']['type']; // 文件类型

    // 获取文件扩展名
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));

    // 生成唯一文件名
    $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
    $uploadFilePath = $uploadDir . $newFileName;

    // 允许的文件类型
    $allowedTypes = array('image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi');
    // 允许的扩展名（二次校验）
    $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'];

    // 验证文件类型
    if (in_array($fileType, $allowedTypes) && in_array($fileExtension, $allowedExts)) {
        // 用 magic bytes 验证文件内容（防止伪造 MIME）
        $fh = fopen($fileTmpPath, 'rb');
        $magicBytes = fread($fh, 12);
        fclose($fh);
        $realMime = '';
        $magicHex = bin2hex($magicBytes);
        if (strpos($magicHex, 'ffd8ff') === 0) $realMime = 'image/jpeg';
        elseif (strpos($magicHex, '89504e47') === 0) $realMime = 'image/png';
        elseif (strpos($magicHex, '47494638') === 0) $realMime = 'image/gif';
        elseif (strpos($magicHex, '52494646') === 0 && stripos($magicBytes, 'WEBP')) $realMime = 'image/webp';
        elseif (strpos($magicHex, '000000') === 0 && stripos($magicBytes, 'ftyp')) $realMime = 'video/mp4';
        elseif (strpos($magicHex, '000000') === 0 && stripos($magicBytes, 'qt')) $realMime = 'video/quicktime';
        elseif (strpos($magicHex, '52494646') === 0 && stripos($magicBytes, 'AVI')) $realMime = 'video/x-msvideo';
        if (!$realMime || !in_array($realMime, $allowedTypes)) {
            $response = array("message" => "文件内容不匹配，请上传合法文件", "code" => 400);
            http_response_code(400);
            echo json_encode($response);
            exit;
        }
        // 根据文件类型设置最大文件大小
        $maxSize = in_array($fileType, array('video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi')) ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        
        // 验证文件大小
        if ($fileSize < $maxSize) {
            // 移动文件到上传目录
            if (move_uploaded_file($fileTmpPath, $uploadFilePath)) {
                // 生成文件URL
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'];
                $fileUrl = $protocol . '://' . $host . '/doo/server/uploads/' . $newFileName;
                
                // 返回成功响应
                $response = array(
                    "message" => "上传成功",
                    "code" => 200,
                    "data" => array(
                        "url" => $fileUrl,
                        "filename" => $newFileName
                    )
                );
                
                http_response_code(200);
                echo json_encode($response);
            } else {
                // 文件移动失败
                $response = array("message" => "文件上传失败", "code" => 500);
                http_response_code(500);
                echo json_encode($response);
            }
        } else {
            // 文件大小超出限制
            $isVideo = in_array($fileType, array('video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/avi'));
            $maxSizeText = $isVideo ? '50MB' : '5MB';
            $response = array("message" => "文件大小不能超过" . $maxSizeText, "code" => 400);
            http_response_code(400);
            echo json_encode($response);
        }
    } else {
        // 文件类型不允许
        $response = array("message" => "只支持JPG、PNG、GIF、MP4格式的文件", "code" => 400);
        http_response_code(400);
        echo json_encode($response);
    }
} else {
    // 没有文件被上传或上传出错
    $errorMsg = isset($_FILES['file']) ? "上传错误: " . $_FILES['file']['error'] : "没有文件被上传";
    $response = array("message" => $errorMsg, "code" => 400);
    http_response_code(400);
    echo json_encode($response);
}
