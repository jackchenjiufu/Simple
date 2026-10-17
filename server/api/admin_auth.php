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
 * 从请求中读取管理 token（优先 X-Admin-Token 头，兼容旧版 query 参数）
 * 说明：token 放进 URL query 会进入访问/代理日志，新调用方应使用请求头。
 */
function adminTokenFromRequest(): string {
    $t = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? ($_GET['admin_token'] ?? '');
    return is_string($t) ? trim($t) : '';
}

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
    } elseif (isset($_SERVER['HTTP_X_ADMIN_UID']) && ctype_digit((string)$_SERVER['HTTP_X_ADMIN_UID'])) {
        $uid = intval($_SERVER['HTTP_X_ADMIN_UID']);
    }
    if ($uid) {
        $adminToken = adminTokenFromRequest();
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
    $userLevelToken = adminTokenFromRequest();
    if ($userLevelToken !== '' && strlen($userLevelToken) >= 32 && ctype_xdigit($userLevelToken)) {
        $stmt = $db->prepare("SELECT id, username, role FROM users WHERE auth_token = ? LIMIT 1");
        $stmt->execute([$userLevelToken]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        // 安全修复：仅后台角色可被识别为管理员；普通用户返回 null
        if ($user && in_array($user['role'], ['super_admin', 'admin', 'editor'], true)) {
            return $user;
        }
        return null;
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
        $globalToken = getenv("ADMIN_TOKEN") ?: Config::get("api.admin_token", "");
        if ($globalToken !== '' && adminTokenFromRequest() === $globalToken) {
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
    $tk = adminTokenFromRequest();
    if (!$authed && $tk !== '') {
        // 模式2：全局 admin_token
        $globalToken = getenv("ADMIN_TOKEN") ?: Config::get("api.admin_token", "");
        if ($globalToken !== '' && $tk === $globalToken) {
            $authed = true;
        }
        // 模式3：用户级 auth_token（旧版 App 使用自身登录 token 请求）
        elseif (strlen($tk) >= 32 && ctype_xdigit($tk)) {
            $dbCheck = (new Database())->getConnection();
            $stmt = $dbCheck->prepare("SELECT id, role FROM users WHERE auth_token = ? LIMIT 1");
            $stmt->execute([$tk]);
            $u = $stmt->fetch(PDO::FETCH_ASSOC);
            // 安全修复：仅后台角色（super_admin/admin/editor）的 auth_token 可用于管理接口，
            // 普通用户（role=user 等）自带登录 token 一律拒绝，防止越权访问管理与 SQL 接口。
            if ($u && in_array($u['role'], ['super_admin', 'admin', 'editor'], true)) {
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
