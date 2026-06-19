<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$input = json_decode(file_get_contents('php://input'), true);
$msg = $input['message'] ?? '';

if (!$msg) {
    echo json_encode(['code' => 400, 'message' => '请输入问题']);
    exit;
}

$ch = curl_init('http://192.168.1.10:8080/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => 'gpt-3.5-turbo',
        'messages' => [['role' => 'user', 'content' => $msg]],
        'max_tokens' => 300
    ]),
    CURLOPT_TIMEOUT => 60,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if (httpCode !== 200) {
    echo json_encode(['code' => 500, 'message' => 'AI服务请求失败']);
    exit;
}

$data = json_decode($response, true);
$reply = $data['choices'][0]['message']['content'] ?? '';

echo json_encode(['code' => 200, 'reply' => $reply], JSON_UNESCAPED_UNICODE);
