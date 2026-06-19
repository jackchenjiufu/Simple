<?php
/**
 * 记录系统日志的辅助函数
 * 
 * @param PDO $db 数据库连接对象
 * @param int $user_id 用户ID
 * @param string $type 日志类型
 * @param string $action 操作
 * @param string $message 日志消息
 * @param string $ip_address IP地址
 * @return bool 是否记录成功
 */
function logAction($db, $user_id, $type, $action, $message, $ip_address) {
    try {
        // 准备SQL语句
        $query = "INSERT INTO logs (user_id, type, action, message, ip_address) 
                  VALUES (:user_id, :type, :action, :message, :ip_address)";
        
        // 预处理SQL语句
        $stmt = $db->prepare($query);
        
        // 绑定参数
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':type', $type);
        $stmt->bindParam(':action', $action);
        $stmt->bindParam(':message', $message);
        $stmt->bindParam(':ip_address', $ip_address);
        
        // 执行SQL语句
        $stmt->execute();
        
        return true;
    } catch (PDOException $e) {
        // 日志记录失败，不影响主流程
        return false;
    }
}

/**
 * 获取客户端IP地址
 * 
 * @return string 客户端IP地址
 */
function getClientIp() {
    $ip = '127.0.0.1';
    
    if (isset($_SERVER['HTTP_CLIENT_IP']) && $_SERVER['HTTP_CLIENT_IP']) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (isset($_SERVER['HTTP_X_FORWARDED_FOR']) && $_SERVER['HTTP_X_FORWARDED_FOR']) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } elseif (isset($_SERVER['REMOTE_ADDR']) && $_SERVER['REMOTE_ADDR']) {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    
    // 处理多个IP地址的情况
    $ip = explode(',', $ip)[0];
    
    return trim($ip);
}
?>