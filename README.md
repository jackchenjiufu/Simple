# Simple Server

轻量级 PHP RESTful API 服务框架 — 内置中间件链、服务-仓库分层架构、频率限制、文件上传、管理后台。

## 架构

```
请求 → CORS 中间件 → 日志中间件 → 错误中间件 → 路由 → 响应
                                                  ↓
                                            Service 层（业务逻辑）
                                                  ↓
                                          Repository 层（数据访问）
                                                  ↓
                                              PDO / MySQL
```

## 目录结构

```
server/
├── api/                # API 端点（40+ 接口）
│   ├── index.php       # 集中式路由入口
│   ├── login.php       # 用户登录（含频率限制）
│   ├── register.php    # 用户注册（含频率限制）
│   ├── content.php     # 内容 CRUD
│   ├── upload.php      # 文件上传
│   └── admin_*.php     # 管理后台接口
├── config/             # 配置
│   ├── Config.php      # .env 配置管理
│   ├── Database.php    # PDO 连接封装
│   └── RateLimiter.php # IP 频率限制
├── middleware/          # 中间件链
│   ├── Middleware.php      # 抽象基类
│   ├── CorsMiddleware.php  # 跨域处理
│   ├── LogMiddleware.php   # 请求/响应日志
│   ├── ErrorMiddleware.php # 异常捕获
│   └── AuthMiddleware.php  # 认证校验
├── services/           # 业务逻辑层
│   ├── UserService.php
│   └── ContentService.php
├── repositories/       # 数据访问层
│   ├── UserRepository.php
│   └── ContentRepository.php
├── uploads/            # 上传文件存储
├── downloads/          # 下载文件
├── sql/                # 数据库脚本
└── mail.php            # 邮件服务（PHPMailer）

admin-web/              # 管理后台前端（原生 HTML/JS/CSS）
```

## 快速开始

### 环境要求

- PHP 7.2+
- MySQL 5.7+ / MariaDB 10.2+
- Apache 2.4+（mod_rewrite）或 Nginx 1.16+

### 安装

```bash
# 1. 克隆项目
git clone git@github.com:jackchenjiufu/Simple.git
cd Simple

# 2. 安装 PHP 依赖
composer install

# 3. 配置环境变量
cp server/config/.env.example server/config/.env
# 编辑 .env 填入数据库连接信息

# 4. 导入数据库
mysql -u root -p < server/sql/doo-app.sql

# 5. 配置 Web 服务器指向 server/ 目录
```

### 初始化

```bash
# 初始化数据库结构
curl http://localhost/server/api/init_database.php

# 重置管理员密码为 admin123
curl http://localhost/server/api/reset_admin.php

# 检查部署状态
curl http://localhost/server/api/check_admin_setup.php
```

### 管理后台

访问 `http://localhost/admin-web/login.html`，使用管理员账号登录。

## 核心特性

| 特性 | 说明 |
|------|------|
| **中间件链** | CORS → 日志 → 错误 → 认证，可插拔 |
| **分层架构** | Service（业务） → Repository（数据） |
| **频率限制** | 基于 IP + 操作的数据库限流 |
| **密码安全** | bcrypt 哈希，`password_hash` / `password_verify` |
| **SQL 注入防护** | 全量 PDO 预处理 + 参数绑定 |
| **CORS 管理** | `.env` 可控的跨域白名单 |
| **请求日志** | JSON 格式请求/响应日志（含处理耗时） |
| **错误处理** | 统一异常捕获，JSON 错误响应 |

## API 响应格式

所有接口统一返回：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

## API 接口一览

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login.php` | 用户登录 |
| POST | `/api/register.php` | 用户注册 |
| POST | `/api/change_password.php` | 修改密码 |
| POST | `/api/forgot_password.php` | 忘记密码 |
| POST | `/api/reset_password.php` | 重置密码 |

### 用户
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/get_users.php` | 用户列表 |
| GET | `/api/user_profile.php` | 用户画像 |
| PUT | `/api/update_user.php` | 更新用户 |
| DELETE | `/api/delete_account.php` | 删除账号 |

### 内容
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/content.php` | 内容列表/详情 |
| POST | `/api/content.php` | 创建内容 |
| PUT | `/api/content.php` | 更新内容 |
| DELETE | `/api/content.php` | 删除内容 |
| GET | `/api/get_carousels.php` | 轮播图 |
| GET | `/api/recommend.php` | 推荐内容 |
| GET | `/api/feed.php` | 视频流 |

### 社交
| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST/DELETE | `/api/follow.php` | 关注/取消/列表 |
| GET | `/api/check_follow.php` | 检查关注状态 |
| GET | `/api/messages.php` | 消息列表 |
| POST | `/api/send_message.php` | 发送消息 |
| GET | `/api/get_chat_history.php` | 聊天记录 |
| GET/POST | `/api/get_collections.php` | 收藏管理 |

### 文件
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload.php` | 文件上传 |
| POST | `/api/upload_image.php` | 图片上传 |
| GET | `/api/files.php` | 文件列表 |

### 管理后台
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin_login.php` | 管理员登录 |
| GET | `/api/admin_stats.php` | 数据统计 |
| CRUD | `/api/admin_users.php` | 用户管理 |
| CRUD | `/api/admin_content.php` | 内容管理 |
| CRUD | `/api/admin_carousels.php` | 轮播图管理 |
| CRUD | `/api/admin_messages.php` | 消息管理 |
| GET | `/api/admin_logs.php` | 操作日志 |

### 系统
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/system_monitor.php` | 系统监控 |
| POST | `/api/user_behavior.php` | 行为数据同步 |
| POST | `/api/deploy.php` | 文件部署 |
| POST | `/api/ai_proxy.php` | AI 代理 |

## 中间件使用

```php
// index.php 中的中间件链构建
$corsMiddleware = new CorsMiddleware($db);
$logMiddleware = new LogMiddleware($db);
$errorMiddleware = new ErrorMiddleware($db);

$corsMiddleware->setNext($logMiddleware)
               ->setNext($errorMiddleware);

$response = $corsMiddleware->handle($requestData);
```

## 频率限制

```php
// 5 分钟内最多 5 次登录尝试
$rateLimiter = new RateLimiter($db, 5, 5);

if ($rateLimiter->isRateLimited('login')) {
    http_response_code(429);
    echo json_encode(['code' => 429, 'message' => '请 5 分钟后再试']);
    exit;
}
```

## 前端项目

项目同时包含一个 uni-app（Vue 3）前端：

```bash
npm install
npm run dev      # Web 开发
npm run build    # 构建 H5
```

## 技术栈

- **后端**: PHP + MySQL + PDO
- **前端**: uni-app (Vue 3) + Vite + Capacitor
- **邮件**: PHPMailer
- **认证**: Session + Token

## License

ISC
