<?php
/**
 * 认证中间件
 * 处理用户认证和权限验证
 */
require_once __DIR__ . '/Middleware.php';

class AuthMiddleware extends Middleware {
    /**
     * 处理请求
     * @param array $request 请求数据
     * @return array 响应数据
     */
    public function handle($request) {
        // 检查用户是否已登录
        if (!isset($_SESSION['user_id'])) {
            // 检查是否有 Authorization 头
            $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
            
            if (empty($authHeader)) {
                return $this->unauthorized('未提供认证信息');
            }
            
            // 验证令牌
            if (!$this->validateToken($authHeader)) {
                return $this->unauthorized('无效的认证令牌');
            }
        }
        
        // 用户已认证，调用下一个中间件
        return $this->callNext($request);
    }
    
    /**
     * 验证令牌
     * @param string $authHeader 认证头信息
     * @return bool 是否有效
     */
    private function validateToken($authHeader) {
        // 提取令牌
        $token = str_replace('Bearer ', '', $authHeader);
        
        // 检查令牌是否存在且不为空
        if (empty($token)) {
            return false;
        }
        
        // 验证令牌格式（简单检查）
        if (!preg_match('/^[a-f0-9]{32,}$/', $token)) {
            return false;
        }
        
        // 这里可以实现更复杂的令牌验证逻辑
        // 例如：
        // 1. 从数据库或缓存中查询令牌
        // 2. 检查令牌是否过期
        // 3. 验证令牌签名
        
        // 临时实现：检查session中的token
        if (isset($_SESSION['token']) && $_SESSION['token'] === $token) {
            return true;
        }
        
        // 如果没有session token，可以添加数据库验证逻辑
        // 例如：$this->validateTokenInDatabase($token);
        
        return false;
    }
    
    /**
     * 返回未授权响应
     * @param string $message 错误信息
     * @return array 响应数据
     */
    private function unauthorized($message) {
        http_response_code(401);
        return [
            'code' => 401,
            'message' => $message
        ];
    }
}
?>