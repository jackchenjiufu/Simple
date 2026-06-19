<?php
header("Content-Type: application/json; charset=UTF-8");

include_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $result = [
        "status" => "success",
        "database" => "connected",
        "checks" => []
    ];

    $result["checks"][] = [
        "name" => "数据库连接",
        "status" => "success",
        "message" => "数据库连接成功"
    ];

    $query = "SHOW TABLES LIKE 'carousels'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($tables) > 0) {
        $result["checks"][] = [
            "name" => "carousels表存在",
            "status" => "error",
            "message" => "carousels表不存在"
        ];
    } else {
        $result["checks"][] = [
            "name" => "carousels表存在",
            "status" => "success",
            "message" => "carousels表存在"
        ];

        $query = "SELECT COUNT(*) as count FROM carousels WHERE is_active = 1";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        $result["checks"][] = [
            "name" => "启用的轮播图数量",
            "status" => "success",
            "message" => "启用的轮播图数量: " . $count['count']
        ];

        $query = "SELECT * FROM carousels WHERE is_active = 1 ORDER BY sort_order ASC LIMIT 5";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $carousels = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $result["checks"][] = [
            "name" => "轮播图数据",
            "status" => "success",
            "message" => "轮播图数据",
            "data" => $carousels
        ];
    }

    $query = "SHOW TABLES LIKE 'videos'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($tables) > 0) {
        $result["checks"][] = [
            "name" => "videos表存在",
            "status" => "error",
            "message" => "videos表不存在"
        ];
    } else {
        $result["checks"][] = [
            "name" => "videos表存在",
            "status" => "success",
            "message" => "videos表存在"
        ];

        $query = "SELECT COUNT(*) as count FROM videos";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        $result["checks"][] = [
            "name" => "视频数量",
            "status" => "success",
            "message" => "视频数量: " . $count['count']
        ];
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}
?>