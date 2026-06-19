<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的请求方法
header("Access-Control-Allow-Methods: GET, POST");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 定义图片类别和标签
$categories = [
    ['name' => '风景摄影', 'category' => 'photography', 'tags' => ['风景', '摄影']],
    ['name' => '城市夜景', 'category' => 'photography', 'tags' => ['城市', '夜景']],
    ['name' => '美食摄影', 'category' => 'food', 'tags' => ['美食', '摄影']],
    ['name' => '时尚摄影', 'category' => 'fashion', 'tags' => ['时尚', '摄影']],
    ['name' => '人像摄影', 'category' => 'photography', 'tags' => ['人像', '摄影']],
    ['name' => '动物摄影', 'category' => 'photography', 'tags' => ['动物', '摄影']],
    ['name' => '花卉摄影', 'category' => 'photography', 'tags' => ['花卉', '摄影']],
    ['name' => '建筑摄影', 'category' => 'photography', 'tags' => ['建筑', '摄影']],
    ['name' => '自然风景', 'category' => 'nature', 'tags' => ['自然', '风景']],
    ['name' => '海滩度假', 'category' => 'travel', 'tags' => ['海滩', '度假']],
    ['name' => '山脉风景', 'category' => 'nature', 'tags' => ['山脉', '风景']],
    ['name' => '湖泊风景', 'category' => 'nature', 'tags' => ['湖泊', '风景']],
    ['name' => '森林风景', 'category' => 'nature', 'tags' => ['森林', '风景']],
    ['name' => '沙漠风景', 'category' => 'nature', 'tags' => ['沙漠', '风景']],
    ['name' => '草原风景', 'category' => 'nature', 'tags' => ['草原', '风景']],
    ['name' => '瀑布风景', 'category' => 'nature', 'tags' => ['瀑布', '风景']],
    ['name' => '日出风景', 'category' => 'photography', 'tags' => ['日出', '风景']],
    ['name' => '日落风景', 'category' => 'photography', 'tags' => ['日落', '风景']],
    ['name' => '星空摄影', 'category' => 'photography', 'tags' => ['星空', '摄影']],
    ['name' => '极光摄影', 'category' => 'photography', 'tags' => ['极光', '摄影']],
    ['name' => '街拍摄影', 'category' => 'photography', 'tags' => ['街拍', '摄影']],
    ['name' => '婚礼摄影', 'category' => 'photography', 'tags' => ['婚礼', '摄影']],
    ['name' => '儿童摄影', 'category' => 'photography', 'tags' => ['儿童', '摄影']],
    ['name' => '宠物摄影', 'category' => 'photography', 'tags' => ['宠物', '摄影']],
    ['name' => '运动摄影', 'category' => 'sports', 'tags' => ['运动', '摄影']],
    ['name' => '汽车摄影', 'category' => 'automotive', 'tags' => ['汽车', '摄影']],
    ['name' => '航空摄影', 'category' => 'photography', 'tags' => ['航空', '摄影']],
    ['name' => '水下摄影', 'category' => 'photography', 'tags' => ['水下', '摄影']],
    ['name' => '微距摄影', 'category' => 'photography', 'tags' => ['微距', '摄影']],
    ['name' => '黑白摄影', 'category' => 'photography', 'tags' => ['黑白', '摄影']],
    ['name' => '创意摄影', 'category' => 'photography', 'tags' => ['创意', '摄影']],
    ['name' => '抽象摄影', 'category' => 'photography', 'tags' => ['抽象', '摄影']],
    ['name' => '商业摄影', 'category' => 'photography', 'tags' => ['商业', '摄影']],
    ['name' => '产品摄影', 'category' => 'photography', 'tags' => ['产品', '摄影']],
    ['name' => '室内摄影', 'category' => 'photography', 'tags' => ['室内', '摄影']],
    ['name' => '室外摄影', 'category' => 'photography', 'tags' => ['室外', '摄影']],
    ['name' => '季节摄影', 'category' => 'photography', 'tags' => ['季节', '摄影']],
    ['name' => '节日摄影', 'category' => 'photography', 'tags' => ['节日', '摄影']],
    ['name' => '文化摄影', 'category' => 'photography', 'tags' => ['文化', '摄影']],
    ['name' => '艺术摄影', 'category' => 'photography', 'tags' => ['艺术', '摄影']],
    ['name' => '科技摄影', 'category' => 'technology', 'tags' => ['科技', '摄影']],
    ['name' => '医疗摄影', 'category' => 'healthcare', 'tags' => ['医疗', '摄影']],
    ['name' => '教育摄影', 'category' => 'education', 'tags' => ['教育', '摄影']],
    ['name' => '军事摄影', 'category' => 'military', 'tags' => ['军事', '摄影']],
    ['name' => '历史摄影', 'category' => 'history', 'tags' => ['历史', '摄影']],
    ['name' => '体育摄影', 'category' => 'sports', 'tags' => ['体育', '摄影']],
    ['name' => '音乐摄影', 'category' => 'music', 'tags' => ['音乐', '摄影']],
    ['name' => '舞蹈摄影', 'category' => 'art', 'tags' => ['舞蹈', '摄影']],
    ['name' => '戏剧摄影', 'category' => 'art', 'tags' => ['戏剧', '摄影']],
    ['name' => '电影摄影', 'category' => 'cinema', 'tags' => ['电影', '摄影']]
];

// 生成50张图片数据
$images = [];
$authors = ['摄影师小王', '摄影师小李', '摄影师小张', '摄影师小陈', '摄影师小刘'];

for ($i = 0; $i < 50; $i++) {
    $category = $categories[$i % count($categories)];
    $author = $authors[array_rand($authors)];
    $title = $category['name'] . ' ' . ($i + 1);
    $prompt = urlencode($category['name'] . ' professional photography, high quality, beautiful');
    $url = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=$prompt";
    
    $images[] = [
        'title' => $title,
        'author' => $author,
        'url' => $url,
        'tags' => implode(',', $category['tags']),
        'category' => $category['category'],
        'created_at' => date('Y-m-d H:i:s')
    ];
}

try {
    // 连接数据库
    $database = new Database();
    $db = $database->getConnection();
    
    // 准备插入语句
    $sql = "INSERT INTO images (title, author, url, tags, category, created_at) VALUES (:title, :author, :url, :tags, :category, :created_at)";
    $stmt = $db->prepare($sql);
    
    // 执行插入
    $insertCount = 0;
    foreach ($images as $image) {
        $stmt->bindParam(':title', $image['title']);
        $stmt->bindParam(':author', $image['author']);
        $stmt->bindParam(':url', $image['url']);
        $stmt->bindParam(':tags', $image['tags']);
        $stmt->bindParam(':category', $image['category']);
        $stmt->bindParam(':created_at', $image['created_at']);
        
        if ($stmt->execute()) {
            $insertCount++;
        }
    }
    
    // 返回成功响应
    http_response_code(200);
    echo json_encode([
        "message" => "图片数据导入成功",
        "code" => 200,
        "imported_count" => $insertCount,
        "total_count" => count($images)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // 捕获异常
    error_log('Database error: ' . $e->getMessage());
    
    // 返回错误响应
    http_response_code(500);
    echo json_encode([
        "message" => "数据库操作失败: " . $e->getMessage(),
        "code" => 500
    ], JSON_UNESCAPED_UNICODE);
}
?>