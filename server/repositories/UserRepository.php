<?php
/**
 * 用户数据访问层
 * 处理用户相关的数据库操作
 */
class UserRepository {
    /**
     * 数据库连接
     * @var PDO
     */
    private $db;
    
    /**
     * 构造函数
     * @param PDO $db 数据库连接
     */
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * 根据用户名获取用户信息
     * @param string $username 用户名
     * @return array|null 用户信息或null
     */
    public function getUserByUsername($username) {
        $query = "SELECT id, username, password, nickname, avatar, background_image, followers, following, likes FROM users WHERE username = :username LIMIT 0,1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * 根据ID获取用户信息
     * @param int $id 用户ID
     * @return array|null 用户信息或null
     */
    public function getUserById($id) {
        $query = "SELECT id, username, nickname, avatar, background_image, followers, following, likes FROM users WHERE id = :id LIMIT 0,1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * 创建新用户
     * @param array $userData 用户数据
     * @return int|null 创建的用户ID或null
     */
    public function createUser($userData) {
        $query = "INSERT INTO users SET username=:username, password=:password, nickname=:nickname";
        $stmt = $this->db->prepare($query);
        
        $stmt->bindValue(":username", $userData['username']);
        $stmt->bindValue(":password", $userData['password']);
        $stmt->bindValue(":nickname", $userData['nickname']);
        
        if ($stmt->execute()) {
            return $this->db->lastInsertId();
        }
        
        return null;
    }
    
    /**
     * 更新用户信息
     * @param int $id 用户ID
     * @param array $userData 用户数据
     * @return bool 是否更新成功
     */
    public function updateUser($id, $userData) {
        // 构建更新字段
        $updateFields = [];
        $params = [':id' => $id];
        
        foreach ($userData as $key => $value) {
            $updateFields[] = "{$key}=:{$key}";
            $params[":{$key}"] = $value;
        }
        
        if (empty($updateFields)) {
            return false;
        }
        
        $query = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = :id";
        $stmt = $this->db->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        return $stmt->execute();
    }
    
    /**
     * 更新用户密码
     * @param int $id 用户ID
     * @param string $hashedPassword 哈希后的密码
     * @return bool 是否更新成功
     */
    public function updatePassword($id, $hashedPassword) {
        $query = "UPDATE users SET password=:password WHERE id = :id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":password", $hashedPassword);
        $stmt->bindParam(":id", $id, PDO::PARAM_INT);
        return $stmt->execute();
    }
    
    /**
     * 获取用户列表
     * @param int $limit 限制数量
     * @param int $offset 偏移量
     * @return array 用户列表
     */
    public function getUserList($limit = 10, $offset = 0) {
        $query = "SELECT id, username, nickname, avatar FROM users ORDER BY id DESC LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":limit", $limit, PDO::PARAM_INT);
        $stmt->bindParam(":offset", $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 检查用户名是否已存在
     * @param string $username 用户名
     * @return bool 是否存在
     */
    public function usernameExists($username) {
        $query = "SELECT id FROM users WHERE username = :username LIMIT 0,1";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":username", $username);
        $stmt->execute();
        return $stmt->rowCount() > 0;
    }

    /**
     * 获取用户总数
     * @return int 用户总数
     */
    public function getUserCount() {
        $query = "SELECT COUNT(*) FROM users";
        $stmt = $this->db->query($query);
        return (int)$stmt->fetchColumn();
    }
}
?>