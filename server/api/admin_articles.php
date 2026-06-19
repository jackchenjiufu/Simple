<?php
require_once __DIR__ . "/cors_headers.php";

session_start();

// 验证管理员身份
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    echo json_encode(['code' => 403, 'message' => '无权限']);
    exit;
}

// 使用统一数据库配置
require_once __DIR__ . '/../config/Database.php';
try {
    $database = new Database();
    $pdo = $database->getConnection();
} catch (Exception $e) {
    echo json_encode(['code' => 500, 'message' => '数据库连接失败']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query('SELECT * FROM articles ORDER BY created_at DESC LIMIT 10');
        $articles = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode([
            'code' => 200,
            'message' => '获取文章成功',
            'data' => $articles,
            'total' => count($articles)
        ]);
    } catch (Exception $e) {
        echo json_encode(['code' => 500, 'message' => '获取文章失败']);
    }
    exit;

} else if ($method === 'PUT') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!isset($input['id'])) {
        echo json_encode(['code' => 400, 'message' => '缺少必要参数']);
        exit;
    }

    $id = $input['id'];

    if (isset($input['top'])) {
        try {
            $stmt = $pdo->prepare('UPDATE articles SET top = :top WHERE id = :id');
            $stmt->bindParam(':top', $input['top']);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            echo json_encode(['code' => 200, 'message' => '置顶状态更新成功']);
        } catch (Exception $e) {
            echo json_encode(['code' => 500, 'message' => '操作失败']);
        }
        exit;
    }

    try {
        $fields = [];
        $params = [':id' => $id];

        foreach (['title', 'content', 'excerpt', 'author', 'status', 'cover'] as $field) {
            if (isset($input[$field])) {
                $fields[] = "$field = :$field";
                $params[":$field"] = $input[$field];
            }
        }

        if (!empty($fields)) {
            $sql = 'UPDATE articles SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        }

        echo json_encode(['code' => 200, 'message' => '更新成功']);
    } catch (Exception $e) {
        echo json_encode(['code' => 500, 'message' => '更新失败']);
    }
    exit;

} else if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? $_GET['id'] : null;
    if (!$id) {
        echo json_encode(['code' => 400, 'message' => '缺少文章ID']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM articles WHERE id = :id');
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        echo json_encode(['code' => 200, 'message' => '删除成功']);
    } catch (Exception $e) {
        echo json_encode(['code' => 500, 'message' => '删除失败']);
    }
    exit;

} else if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $title = $input['title'] ?? '';
    $content = $input['content'] ?? '';
    $excerpt = $input['excerpt'] ?? '';
    $author = $input['author'] ?? '';
    $status = $input['status'] ?? 'draft';

    if (empty($title)) {
        echo json_encode(['code' => 400, 'message' => '标题不能为空']);
        exit;
    }

    try {
        $stmt = $pdo->prepare('INSERT INTO articles (title, content, excerpt, author, status, created_at) VALUES (:title, :content, :excerpt, :author, :status, NOW())');
        $stmt->bindParam(':title', $title);
        $stmt->bindParam(':content', $content);
        $stmt->bindParam(':excerpt', $excerpt);
        $stmt->bindParam(':author', $author);
        $stmt->bindParam(':status', $status);
        $stmt->execute();

        echo json_encode(['code' => 201, 'message' => '创建成功', 'data' => ['id' => $pdo->lastInsertId()]]);
    } catch (Exception $e) {
        echo json_encode(['code' => 500, 'message' => '创建失败']);
    }
    exit;
}
