# Simple Server 安全审计报告

**审计日期**: 2026-06-20  
**审计范围**: `server/` 目录下全部 90 个 PHP 文件  
**审计方法**: 手动逐文件代码审查  
**版本**: v2.2.0

---

## 发现问题汇总

| 等级 | 数量 | 说明 |
|------|------|------|
| 🔴 严重 | 3 | 需立即修复 |
| 🟠 高危 | 5 | 应尽快修复 |
| 🟡 中危 | 7 | 建议修复 |
| 🟢 低危 | 6 | 酌情修复 |
| ✅ 安全 | — | 已确认安全的模式 |

---

## 🔴 严重 (Critical)

### SEC-001: `reset_admin.php` 无认证 — 可被任意调用

**文件**: `server/api/reset_admin.php`  
**风险**: 任何知道 URL 的人访问此文件即可将管理员密码重置为 `admin123`  
**影响**: 攻击者获取管理员账号，完全控制后台

```php
// reset_admin.php — 无任何 session 检查或 token 验证
$password = 'admin123';
// 直接重置 admin 密码
```

**修复建议**: 添加 token 验证或仅允许本地访问：
```php
if ($_SERVER['REMOTE_ADDR'] !== '127.0.0.1' && $_SERVER['REMOTE_ADDR'] !== '::1') {
    http_response_code(403);
    exit;
}
// 或读取 .env 中预设的 RESET_TOKEN
```

### SEC-002: `deploy.php` 硬编码弱令牌

**文件**: `server/api/deploy.php:11`  
**风险**: 令牌 `doo_deploy_2024` 是弱且可预测的字符串，通过此接口可写入任意 PHP 文件 → 远程代码执行  
**依赖链**: 写入 server/api/ 目录下的文件可被直接执行

```php
define('DEPLOY_TOKEN', 'doo_deploy_2024');
```

**修复建议**:
```php
define('DEPLOY_TOKEN', Config::get('api.deploy_token'));
// .env: DEPLOY_TOKEN=<random-64-char-string>
```

### SEC-003: `init_database.php` 可被外部调用

**文件**: `server/api/init_database.php`  
**风险**: 无认证，可被重复调用重置数据库，或通过 SQL 注入风险写入恶意数据（当前 `exec()` 调用的 SQL 是硬编码的，暂时安全）

**修复建议**: 添加 IP 白名单或临时 token，初始化完成后自动禁用：
```php
if (file_exists(__DIR__ . '/../.initialized')) {
    http_response_code(403);
    echo json_encode(['code' => 403, 'message' => '已初始化']);
    exit;
}
```

---

## 🟠 高危 (High)

### SEC-004: `admin_users.php` PUT 动态列名无白名单

**文件**: `server/api/admin_users.php:103-124`  
**风险**: 列名直接插入 SQL，虽值使用参数绑定，但攻击者可通过控制 `$data` 的 key 注入任意列名

```php
if (isset($data->avatar)) {
    $updateFields[] = "avatar=:avatar";  // 虽然 key 是硬编码的
    $params[":avatar"] = $data->avatar;  // 值安全
}
// 但攻击者无法控制列名 — 当前代码实际上是安全的
// 风险在 UserRepository::updateUser() 中，那里列名来自用户输入的 key
```

**文件**: `server/repositories/UserRepository.php:79`  
**实际风险点**:
```php
foreach ($userData as $key => $value) {
    $updateFields[] = "{$key}=:{$key}";  // $key 直接来自用户输入
```

**修复**: 对 `$userData` 的 key 进行白名单校验：
```php
$allowedFields = ['nickname', 'avatar', 'background_image', 'email'];
foreach ($userData as $key => $value) {
    if (!in_array($key, $allowedFields, true)) continue;
    $updateFields[] = "{$key}=:{$key}";
```

### SEC-005: `files.php` DELETE 路径注入风险

**文件**: `server/api/files.php:200-203`  
**风险**: 文件路径拼接中使用 `$file['folder']` 和 `$file['name']`，虽值来自数据库，但如果数据库被污染，可能触发路径穿越

```php
$filePath = __DIR__ . '/../uploads/' . ($file['folder'] ? $file['folder'] . '/' : '') . $file['name'];
if (file_exists($filePath)) {
    unlink($filePath);  // 可能删除任意文件
}
```

**修复**: 添加 `basename()` 防护：
```php
$safeFolder = basename($file['folder'] ?? '');
$safeName = basename($file['name']);
$filePath = __DIR__ . '/../uploads/' . $safeFolder . '/' . $safeName;
```

### SEC-006: `ai_proxy.php` 缺乏输入验证 → SSRF

**文件**: `server/api/ai_proxy.php`  
**风险**: 完全转发用户输入到内部 LLM 服务 `192.168.1.10:8080`，无任何内容过滤

```php
$msg = $input['message'] ?? '';
curl_setopt_array($ch, [
    CURLOPT_POSTFIELDS => json_encode([
        'model' => 'gpt-3.5-turbo',
        'messages' => [['role' => 'user', 'content' => $msg]],  // 用户输入直传
        'max_tokens' => 300
    ]),
]);
```

**影响**: 恶意 prompt 注入、token 浪费、可能的信息泄露  
**修复**: 添加内容过滤、速率限制、max_tokens 上限：
```php
$msg = mb_substr(trim($msg), 0, 2000); // 限制长度
// 添加基础敏感词过滤
$rateLimiter = new RateLimiter($db, 10, 1); // 1分钟10次
```

### SEC-007: `crawl_douyin_hotsearch.php` SSL 验证禁用

**文件**: `server/api/crawl_douyin_hotsearch.php:110-111`  
**风险**: MITM 攻击，抓取数据可能被篡改

```php
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
```

### SEC-008: 多处异常信息泄露错误详情

**文件**: `server/api/` 下约 20+ 个文件  
**风险**: 数据库错误信息（表名、字段名）泄露给客户端

示例 — `files.php:141`:
```php
"message" => "数据库查询失败: " . $e->getMessage()
```

示例 — `upload.php:205`:
```php
"message" => "数据库连接失败: " . $e->getMessage()
```

**修复**: 生产环境只返回友好消息：
```php
"message" => "服务器处理失败，请稍后重试"
// 详细错误仅记录到 error_log()
```

---

## 🟡 中危 (Medium)

### SEC-009: `files_upload.php` 未验证文件 Magic Bytes

**文件**: `server/api/files_upload.php:79-84`  
**对比**: `upload.php` 有 magic bytes 验证，但 `files_upload.php` 只检查 `$_FILES['file']['type']`（可被伪造）

```php
// files_upload.php — 仅信任客户端上报的 MIME
if (in_array($fileType, $allowedTypes)) {
```

**修复**: 添加与 `upload.php` 相同的 magic bytes 验证。

### SEC-010: `files_upload.php` 端口号硬编码

**文件**: `server/api/files_upload.php:101`  
```php
if (strpos($host, ':') === false) {
    $host .= ':7070';  // 端口硬编码
}
```

### SEC-011: `upload.php` Magic Bytes 检测不完整

**文件**: `server/api/upload.php:73-79`  
**风险**: AVI 检测 (`stripos($magicBytes, 'AVI')`) 不够严格，`strpos($magicHex, '000000')` 可能匹配空字节前缀。虽整体良好，但存在边缘绕过可能。

### SEC-012: `user_profile.php` 推荐查询 LIKE 无长度限制

**文件**: `server/api/user_profile.php:636`  
**风险**: 偏好标签用于 LIKE 查询，如果标签过多可能导致性能下降或查询时间超长

```php
$preferenceConditions[] = "c.tags LIKE ?";
$params[] = "%$tag%";  // 无长度限制
```

### SEC-013: `admin_recommendations.php` 算法名直接插入 SQL

**文件**: `server/api/admin_recommendations.php:376-381`  
**风险**: `$validAlgorithms` 来自硬编码的 `array_keys($algorithmMap)`，当前安全但模式不够规范

```php
$behaviorSql = "SELECT ... WHERE algorithm IN ('$validAlgorithms')";
```

**修复**: 使用位置占位符：
```php
$placeholders = implode(',', array_fill(0, count($algoKeys), '?'));
$behaviorSql = "SELECT ... WHERE algorithm IN ($placeholders)";
```

### SEC-014: `admin_users.php` DELETE 无引用完整性检查

**文件**: `server/api/admin_users.php:174-192`  
**风险**: 直接删除用户，不检查关联数据（内容、消息、关注等）是否存在级联问题  
**注**: 数据库外键设置了 `ON DELETE CASCADE`，但需确认所有表的外键约束一致

### SEC-015: 邮件 HTML 使用不安全的 `$safeName`

**文件**: `server/mail.php:96-97`  
**分析**: 使用了 `htmlspecialchars()`，是安全的 ✅。但 `$code` 直接插入 HTML 未做转义，由于 `$code` 是 `generate_verification_code()` 生成的数字，实际安全。

---

## 🟢 低危 (Low)

### SEC-016: `str_shuffle()` 非加密安全随机

**文件**: `server/api/files_upload.php:48,74`, `server/api/upload.php:57`  
**风险**: `str_shuffle()` 使用内部伪随机数，文件名可能被预测  
**影响**: 低 — 仅影响文件存储的可预测性  
**修复**: 使用 `bin2hex(random_bytes(16))`

### SEC-017: Token 无过期时间

**文件**: `server/api/login.php:71`, `server/api/index.php:106`  
**风险**: Token 生成后永不过期  
**修复**: 存储 token 时记录 `expires_at`，验证时检查

### SEC-018: `register.php` 密码无最小长度限制

**文件**: `server/api/register.php`  
**对比**: `reset_password.php:46` 有 `strlen($newPassword) < 6` 检查  
**修复**: 在 register.php 也添加最小长度检查

### SEC-019: .env 备份文件可能被访问

**风险**: `.env.example` 虽无真实值，但 `.env` 如果配置错误可能被 Web 服务器直接访问  
**当前防护**: `.gitignore` 中已排除，但缺少 Apache/Nginx 层面的防护  
**修复**: 在 `.htaccess` 中添加：
```apache
<FilesMatch "\.env$">
    Deny from all
</FilesMatch>
```

### SEC-020: Oracle 没有 HTTPS 强制

**风险**: 所有 API 均通过 HTTP 访问，密码和 token 明文传输  
**修复建议**: 生产环境配置 Nginx/Apache 301 重定向到 HTTPS，设置 HSTS 头

### SEC-021: Session Cookie 无安全标志

**风险**: PHP 默认 session cookie 未设置 `HttpOnly`、`Secure`、`SameSite`  
**修复**: 在 `php.ini` 或在 `Config::init()` 中配置：
```php
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.cookie_samesite', 'Strict');
```

---

## ✅ 已确认安全

以下项目经过验证，确认不存在安全风险：

| 检查项 | 状态 | 说明 |
|--------|------|------|
| SQL 注入 | ✅ | 全量 PDO prepare + bindParam/bindValue |
| 密码存储 | ✅ | bcrypt via `password_hash(PASSWORD_DEFAULT)` |
| XSS (邮件) | ✅ | `htmlspecialchars()` 转义用户名 |
| 路径穿越 (download_proxy) | ✅ | `basename()` 防护 |
| 危险函数 | ✅ | 无 `eval()`/`system()`/`shell_exec()` |
| Rate Limiter SQL | ✅ | v2.0.1 修复 INTERVAL 内联 |
| 错误堆栈泄露 (middleware) | ✅ | v2.1.0 修复 ErrorMiddleware |
| CORS 覆盖 | ✅ | v2.1.0 补齐 26 个文件 |
| 路由统一 | ✅ | v2.2.0 .htaccess → index.php |

---

## 修复优先级建议

| 优先级 | 编号 | 问题 | 影响 |
|--------|------|------|------|
| 🔴 P0 | SEC-001 | reset_admin 无认证 | 管理员账号接管 |
| 🔴 P0 | SEC-002 | deploy 弱令牌 | 远程代码执行 |
| 🔴 P0 | SEC-003 | init_database 无认证 | 数据库破坏 |
| 🟠 P1 | SEC-004 | UserRepository 列名注入 | 数据篡改 |
| 🟠 P1 | SEC-008 | 20+ 文件错误信息泄露 | 信息泄露 |
| 🟠 P1 | SEC-006 | ai_proxy 无输入过滤 | SSRF/滥用 |
| 🟠 P1 | SEC-005 | files.php 路径穿越 | 文件删除 |
| 🟠 P1 | SEC-007 | SSL 禁用 | MITM |
| 🟡 P2 | SEC-009~015 | 中等风险 | 防御性修复 |
| 🟢 P3 | SEC-016~021 | 低风险 | 加固 |

---

**审计人员**: Claude (AI)  
**审计范围**: server/ — 90 PHP 文件  
**下次审计**: 建议在 SEC-001~008 修复后进行
