<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
} catch (Exception $e) {
    echo json_encode(['code' => 500, 'message' => '数据库连接失败']);
    exit;
}

// 获取POST数据
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// 验证数据
if (!isset($data['title']) || !isset($data['content']) || !isset($data['author'])) {
    echo json_encode(['code' => 400, 'message' => '缺少必要参数']);
    exit;
}

// 提取数据
$title = $data['title'];
$content = $data['content'];
$author = $data['author'];
$tags = isset($data['tags']) ? $data['tags'] : '';
$category = isset($data['category']) ? $data['category'] : 'article';
$user_id = isset($data['user_id']) ? (int)$data['user_id'] : 1;
$created_at = date('Y-m-d H:i:s');

// 插入文章数据
try {
    $stmt = $pdo->prepare("INSERT INTO articles (title, content, author, tags, category, user_id, created_at) VALUES (:title, :content, :author, :tags, :category, :user_id, :created_at)");
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':content', $content);
    $stmt->bindParam(':author', $author);
    $stmt->bindParam(':tags', $tags);
    $stmt->bindParam(':category', $category);
    $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
    $stmt->bindParam(':created_at', $created_at);
    $stmt->execute();
    
    // 获取插入的文章ID
    $article_id = $pdo->lastInsertId();
    
    // 返回成功响应
    echo json_encode([
        'code' => 200,
        'message' => '文章发布成功',
        'data' => [
            'article_id' => $article_id,
            'title' => $title,
            'author' => $author,
            'created_at' => $created_at
        ]
    ]);
} catch (PDOException $e) {
    echo json_encode(['code' => 500, 'message' => '发布失败: ' . $e->getMessage()]);
    exit;
}
?>