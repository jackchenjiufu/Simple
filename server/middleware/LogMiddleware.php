<?php
/**
 * 日志中间件
 * 记录请求和响应日志
 */
require_once __DIR__ . '/Middleware.php';
require_once __DIR__ . '/../config/Config.php';

class LogMiddleware extends Middleware {
    /**
     * 处理请求
     * @param array $request 请求数据
     * @return array 响应数据
     */
    public function handle($request) {
        // 开始时间
        $startTime = microtime(true);
        
        // 记录请求信息
        $this->logRequest($request, $startTime);
        
        // 调用下一个中间件
        $response = $this->callNext($request);
        
        // 结束时间
        $endTime = microtime(true);
        // 计算处理时间
        $processingTime = ($endTime - $startTime) * 1000; // 转换为毫秒
        
        // 记录响应信息
        $this->logResponse($response, $processingTime);
        
        return $response;
    }
    
    /**
     * 记录请求信息
     * @param array $request 请求数据
     * @param float $startTime 开始时间
     */
    private function logRequest($request, $startTime) {
        if (!Config::get('logging.enabled')) {
            return;
        }
        
        $logData = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'type' => 'request',
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'ip' => $this->getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? '',
            'request_data' => $request,
            'start_time' => $startTime
        ];
        
        $this->writeLog($logData);
    }
    
    /**
     * 记录响应信息
     * @param array $response 响应数据
     * @param float $processingTime 处理时间（毫秒）
     */
    private function logResponse($response, $processingTime) {
        if (!Config::get('logging.enabled')) {
            return;
        }
        
        $logData = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'type' => 'response',
            'method' => $_SERVER['REQUEST_METHOD'],
            'uri' => $_SERVER['REQUEST_URI'],
            'status_code' => $response['code'] ?? 200,
            'message' => $response['message'] ?? '',
            'processing_time_ms' => round($processingTime, 2)
        ];
        
        $this->writeLog($logData);
    }
    
    /**
     * 获取客户端 IP 地址
     * @return string 客户端 IP 地址
     */
    private function getClientIp() {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (isset($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                // 处理多个 IP 地址的情况（例如通过代理）
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                return $ip;
            }
        }
        
        return 'unknown';
    }
    
    /**
     * 写入日志
     * @param array $logData 日志数据
     */
    private function writeLog($logData) {
        $logFile = Config::get('logging.log_file');
        $logDir = dirname($logFile);
        
        // 确保日志目录存在
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        // 格式化日志数据
        $logLine = json_encode($logData, JSON_UNESCAPED_UNICODE) . PHP_EOL;
        
        // 写入日志文件
        file_put_contents($logFile, $logLine, FILE_APPEND | LOCK_EX);
    }
}
?>