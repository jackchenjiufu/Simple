<?php
/**
 * 公共 CORS 头处理
 * 统一管理跨域设置，所有 admin API 文件引入此文件
 */
// 获取请求来源
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// 允许的域名列表（可根据需要扩展）
$allowedOrigins = [
    'http://localhost',
    'http://127.0.0.1',
    'http://139.196.185.197',
    'http://139.196.185.197:7070',
    'null'
];

// 如果请求来源在允许列表中，反射该来源以支持 credentials: include
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header("Access-Control-Allow-Credentials: true");
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// 处理 OPTIONS 预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
