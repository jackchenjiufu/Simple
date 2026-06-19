<?php
/**
 * system_monitor.php - 系统监控API接口
 * 
 * 功能：
 * - 提供服务器状态监控
 * - 提供数据库状态监控
 * - 提供API响应时间监控
 * - 提供系统资源使用情况监控
 */

// 启动session，用于管理员认证
session_start();
// 设置CORS头，允许跨域请求
// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");
// 允许的HTTP方法
header("Access-Control-Allow-Methods: GET");
// 允许的请求头
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 验证session中是否存在管理员标识（必须登录才能使用管理功能）
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    // 返回401未授权状态码
    http_response_code(401);
    echo json_encode(array("message" => "未授权访问", "code" => 401));
    exit;
}

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

// 服务器状态监控
function getServerStatus() {
    $status = array();
    
    // PHP版本
    $status['php_version'] = PHP_VERSION;
    
    // 服务器软件
    $status['server_software'] = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
    
    // 服务器时间
    $status['server_time'] = date('Y-m-d H:i:s');
    
    // 服务器时区
    $status['timezone'] = date_default_timezone_get();
    
    // 内存使用情况
    if (function_exists('memory_get_usage')) {
        $status['memory_usage'] = array(
            'current' => round(memory_get_usage() / 1024 / 1024, 2) . ' MB',
            'peak' => round(memory_get_peak_usage() / 1024 / 1024, 2) . ' MB'
        );
    }
    
    // 磁盘空间使用情况
    if (function_exists('disk_free_space') && function_exists('disk_total_space')) {
        $rootPath = '/';
        if (PHP_OS === 'WINNT') {
            $rootPath = 'C:';
        }
        
        try {
            $freeSpace = disk_free_space($rootPath);
            $totalSpace = disk_total_space($rootPath);
            $usedSpace = $totalSpace - $freeSpace;
            
            $status['disk_space'] = array(
                'total' => round($totalSpace / 1024 / 1024 / 1024, 2) . ' GB',
                'used' => round($usedSpace / 1024 / 1024 / 1024, 2) . ' GB',
                'free' => round($freeSpace / 1024 / 1024 / 1024, 2) . ' GB',
                'usage_percent' => round(($usedSpace / $totalSpace) * 100, 2) . '%'
            );
        } catch (Exception $e) {
            $status['disk_space'] = '无法获取磁盘空间信息';
        }
    }
    
    // CPU负载（仅Linux系统）
    if (PHP_OS === 'Linux' && function_exists('sys_getloadavg')) {
        $loadAvg = sys_getloadavg();
        $status['cpu_load'] = array(
            '1min' => round($loadAvg[0], 2),
            '5min' => round($loadAvg[1], 2),
            '15min' => round($loadAvg[2], 2)
        );
    }
    
    return $status;
}

// 数据库状态监控
function getDatabaseStatus($db) {
    $status = array();
    
    try {
        // 数据库连接状态
        $status['connection_status'] = 'Connected';
        
        // 数据库版本
        $versionQuery = "SELECT VERSION() as version";
        $versionStmt = $db->query($versionQuery);
        $version = $versionStmt->fetch(PDO::FETCH_ASSOC);
        $status['database_version'] = $version['version'] ?? 'Unknown';
        
        // 数据库连接数
        $connectionsQuery = "SHOW GLOBAL STATUS LIKE 'Threads_connected'";
        $connectionsStmt = $db->query($connectionsQuery);
        $connections = $connectionsStmt->fetch(PDO::FETCH_ASSOC);
        $status['connections'] = $connections['Value'] ?? 'Unknown';
        
        // 数据库查询次数
        $queriesQuery = "SHOW GLOBAL STATUS LIKE 'Queries'";
        $queriesStmt = $db->query($queriesQuery);
        $queries = $queriesStmt->fetch(PDO::FETCH_ASSOC);
        $status['queries'] = $queries['Value'] ?? 'Unknown';
        
        // 表状态
        $tablesQuery = "SHOW TABLE STATUS";
        $tablesStmt = $db->query($tablesQuery);
        $tables = $tablesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $status['tables'] = array(
            'count' => count($tables),
            'details' => array()
        );
        
        foreach ($tables as $table) {
            $status['tables']['details'][] = array(
                'name' => $table['Name'],
                'rows' => $table['Rows'],
                'data_size' => round($table['Data_length'] / 1024 / 1024, 2) . ' MB',
                'index_size' => round($table['Index_length'] / 1024 / 1024, 2) . ' MB'
            );
        }
        
    } catch (Exception $e) {
        $status['connection_status'] = 'Error';
        $status['error_message'] = $e->getMessage();
    }
    
    return $status;
}

// API响应时间监控
function getApiResponseTime($db) {
    $apis = array(
        '/api/users.php',
        '/api/content.php',
        '/api/admin_stats.php',
        '/api/admin_logs.php'
    );
    
    $responseTimes = array();
    
    foreach ($apis as $api) {
        $startTime = microtime(true);
        
        try {
            // 模拟API请求
            if ($api === '/api/users.php') {
                $query = "SELECT COUNT(*) as count FROM users LIMIT 1";
                $stmt = $db->query($query);
                $stmt->fetch();
            } else if ($api === '/api/content.php') {
                $query = "SELECT COUNT(*) as count FROM content LIMIT 1";
                $stmt = $db->query($query);
                $stmt->fetch();
            } else if ($api === '/api/admin_stats.php') {
                $query = "SELECT COUNT(*) as count FROM users";
                $stmt = $db->query($query);
                $stmt->fetch();
            } else if ($api === '/api/admin_logs.php') {
                $query = "SELECT COUNT(*) as count FROM logs";
                $stmt = $db->query($query);
                $stmt->fetch();
            }
            
            $endTime = microtime(true);
            $responseTime = round(($endTime - $startTime) * 1000, 2);
            
            $responseTimes[] = array(
                'api' => $api,
                'response_time_ms' => $responseTime,
                'status' => 'OK'
            );
            
        } catch (Exception $e) {
            $endTime = microtime(true);
            $responseTime = round(($endTime - $startTime) * 1000, 2);
            
            $responseTimes[] = array(
                'api' => $api,
                'response_time_ms' => $responseTime,
                'status' => 'Error',
                'error_message' => $e->getMessage()
            );
        }
    }
    
    return $responseTimes;
}

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

// 根据请求方法执行不同操作
switch ($method) {
    // GET请求：获取系统监控信息
    case 'GET':
        $type = isset($_GET['type']) ? $_GET['type'] : 'overview';
        
        if ($type === 'overview') {
            // 获取系统概览
            $serverStatus = getServerStatus();
            $databaseStatus = getDatabaseStatus($db);
            $apiResponseTimes = getApiResponseTime($db);
            
            $result = array(
                'server_status' => $serverStatus,
                'database_status' => $databaseStatus,
                'api_response_times' => $apiResponseTimes
            );
            
            http_response_code(200);
            echo json_encode(array("message" => "获取系统监控信息成功", "code" => 200, "data" => $result));
        } else if ($type === 'server') {
            // 获取服务器状态
            $serverStatus = getServerStatus();
            
            http_response_code(200);
            echo json_encode(array("message" => "获取服务器状态成功", "code" => 200, "data" => $serverStatus));
        } else if ($type === 'database') {
            // 获取数据库状态
            $databaseStatus = getDatabaseStatus($db);
            
            http_response_code(200);
            echo json_encode(array("message" => "获取数据库状态成功", "code" => 200, "data" => $databaseStatus));
        } else if ($type === 'api') {
            // 获取API响应时间
            $apiResponseTimes = getApiResponseTime($db);
            
            http_response_code(200);
            echo json_encode(array("message" => "获取API响应时间成功", "code" => 200, "data" => $apiResponseTimes));
        }
        break;
        
    // 其他请求方法：返回405方法不允许
    default:
        http_response_code(405);
        echo json_encode(array("message" => "方法不允许", "code" => 405));
        break;
}
?>