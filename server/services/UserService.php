<?php
/**
 * 用户服务层
 * 处理用户相关的业务逻辑
 */
require_once __DIR__ . '/../repositories/UserRepository.php';

class UserService {
    /**
     * 用户数据访问层
     * @var UserRepository
     */
    private $userRepository;
    
    /**
     * 构造函数
     * @param PDO $db 数据库连接
     */
    public function __construct($db) {
        $this->userRepository = new UserRepository($db);
    }
    
    /**
     * 用户登录
     * @param string $username 用户名
     * @param string $password 密码
     * @return array|null 用户信息或null
     */
    public function login($username, $password) {
        // 根据用户名获取用户信息
        $user = $this->userRepository->getUserByUsername($username);
        
        // 验证用户是否存在且密码正确
        if ($user && password_verify($password, $user['password'])) {
            // 移除密码字段，不返回给前端
            unset($user['password']);
            return $user;
        }
        
        return null;
    }
    
    /**
     * 用户注册
     * @param string $username 用户名
     * @param string $password 密码
     * @param string $nickname 昵称
     * @return array|null 注册结果或null
     */
    public function register($username, $password, $nickname = null) {
        // 检查用户名是否已存在
        if ($this->userRepository->usernameExists($username)) {
            return null;
        }
        
        // 生成密码哈希
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // 如果没有提供昵称，使用用户名作为昵称
        if (empty($nickname)) {
            $nickname = $username;
        }
        
        // 创建用户数据
        $userData = [
            'username' => $username,
            'password' => $hashedPassword,
            'nickname' => $nickname
        ];
        
        // 创建用户
        $userId = $this->userRepository->createUser($userData);
        
        if ($userId) {
            // 获取创建的用户信息
            $user = $this->userRepository->getUserById($userId);
            return $user;
        }
        
        return null;
    }
    
    /**
     * 获取用户信息
     * @param int $userId 用户ID
     * @return array|null 用户信息或null
     */
    public function getUserInfo($userId) {
        return $this->userRepository->getUserById($userId);
    }
    
    /**
     * 更新用户信息
     * @param int $userId 用户ID
     * @param array $userData 用户数据
     * @return bool 是否更新成功
     */
    public function updateUserInfo($userId, $userData) {
        // 移除密码字段，密码更新需要单独处理
        unset($userData['password']);
        
        return $this->userRepository->updateUser($userId, $userData);
    }
    
    /**
     * 修改密码
     * @param int $userId 用户ID
     * @param string $oldPassword 旧密码
     * @param string $newPassword 新密码
     * @return bool 是否修改成功
     */
    public function changePassword($userId, $oldPassword, $newPassword) {
        // 获取用户信息
        $user = $this->userRepository->getUserById($userId);
        
        // 验证旧密码是否正确
        if (!$user || !password_verify($oldPassword, $user['password'])) {
            return false;
        }
        
        // 生成新密码哈希
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        // 更新密码
        return $this->userRepository->updatePassword($userId, $hashedPassword);
    }
    
    /**
     * 获取用户列表
     * @param int $page 页码
     * @param int $pageSize 每页数量
     * @return array 用户列表和分页信息
     */
    public function getUserList($page = 1, $pageSize = 10) {
        // 计算偏移量
        $offset = ($page - 1) * $pageSize;
        
        // 获取用户列表
        $users = $this->userRepository->getUserList($pageSize, $offset);
        
        // 这里可以添加获取总用户数的逻辑，用于分页
        
        return [
            'users' => $users,
            'pagination' => [
                'page' => $page,
                'pageSize' => $pageSize,
                'total' => count($users) // 临时使用，实际应该从数据库获取
            ]
        ];
    }
}
?>