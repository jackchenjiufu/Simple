<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();

    $stmt = $pdo->query('SELECT * FROM articles LIMIT 10');
    $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'code' => 200,
        'message' => '获取文章成功',
        'data' => $articles,
        'total' => count($articles)
    ]);
} catch (Exception $e) {
    echo json_encode([
        'code' => 500,
        'message' => '数据库错误'
    ]);
}
