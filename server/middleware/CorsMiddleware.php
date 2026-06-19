<?php
/**
 * CORS 中间件
 * 处理跨域请求，设置适当的 CORS 头
 */
require_once __DIR__ . '/Middleware.php';
require_once __DIR__ . '/../config/Config.php';

class CorsMiddleware extends Middleware {
    /**
     * 处理请求
     * @param array $request 请求数据
     * @return array 响应数据
     */
    public function handle($request) {
        // 从配置中获取允许的源
        $allowedOrigins = Config::get('api.allowed_origins');
        
        // 获取请求的 Origin 头
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
        
        // 检查 Origin 是否在允许列表中
        if (in_array('*', $allowedOrigins) || in_array($origin, $allowedOrigins)) {
            // 设置 CORS 头
            header("Access-Control-Allow-Origin: {$origin}");
        }
        
        // 设置其他 CORS 头
        header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
        header("Access-Control-Allow-Credentials: true");
        header("Access-Control-Max-Age: 3600");
        
        // 处理 OPTIONS 请求
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        
        // 调用下一个中间件
        return $this->callNext($request);
    }
}
?>