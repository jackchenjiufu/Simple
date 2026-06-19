<?php
/**
 * 错误处理中间件
 * 捕获和处理请求处理过程中的错误
 */
require_once __DIR__ . '/Middleware.php';
require_once __DIR__ . '/../config/Config.php';

class ErrorMiddleware extends Middleware {
    /**
     * 处理请求
     * @param array $request 请求数据
     * @return array 响应数据
     */
    public function handle($request) {
        try {
            // 调用下一个中间件
            return $this->callNext($request);
        } catch (Exception $e) {
            // 捕获异常并处理
            return $this->handleException($e);
        } catch (Error $e) {
            // 捕获错误并处理
            return $this->handleError($e);
        }
    }
    
    /**
     * 处理异常
     * @param Exception $e 异常对象
     * @return array 错误响应
     */
    private function handleException(Exception $e) {
        // 记录异常信息
        $this->logException($e);

        // 根据异常类型返回不同的响应
        $statusCode = $this->getStatusCodeForException($e);
        $message = $this->getMessageForException($e);

        // 设置 HTTP 状态码
        http_response_code($statusCode);

        // 返回错误响应 — 生产环境不暴露内部详情
        $response = [
            'code' => $statusCode,
            'message' => $message
        ];

        // 仅调试模式暴露堆栈信息
        if (Config::get('api.debug', false)) {
            $response['error'] = [
                'type' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ];
        }

        return $response;
    }
    
    /**
     * 处理错误
     * @param Error $e 错误对象
     * @return array 错误响应
     */
    private function handleError(Error $e) {
        // 记录错误信息
        $this->logError($e);

        $statusCode = 500;
        http_response_code($statusCode);

        // 生产环境不暴露内部错误详情
        $response = [
            'code' => $statusCode,
            'message' => '服务器内部错误'
        ];

        if (Config::get('api.debug', false)) {
            $response['error'] = [
                'type' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ];
        }

        return $response;
    }
    
    /**
     * 记录异常信息
     * @param Exception $e 异常对象
     */
    private function logException(Exception $e) {
        if (!Config::get('logging.enabled')) {
            return;
        }
        
        $logData = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'type' => 'exception',
            'method' => $_SERVER['REQUEST_METHOD'] ?? '',
            'uri' => $_SERVER['REQUEST_URI'] ?? '',
            'exception' => [
                'type' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]
        ];
        
        $this->writeLog($logData);
    }
    
    /**
     * 记录错误信息
     * @param Error $e 错误对象
     */
    private function logError(Error $e) {
        if (!Config::get('logging.enabled')) {
            return;
        }
        
        $logData = [
            'timestamp' => date('Y-m-d H:i:s.u'),
            'type' => 'error',
            'method' => $_SERVER['REQUEST_METHOD'] ?? '',
            'uri' => $_SERVER['REQUEST_URI'] ?? '',
            'error' => [
                'type' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]
        ];
        
        $this->writeLog($logData);
    }
    
    /**
     * 获取异常对应的 HTTP 状态码
     * @param Exception $e 异常对象
     * @return int HTTP 状态码
     */
    private function getStatusCodeForException(Exception $e) {
        // 默认状态码
        $statusCode = 500;
        
        // 根据异常类型设置不同的状态码
        $exceptionClass = get_class($e);
        
        // 这里可以根据实际的异常类型设置不同的状态码
        // 例如：
        // if ($exceptionClass === 'UnauthorizedException') {
        //     $statusCode = 401;
        // } elseif ($exceptionClass === 'NotFoundException') {
        //     $statusCode = 404;
        // }
        
        return $statusCode;
    }
    
    /**
     * 获取异常对应的错误消息
     * @param Exception $e 异常对象
     * @return string 错误消息
     */
    private function getMessageForException(Exception $e) {
        // 默认错误消息
        $message = '服务器内部错误';
        
        // 根据异常类型设置不同的错误消息
        $exceptionClass = get_class($e);
        
        // 这里可以根据实际的异常类型设置不同的错误消息
        // 例如：
        // if ($exceptionClass === 'UnauthorizedException') {
        //     $message = '未授权访问';
        // } elseif ($exceptionClass === 'NotFoundException') {
        //     $message = '资源不存在';
        // }
        
        return $message;
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