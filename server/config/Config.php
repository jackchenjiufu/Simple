<?php
/**
 * 配置管理类
 * 集中管理数据库连接、API 密钥等配置信息
 */

class Config {
    /**
     * 配置数据
     * @var array
     */
    private static $config = [];
    
    /** @var array 环境变量缓存 */
    private static $env = null;

    /**
     * 加载 .env 配置文件
     */
    private static function loadEnv() {
        if (self::$env !== null) return;
        self::$env = [];
        $envFile = __DIR__ . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0) continue;
                if (strpos($line, '=') === false) continue;
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                // 移除可选引号
                if ((strpos($value, '"') === 0 && strrpos($value, '"') === strlen($value)-1) ||
                    (strpos($value, "'") === 0 && strrpos($value, "'") === strlen($value)-1)) {
                    $value = substr($value, 1, -1);
                }
                self::$env[$key] = $value;
            }
        }
    }

    /**
     * 获取环境变量值
     */
    private static function env($key, $default = null) {
        self::loadEnv();
        return isset(self::$env[$key]) ? self::$env[$key] : $default;
    }

    /**
     * 初始化配置
     */
    public static function init() {
        // 基础配置
        $config = [
            'database' => [
                'host' => self::env('DB_HOST', 'localhost'),
                'port' => (int)self::env('DB_PORT', 3306),
                'dbname' => self::env('DB_NAME', 'doo-app'),
                'username' => self::env('DB_USER', 'root'),
                'password' => self::env('DB_PASS', ''),
                'charset' => 'utf8mb4',
                'options' => []
            ],
            'api' => [
                'version' => '1.0.0',
                'prefix' => '/api',
                'allowed_origins' => array_map('trim', explode(',', self::env('CORS_ORIGIN', '*'))),
                'token_expiry' => 3600,
                'secret_key' => self::env('API_SECRET', 'your_secret_key_here')
            ],
            'logging' => [
                'enabled' => true,
                'level' => 'info',
                'log_file' => self::env('LOG_FILE', __DIR__ . '/../logs/api.log')
            ],
            'upload' => [
                'path' => self::env('UPLOAD_PATH', __DIR__ . '/../uploads'),
                'max_size' => (int)self::env('UPLOAD_MAX_SIZE', 5 * 1024 * 1024),
                'allowed_types' => ['jpg', 'jpeg', 'png', 'gif', 'webp']
            ],
            'smtp' => [
                'enabled' => self::env('SMTP_ENABLED', 'true') === 'true',
                'host' => self::env('SMTP_HOST', 'smtp.qq.com'),
                'port' => (int)self::env('SMTP_PORT', 465),
                'secure' => self::env('SMTP_SECURE', 'ssl'),
                'user' => self::env('SMTP_USER', ''),
                'pass' => self::env('SMTP_PASS', ''),
                'from_email' => self::env('SMTP_FROM', 'chensauce@qq.com'),
                'from_name' => self::env('SMTP_FROM_NAME', 'DOO 应用')
            ]
        ];
        
        // 只有当 PDO 扩展可用时，才添加 PDO 选项
        if (class_exists('PDO')) {
            $config['database']['options'] = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ];
        }
        
        self::$config = $config;
    }
    
    /**
     * 获取配置值
     * @param string $key 配置键名，支持点号分隔的路径
     * @param mixed $default 默认值
     * @return mixed 配置值
     */
    public static function get($key, $default = null) {
        if (empty(self::$config)) {
            self::init();
        }
        
        $parts = explode('.', $key);
        $value = self::$config;
        
        foreach ($parts as $part) {
            if (!isset($value[$part])) {
                return $default;
            }
            $value = $value[$part];
        }
        
        return $value;
    }
    
    /**
     * 设置配置值
     * @param string $key 配置键名
     * @param mixed $value 配置值
     */
    public static function set($key, $value) {
        if (empty(self::$config)) {
            self::init();
        }
        
        $parts = explode('.', $key);
        $config = &self::$config;
        
        foreach ($parts as $i => $part) {
            if ($i === count($parts) - 1) {
                $config[$part] = $value;
            } else {
                if (!isset($config[$part])) {
                    $config[$part] = [];
                }
                $config = &$config[$part];
            }
        }
    }
    
    /**
     * 获取数据库连接配置
     * @return array 数据库配置
     */
    public static function getDatabaseConfig() {
        return self::get('database');
    }
    
    /**
     * 获取 API 配置
     * @return array API 配置
     */
    public static function getApiConfig() {
        return self::get('api');
    }
    
    /**
     * 获取日志配置
     * @return array 日志配置
     */
    public static function getLoggingConfig() {
        return self::get('logging');
    }
    
    /**
     * 获取上传配置
     * @return array 上传配置
     */
    public static function getUploadConfig() {
        return self::get('upload');
    }
}

// 初始化配置
Config::init();
?>