# Simple Server

轻量级 PHP RESTful API 服务框架 — 中间件链 + 服务-仓库分层架构，内置 60+ API、频率限制、RBAC 权限、推荐系统、考勤薪资、自动化爬虫。

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

## 目录

```
server/
├── api/          # 60+ API 接口（认证/用户/内容/社交/文件/考勤/推荐/管理后台）
├── config/       # Config.php（.env管理） + Database.php（PDO） + RateLimiter.php（限流）
├── middleware/    # CORS / 日志 / 错误 / 认证 — 链式中间件
├── services/     # UserService / ContentService — 业务逻辑
├── repositories/ # UserRepository / ContentRepository — 数据访问
├── uploads/      # 上传文件
├── downloads/    # APK 下载
├── sql/          # 数据库脚本
└── mail.php      # 邮件（PHPMailer）

admin-web/        # 管理后台（原生 HTML/JS/CSS）
pages/            # uni-app (Vue 3) 前端页面
components/       # Vue 组件库
store/            # Vuex 状态管理
utils/            # 工具函数（请求封装/推荐算法/行为分析/缓存）
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

## API 概览

| 模块 | 接口数 | 核心功能 |
|------|--------|----------|
| 认证 | 8 | 登录/注册/改密/忘记密码（频率限制 + 邮件验证码） |
| 用户 | 8 | 用户列表/画像/等级/行为分析/个性化推荐 |
| 社交 | 8 | 关注/粉丝/私信/聊天记录/收藏 |
| 内容 | 12 | CRUD/轮播图/推荐/视频流/文章/公告 |
| 文件 | 7 | 上传/下载/预览/批量导入（类型白名单） |
| 考勤薪资 | 4 | 上下班打卡 + 加班费 + 五险一金 + 个税（江苏标准） |
| 推荐系统 | 1 | 4 种算法/CURD/A/B测试/实时监控/手动推荐 |
| RBAC | 1 | 4 角色 + 12 权限/动态分配 |
| 爬虫 | 3 | 抖音热榜→自动发文章 / picsum→自动发图 |
| 系统 | 7 | 监控/部署/APK代理/AI代理/版本管理 |
| 管理后台 | 12 | 用户/内容/轮播/消息/日志/统计/反馈/权限管理 |

## 响应格式

```json
{ "code": 200, "message": "成功", "data": { ... } }
```

## 安全

- bcrypt 密码哈希 | 全量 PDO 预处理 | 频率限制
- Session + Token 双重认证 | CORS 白名单 | 文件上传白名单 + 大小限制

## 技术栈

**后端**: PHP + MySQL + PDO + PHPMailer  
**前端**: uni-app (Vue 3) + Vite + Capacitor  
**文档**: [完整架构与功能文档](./项目架构与功能文档.md)

## License

ISC
