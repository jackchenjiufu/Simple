<?php
/**
 * admin_v2api.php - v2 接口迁移管理（管理员）
 *
 * GET                     → 列出 v1 接口文件 + v2 状态
 * POST action=create      → 为 v1 接口创建 v2 版本（v2/xxx.php 转发到 v1 实现）
 * POST action=delete      → 删除 v2 版本文件
 *
 * 安全：file 参数白名单 [a-z0-9_]+.php 且必须存在于 api/ 根目录，防路径穿越
 */
session_start();
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Origin: *");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/admin_auth.php';
checkAdminAuth();

$method = $_SERVER['REQUEST_METHOD'];
$input = $method === 'POST' ? (json_decode(file_get_contents('php://input'), true) ?: []) : [];
$action = isset($_GET['action']) ? trim($_GET['action']) : (isset($input['action']) ? trim($input['action']) : 'list');

$V2_DIR = __DIR__ . '/v2';
$API_DIR = __DIR__;

/** 校验文件名：仅允许小写字母数字下划线的 .php，且是 api/ 根目录真实存在的文件 */
function validV1File($file) {
    global $API_DIR;
    if (!preg_match('/^[a-z0-9_]+\.php$/i', $file)) return false;
    return file_exists($API_DIR . '/' . $file);
}

try {
    if ($method === 'POST' && $action === 'create') {
        $file = trim($input['file'] ?? '');
        if (!validV1File($file)) {
            http_response_code(400);
            echo json_encode(array('code' => 400, 'message' => '无效的接口文件名'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        if (!is_dir($V2_DIR)) mkdir($V2_DIR, 0755, true);
        $target = $V2_DIR . '/' . $file;
        if (file_exists($target)) {
            echo json_encode(array('code' => 200, 'message' => 'v2/' . $file . ' 已存在（未改动）'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        $content = "<?php
"
            . "/**
"
            . " * v2/{$file} — v2 版本（转发到 v1 实现）
"
            . " * 由后台「v2 接口迁移」创建。如需真正的 v2 实现，直接改写本文件即可。
"
            . " */
"
            . "require_once dirname(__DIR__) . '/{$file}';
";
        if (file_put_contents($target, $content) === false) {
            http_response_code(500);
            echo json_encode(array('code' => 500, 'message' => '创建失败（目录无写入权限）'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(array('code' => 200, 'message' => '已创建 v2/' . $file), JSON_UNESCAPED_UNICODE);

    } elseif ($method === 'POST' && $action === 'delete') {
        $file = trim($input['file'] ?? '');
        if (!preg_match('/^[a-z0-9_]+\.php$/i', $file)) {
            http_response_code(400);
            echo json_encode(array('code' => 400, 'message' => '无效的接口文件名'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        $target = $V2_DIR . '/' . $file;
        if (!file_exists($target)) {
            echo json_encode(array('code' => 200, 'message' => 'v2/' . $file . ' 不存在'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        if (!unlink($target)) {
            http_response_code(500);
            echo json_encode(array('code' => 500, 'message' => '删除失败（目录无写入权限）'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(array('code' => 200, 'message' => '已删除 v2/' . $file), JSON_UNESCAPED_UNICODE);

    } else { // list
        $v1 = array();
        foreach (glob($API_DIR . '/*.php') as $f) {
            $name = basename($f);
            if ($name === 'index.php') continue;           // 路由入口，非业务接口
            $v1[] = $name;
        }
        sort($v1);
        $v2 = array();
        if (is_dir($V2_DIR)) {
            foreach (glob($V2_DIR . '/*.php') as $f) $v2[] = basename($f);
        }
        $list = array_map(function ($f) use ($v2) {
            return array('file' => $f, 'v2' => in_array($f, $v2));
        }, $v1);
        echo json_encode(array(
            'code' => 200,
            'message' => '成功',
            'data' => array(
                'list' => $list,
                'total' => count($v1),
                'v2_count' => count($v2)
            )
        ), JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array('code' => 500, 'message' => '操作失败: ' . $e->getMessage()), JSON_UNESCAPED_UNICODE);
}
