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

    $query = "SHOW TABLES LIKE 'users'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($tables) > 0) {
        $result["checks"][] = [
            "name" => "users表存在",
            "status" => "success",
            "message" => "users表存在"
        ];

        $query = "SHOW COLUMNS FROM users LIKE 'role'";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $roleColumn = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($roleColumn) {
            $result["checks"][] = [
                "name" => "role字段存在",
                "status" => "success",
                "message" => "role字段存在"
            ];
        } else {
            $result["checks"][] = [
                "name" => "role字段存在",
                "status" => "error",
                "message" => "role字段不存在，请执行admin_update.sql"
            ];
        }

        $query = "SELECT id, username, nickname, role FROM users WHERE username = 'admin'";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $adminUser = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($adminUser) {
            $result["checks"][] = [
                "name" => "管理员账号存在",
                "status" => "success",
                "message" => "管理员账号存在",
                "data" => $adminUser
            ];
        } else {
            $result["checks"][] = [
                "name" => "管理员账号存在",
                "status" => "error",
                "message" => "管理员账号不存在，请执行admin_update.sql"
            ];
        }

        $query = "SELECT COUNT(*) as count FROM users";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        $result["checks"][] = [
            "name" => "用户总数",
            "status" => "success",
            "message" => "用户总数: " . $count['count']
        ];

    } else {
        $result["checks"][] = [
            "name" => "users表存在",
            "status" => "error",
            "message" => "users表不存在，请先创建数据库"
        ];
    }

    $query = "SHOW TABLES LIKE 'carousels'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (count($tables) > 0) {
        $result["checks"][] = [
            "name" => "carousels表存在",
            "status" => "success",
            "message" => "carousels表存在"
        ];
    } else {
        $result["checks"][] = [
            "name" => "carousels表存在",
            "status" => "warning",
            "message" => "carousels表不存在，请执行admin_update.sql"
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