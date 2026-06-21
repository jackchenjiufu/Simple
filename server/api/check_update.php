<?php
// 设置CORS头，允许跨域请求
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

// 当前APP版本号（默认值）
$currentVersion = '1.0.0';
// 最新APP版本号
$latestVersion = '1.0.0';
// 是否有更新
$hasUpdate = false;
// 更新下载地址
$downloadUrl = '';
// 更新说明
$description = '';

try {
    // 如果是POST请求，从请求体获取当前版本号
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['currentVersion'])) {
            $currentVersion = $input['currentVersion'];
        }
    } else if (isset($_GET['currentVersion'])) {
        // 如果是GET请求，从URL参数获取
        $currentVersion = $_GET['currentVersion'];
    }
    
    // 引入数据库连接类
    include_once __DIR__ . '/../config/Database.php';
    
    // 创建数据库实例
    $database = new Database();
    // 获取数据库连接
    $db = $database->getConnection();
    
    // 查询最新版本
    $query = "SELECT version, description FROM app_versions ORDER BY id DESC LIMIT 1";
    // 预处理SQL语句
    $stmt = $db->prepare($query);
    // 执行查询
    $stmt->execute();
    // 获取结果
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // 查询全部版本历史（更新日志）
    $logQuery = "SELECT version, description, created_at FROM app_versions ORDER BY created_at DESC";
    $logStmt = $db->prepare($logQuery);
    $logStmt->execute();
    $changelog = $logStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 如果有版本数据，更新最新版本号
    if ($result) {
        $latestVersion = $result['version'];
        $hasUpdate = version_compare($latestVersion, $currentVersion, '>');
        
        // 使用服务器的实际域名或IP地址构建下载URL
        // 获取当前服务器的域名或IP地址
        $serverName = $_SERVER['SERVER_NAME'] ?? 'localhost';
        $serverPort = $_SERVER['SERVER_PORT'] ?? 80;
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        
        // 构建完整的下载URL
        $downloadUrl = $protocol . '://' . $serverName . ($serverPort !== 80 ? ':' . $serverPort : '') . '/doo/server/downloads/app_v' . str_replace('.', '_', $latestVersion) . '.apk';
        $description = $result['description'] ?? '新版本已发布';
    }

    // 返回200成功状态码
    http_response_code(200);
    // 返回JSON响应
    echo json_encode(array(
        "message" => "检查成功",
        "code" => 200,
        "data" => array(
            "currentVersion" => $currentVersion,
            "latestVersion" => $latestVersion,
            "hasUpdate" => $hasUpdate,
            "downloadUrl" => $downloadUrl,
            "description" => $description ?? '',
            "changelog" => $changelog ?? []
        )
    ), JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    // 捕获异常
    // 返回500错误状态码
    http_response_code(500);
    // 返回错误信息
    echo json_encode(array(
        "message" => "检查失败",
        "code" => 500,
        "error" => $e->getMessage()
    ), JSON_UNESCAPED_UNICODE);
}
?>
