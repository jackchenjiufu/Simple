<?php
/**
 * Simple Server — 统一 API 入口
 *
 * 所有 /api/* 请求通过 .htaccess rewrite 进入此文件。
 * 中间件链（CORS → 日志 → 错误）统一处理，然后路由到具体处理器。
 *
 * 路由策略:
 *   - RESTful 路由（auth/login, users/1, content）→ 内置 Service 处理器
 *   - 传统文件路由（login.php, follow.php）→ 内部 require 原文件
 */
// 安全启动会话（避免被 require 的子文件重复触发 E_NOTICE）
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// === 引导：加载核心组件 ===
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
require_once __DIR__ . '/../middleware/LogMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorMiddleware.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/UserService.php';
require_once __DIR__ . '/../services/ContentService.php';

// === 数据库与服务 ===
$database = new Database();
$db = $database->getConnection();
$userService = new UserService($db);
$contentService = new ContentService($db);

// === 构建中间件链: CORS → 日志 → 错误 ===
$corsMiddleware = new CorsMiddleware($db);
$logMiddleware = new LogMiddleware($db);
$errorMiddleware = new ErrorMiddleware($db);
$corsMiddleware->setNext($logMiddleware)->setNext($errorMiddleware);

// === 获取请求数据 ===
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// 非 GET 请求解析 JSON body
$requestData = [];
if ($requestMethod !== 'GET') {
    $rawData = file_get_contents('php://input');
    $requestData = json_decode($rawData, true) ?: [];
}

// === 运行中间件链（OPTIONS 预检在 CORS 中间件中处理并 exit）===
$corsMiddleware->handle($requestData);

// === 解析路由 ===
// .htaccess 传入 __route 参数，如 ?__route=login.php&id=1
// 也支持 RESTful URL: /api/auth/login, /api/users/1, /api/content
$route = $_GET['__route'] ?? '';

if (empty($route)) {
    // 尝试从 URI 直接解析（RESTful 风格）
    $path = parse_url($requestUri, PHP_URL_PATH);
    // 移除 /api/ 前缀以及项目路径前缀
    $path = preg_replace('#^.*/api/#', '', $path);
    $route = $path;
}

unset($_GET['__route']); // 清理内部参数，避免干扰下游

// routes(): ['login', 'register', 'content', 'users/1', 'auth/login']
$route = preg_replace('/\.php$/', '', trim($route, '/'));
$segments = explode('/', $route);
$resource = $segments[0] ?? '';
$resourceId = $segments[1] ?? null;

// === 路由分发 ===
switch ($resource) {
    // ── RESTful 路由（已有 Service 层的核心模块）──
    case 'auth':
        handleAuth($requestMethod, $resourceId, $requestData);
        break;
    case 'users':
        handleUsers($requestMethod, $resourceId, $requestData);
        break;
    case 'content':
        handleContent($requestMethod, $resourceId, $requestData);
        break;
    case 'carousels':
        handleCarousels($requestMethod, $resourceId, $requestData);
        break;

    // ── 传统 .php 文件路由（内部 require，中间件已就绪）──
    case 'login':
    case 'register':
    case 'forgot_password':
    case 'reset_password':
    case 'change_password':
    case 'delete_account':
    case 'get_users':
    case 'update_user':
    case 'user_profile':
    case 'user_behavior':
    case 'user_level':
    case 'update_user_level':
    case 'follow':
    case 'check_follow':
    case 'follow_test':
    case 'messages':
    case 'send_message':
    case 'get_chat_history':
    case 'get_collections':
    case 'add_collection':
    case 'get_carousels':
    case 'recommend':
    case 'feed':
    case 'feedback':
    case 'announcements':
    case 'upload':
    case 'upload_image':
    case 'files':
    case 'files_preview':
    case 'files_upload':
    case 'get_images':
    case 'import_images':
    case 'download_proxy':
    case 'attendance':
    case 'overtime':
    case 'deploy':
    case 'ai_proxy':
    case 'cors_headers':
    case 'system_monitor':
    case 'check_update':
    case 'check_database':
    case 'check_app_data':
    case 'check_admin':
    case 'check_admin_setup':
    case 'check_users_table':
    case 'check_created_at_format':
    case 'test_connection':
    case 'test_articles':
    case 'test_content_system':
    case 'init_database':
    case 'init_images_table':
    case 'reset_admin':
    case 'setup_admin_role':
    case 'create_content_table':
    case 'create_logs_table':
    case 'get_articles':
    case 'get_user_articles':
    case 'get_versions':
    case 'simple_articles':
    case 'upload_article':
    case 'upload_version':
    case 'delete_article':
    case 'delete_version':
    case 'update_users_created_at':
    case 'crawl_douyin_hotsearch':
    case 'crawl_hotsearch':
    case 'crawl_images':
    case 'admin_login':
    case 'admin_logout':
    case 'admin_users':
    case 'admin_content':
    case 'admin_carousels':
    case 'admin_follows':
    case 'admin_messages':
    case 'admin_stats':
    case 'admin_logs':
    case 'admin_articles':
    case 'admin_feedback':
    case 'admin_recommendations':
    case 'admin_permissions':
        $file = __DIR__ . '/' . $resource . '.php';
        if (file_exists($file)) {
            require $file;
        } else {
            http_response_code(404);
            echo json_encode(['code' => 404, 'message' => '接口文件不存在'], JSON_UNESCAPED_UNICODE);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode([
            'code' => 404,
            'message' => '资源不存在: ' . $resource
        ], JSON_UNESCAPED_UNICODE);
        break;
}

// ══════════════════════════════════════════
// 处理器函数（直接调用 Service 层，不走旧文件）
// ══════════════════════════════════════════

/**
 * 认证处理: auth/login, auth/register, auth/logout
 */
function handleAuth($method, $id, $data) {
    global $userService;

    switch ($id) {
        case 'login':
            if ($method !== 'POST') { methodNotAllowed(); return; }
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode(['code' => 400, 'message' => '用户名和密码不能为空'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $user = $userService->login($username, $password);
            if ($user) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['nickname'] = $user['nickname'];
                $_SESSION['token'] = bin2hex(random_bytes(32));
                http_response_code(200);
                echo json_encode([
                    'code' => 200,
                    'message' => '登录成功',
                    'data' => ['user' => $user, 'token' => $_SESSION['token']]
                ], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(401);
                echo json_encode(['code' => 401, 'message' => '用户名或密码错误'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'register':
            if ($method !== 'POST') { methodNotAllowed(); return; }
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';
            $nickname = $data['nickname'] ?? null;
            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode(['code' => 400, 'message' => '用户名和密码不能为空'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $user = $userService->register($username, $password, $nickname);
            if ($user) {
                http_response_code(201);
                echo json_encode(['code' => 201, 'message' => '注册成功', 'data' => $user], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(400);
                echo json_encode(['code' => 400, 'message' => '用户名已存在'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'logout':
            if ($method !== 'POST') { methodNotAllowed(); return; }
            session_destroy();
            http_response_code(200);
            echo json_encode(['code' => 200, 'message' => '登出成功'], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(404);
            echo json_encode(['code' => 404, 'message' => '认证资源不存在'], JSON_UNESCAPED_UNICODE);
            break;
    }
}

/**
 * 用户处理: GET users (列表), GET users/1 (详情), PUT users/1 (更新)
 */
function handleUsers($method, $id, $data) {
    global $userService;
    // 兼容 /api/users.php?id=1 风格
    if (!$id && isset($_GET['id'])) $id = (int)$_GET['id'];

    switch ($method) {
        case 'GET':
            if ($id) {
                $user = $userService->getUserInfo($id);
                if ($user) {
                    http_response_code(200);
                    echo json_encode(['code' => 200, 'message' => '获取成功', 'data' => $user], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(404);
                    echo json_encode(['code' => 404, 'message' => '用户不存在'], JSON_UNESCAPED_UNICODE);
                }
            } else {
                $page = (int)($_GET['page'] ?? 1);
                $pageSize = (int)($_GET['pageSize'] ?? 10);
                $result = $userService->getUserList($page, $pageSize);
                http_response_code(200);
                echo json_encode(['code' => 200, 'message' => '获取成功', 'data' => $result], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'PUT':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['code' => 400, 'message' => '缺少用户ID'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) { unauthorized(); return; }
            if ((int)$userId !== (int)$id) {
                http_response_code(403);
                echo json_encode(['code' => 403, 'message' => '无权修改其他用户信息'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $success = $userService->updateUserInfo($id, $data);
            http_response_code($success ? 200 : 400);
            echo json_encode([
                'code' => $success ? 200 : 400,
                'message' => $success ? '更新成功' : '更新失败'
            ], JSON_UNESCAPED_UNICODE);
            break;

        default:
            methodNotAllowed();
            break;
    }
}

/**
 * 内容处理: GET content (列表/详情), POST (创建), PUT (更新), DELETE (删除)
 */
function handleContent($method, $id, $data) {
    global $contentService;
    // 兼容 /api/content.php?id=1 风格
    if (!$id && isset($_GET['id'])) $id = (int)$_GET['id'];

    switch ($method) {
        case 'GET':
            if ($id) {
                $content = $contentService->getContentDetail($id);
                if ($content) {
                    http_response_code(200);
                    echo json_encode(['code' => 200, 'message' => '获取成功', 'data' => $content], JSON_UNESCAPED_UNICODE);
                } else {
                    http_response_code(404);
                    echo json_encode(['code' => 404, 'message' => '内容不存在'], JSON_UNESCAPED_UNICODE);
                }
            } else {
                $filters = [];
                if (isset($_GET['type'])) $filters['type'] = $_GET['type'];
                if (isset($_GET['category'])) $filters['category'] = $_GET['category'];
                if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
                $page = (int)($_GET['page'] ?? 1);
                $pageSize = (int)($_GET['pageSize'] ?? 10);
                $result = $contentService->getContentList($filters, $page, $pageSize);
                http_response_code(200);
                echo json_encode(['code' => 200, 'message' => '获取成功', 'data' => $result], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'POST':
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) { unauthorized(); return; }
            if (empty($data['title'])) {
                http_response_code(400);
                echo json_encode(['code' => 400, 'message' => '标题不能为空'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $content = $contentService->createContent($data, $userId);
            http_response_code($content ? 201 : 400);
            echo json_encode([
                'code' => $content ? 201 : 400,
                'message' => $content ? '创建成功' : '创建失败',
                'data' => $content
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['code' => 400, 'message' => '缺少内容ID'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) { unauthorized(); return; }
            $success = $contentService->updateContent($id, $data, $userId);
            http_response_code($success ? 200 : 400);
            echo json_encode([
                'code' => $success ? 200 : 400,
                'message' => $success ? '更新成功' : '更新失败'
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['code' => 400, 'message' => '缺少内容ID'], JSON_UNESCAPED_UNICODE);
                return;
            }
            $userId = $_SESSION['user_id'] ?? null;
            if (!$userId) { unauthorized(); return; }
            $success = $contentService->deleteContent($id, $userId);
            http_response_code($success ? 200 : 400);
            echo json_encode([
                'code' => $success ? 200 : 400,
                'message' => $success ? '删除成功' : '删除失败'
            ], JSON_UNESCAPED_UNICODE);
            break;

        default:
            methodNotAllowed();
            break;
    }
}

/**
 * 轮播图处理
 */
function handleCarousels($method, $id, $data) {
    global $contentService;

    if ($method === 'GET') {
        $limit = (int)($_GET['limit'] ?? 5);
        $carousels = $contentService->getCarousels($limit);
        http_response_code(200);
        echo json_encode(['code' => 200, 'message' => '获取成功', 'data' => $carousels], JSON_UNESCAPED_UNICODE);
    } else {
        methodNotAllowed();
    }
}

// === 辅助函数 ===
function methodNotAllowed() {
    http_response_code(405);
    echo json_encode(['code' => 405, 'message' => '不支持的请求方法'], JSON_UNESCAPED_UNICODE);
}
function unauthorized() {
    http_response_code(401);
    echo json_encode(['code' => 401, 'message' => '未授权访问'], JSON_UNESCAPED_UNICODE);
}
