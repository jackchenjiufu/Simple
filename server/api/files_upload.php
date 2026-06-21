<?php
/**
 * 文件上传 API
 * 处理文件上传操作，包括文件验证、存储和数据库记录
 * 
 * API 端点：
 * - POST /api/files/upload - 上传文件（支持多文件类型）
 */

// 设置 CORS 头信息
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 开启错误报告

// 启动session
session_start();

// 引入数据库配置
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../config/Database.php';

/**
 * 检查请求方法
 * 只允许 POST 请求
 */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $response = array(
        "code" => 405,
        "message" => "方法不允许"
    );
    http_response_code(405);
    echo json_encode($response);
    exit;
}

// 上传目录设置
$uploadDir = __DIR__ . '/../uploads/';

// 确保上传目录存在
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// 生成5位英文字母的唯一文件夹名
$folder = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 5);
$uploadDir .= $folder . '/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

/**
 * 处理文件上传
 */
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    // 获取上传文件信息
    $fileTmpPath = $_FILES['file']['tmp_name'];
    $fileName = $_FILES['file']['name'];
    $fileSize = $_FILES['file']['size'];
    $fileType = $_FILES['file']['type'];

    // 获取文件扩展名
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));

    // 生成10位英文唯一文件名
    $randomName = substr(str_shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 10);
    $newFileName = $randomName . '.' . $fileExtension;
    $uploadFilePath = $uploadDir . $newFileName;

    // 允许的文件类型
    $allowedTypes = array(
        'image/jpeg', 'image/png', 'image/jpg', 'image/gif',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4'
    );

    // 验证文件类型
    if (in_array($fileType, $allowedTypes)) {
        // 设置文件大小限制为50MB
        $maxSize = 50 * 1024 * 1024;
        
        // 验证文件大小
        if ($fileSize <= $maxSize) {
            // 移动上传文件到目标目录
            if (move_uploaded_file($fileTmpPath, $uploadFilePath)) {
                // 生成文件URL（直接存储到服务器）
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
                $host = $_SERVER['HTTP_HOST'];
                // 确保URL包含正确的端口号
                if (strpos($host, ':') === false) {
                    $host .= ':7070';
                }
                $fileUrl = $protocol . '://' . $host . '/doo/server/uploads/';
                if (!empty($folder)) {
                    $fileUrl .= $folder . '/';
                }
                $fileUrl .= $newFileName;
                
                // 服务器本地存储，不需要OSS密钥
                $ossKey = '';
                
                // 保存到数据库
                try {
                    $database = new Database();
                    $conn = $database->getConnection();
                    
                    // 从session中获取用户ID
                    $userId = $_SESSION['user_id'] ?? null;
                    
                    // 如果session中没有用户ID，尝试从Authorization头获取
                    if (empty($userId) && isset($_SERVER['HTTP_AUTHORIZATION'])) {
                        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
                        // 简单的token解析，实际项目中应该使用JWT等标准方案
                        if (strpos($authHeader, 'Bearer ') === 0) {
                            $token = substr($authHeader, 7);
                            // 验证token是否与session中的token匹配
                            if (isset($_SESSION['token']) && $_SESSION['token'] === $token) {
                                // 如果token匹配，使用session中的用户ID
                                $userId = $_SESSION['user_id'] ?? null;
                            }
                        }
                    }
                    
                    // 验证用户是否登录
                    if (empty($userId)) {
                        $response = array("code" => 401, "message" => "未登录");
                        http_response_code(401);
                        echo json_encode($response);
                        exit;
                    }
                    
                    // 准备SQL语句
                    $query = "INSERT INTO files (user_id, name, original_name, size, type, url, oss_key, folder, status) VALUES (:user_id, :name, :original_name, :size, :type, :url, :oss_key, :folder, :status)";
                    $stmt = $conn->prepare($query);
                    
                    // 绑定参数
                    $stmt->bindParam(':user_id', $userId);
                    $stmt->bindParam(':name', $newFileName);
                    $stmt->bindParam(':original_name', $fileName);
                    $stmt->bindParam(':size', $fileSize);
                    $stmt->bindParam(':type', $fileType);
                    $stmt->bindParam(':url', $fileUrl);
                    $stmt->bindParam(':oss_key', $ossKey);
                    $stmt->bindParam(':folder', $folder);
                    $status = 'success';
                    $stmt->bindParam(':status', $status);
                    
                    // 执行SQL语句
                    if ($stmt->execute()) {
                        $fileId = $conn->lastInsertId();
                        
                        // 构建响应
                        $response = array(
                            "code" => 200,
                            "message" => "上传成功",
                            "data" => array(
                                "id" => $fileId,
                                "url" => $fileUrl,
                                "name" => $fileName,
                                "size" => $fileSize,
                                "type" => $fileType
                            )
                        );
                        
                        // 返回响应
                        http_response_code(200);
                        echo json_encode($response);
                    } else {
                        $response = array("code" => 500, "message" => "数据库保存失败");
                        http_response_code(500);
                        echo json_encode($response);
                    }
                } catch (Exception $e) {
                    $response = array("code" => 500, "message" => "数据库连接失败: " . $e->getMessage());
                    http_response_code(500);
                    echo json_encode($response);
                }
            } else {
                $response = array("code" => 500, "message" => "文件上传失败");
                http_response_code(500);
                echo json_encode($response);
            }
        } else {
            $response = array("code" => 400, "message" => "文件大小不能超过50MB");
            http_response_code(400);
            echo json_encode($response);
        }
    } else {
        $response = array("code" => 400, "message" => "只支持PDF、JPG、DOCX、MP4格式的文件");
        http_response_code(400);
        echo json_encode($response);
    }
} else {
    $errorMsg = isset($_FILES['file']) ? "上传错误: " . $_FILES['file']['error'] : "没有文件被上传";
    $response = array("code" => 400, "message" => $errorMsg);
    http_response_code(400);
    echo json_encode($response);
}
