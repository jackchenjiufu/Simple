<?php
/**
 * 管理员认证统一检查（Session + Token 双模式 + RBAC 权限校验）
 *
 * 用法：在 admin API 文件顶部用以下代码替换原有的 session/is_admin 检查：
 *   require_once __DIR__ . '/admin_auth.php';
 *   checkAdminAuth('manage_users');   // 需要指定权限名
 *   checkAdminAuth();                 // 仅需登录（无权限要求）
 *
 * 权限来源：roles / role_permissions / permissions 表（RBAC）
 * - super_admin 角色全量放行
 * - 返回 401/403 JSON 响应并 exit，不返回值。
 */

// 引入 Config（供 Token 模式降级读取 api.admin_token 配置）
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../config/Database.php';

/**
 * 获取当前认证用户（admin 登录 session 或 App 端 token+uid）
 * @return array|null 用户行（id/username/role）或 null
 */
function getAuthUser($db) {
    $uid = null;
    $viaSession = isset($_SESSION['admin_id']);
    if ($viaSession) {
        $uid = $_SESSION['admin_id'];
    } elseif (isset($_GET['admin_uid']) && ctype_digit((string)$_GET['admin_uid'])) {
        $uid = intval($_GET['admin_uid']);
    }
    if ($uid) {
        $adminToken = $_GET['admin_token'] ?? '';
        // 安全：经 admin_uid 参数识别用户且带用户级 auth_token 时，
        // 必须校验 token 与 uid 属于同一用户，防止用他人 uid 冒充高权限账号。
        // （session 模式 / 全局 admin_token 不受此限制）
        $isUserToken = strlen($adminToken) >= 32 && ctype_xdigit($adminToken);
        if (!$viaSession && $isUserToken) {
            $stmt = $db->prepare("SELECT id FROM users WHERE id = ? AND auth_token = ? LIMIT 1");
            $stmt->execute([$uid, $adminToken]);
            if (!$stmt->fetch()) {
                return null;
            }
        }
        $stmt = $db->prepare("SELECT id, username, role FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$uid]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            return $user;
        }
    }
    // 用户级 auth_token 识别（旧版 App 请求带自身登录 token）
    if (isset($_GET['admin_token']) && strlen($_GET['admin_token']) >= 32 && ctype_xdigit($_GET['admin_token'])) {
        $stmt = $db->prepare("SELECT id, username, role FROM users WHERE auth_token = ? LIMIT 1");
        $stmt->execute([$_GET['admin_token']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user) {
            return $user;
        }
    }
    return null;
}

/**
 * 获取角色拥有的权限名列表
 * @return string[]
 */
function getUserPermissions($db, $role) {
    $stmt = $db->prepare(
        "SELECT p.name FROM role_permissions rp
         JOIN roles r ON rp.role_id = r.id
         JOIN permissions p ON rp.permission_id = p.id
         WHERE r.name = ?"
    );
    $stmt->execute([$role]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * 当前认证用户是否拥有指定权限
 * @return bool
 */
function hasPermission($db, $perm) {
    $user = getAuthUser($db);
    if (!$user) {
        // 兼容旧客户端：全局 admin_token（仅发给 admin/super_admin）且未带 admin_uid 无法识别用户时，
        // 维持旧行为放行；用户级 auth_token 会被识别出角色，严格按 RBAC 校验
        if (isset($_GET['admin_token']) && $_GET['admin_token'] === (getenv("ADMIN_TOKEN") ?: Config::get("api.admin_token", ""))) {
            return true;
        }
        return false;
    }
    if ($user['role'] === 'super_admin') {
        return true;
    }
    return in_array($perm, getUserPermissions($db, $user['role']), true);
}

/**
 * 统一鉴权入口
 * @param string|null $requiredPerm 需要的权限名；null 仅验证已登录
 */
function checkAdminAuth($requiredPerm = null) {
    // === 认证（Session / Token 双模式）===
    $authed = false;
    if (isset($_SESSION['is_admin']) && $_SESSION['is_admin']) {
        $authed = true;
    }
    if (!$authed && isset($_GET['admin_token'])) {
        $tk = $_GET['admin_token'];
        // 模式2：全局 admin_token
        if ($tk === (getenv("ADMIN_TOKEN") ?: Config::get("api.admin_token", ""))) {
            $authed = true;
        }
        // 模式3：用户级 auth_token（旧版 App 使用自身登录 token 请求）
        elseif (strlen($tk) >= 32 && ctype_xdigit($tk)) {
            $dbCheck = (new Database())->getConnection();
            $stmt = $dbCheck->prepare("SELECT id FROM users WHERE auth_token = ? LIMIT 1");
            $stmt->execute([$tk]);
            if ($stmt->fetch()) {
                $authed = true;
            }
        }
    }
    if (!$authed) {
        http_response_code(401);
        echo json_encode(array("message" => "未授权访问", "code" => 401));
        exit;
    }

    // === 权限校验 ===
    if ($requiredPerm === null) {
        return;
    }
    $db = (new Database())->getConnection();
    if (!hasPermission($db, $requiredPerm)) {
        http_response_code(403);
        echo json_encode(array("message" => "无权限执行此操作", "code" => 403));
        exit;
    }
}
