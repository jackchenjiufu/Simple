<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
// 允许的请求方法
header("Access-Control-Allow-Methods: POST");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

try {
    // 检查请求方法
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('只支持POST请求');
    }
    
    // 检查文件是否上传
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('图片上传失败: ' . $_FILES['image']['error']);
    }
    
    // 检查必要的POST参数
    if (!isset($_POST['title']) || !isset($_POST['author'])) {
        throw new Exception('缺少必要的参数');
    }
    
    // 获取POST参数
    $title = $_POST['title'];
    $author = $_POST['author'];
    $tags = isset($_POST['tags']) ? $_POST['tags'] : '';
    $category = isset($_POST['category']) ? $_POST['category'] : 'photography';
    
    // 图片上传处理
    $uploadDir = __DIR__ . '/../uploads/';
    
    // 确保上传目录存在
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // 获取文件信息
    $fileTmpPath = $_FILES['image']['tmp_name'];
    $fileName = $_FILES['image']['name'];
    $fileSize = $_FILES['image']['size'];
    $fileType = $_FILES['image']['type'];
    
    // 生成新的文件名
    $fileNameCmps = explode(".", $fileName);
    $fileExtension = strtolower(end($fileNameCmps));
    $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
    $uploadFilePath = $uploadDir . $newFileName;
    
    // 检查文件类型
    $allowedTypes = array('image/jpeg', 'image/png', 'image/jpg', 'image/gif');
    if (!in_array($fileType, $allowedTypes)) {
        throw new Exception('只支持JPG、PNG、GIF格式的图片');
    }
    
    // 用 magic bytes 验证图片内容
    $fh = fopen($fileTmpPath, 'rb');
    $magicBytes = fread($fh, 12);
    fclose($fh);
    $magicHex = bin2hex($magicBytes);
    $realMime = '';
    if (strpos($magicHex, 'ffd8ff') === 0) $realMime = 'image/jpeg';
    elseif (strpos($magicHex, '89504e47') === 0) $realMime = 'image/png';
    elseif (strpos($magicHex, '47494638') === 0) $realMime = 'image/gif';
    $allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!$realMime || !in_array($realMime, $allowedMimes)) {
        throw new Exception('图片内容不合法，请上传真实图片文件');
    }
    
    // 检查文件大小（5MB限制）
    $maxSize = 5 * 1024 * 1024;
    if ($fileSize > $maxSize) {
        throw new Exception('文件大小不能超过5MB');
    }
    
    // 用 GD 重编码图片（去除潜在恶意代码）
    $imageResource = null;
    switch ($realMime) {
        case 'image/jpeg':
            $imageResource = @imagecreatefromjpeg($fileTmpPath);
            break;
        case 'image/png':
            $imageResource = @imagecreatefrompng($fileTmpPath);
            break;
        case 'image/gif':
            $imageResource = @imagecreatefromgif($fileTmpPath);
            break;
    }
    if (!$imageResource) {
        throw new Exception('图片格式损坏，无法处理');
    }
    
    // 重编码并保存为新文件
    $newFileName = md5(time() . $fileName) . '.' . $fileExtension;
    $uploadFilePath = $uploadDir . $newFileName;
    switch ($realMime) {
        case 'image/jpeg':
            imagejpeg($imageResource, $uploadFilePath, 90);
            break;
        case 'image/png':
            imagepng($imageResource, $uploadFilePath, 6);
            break;
        case 'image/gif':
            imagegif($imageResource, $uploadFilePath);
            break;
    }
    imagedestroy($imageResource);
    
    // 生成文件URL
    $fileUrl = 'http://139.196.185.197:7070/doo/server/uploads/' . $newFileName;
    
    // 保存到数据库
    $database = new Database();
    $db = $database->getConnection();
    
    // 获取用户ID（这里使用固定值，实际应用中应该从会话或token中获取）
    $userId = isset($_POST['user_id']) ? $_POST['user_id'] : 1;
    
    // 检查content表是否存在，如果不存在则创建
    $checkTableSql = "SHOW TABLES LIKE 'content'";
    $checkTableStmt = $db->prepare($checkTableSql);
    $checkTableStmt->execute();
    $tableExists = $checkTableStmt->rowCount() > 0;
    
    if (!$tableExists) {
        // 创建content表
        $createTableSql = "CREATE TABLE content (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            image_url VARCHAR(255),
            video_url VARCHAR(255),
            likes INT DEFAULT 0,
            comments INT DEFAULT 0,
            status ENUM('draft', 'published', 'deleted') DEFAULT 'published',
            tags VARCHAR(255),
            category VARCHAR(100) DEFAULT 'photography',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        $createTableStmt = $db->prepare($createTableSql);
        $createTableStmt->execute();
    }
    
    // 准备SQL语句，插入到content表
    $sql = "INSERT INTO content (user_id, title, content, image_url, tags, category, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $db->prepare($sql);
    
    // 执行SQL语句
    $result = $stmt->execute(array($userId, $title, '', $fileUrl, $tags, $category, 'published'));
    
    if (!$result) {
        throw new Exception('数据库保存失败');
    }
    
    // 获取插入的ID
    $imageId = $db->lastInsertId();
    
    // 返回成功响应
    http_response_code(200);
    echo json_encode(array(
        "message" => "图片上传成功",
        "code" => 200,
        "data" => array(
            "id" => $imageId,
            "title" => $title,
            "author" => $author,
            "url" => $fileUrl,
            "tags" => $tags,
            "category" => $category
        )
    ), JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // 捕获异常
    http_response_code(400);
    echo json_encode(array(
        "message" => $e->getMessage(),
        "code" => 400
    ), JSON_UNESCAPED_UNICODE);
}
?>