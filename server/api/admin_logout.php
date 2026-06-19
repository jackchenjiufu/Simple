<?php
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . "/cors_headers.php";
session_start();

session_unset();
session_destroy();

http_response_code(200);
echo json_encode(array("message" => "登出成功", "code" => 200));
?>