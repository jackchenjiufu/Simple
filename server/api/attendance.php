<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/Database.php';

$database = new Database();
$db = $database->getConnection();

// 创建表
$db->exec("CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    check_in DATETIME NULL,
    check_out DATETIME NULL,
    duration DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['code' => 400, 'message' => '缺少用户ID']);
        exit;
    }

    // 今日状态
    $today = date('Y-m-d');
    $stmt = $db->prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?");
    $stmt->execute([$userId, $today]);
    $todayRecord = $stmt->fetch(PDO::FETCH_ASSOC);

    $clockedIn = $todayRecord && !$todayRecord['check_out'];
    $todayHours = '0.0';

    if ($todayRecord) {
        if ($todayRecord['check_out']) {
            $todayHours = number_format((float)$todayRecord['duration'], 1);
        } elseif ($todayRecord['check_in']) {
            $seconds = time() - strtotime($todayRecord['check_in']);
            $todayHours = number_format($seconds / 3600, 1);
        }
    }

    // 最近记录
    $stmt = $db->prepare("SELECT * FROM attendance WHERE user_id = ? ORDER BY date DESC LIMIT 10");
    $stmt->execute([$userId]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'code' => 200,
        'data' => [
            'clocked_in' => $clockedIn,
            'today_hours' => $todayHours,
            'records' => $records
        ]
    ]);

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'));
    $userId = (int)($data->user_id ?? 0);
    $action = $data->action ?? '';

    if (!$userId || !in_array($action, ['check_in', 'check_out'])) {
        http_response_code(400);
        echo json_encode(['code' => 400, 'message' => '参数错误']);
        exit;
    }

    $today = date('Y-m-d');
    $now = date('Y-m-d H:i:s');

    if ($action === 'check_in') {
        $stmt = $db->prepare("INSERT INTO attendance (user_id, date, check_in) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE check_in = VALUES(check_in), check_out = NULL, duration = 0");
        $stmt->execute([$userId, $today, $now]);
        echo json_encode(['code' => 200, 'message' => '上班打卡成功']);
    } else {
        $stmt = $db->prepare("SELECT * FROM attendance WHERE user_id = ? AND date = ?");
        $stmt->execute([$userId, $today]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$record || !$record['check_in']) {
            echo json_encode(['code' => 400, 'message' => '尚未上班打卡']);
            exit;
        }

        $seconds = time() - strtotime($record['check_in']);
        $duration = round($seconds / 3600, 2);

        $stmt = $db->prepare("UPDATE attendance SET check_out = ?, duration = ? WHERE id = ?");
        $stmt->execute([$now, $duration, $record['id']]);
        echo json_encode(['code' => 200, 'message' => '下班打卡成功', 'data' => ['duration' => $duration]]);
    }
}
