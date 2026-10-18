# Redis 缓存 + API 版本控制 实施方案

> 适用项目：Simple / DOO（PHP 7.2+ / MySQL / uni-app Vue3）
> 设计原则：**渐进式、零破坏、可回滚**。所有改动不改变现有 95+ 接口行为，旧 App 无需发版即可平滑过渡。

---

## 一、现状分析（方案依据）

| 关注点 | 现状 | 结论 |
|--------|------|------|
| 配置 | `server/config/Config.php` 静态类 + `.env`，已有 `api.version='1.0.0'` 键 | 版本号已存在，但**未参与路由**，仅信息展示 |
| 路由 | `.htaccess` 将所有 `/api/*` rewrite 进 `server/api/index.php`（`__route` 参数）；index.php 内 switch 分发（RESTful 4 个 + 传统文件 require 80+） | 版本前缀可**零改动**地经由现有 rewrite 传递（`/api/v2/login.php` 自然变成 `__route=v2/login.php`） |
| 数据库 | `Database.php` 简单 PDO 封装，每次请求新建连接 | 高频读接口（轮播/公告/文章/统计）是缓存首要目标 |
| 限流 | `RateLimiter.php` 基于 MySQL `rate_limits` 表，登录 5次/5分、注册 3次/10分 | 每次限流检查都产生 DB 读写，可搬 Redis（保留 MySQL 版作降级） |
| 前端缓存 | `utils/request.js` 已有**客户端本地缓存**（cache 选项，默认 30 分钟） | 客户端缓存 ≠ 服务端缓存，两者互补：客户端省流量，服务端省 DB |
| 前端配置 | `utils/config.js` 唯一配置源，`baseUrl = .../server/api/`；大量页面**硬编码** `baseUrl + 'xxx.php'` 拼接 | 版本切换必须做到 **baseUrl 一处开关 + 服务端 fallback**，否则要改上百处页面 |
| 依赖 | 无 composer.json（vendor 仅 PHPMailer），无 Redis 扩展 | 优先 phpredis 扩展；服务器装不了则用 Predis 纯 PHP（无需扩展） |

---

## 二、Redis 缓存方案

### 2.1 技术选型

| 方案 | 前提 | 适用 |
|------|------|------|
| **phpredis 扩展**（首选） | `pecl install redis`，PHP 7.2+ 均可 | 自有 VPS / 宝塔面板（`php -m | grep redis` 验证） |
| **Predis 纯 PHP**（备选） | 无扩展依赖，`composer require predis/predis` 或直接放 `vendor/` | 共享虚拟主机、无法装扩展的环境 |

> 本项目无 composer.json，若走 Predis：在 `server/` 下 `composer init && composer require predis/predis` 生成 autoloader；若嫌重，可只 `require` Predis 的 `Client.php` 单入口（Predis 支持免 autoload 直接 require）。

### 2.2 新增文件与配置

**新增 `server/config/Cache.php`**（Redis 封装，核心骨架）：

```php
<?php
require_once __DIR__ . '/Config.php';

class Cache {
    private static $redis  = null;
    private static $ok     = null;   // null=未探测, true/false=可用性

    /** 获取连接；任何异常 → 标记不可用并返回 null（本请求不再重试，静默降级） */
    private static function conn() {
        if (self::$ok === false) return null;
        if (self::$redis !== null) return self::$redis;
        if (!class_exists('Redis')) { self::$ok = false; return null; }
        try {
            $r = new Redis();
            $r->connect(
                Config::get('redis.host', '127.0.0.1'),
                (int)Config::get('redis.port', 6379),
                0.5                              // 0.5s 快速失败，不拖慢接口
            );
            $pass = Config::get('redis.password', '');
            if ($pass !== '') $r->auth($pass);
            $r->select((int)Config::get('redis.db', 0));
            self::$redis = $r;
            self::$ok = true;
        } catch (Exception $e) {
            self::$ok = false;
        }
        return self::$redis;
    }

    /** 读缓存；null 表示未命中或不可用 */
    public static function get($key) {
        $r = self::conn();
        if ($r === null) return null;
        $v = $r->get($key);
        return $v === false ? null : json_decode($v, true);
    }

    /** 写缓存（自动 JSON 序列化） */
    public static function set($key, $value, $ttl = 300) {
        $r = self::conn();
        if ($r === null) return false;
        return $r->setex($key, $ttl, json_encode($value, JSON_UNESCAPED_UNICODE));
    }

    /** 缓存回调：未命中时执行 $callback 并回填 */
    public static function remember($key, $ttl, $callback) {
        $v = self::get($key);
        if ($v !== null) return $v;
        $v = $callback();
        self::set($key, $v, $ttl);
        return $v;
    }

    /** 按前缀批量失效（SCAN 而非 KEYS，避免阻塞） */
    public static function forget($pattern) {
        $r = self::conn();
        if ($r === null) return;
        $keys = [];
        $it = null;
        do { $keys = array_merge($keys, $r->scan($it, $pattern, 100)); } while ($it > 0);
        if ($keys) $r->del($keys);
    }

    /** 原子限流：返回窗口内计数（配合 EXPIRE） */
    public static function incr($key, $ttl = 300) {
        $r = self::conn();
        if ($r === null) return false;
        $n = $r->incr($key);
        if ($n === 1) $r->expire($key, $ttl);
        return $n;
    }
}
```

**`.env` 新增配置**（`server/config/.env`，Cache 类通过 `Config::get('redis.*')` 读取，需在 `Config::init()` 的 `$config` 数组补 `'redis' => [...]` 段）：

```
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_PREFIX=doo:
```

### 2.3 缓存策略分层（按优先级）

| 优先级 | 接口 | 缓存 Key | TTL | 失效时机 |
|--------|------|----------|-----|----------|
| **P0** | `get_carousels.php` 轮播图 | `doo:carousels:list` | 10 分钟 | 后台增删改轮播图后 `Cache::forget('doo:carousels:*')` |
| **P0** | `announcements.php` 公告 | `doo:announcements:list` | 5 分钟 | 后台发布公告后删除 |
| **P0** | `get_articles.php` 文章列表 | `doo:articles:list:{page}` | 10 分钟 | 爬虫/后台发文后删除 |
| **P1** | `get_images.php` / `feed.php` | `doo:images:list` / `doo:feed:{page}` | 60 秒 | 短 TTL 兜底，不主动失效 |
| **P1** | `user_profile.php` 用户画像 | `doo:user:profile:{uid}` | 30 分钟 | 用户更新资料/行为同步后删除 |
| **P1** | 登录/注册限流 | 迁移 RateLimiter → Redis | 随窗口 | `INCR + EXPIRE` 原子完成 |
| **P2** | `admin_stats.php` 统计 | `doo:stats:overview` | 60 秒 | 短 TTL 兜底 |
| **P2** | `system_monitor.php` | `doo:monitor` | 30 秒 | 短 TTL 兜底 |
| P3 | 会话/Token 校验 | `doo:token:{token}` | 与 `token_expiry` 对齐 | 登出即删 |

**改造范式**（以 `get_carousels.php` 为例，改动最小）：

```php
require_once __DIR__ . '/../config/Cache.php';

try {
    $data = Cache::remember('doo:carousels:list', 600, function () use ($db) {
        $query = "SELECT id, title, author, image_url as image, sort_order as sort
                  FROM carousels WHERE is_active = 1 ORDER BY sort_order ASC";
        $stmt = $db->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    });
    http_response_code(200);
    echo json_encode(["message" => "获取成功", "code" => 200, "data" => $data], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) { ... }
```

**写操作失效**（admin_carousels.php 等改动落库后追加一行）：
```php
Cache::forget('doo:carousels:*');   // SCAN 前缀删除，不改动其他 key
```

### 2.4 一致性、穿透与雪崩

| 问题 | 对策 |
|------|------|
| 一致性 | **写库 → 删缓存**（Cache Aside），配合 TTL 兜底，容忍 ≤ TTL 的短暂不一致；不采用双写 |
| 缓存穿透 | 不存在的 key 也缓存空值 `[]` 60 秒（可选开关） |
| 缓存雪崩 | TTL 加随机抖动：`$ttl + mt_rand(0, 60)` |
| 缓存击穿 | 极热 key（首页轮播）可在 remember 里加简单的请求内互斥锁（`SETNX`） |
| Redis 宕机 | `Cache::ok === false` 后整请求静默走 DB，业务零感知；PHP 每次请求独立探测 |

### 2.5 可选增强：限流迁移（P1）

`RateLimiter.php` 提供 Redis 版实现（保留 MySQL 版）：

```php
public function isRateLimited($action) {
    $key = 'doo:rate:' . $action . ':' . getClientIp();
    $n = Cache::incr($key, $this->windowSeconds);
    if ($n === false) return $this->isRateLimitedDb($action); // 降级回 MySQL
    return $n > $this->maxAttempts;
}
```

收益：登录/注册限流不再产生 MySQL 读写与 `rate_limits` 垃圾行；Redis 原子计数天然防并发。

### 2.6 实施步骤

1. 服务器装 phpredis 扩展（或引入 Predis），`php -m | grep redis` 验证
2. 新建 `server/config/Cache.php` + `Config.php` 补 `redis` 配置段 + `.env` 补 5 个变量
3. P0 三接口接入（轮播/公告/文章列表）+ 对应 admin 接口加 `Cache::forget`
4. 部署后用 `system_monitor.php` 对比接口耗时，验证命中率（可临时在 Cache::get 加命中计数）
5. 可选：RateLimiter Redis 版 → 统计接口 → 画像

---

## 三、API 版本控制方案

### 3.1 方案选型

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **A. URL 路径版本** `/api/v2/xxx` | 直观、标准、利于网关/CDN 按路径缓存、浏览器可读 | 旧路径需保留 | **推荐** |
| B. Header 版本 `X-API-Version: 2` | URL 干净 | 调试不便、CDN 区分难、前端封装全改 | 备选 |
| C. Query 版本 `?v=2` | 实现最简单 | 与现有大量 query 参数混杂、易漏传 | 不推荐 |

### 3.2 架构设计（三阶段渐进，旧接口零破坏）

**阶段 1：基础设施（半天）——先有"版本路径"，行为完全不变**

1. `.htaccess` **无需修改**：`/api/v2/login.php` 经现有规则自然变成 `__route=v2/login.php`
2. `server/api/index.php` 路由解析处插入版本识别（约 10 行）：

```php
// === 解析版本前缀（v1/v2/...）===
$apiVersion = 1;
$route = preg_replace('/\.php$/', '', trim($route, '/'));
$segments = explode('/', $route);
if (preg_match('/^v(\d+)$/', $segments[0] ?? '', $m)) {
    $apiVersion = (int)$m[1];
    array_shift($segments);
}
$resource = $segments[0] ?? '';
$resourceId = $segments[1] ?? null;
```

3. 传统文件路由处改为「v2 目录优先，根目录 fallback」：

```php
// 版本目录优先：server/api/v2/xxx.php
if ($apiVersion >= 2) {
    $v2file = __DIR__ . '/v2/' . $resource . '.php';
    if (file_exists($v2file)) { require $v2file; break; }
}
// fallback：v2 未实现的接口 → 走 v1 实现（行为不变）
$file = __DIR__ . '/' . $resource . '.php';
if (file_exists($file)) { require $file; }
```

> 效果：`/api/v2/get_carousels.php` 立即可用且与 v1 返回完全一致；任何新版本请求都不会 404。

4. 所有响应统一带版本头（在 index.php 引导段加一行）：

```php
header('X-API-Version: v' . $apiVersion);
// v1 已稳定时可选：header('Deprecation: version="1"');  // 标记旧版本进入弃用期
```

**阶段 2：前端切换开关（0 改动页面）**

`utils/config.js` 增加版本开关，**默认关闭**：

```js
const config = {
  host: 'your-domain.com',
  port: '7070',
  sitePath: '/doo',
  /** 0=不启用版本段(现状) / 2=走 /api/v2/ */
  apiVersion: 0,

  get baseUrl() {
    const v = this.apiVersion ? `v${this.apiVersion}/` : ''
    return `http://${this.host}:${this.port}${this.sitePath}/server/api/${v}`
  },
  ...
}
```

> 因所有页面都拼 `baseUrl + 'xxx.php'`，**只需把 `apiVersion` 改成 2**，全 App 即整体切到 v2 路径；服务器端 fallback 保证每个接口仍然可用。切回 1 即回滚，无需发版 App（热更新 WGT 亦可）。

**阶段 3：按接口逐个提供真正的 v2 实现**

- 将改动最大的接口（`content`、`user_profile`、`feed`、`overtime` 等）新逻辑放进 `server/api/v2/`，v1 原文件冻结不动，继续服务旧路径
- v2 稳定后给 v1 响应加 `Deprecation` 头，文档标注下线计划，最后删除 v1 路由分支

### 3.3 版本生命周期管理

| 阶段 | 动作 |
|------|------|
| 并行期 | v1/v2 双跑；新 App 走 v2（`apiVersion: 2`），旧 App 走 v1 |
| 弃用期 | v1 响应加 `Deprecation: version="1"`；文档公告 v1 下线日期 |
| 下线期 | index.php 移除 v1 fallback 分支，仅保留 v2 目录；`.htaccess` 不变 |

版本号唯一来源保持 `Config::get('api.version')`（`server/config/Config.php` 中的 `'version' => '1.0.0'`），发版时同步 bump。

### 3.4 实施步骤

1. index.php 加版本解析 + v2 fallback（约 15 行）+ 版本响应头
2. 建空目录 `server/api/v2/`，放 1 个验证接口（如 `v2/get_carousels.php`，先复制 v1 实现）验证路由
3. curl 验证：`/api/v2/get_carousels.php` 与 `/api/get_carousels.php` 返回一致
4. 前端 `config.js` 加 `apiVersion` 开关（默认 0），文档注明切换方法
5. 需要大改的接口开始按 v2 重写

---

## 四、优先级与工作量

| 任务 | 优先级 | 工作量 | 收益 |
|------|--------|--------|------|
| 轮播/公告/文章列表缓存 | P0 | 0.5 天 | 首页首屏 DB 压力 ↓90%，秒开 |
| Cache.php + .env + 降级 | P0 | 0.5 天 | 基础设施 |
| 版本控制基础设施（阶段1+2） | P0 | 0.5 天 | 后续所有破坏性改动有安全通道 |
| RateLimiter 搬 Redis | P1 | 0.5 天 | 登录/注册限流不再碰 DB |
| 统计/画像/Feed 缓存 | P1 | 0.5 天 | 后台与 Tab 页提速 |
| 会话/Token Redis | P3 | 1 天 | 分布式扩展基础 |

> 缓存 + 版本控制基础设施合计约 **1.5 天**；缓存接口铺开约 **2 天**。

## 五、风险与注意点

1. **扩展不可用**：phpredis 装不上 → 立即切 Predis（纯 PHP），Cache.php 接口不变，只换连接实现。
2. **前端硬编码**：`grep -rn "baseUrl" pages/ components/` 有大量拼接点，但均走 `config.baseUrl`，因此 `apiVersion` 开关一处生效；`utils/request.js` 的 URL 构建也统一走 `apiConfig.getUrl`，不受影响。
3. **缓存污染**：带登录态/权限的接口（admin_*、user_profile 含私有数据）**不要全局缓存**，只能按 uid 维度缓存；列表类缓存统一在写接口删 key。
4. **旧 App 兼容**：版本控制的 fallback 机制保证旧版本号（无前缀）永远走 v1 实现，App 升级前不受任何影响。
5. **Redis 安全**：生产 Redis 必须设置密码并禁止外网端口暴露；`.env` 的 `REDIS_PASSWORD` 权限保持 600。
6. **回滚**：Cache.php 在 `Config::get('redis.enabled', true)` 为 false 时整体禁用；版本控制回滚 = 前端 `apiVersion` 改回 0。

---

*方案版本 v1.0 | 依据代码：server/api/index.php(428行) / server/config/Config.php / server/config/Database.php / server/config/RateLimiter.php / utils/config.js / utils/request.js*

---

## 实施状态（v1.1 — 2026-08 多 agent 并行落地）

### 已完成 ✅

| 任务 | 状态 | 涉及文件 |
|------|------|----------|
| 缓存基础设施 | ✅ 已完成 | server/config/Cache.php（新建）、server/config/Config.php（redis 配置段）、server/config/.env.example（REDIS_* 6 变量） |
| 轮播图读缓存 | ✅ 已完成 | server/api/get_carousels.php（remember 600s） |
| 文章列表读缓存 | ✅ 已完成 | server/api/get_articles.php（remember 600s，按 分类:limit:offset 维度） |
| 公告读缓存 + 写失效 | ✅ 已完成 | server/api/announcements.php（remember 300s + 3×forget） |
| 后台轮播/文章写失效 | ✅ 已完成 | server/api/admin_carousels.php（3×forget）、server/api/admin_articles.php（4×forget） |
| 爬虫/发文/删文写失效 | ✅ 已完成 | 8×crawl_*.php + upload_article.php + delete_article.php（各 1×forget articles:*） |
| API 版本控制后端 | ✅ 已完成 | server/api/index.php（版本解析 + v2 fallback + X-API-Version 头）、server/api/v2/get_carousels.php（新建） |
| API 版本控制前端 | ✅ 已完成 | utils/config.js（apiVersion: 0 开关）、utils/api.js（getImageUrl 版本兼容修复） |
| 后台可视化管理 | ✅ 已完成 | server/api/system_cache.php（状态/清缓存/版本信息）、admin-vue 独立导航页：缓存管理（CacheManage.vue）+ v2 接口（V2Apis.vue，含 API 版本状态）、Cache.php（stats/flushAll/raw） |
| v2 接口迁移（后台） | ✅ 已完成 | server/api/admin_v2api.php（列表/创建/删除 v2 转发文件，防路径穿越）、端到端验证通过（v2 转发返回 v1 数据） |
| 接口切换至 v2 | ✅ 已完成 | 后台 admin-vue API_BASE=/doo/server/api/v2（已部署生效） |
| v1/v2 全局切换 + App 自动跟随 | ✅ 已完成 | 后端 api_version.php（公开读）+ admin_api_version.php（管理员切换，api_settings 表存储）；App config.js baseUrl 动态读 storage、App.vue 启动拉取后端版本；后台 v2 接口页版本下拉切换。验证：api_version.php v1→v2 切换生效、鉴权 401、admin-vue 200 |
| 数据库管理页面 | ✅ 已完成 | server/api/admin_database.php（概览/表结构/数据分页浏览/SQL 执行，表名白名单+单语句限制+写操作确认+操作日志）、admin-vue DatabaseManage.vue + 导航「数据库管理」、v2 转发就位 |
| 后台全面审查修复 | ✅ 已完成 | 3 agent 并行审查（核心/数据/公共页面）。修复：V2Apis 版本切换时序 bug、Users 头像字段、upload_image 鉴权兼容 token 流+URL 动态化、admin_logs 搜索参数绑定+假日志清理、Stats 版本统计字段、Carousel is_active 类型、ArticleEdit 路由复用、ai_proxy 管理鉴权、upload_version MIME 按扩展名、get_versions URL 动态化、权限种子补全（8 权限+display_name+editor 授权）、死代码清理 |

### 未做（按方案后续排期）

- RateLimiter 迁移 Redis（P1）
- 统计/画像/Feed 缓存（P1/P2）
- 会话/Token Redis（P3）
- v2 接口逐个重写（阶段 3，按需）

### 部署与验证注意

- 本地无 PHP CLI，未执行 php -l 语法校验（所有改动均人工复查）
- 部署后冒烟测试建议：
  1. `curl /api/get_carousels.php` 与 `curl /api/v2/get_carousels.php` 返回一致，且后者响应头含 `X-API-Version: v2`
  2. 后台修改轮播图/公告/文章后，对应列表接口应返回最新数据（缓存已失效）
  3. 服务器需安装 phpredis 扩展并配置 server/config/.env 的 REDIS_* 变量；未安装时自动降级走数据库，接口行为不变
- server/ 目录在 .gitignore 中（生产通过 deploy 脚本直传），本次改动未纳入 git 追踪

