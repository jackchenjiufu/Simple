<?php
/**
 * RateLimiter - 请求频率限制
 * 基于数据库记录 IP + 操作类型的请求次数
 */
require_once __DIR__ . '/../api/log_helper.php';

class RateLimiter {
    private $db;
    private $maxAttempts;
    private $windowSeconds;

    /**
     * @param PDO   $db             数据库连接
     * @param int   $maxAttempts    窗口内最大尝试次数
     * @param int   $windowMinutes  窗口时间（分钟）
     */
    public function __construct($db, $maxAttempts = 5, $windowMinutes = 5) {
        $this->db = $db;
        $this->maxAttempts = $maxAttempts;
        $this->windowSeconds = $windowMinutes * 60;
        $this->ensureTable();
    }

    /**
     * 确保 rate_limits 表存在
     */
    private function ensureTable() {
        $sql = "CREATE TABLE IF NOT EXISTS `rate_limits` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `ip` VARCHAR(50) NOT NULL,
            `action` VARCHAR(50) NOT NULL,
            `attempts` INT DEFAULT 1,
            `window_start` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `unique_ip_action_window` (`ip`, `action`, `window_start`),
            KEY `idx_ip_action` (`ip`, `action`),
            KEY `idx_window` (`window_start`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        try { $this->db->exec($sql); } catch (Exception $e) { /* 表已存在 */ }
    }

    /**
     * 检查当前请求是否被限流
     */
    public function isRateLimited($action) {
        $ip = getClientIp();
        $windowStart = date('Y-m-d H:i:s', time() - $this->windowSeconds);

        // 清理过期记录
        $cleanup = "DELETE FROM rate_limits WHERE window_start < :ws";
        $s = $this->db->prepare($cleanup);
        $s->execute([':ws' => $windowStart]);

        // 查询当前窗口内累计请求数
        $query = "SELECT COALESCE(SUM(attempts), 0) as total FROM rate_limits 
                  WHERE ip = :ip AND action = :action AND window_start >= :ws";
        $s = $this->db->prepare($query);
        $s->execute([':ip' => $ip, ':action' => $action, ':ws' => $windowStart]);
        $row = $s->fetch(PDO::FETCH_ASSOC);

        return (int)$row['total'] >= $this->maxAttempts;
    }

    /**
     * 记录一次请求尝试
     */
    public function recordAttempt($action) {
        $ip = getClientIp();
        $windowStart = date('Y-m-d H:i:s', time() - $this->windowSeconds);

        // 尝试增加现有窗口的计数
        $update = "UPDATE rate_limits SET attempts = attempts + 1 
                   WHERE ip = :ip AND action = :action 
                   AND window_start >= :ws";
        $s = $this->db->prepare($update);
        $s->execute([':ip' => $ip, ':action' => $action, ':ws' => $windowStart]);

        if ($s->rowCount() === 0) {
            // 无现有窗口，插入新记录
            $insert = "INSERT INTO rate_limits (ip, action, attempts) VALUES (:ip, :action, 1)";
            $s = $this->db->prepare($insert);
            $s->execute([':ip' => $ip, ':action' => $action]);
        }
    }

    /**
     * 获取剩余可用尝试次数
     */
    public function getRemainingAttempts($action) {
        $ip = getClientIp();
        $windowStart = date('Y-m-d H:i:s', time() - $this->windowSeconds);

        $query = "SELECT COALESCE(SUM(attempts), 0) as total FROM rate_limits 
                  WHERE ip = :ip AND action = :action AND window_start >= :ws";
        $s = $this->db->prepare($query);
        $s->execute([':ip' => $ip, ':action' => $action, ':ws' => $windowStart]);
        $row = $s->fetch(PDO::FETCH_ASSOC);

        return max(0, $this->maxAttempts - (int)$row['total']);
    }
}
