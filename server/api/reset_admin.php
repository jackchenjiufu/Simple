<?php
header("Content-Type: application/json; charset=UTF-8");

include_once __DIR__ . '/../config/Database.php';

try {
    $database = new Database();
    $db = $database->getConnection();

    $username = 'admin';
    $password = 'admin123';
    $nickname = '系统管理员';
    $role = 'admin';

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $query = "SELECT id, username, password, role FROM users WHERE username = :username";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $username);
    $stmt->execute();
    $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existingUser) {
        $query = "UPDATE users SET password = :password, role = :role WHERE username = :username";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":role", $role);
        $stmt->bindParam(":username", $username);

        if ($stmt->execute()) {
            echo json_encode([
                "status" => "success",
                "message" => "管理员密码已重置",
                "username" => $username,
                "role" => $role
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                "status" => "error",
                "message" => "更新失败"
            ], JSON_UNESCAPED_UNICODE);
        }
    } else {
        $query = "INSERT INTO users (username, password, nickname, role) VALUES (:username, :password, :nickname, :role)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":nickname", $nickname);
        $stmt->bindParam(":role", $role);

        if ($stmt->execute()) {
            echo json_encode([
                "status" => "success",
                "message" => "管理员账号已创建",
                "username" => $username,
                "role" => $role
            ], JSON_UNESCAPED_UNICODE);
        } else {
            echo json_encode([
                "status" => "error",
                "message" => "创建失败"
            ], JSON_UNESCAPED_UNICODE);
        }
    }

} catch (Exception $e) {
    echo json_encode([
        "status" => "error",
        "message" => "服务器内部错误"
    ], JSON_UNESCAPED_UNICODE);
}
?>