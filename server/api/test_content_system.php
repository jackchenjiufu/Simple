<?php
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 测试结果数组
$testResults = array();

// 测试函数
function runTest($name, $callback) {
    global $testResults;
    
    try {
        $result = $callback();
        $testResults[] = array(
            "name" => $name,
            "status" => "success",
            "message" => $result
        );
    } catch (Exception $e) {
        $testResults[] = array(
            "name" => $name,
            "status" => "failed",
            "message" => $e->getMessage()
        );
    }
}

try {
    // 创建数据库连接
    $database = new Database();
    $db = $database->getConnection();
    
    // 测试1: 检查content表是否存在
    runTest("检查content表是否存在", function() use ($db) {
        $sql = "SHOW TABLES LIKE 'content'";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $tableExists = $stmt->rowCount() > 0;
        
        if ($tableExists) {
            return "content表存在";
        } else {
            throw new Exception("content表不存在");
        }
    });
    
    // 测试2: 检查content表结构
    runTest("检查content表结构", function() use ($db) {
        $sql = "SHOW COLUMNS FROM content";
        $stmt = $db->prepare($sql);
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $requiredColumns = array('id', 'user_id', 'title', 'content', 'image_url', 'video_url', 'likes', 'comments', 'status', 'created_at', 'updated_at');
        $missingColumns = array();
        
        foreach ($requiredColumns as $column) {
            $columnExists = false;
            foreach ($columns as $col) {
                if ($col['Field'] === $column) {
                    $columnExists = true;
                    break;
                }
            }
            if (!$columnExists) {
                $missingColumns[] = $column;
            }
        }
        
        if (empty($missingColumns)) {
            return "content表结构完整，包含所有必要字段";
        } else {
            throw new Exception("content表缺少字段: " . implode(', ', $missingColumns));
        }
    });
    
    // 测试3: 测试获取内容列表
    runTest("测试获取内容列表", function() {
        $url = 'http://localhost:8080/server/api/content.php';
        $response = file_get_contents($url);
        $data = json_decode($response, true);
        
        if ($data && $data['code'] === 200) {
            return "获取内容列表成功，共 " . $data['data']['total'] . " 条内容";
        } else {
            throw new Exception("获取内容列表失败: " . ($data['message'] ?? '未知错误'));
        }
    });
    
    // 测试4: 测试推荐系统
    runTest("测试推荐系统", function() {
        $url = 'http://localhost:8080/server/api/recommend.php';
        $response = file_get_contents($url);
        $data = json_decode($response, true);
        
        if ($data && $data['code'] === 200) {
            $count = count($data['data']['recommendations']);
            return "推荐系统工作正常，返回了 " . $count . " 条推荐内容";
        } else {
            throw new Exception("推荐系统失败: " . ($data['message'] ?? '未知错误'));
        }
    });
    
    // 计算测试结果
    $successCount = 0;
    $failedCount = 0;
    
    foreach ($testResults as $test) {
        if ($test['status'] === 'success') {
            $successCount++;
        } else {
            $failedCount++;
        }
    }
    
    // 返回测试结果
    http_response_code(200);
    echo json_encode(array(
        "message" => "测试完成",
        "code" => 200,
        "data" => array(
            "total_tests" => count($testResults),
            "success_count" => $successCount,
            "failed_count" => $failedCount,
            "test_results" => $testResults
        )
    ), JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // 捕获异常
    http_response_code(500);
    echo json_encode(array(
        "message" => "测试过程中发生错误: " . $e->getMessage(),
        "code" => 500
    ), JSON_UNESCAPED_UNICODE);
}
?>