<?php
/**
 * 个推推送 API
 * 绑定CID / 发送推送
 */
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/Database.php';

$input = json_decode(file_get_contents("php://input"), true);
$action = $input['action'] ?? '';

$db = (new Database())->getConnection();

switch ($action) {
    case 'bind_cid':
        // 用户登录后绑定推送CID
        $userId = intval($input['user_id'] ?? 0);
        $cid = trim($input['cid'] ?? '');
        if (!$userId || !$cid) {
            http_response_code(400);
            echo json_encode(["code" => 400, "message" => "参数不完整"], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $stmt = $db->prepare("UPDATE users SET push_cid = :cid WHERE id = :id");
        $stmt->execute(['cid' => $cid, 'id' => $userId]);
        echo json_encode(["code" => 200, "message" => "绑定成功"], JSON_UNESCAPED_UNICODE);
        break;

    case 'unbind_cid':
        // 退出登录时解绑
        $userId = intval($input['user_id'] ?? 0);
        if ($userId) {
            $stmt = $db->prepare("UPDATE users SET push_cid = NULL WHERE id = :id");
            $stmt->execute(['id' => $userId]);
        }
        echo json_encode(["code" => 200, "message" => "解绑成功"], JSON_UNESCAPED_UNICODE);
        break;

    case 'send':
        // 发送推送（管理后台调用）
        $title = trim($input['title'] ?? '');
        $content = trim($input['content'] ?? '');
        $userId = intval($input['user_id'] ?? 0);

        if (!$title || !$content) {
            http_response_code(400);
            echo json_encode(["code" => 400, "message" => "标题和内容不能为空"], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // 获取目标CID
        if ($userId) {
            $stmt = $db->prepare("SELECT push_cid FROM users WHERE id = :id AND push_cid IS NOT NULL");
            $stmt->execute(['id' => $userId]);
            $targets = [$stmt->fetchColumn()];
        } else {
            // 发给所有绑定了CID的用户
            $stmt = $db->query("SELECT push_cid FROM users WHERE push_cid IS NOT NULL");
            $targets = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }

        $targets = array_filter($targets);
        if (empty($targets)) {
            echo json_encode(["code" => 200, "message" => "无目标用户", "sent" => 0], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // 调用个推API发送
        $result = sendGetuiPush($title, $content, $targets);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(400);
        echo json_encode(["code" => 400, "message" => "未知操作"], JSON_UNESCAPED_UNICODE);
        break;
}

/**
 * 通过 DCloud UniPush REST API V3 发送推送
 */
function sendGetuiPush(string $title, string $content, array $cidList): array {
    $appId = 'o4wWFAWuXE7Ln2V0RBt59A';
    $appKey = 'LEMxKoYP59AnffZpTbmfc3';
    $appSecret = 'z5NQOgPGJzAG9LS5jIwxJ7';

    // 1. 获取 IAT Token
    $timestamp = intval(microtime(true) * 1000);
    $secretB64 = base64_encode($appSecret);
    $authUrl = 'https://api.unipush.dcloud.net.cn/rest/v3/' . $secretB64 . '/iat/auth';
    $authData = json_encode([
        'appkey' => $appKey,
        'timestamp' => $timestamp
    ]);

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $authUrl,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $authData,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $authResp = curl_exec($ch);
    $authCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($authCode !== 200) {
        curl_close($ch);
        return ["code" => 500, "message" => "UniPush认证失败", "error" => $authResp];
    }

    $authResult = json_decode($authResp, true);
    $iat = $authResult['iat'] ?? '';

    if (!$iat) {
        curl_close($ch);
        return ["code" => 500, "message" => "获取IAT失败"];
    }

    // 2. 发送推送
    $pushUrl = 'https://api.unipush.dcloud.net.cn/rest/v3/' . $appId . '/push';
    $pushData = json_encode([
        'push_token' => $cidList,
        'push_type' => 'individual',
        'title' => $title,
        'content' => $content,
        'payload' => '',
        'after_open' => 'go_app',
    ]);

    curl_setopt_array($ch, [
        CURLOPT_URL => $pushUrl,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $iat,
        ],
        CURLOPT_POSTFIELDS => $pushData,
    ]);
    $pushResp = curl_exec($ch);
    $pushCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $pushResult = json_decode($pushResp, true);

    if ($pushCode === 200 && ($pushResult['code'] ?? '') === '0') {
        return [
            "code" => 200,
            "message" => "推送成功",
            "sent" => count($cidList),
        ];
    } else {
        return [
            "code" => 500,
            "message" => "推送失败",
            "error" => $pushResp,
        ];
    }
}
