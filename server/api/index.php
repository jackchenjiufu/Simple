<?php
/**
 * API 路由处理器
 * 集中处理所有 API 请求，采用 RESTful 设计规范
 */

// 启动会话
session_start();

// 设置响应内容类型为JSON
header("Content-Type: application/json; charset=UTF-8");

// 引入配置管理类
require_once __DIR__ . '/../config/Config.php';
// 引入数据库连接类
require_once __DIR__ . '/../config/Database.php';
// 引入中间件
require_once __DIR__ . '/../middleware/CorsMiddleware.php';
require_once __DIR__ . '/../middleware/LogMiddleware.php';
require_once __DIR__ . '/../middleware/ErrorMiddleware.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
// 引入服务层
require_once __DIR__ . '/../services/UserService.php';
require_once __DIR__ . '/../services/ContentService.php';

// 创建数据库实例
$database = new Database();
$db = $database->getConnection();

// 创建服务实例
$userService = new UserService($db);
$contentService = new ContentService($db);

// 创建中间件链
$errorMiddleware = new ErrorMiddleware($db);
$logMiddleware = new LogMiddleware($db);
$corsMiddleware = new CorsMiddleware($db);
$authMiddleware = new AuthMiddleware($db);

// 构建中间件链: CORS → 日志 → 错误
// 注意: AuthMiddleware 不在全局链中，由各路由处理器按需调用
// 需要认证的路由在处理函数内通过 $_SESSION['user_id'] 校验
$corsMiddleware->setNext($logMiddleware)->setNext($errorMiddleware);

// 获取请求信息
$requestMethod = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// 解析请求路径
$path = parse_url($requestUri, PHP_URL_PATH);
$pathSegments = explode('/', trim($path, '/'));

// 移除 API 前缀
if (isset($pathSegments[0]) && $pathSegments[0] === 'api') {
    array_shift($pathSegments);
}

// 获取资源类型和 ID
$resource = isset($pathSegments[0]) ? $pathSegments[0] : '';
$resourceId = isset($pathSegments[1]) ? $pathSegments[1] : null;

// 获取请求数据
$requestData = [];
if ($requestMethod !== 'GET') {
    $rawData = file_get_contents('php://input');
    $requestData = json_decode($rawData, true) ?: [];
}

// 处理请求
$response = $corsMiddleware->handle($requestData);

// 路由到相应的处理方法
switch ($resource) {
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
    default:
        // 404 Not Found
        http_response_code(404);
        echo json_encode([
            'code' => 404,
            'message' => '资源不存在'
        ]);
        break;
}

/**
 * 处理认证相关请求
 * @param string $method 请求方法
 * @param string|null $id 资源ID
 * @param array $data 请求数据
 */
function handleAuth($method, $id, $data) {
    global $userService;
    
    switch ($id) {
        case 'login':
            if ($method === 'POST') {
                // 登录
                $username = $data['username'] ?? '';
                $password = $data['password'] ?? '';
                
                $user = $userService->login($username, $password);
                
                if ($user) {
                    // 设置会话
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    $_SESSION['nickname'] = $user['nickname'];
                    
                    http_response_code(200);
                    echo json_encode([
                        'code' => 200,
                        'message' => '登录成功',
                        'data' => $user
                    ]);
                } else {
                    http_response_code(401);
                    echo json_encode([
                        'code' => 401,
                        'message' => '用户名或密码错误'
                    ]);
                }
            } else {
                http_response_code(405);
                echo json_encode([
                    'code' => 405,
                    'message' => '不支持的请求方法'
                ]);
            }
            break;
            
        case 'register':
            if ($method === 'POST') {
                // 注册
                $username = $data['username'] ?? '';
                $password = $data['password'] ?? '';
                $nickname = $data['nickname'] ?? null;
                
                $user = $userService->register($username, $password, $nickname);
                
                if ($user) {
                    http_response_code(201);
                    echo json_encode([
                        'code' => 201,
                        'message' => '注册成功',
                        'data' => $user
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'code' => 400,
                        'message' => '用户名已存在'
                    ]);
                }
            } else {
                http_response_code(405);
                echo json_encode([
                    'code' => 405,
                    'message' => '不支持的请求方法'
                ]);
            }
            break;
            
        case 'logout':
            if ($method === 'POST') {
                // 登出
                session_destroy();
                
                http_response_code(200);
                echo json_encode([
                    'code' => 200,
                    'message' => '登出成功'
                ]);
            } else {
                http_response_code(405);
                echo json_encode([
                    'code' => 405,
                    'message' => '不支持的请求方法'
                ]);
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode([
                'code' => 404,
                'message' => '资源不存在'
            ]);
            break;
    }
}

/**
 * 处理用户相关请求
 * @param string $method 请求方法
 * @param string|null $id 资源ID
 * @param array $data 请求数据
 */
function handleUsers($method, $id, $data) {
    global $userService;
    
    switch ($method) {
        case 'GET':
            if ($id) {
                // 获取单个用户信息
                $user = $userService->getUserInfo($id);
                
                if ($user) {
                    http_response_code(200);
                    echo json_encode([
                        'code' => 200,
                        'message' => '获取成功',
                        'data' => $user
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'code' => 404,
                        'message' => '用户不存在'
                    ]);
                }
            } else {
                // 获取用户列表
                $page = $_GET['page'] ?? 1;
                $pageSize = $_GET['pageSize'] ?? 10;
                
                $result = $userService->getUserList($page, $pageSize);
                
                http_response_code(200);
                echo json_encode([
                    'code' => 200,
                    'message' => '获取成功',
                    'data' => $result
                ]);
            }
            break;
            
        case 'PUT':
            if ($id) {
                // 更新用户信息
                $userId = $_SESSION['user_id'] ?? null;
                
                if (!$userId) {
                    http_response_code(401);
                    echo json_encode([
                        'code' => 401,
                        'message' => '未授权访问'
                    ]);
                    return;
                }
                
                if ($userId != $id) {
                    http_response_code(403);
                    echo json_encode([
                        'code' => 403,
                        'message' => '无权修改其他用户信息'
                    ]);
                    return;
                }
                
                $success = $userService->updateUserInfo($id, $data);
                
                if ($success) {
                    http_response_code(200);
                    echo json_encode([
                        'code' => 200,
                        'message' => '更新成功'
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'code' => 400,
                        'message' => '更新失败'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'code' => 400,
                    'message' => '缺少用户ID'
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'code' => 405,
                'message' => '不支持的请求方法'
            ]);
            break;
    }
}

/**
 * 处理内容相关请求
 * @param string $method 请求方法
 * @param string|null $id 资源ID
 * @param array $data 请求数据
 */
function handleContent($method, $id, $data) {
    global $contentService;
    
    switch ($method) {
        case 'GET':
            if ($id) {
                // 获取单个内容详情
                $content = $contentService->getContentDetail($id);
                
                if ($content) {
                    http_response_code(200);
                    echo json_encode([
                        'code' => 200,
                        'message' => '获取成功',
                        'data' => $content
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'code' => 404,
                        'message' => '内容不存在'
                    ]);
                }
            } else {
                // 获取内容列表
                $filters = [];
                
                if (isset($_GET['type'])) {
                    $filters['type'] = $_GET['type'];
                }
                
                if (isset($_GET['category'])) {
                    $filters['category'] = $_GET['category'];
                }
                
                $page = $_GET['page'] ?? 1;
                $pageSize = $_GET['pageSize'] ?? 10;
                
                $result = $contentService->getContentList($filters, $page, $pageSize);
                
                http_response_code(200);
                echo json_encode([
                    'code' => 200,
                    'message' => '获取成功',
                    'data' => $result
                ]);
            }
            break;
            
        case 'POST':
            // 创建内容
            $userId = $_SESSION['user_id'] ?? null;
            
            if (!$userId) {
                http_response_code(401);
                echo json_encode([
                    'code' => 401,
                    'message' => '未授权访问'
                ]);
                return;
            }
            
            $content = $contentService->createContent($data, $userId);
            
            if ($content) {
                http_response_code(201);
                echo json_encode([
                    'code' => 201,
                    'message' => '创建成功',
                    'data' => $content
                ]);
            } else {
                http_response_code(400);
                echo json_encode([
                    'code' => 400,
                    'message' => '创建失败'
                ]);
            }
            break;
            
        case 'PUT':
            if ($id) {
                // 更新内容
                $userId = $_SESSION['user_id'] ?? null;
                
                if (!$userId) {
                    http_response_code(401);
                    echo json_encode([
                        'code' => 401,
                        'message' => '未授权访问'
                    ]);
                    return;
                }
                
                $success = $contentService->updateContent($id, $data, $userId);
                
                if ($success) {
                    http_response_code(200);
                    echo json_encode([
                        'code' => 200,
                        'message' => '更新成功'
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'code' => 400,
                        'message' => '更新失败'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'code' => 400,
                    'message' => '缺少内容ID'
                ]);
            }
            break;
            
        case 'DELETE':
            if ($id) {
                // 删除内容
                $userId = $_SESSION['user_id'] ?? null;
                
                if (!$userId) {
                    http_response_code(401);
                    echo json_encode([
                        'code' => 401,
                        'message' => '未授权访问'
                    ]);
                    return;
                }
                
                $success = $contentService->deleteContent($id, $userId);
                
                if ($success) {
                    http_response_code(200);
                    echo json_encode([
                        'code' => 200,
                        'message' => '删除成功'
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'code' => 400,
                        'message' => '删除失败'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'code' => 400,
                    'message' => '缺少内容ID'
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'code' => 405,
                'message' => '不支持的请求方法'
            ]);
            break;
    }
}

/**
 * 处理轮播图相关请求
 * @param string $method 请求方法
 * @param string|null $id 资源ID
 * @param array $data 请求数据
 */
function handleCarousels($method, $id, $data) {
    global $contentService;
    
    switch ($method) {
        case 'GET':
            // 获取轮播图数据
            $limit = $_GET['limit'] ?? 5;
            $carousels = $contentService->getCarousels($limit);
            
            http_response_code(200);
            echo json_encode([
                'code' => 200,
                'message' => '获取成功',
                'data' => $carousels
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'code' => 405,
                'message' => '不支持的请求方法'
            ]);
            break;
    }
}
?>