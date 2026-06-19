<?php
header('Content-Type: application/json');

require_once '../config/database.php';

$database = new Database();
$conn = $database->getConnection();

try {
    $stmt = $conn->query("SHOW TABLES LIKE 'videos'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    $response = array(
        'code' => 200,
        'message' => '检查完成',
        'data' => array(
            'videos_table_exists' => in_array('videos', $tables),
            'tables' => $tables
        )
    );
    
    if (in_array('videos', $tables)) {
        $stmt = $conn->query("SELECT COUNT(*) as count FROM videos");
        $count = $stmt->fetch(PDO::FETCH_ASSOC);
        $response['data']['video_count'] = $count['count'];
        
        $stmt = $conn->query("SELECT * FROM videos LIMIT 1");
        $sample = $stmt->fetch(PDO::FETCH_ASSOC);
        $response['data']['sample_video'] = $sample;
    }
    
    echo json_encode($response);
} catch (PDOException $e) {
    echo json_encode(array(
        'code' => 500,
        'message' => '数据库错误: ' . $e->getMessage()
    ));
}
