<?php
header("Content-Type: application/json; charset=UTF-8");

include_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $result = [
        "status" => "success",
        "steps" => []
    ];

    $result["steps"][] = [
        "step" => 1,
        "name" => "添加 role 字段",
        "status" => "running",
        "message" => "正在添加 role 字段..."
    ];

    $query = "ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' COMMENT '用户角色：user/admin' AFTER password";
    try {
        $db->exec($query);
        $result["steps"][] = [
            "step" => 1,
            "name" => "添加 role 字段",
            "status" => "success",
            "message" => "role 字段添加成功"
        ];
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            $result["steps"][] = [
                "step" => 1,
                "name" => "添加 role 字段",
                "status" => "skipped",
                "message" => "role 字段已存在，跳过"
            ];
        } else {
            throw $e;
        }
    }

    $result["steps"][] = [
        "step" => 2,
        "name" => "更新 admin 用户角色",
        "status" => "running",
        "message" => "正在更新 admin 用户角色..."
    ];

    $query = "UPDATE users SET role = 'admin' WHERE username = 'admin'";
    $stmt = $db->prepare($query);
    $stmt->execute();

    $result["steps"][] = [
        "step" => 2,
        "name" => "更新 admin 用户角色",
        "status" => "success",
        "message" => "admin 用户角色更新成功"
    ];

    $result["steps"][] = [
        "step" => 3,
        "name" => "验证 role 字段",
        "status" => "running",
        "message" => "正在验证 role 字段..."
    ];

    $query = "SHOW COLUMNS FROM users LIKE 'role'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $roleColumn = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($roleColumn) {
        $result["steps"][] = [
            "step" => 3,
            "name" => "验证 role 字段",
            "status" => "success",
            "message" => "role 字段验证成功"
        ];
    } else {
        $result["steps"][] = [
            "step" => 3,
            "name" => "验证 role 字段",
            "status" => "error",
            "message" => "role 字段验证失败"
        ];
    }

    $result["steps"][] = [
        "step" => 4,
        "name" => "验证 admin 用户角色",
        "status" => "running",
        "message" => "正在验证 admin 用户角色..."
    ];

    $query = "SELECT id, username, role FROM users WHERE username = 'admin'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $adminUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($adminUser && isset($adminUser['role']) && $adminUser['role'] === 'admin') {
        $result["steps"][] = [
            "step" => 4,
            "name" => "验证 admin 用户角色",
            "status" => "success",
            "message" => "admin 用户角色验证成功",
            "data" => $adminUser
        ];
    } else {
        $result["steps"][] = [
            "step" => 4,
            "name" => "验证 admin 用户角色",
            "status" => "error",
            "message" => "admin 用户角色验证失败",
            "data" => $adminUser
        ];
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "执行失败",
        "error" => $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}
?>