<?php
// 引入配置管理类
require_once __DIR__ . '/Config.php';

// CORS: 从配置读取允许的源，设置统一跨域头
$__cors_allowed = Config::get('api.allowed_origins');
$__cors_origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if ($__cors_origin !== '' && (in_array('*', $__cors_allowed) || in_array($__cors_origin, $__cors_allowed))) {
    header("Access-Control-Allow-Origin: {$__cors_origin}");
    header("Access-Control-Allow-Credentials: true");
}
unset($__cors_allowed, $__cors_origin);

// OPTIONS 预检请求提前返回
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 3600");
    http_response_code(204);
    exit;
}

/**
 * 数据库连接类
 * 使用配置管理类获取数据库连接信息
 */
class Database {
    // 数据库连接对象
    public $conn;

    /**
     * 获取数据库连接方法
     * @return PDO 数据库连接对象
     * @throws Exception 数据库连接失败时抛出异常
     */
    public function getConnection() {
        // 初始化连接为null
        $this->conn = null;
        try {
            // 从配置中获取数据库连接信息
            $dbConfig = Config::getDatabaseConfig();
            
            // 创建DSN (Data Source Name)
            $dsn = sprintf(
                "mysql:host=%s;port=%d;dbname=%s;charset=%s",
                $dbConfig['host'],
                $dbConfig['port'],
                $dbConfig['dbname'],
                $dbConfig['charset']
            );
            
            // 创建PDO连接实例
            $this->conn = new PDO(
                $dsn,
                $dbConfig['username'],
                $dbConfig['password'],
                $dbConfig['options']
            );
        } catch(PDOException $exception) {
            // 记录连接错误日志
            error_log("Connection error: " . $exception->getMessage());
            // 抛出异常，包含错误信息
            throw new Exception("数据库连接失败: " . $exception->getMessage());
        }
        // 返回数据库连接对象
        return $this->conn;
    }
}
?>