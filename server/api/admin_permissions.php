<?php
/**
 * admin_permissions.php - 权限管理API接口
 * 
 * 功能：
 * - 提供基于角色的权限管理（RBAC）
 * - 支持角色的创建、编辑、删除
 * - 支持权限的分配和管理
 * - 自动检查并创建权限相关表结构
 */

// 启动session，用于管理员认证
session_start();
require_once __DIR__ . "/cors_headers.php";

// 验证session中是否存在管理员标识（必须登录才能使用管理功能）
if (!isset($_SESSION['is_admin']) || !$_SESSION['is_admin']) {
    // 返回401未授权状态码
    http_response_code(401);
    echo json_encode(array("message" => "未授权访问", "code" => 401));
    exit;
}

// 引入数据库连接类
include_once __DIR__ . '/../config/Database.php';

// 创建数据库实例
$database = new Database();
// 获取数据库连接
$db = $database->getConnection();

// 检查并创建权限相关表结构
function createPermissionTables($db) {
    // 创建roles表
    $checkRolesTable = "SHOW TABLES LIKE 'roles'";
    $rolesExists = $db->query($checkRolesTable)->rowCount() > 0;
    
    if (!$rolesExists) {
        $createRolesTable = "CREATE TABLE roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
            description TEXT COMMENT '角色描述',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';";
        $db->exec($createRolesTable);
        
        // 插入默认角色
        $insertDefaultRoles = "INSERT INTO roles (name, description) VALUES
            ('super_admin', '超级管理员，拥有所有权限'),
            ('admin', '管理员，拥有大部分权限'),
            ('editor', '编辑，拥有内容管理权限'),
            ('user', '普通用户，拥有基本权限');";
        $db->exec($insertDefaultRoles);
    }
    
    // 创建permissions表
    $checkPermissionsTable = "SHOW TABLES LIKE 'permissions'";
    $permissionsExists = $db->query($checkPermissionsTable)->rowCount() > 0;
    
    if (!$permissionsExists) {
        $createPermissionsTable = "CREATE TABLE permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE COMMENT '权限名称',
            description TEXT COMMENT '权限描述',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';";
        $db->exec($createPermissionsTable);
        
        // 插入默认权限
        $insertDefaultPermissions = "INSERT INTO permissions (name, description) VALUES
            ('manage_users', '管理用户'),
            ('manage_content', '管理内容'),
            ('manage_messages', '管理消息'),
            ('manage_follows', '管理关注关系'),
            ('manage_carousel', '管理轮播图'),
            ('manage_versions', '管理版本'),
            ('manage_announcements', '管理公告'),
            ('view_stats', '查看统计数据'),
            ('manage_logs', '管理系统日志'),
            ('manage_recommendations', '管理推荐系统'),
            ('manage_permissions', '管理权限'),
            ('manage_system', '管理系统设置');";
        $db->exec($insertDefaultPermissions);
    }
    
    // 创建role_permissions表
    $checkRolePermissionsTable = "SHOW TABLES LIKE 'role_permissions'";
    $rolePermissionsExists = $db->query($checkRolePermissionsTable)->rowCount() > 0;
    
    if (!$rolePermissionsExists) {
        $createRolePermissionsTable = "CREATE TABLE role_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_id INT NOT NULL COMMENT '角色ID',
            permission_id INT NOT NULL COMMENT '权限ID',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            UNIQUE KEY idx_role_permission (role_id, permission_id),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';";
        $db->exec($createRolePermissionsTable);
        
        // 为超级管理员分配所有权限
        $insertSuperAdminPermissions = "INSERT INTO role_permissions (role_id, permission_id) 
            SELECT 1, id FROM permissions;";
        $db->exec($insertSuperAdminPermissions);
        
        // 为管理员分配大部分权限
        $insertAdminPermissions = "INSERT INTO role_permissions (role_id, permission_id) 
            SELECT 2, id FROM permissions WHERE name != 'manage_permissions';";
        $db->exec($insertAdminPermissions);
        
        // 为编辑分配内容管理权限
        $insertEditorPermissions = "INSERT INTO role_permissions (role_id, permission_id) 
            SELECT 3, id FROM permissions WHERE name IN ('manage_content', 'manage_carousel');";
        $db->exec($insertEditorPermissions);
    }
    
    // 创建user_roles表
    $checkUserRolesTable = "SHOW TABLES LIKE 'user_roles'";
    $userRolesExists = $db->query($checkUserRolesTable)->rowCount() > 0;
    
    if (!$userRolesExists) {
        $createUserRolesTable = "CREATE TABLE user_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL COMMENT '用户ID',
            role_id INT NOT NULL COMMENT '角色ID',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
            UNIQUE KEY idx_user_role (user_id, role_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';";
        $db->exec($createUserRolesTable);
    }
}

// 创建权限相关表结构
createPermissionTables($db);

// 获取请求方法
$method = $_SERVER['REQUEST_METHOD'];

// 根据请求方法执行不同操作
switch ($method) {
    // GET请求：获取角色或权限列表
    case 'GET':
        $type = isset($_GET['type']) ? $_GET['type'] : 'roles';
        
        if ($type === 'roles') {
            // 获取角色列表
            $query = "SELECT * FROM roles ORDER BY id ASC";
            $stmt = $db->query($query);
            $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 获取每个角色的权限
            foreach ($roles as &$role) {
                $permissionsQuery = "SELECT p.* FROM permissions p 
                    JOIN role_permissions rp ON p.id = rp.permission_id 
                    WHERE rp.role_id = ?";
                $permissionsStmt = $db->prepare($permissionsQuery);
                $permissionsStmt->execute(array($role['id']));
                $role['permissions'] = $permissionsStmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            http_response_code(200);
            echo json_encode(array("message" => "获取角色列表成功", "code" => 200, "data" => $roles));
        } else if ($type === 'permissions') {
            // 获取权限列表
            $query = "SELECT * FROM permissions ORDER BY id ASC";
            $stmt = $db->query($query);
            $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            http_response_code(200);
            echo json_encode(array("message" => "获取权限列表成功", "code" => 200, "data" => $permissions));
        } else if ($type === 'user_roles') {
            // 获取用户角色
            $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;
            if ($user_id) {
                $query = "SELECT r.* FROM roles r 
                    JOIN user_roles ur ON r.id = ur.role_id 
                    WHERE ur.user_id = ?";
                $stmt = $db->prepare($query);
                $stmt->execute(array($user_id));
                $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                http_response_code(200);
                echo json_encode(array("message" => "获取用户角色成功", "code" => 200, "data" => $roles));
            } else {
                http_response_code(400);
                echo json_encode(array("message" => "缺少用户ID", "code" => 400));
            }
        }
        break;
        
    // POST请求：创建角色或分配权限
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (isset($data['role_name'])) {
            // 创建角色
            $roleName = $data['role_name'];
            $description = isset($data['description']) ? $data['description'] : '';
            
            $query = "INSERT INTO roles (name, description) VALUES (:name, :description)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':name', $roleName);
            $stmt->bindParam(':description', $description);
            
            if ($stmt->execute()) {
                $roleId = $db->lastInsertId();
                
                // 分配权限
                if (isset($data['permissions']) && is_array($data['permissions'])) {
                    foreach ($data['permissions'] as $permissionId) {
                        $assignQuery = "INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)";
                        $assignStmt = $db->prepare($assignQuery);
                        $assignStmt->bindParam(':role_id', $roleId);
                        $assignStmt->bindParam(':permission_id', $permissionId);
                        $assignStmt->execute();
                    }
                }
                
                http_response_code(201);
                echo json_encode(array("message" => "创建角色成功", "code" => 201));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "创建角色失败", "code" => 500));
            }
        } else if (isset($data['user_id']) && isset($data['role_id'])) {
            // 分配用户角色
            $userId = $data['user_id'];
            $roleId = $data['role_id'];
            
            $query = "INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':role_id', $roleId);
            
            try {
                if ($stmt->execute()) {
                    http_response_code(200);
                    echo json_encode(array("message" => "分配角色成功", "code" => 200));
                } else {
                    http_response_code(500);
                    echo json_encode(array("message" => "分配角色失败", "code" => 500));
                }
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode(array("message" => "用户已拥有该角色", "code" => 400));
            }
        }
        break;
        
    // PUT请求：更新角色或权限
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (isset($data['role_id'])) {
            // 更新角色
            $roleId = $data['role_id'];
            $description = isset($data['description']) ? $data['description'] : '';
            
            $query = "UPDATE roles SET description = :description WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':description', $description);
            $stmt->bindParam(':id', $roleId);
            
            if ($stmt->execute()) {
                // 更新权限
                if (isset($data['permissions']) && is_array($data['permissions'])) {
                    // 删除旧权限
                    $deleteQuery = "DELETE FROM role_permissions WHERE role_id = :role_id";
                    $deleteStmt = $db->prepare($deleteQuery);
                    $deleteStmt->bindParam(':role_id', $roleId);
                    $deleteStmt->execute();
                    
                    // 添加新权限
                    foreach ($data['permissions'] as $permissionId) {
                        $insertQuery = "INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :permission_id)";
                        $insertStmt = $db->prepare($insertQuery);
                        $insertStmt->bindParam(':role_id', $roleId);
                        $insertStmt->bindParam(':permission_id', $permissionId);
                        $insertStmt->execute();
                    }
                }
                
                http_response_code(200);
                echo json_encode(array("message" => "更新角色成功", "code" => 200));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "更新角色失败", "code" => 500));
            }
        }
        break;
        
    // DELETE请求：删除角色或移除用户角色
    case 'DELETE':
        if (isset($_GET['role_id'])) {
            // 删除角色
            $roleId = $_GET['role_id'];
            
            $query = "DELETE FROM roles WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $roleId);
            
            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array("message" => "删除角色成功", "code" => 200));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "删除角色失败", "code" => 500));
            }
        } else if (isset($_GET['user_id']) && isset($_GET['role_id'])) {
            // 移除用户角色
            $userId = $_GET['user_id'];
            $roleId = $_GET['role_id'];
            
            $query = "DELETE FROM user_roles WHERE user_id = :user_id AND role_id = :role_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':role_id', $roleId);
            
            if ($stmt->execute()) {
                http_response_code(200);
                echo json_encode(array("message" => "移除角色成功", "code" => 200));
            } else {
                http_response_code(500);
                echo json_encode(array("message" => "移除角色失败", "code" => 500));
            }
        }
        break;
        
    // 其他请求方法：返回405方法不允许
    default:
        http_response_code(405);
        echo json_encode(array("message" => "方法不允许", "code" => 405));
        break;
}
?>