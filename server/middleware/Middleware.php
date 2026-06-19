<?php
/**
 * 中间件抽象类
 * 定义中间件的基本接口
 */
abstract class Middleware {
    /**
     * 下一个中间件
     * @var Middleware|null
     */
    protected $next;
    
    /**
     * 数据库连接
     * @var PDO
     */
    protected $db;
    
    /**
     * 构造函数
     * @param PDO $db 数据库连接
     */
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * 设置下一个中间件
     * @param Middleware $next 下一个中间件
     * @return Middleware 当前中间件实例
     */
    public function setNext(Middleware $next) {
        $this->next = $next;
        return $next;
    }
    
    /**
     * 处理请求
     * @param array $request 请求数据
     * @return array 响应数据
     */
    abstract public function handle($request);
    
    /**
     * 调用下一个中间件
     * @param array $request 请求数据
     * @return array 响应数据
     */
    protected function callNext($request) {
        if ($this->next) {
            return $this->next->handle($request);
        }
        return [
            'code' => 200,
            'message' => 'Request processed successfully'
        ];
    }
}
?>