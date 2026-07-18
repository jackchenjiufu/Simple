# Simple Server / DOO

轻量级 PHP RESTful API 服务框架 — 中间件链 + 服务-仓库分层架构，内置 80+ API、频率限制、RBAC 权限、考勤薪资、自动化爬虫、反馈系统。配套 uni-app（Vue 3）跨端 App 和 Vue 3 / 原生双版本管理后台。

## 架构

```
请求 → CORS 中间件 → 日志中间件 → 错误中间件 → 路由 → 响应
                                                    ↓
                                              Service 层
                                                    ↓
                                            Repository 层
                                                    ↓
                                              PDO / MySQL
```

统一路由入口：`/api/*` 经 `.htaccess` → `index.php` 集中分发（RESTful 路由 + 传统文件路由双模式）。

## 目录

```
server/
├── api/          # 80+ API 接口（认证/用户/内容/社交/文件/考勤/反馈/爬虫/管理后台）
├── config/       # Config.php（.env管理） + Database.php（PDO） + RateLimiter.php（限流）
├── middleware/    # CORS / 日志 / 错误 / 认证 — 链式中间件
├── services/     # UserService / ContentService — 业务逻辑
├── repositories/ # UserRepository / ContentRepository — 数据访问
├── uploads/      # 上传文件
├── downloads/    # APK 下载
├── sql/          # 数据库脚本
├── websocket/    # Node.js WebSocket 推送服务
└── mail.php      # 邮件（PHPMailer）

admin-vue/        # 管理后台（Vue 3 SPA，Hash 路由）
admin-web/        # 管理后台（原生 HTML/JS/CSS，传统版）
admin-vue-dist/   # admin-vue 构建产物

pages/            # uni-app (Vue 3) 前端页面
components/       # Vue 组件库
store/            # Vuex 状态管理
utils/            # 工具函数（请求封装/行为分析/缓存）
websocket/        # App 端 WebSocket 连接逻辑（App.vue 内嵌）
```

## 快速开始

```bash
git clone git@github.com:jackchenjiufu/Simple.git
cd Simple
composer install
cp server/config/.env.example server/config/.env   # 编辑数据库配置
mysql -u root -p < server/sql/doo-app.sql
```

```bash
# 初始化
curl http://localhost/server/api/init_database.php
curl http://localhost/server/api/reset_admin.php        # 管理员 → admin123
```

## API 概览（80+ 接口）

| 模块 | 接口数 | 核心功能 |
|------|--------|----------|
| 认证 | 8 | 登录/注册/改密/忘记密码（频率限制 + 邮件验证码） |
| 用户 | 5 | 用户列表/画像/等级/行为分析 |
| 内容 | 10 | CRUD/轮播图/文章/用户行为同步 |
| 反馈 | 2 | 用户提交反馈 + 查看回复历史 |
| 社交 | 6 | 关注/粉丝/私信/聊天记录 |
| 文件/图片 | 11 | 上传/预览/列表/删除/批量导入/下载代理 |
| 收藏 | 2 | 收藏列表/添加收藏 |
| 考勤薪资 | 2 | 打卡 + 加班费 + 五险一金 + 个税（江苏标准） |
| 公告 | 1 | 公告列表 |
| RBAC | 1 | 4 角色 + 12 权限/动态分配 |
| 爬虫 | 3 | 抖音热榜→自动发文章 / picsum→自动发图 |
| 系统 | 9 | 监控/部署/AI代理/版本管理/数据库初始化 |
| 管理后台 | 12 | 用户/内容/轮播/消息/日志/统计/反馈/权限/开屏/文章管理 |

### WebSocket

- App 启动自动连接 `ws://139.196.185.197:1884`
- 心跳保活（8 秒间隔），断线自动重连
- 支持：认证、推送消息、在线人数统计、踢下线

## 响应格式

```json
{ "code": 200, "message": "成功", "data": { ... } }
```

## 安全

- bcrypt 密码哈希 | 全量 PDO 预处理 | 频率限制
- Session + Token 双重认证 | CORS 白名单 | 文件上传白名单 + 大小限制
- Token 认证（64 字符随机 hex） | 错误信息脱敏

## 管理后台

| 版本 | 技术 | 路径 | 状态 |
|------|------|------|------|
| Vue 3 SPA | Vue 3 + Vue Router (Hash) | `admin-vue/` | ✅ 主力版 |
| 原生版 | HTML/JS/CSS 传统多页 | `admin-web/` | ✅ 共存 |

功能：仪表盘 / 用户管理 / 内容管理 / 轮播图 / 公告 / 文章 / 反馈管理 / 开屏配置 / 数据统计 / 操作日志

## 技术栈

**后端**: PHP + MySQL + PDO + PHPMailer + Node.js (WebSocket)  
**前端**: uni-app (Vue 3) + Vite + Capacitor 6 → Android APK  
**后台**: Vue 3 SPA + 原生 HTML/JS/CSS 双版本  
**管理入口**: http://139.196.185.197:7070/admin  
**配置**: `E:/poo/doo/server/config/`

## License

ISC
