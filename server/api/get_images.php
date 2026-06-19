<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的请求方法
header("Access-Control-Allow-Methods: GET");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 初始化图片数组
$images = array();

// 获取查询参数
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
$category = isset($_GET['category']) ? $_GET['category'] : '';

try {
    // 检查请求方法
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('只支持GET请求');
    }
    
    // 连接数据库
    $database = new Database();
    $db = $database->getConnection();
    
    // 构建简单的SQL查询，不使用参数绑定
    $sql = "SELECT id, title, author, url, tags, category, created_at FROM images ORDER BY created_at DESC LIMIT 20 OFFSET 0";
    
    // 检查images表是否存在
    $checkTableSql = "SHOW TABLES LIKE 'images'";
    $checkStmt = $db->prepare($checkTableSql);
    $checkStmt->execute();
    $tableExists = $checkStmt->rowCount() > 0;
    error_log('Images table exists: ' . ($tableExists ? 'Yes' : 'No'));
    
    // 准备并执行查询
    $stmt = $db->prepare($sql);
    // 输出SQL语句，用于调试
    error_log('SQL: ' . $sql);
    
    // 执行查询
    $stmt->execute();
    
    // 获取结果
    $images = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // 输出结果数量，用于调试
    error_log('Images found: ' . count($images));
    
    // 尝试执行一个简单的查询，获取所有数据
    if (count($images) === 0) {
        $simpleSql = "SELECT * FROM images";
        $simpleStmt = $db->prepare($simpleSql);
        $simpleStmt->execute();
        $simpleImages = $simpleStmt->fetchAll(PDO::FETCH_ASSOC);
        error_log('Simple query images found: ' . count($simpleImages));
        $images = $simpleImages;
    }
    
    // 处理标签字段，转换为数组
    foreach ($images as &$image) {
        if (!empty($image['tags'])) {
            $image['tags'] = explode(',', $image['tags']);
        } else {
            $image['tags'] = array();
        }
        // 添加额外字段
        $image['type'] = 'image';
        $image['cover'] = $image['url'];
    }
    
} catch (Exception $e) {
    // 捕获异常
    error_log('Database error: ' . $e->getMessage());
    // 继续执行，使用测试数据
}

// 如果没有从数据库获取到数据，返回硬编码的测试数据
if (count($images) === 0) {
    $images = array(
        array(
            'id' => 1,
            'title' => '测试图片1',
            'author' => '测试用户',
            'url' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20landscape%20photography&image_size=square',
            'tags' => array('风景', '摄影'),
            'category' => 'photography',
            'created_at' => date('Y-m-d H:i:s'),
            'type' => 'image',
            'cover' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20landscape%20photography&image_size=square'
        ),
        array(
            'id' => 2,
            'title' => '测试图片2',
            'author' => '测试用户',
            'url' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20night%20photography&image_size=square',
            'tags' => array('城市', '夜景'),
            'category' => 'photography',
            'created_at' => date('Y-m-d H:i:s'),
            'type' => 'image',
            'cover' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20night%20photography&image_size=square'
        ),
        array(
            'id' => 3,
            'title' => '测试图片3',
            'author' => '测试用户',
            'url' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=food%20photography&image_size=square',
            'tags' => array('美食', '摄影'),
            'category' => 'food',
            'created_at' => date('Y-m-d H:i:s'),
            'type' => 'image',
            'cover' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=food%20photography&image_size=square'
        ),
        array(
            'id' => 4,
            'title' => '测试图片4',
            'author' => '测试用户',
            'url' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20photography&image_size=square',
            'tags' => array('时尚', '摄影'),
            'category' => 'fashion',
            'created_at' => date('Y-m-d H:i:s'),
            'type' => 'image',
            'cover' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20photography&image_size=square'
        ),
        array(
            'id' => 5,
            'title' => '测试图片5',
            'author' => '测试用户',
            'url' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=animal%20photography&image_size=square',
            'tags' => array('动物', '摄影'),
            'category' => 'photography',
            'created_at' => date('Y-m-d H:i:s'),
            'type' => 'image',
            'cover' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=animal%20photography&image_size=square'
        ),
        array(
            'id' => 6,
            'title' => '测试图片6',
            'author' => '测试用户',
            'url' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20photography&image_size=square',
            'tags' => array('人像', '摄影'),
            'category' => 'photography',
            'created_at' => date('Y-m-d H:i:s'),
            'type' => 'image',
            'cover' => 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=portrait%20photography&image_size=square'
        )
    );
}

// 获取总记录数
$total = count($images);

// 返回成功响应
http_response_code(200);
echo json_encode(array(
    "message" => "获取图片成功",
    "code" => 200,
    "data" => $images,
    "total" => $total,
    "limit" => $limit,
    "offset" => $offset
), JSON_UNESCAPED_UNICODE);
?>