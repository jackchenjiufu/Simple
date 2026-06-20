# DOO → Flutter 全量迁移计划

> **目标:** 将 uni-app (Vue 3) 前端完全迁移到 Flutter，PHP 后端不动
> **预估工时:** 2-3 周（单人）
> **技术栈:** Flutter 3.x + Dart, Provider/Riverpod 状态管理, Dio HTTP 客户端

---

## 一、项目结构

```
E:\poo\doo_flutter/
├── lib/
│   ├── main.dart                    # 入口 + 路由配置
│   ├── config/
│   │   └── api_config.dart          # API 地址、常量
│   ├── services/
│   │   ├── api_service.dart         # Dio HTTP 封装
│   │   └── auth_service.dart        # 登录状态管理（SharedPreferences）
│   ├── models/
│   │   ├── user.dart                # 用户模型
│   │   ├── article.dart             # 文章模型
│   │   ├── message.dart             # 消息模型
│   │   ├── card_item.dart           # 推荐卡片模型
│   │   └── attendance.dart          # 考勤模型
│   ├── providers/                   # 或 store/ (Riverpod/Provider)
│   │   ├── auth_provider.dart
│   │   ├── article_provider.dart
│   │   └── recommend_provider.dart
│   ├── screens/
│   │   ├── splash_screen.dart       # 启动页 + 自动登录
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   ├── register_screen.dart
│   │   │   ├── forgot_password_screen.dart
│   │   │   └── reset_password_screen.dart
│   │   ├── home/
│   │   │   ├── home_screen.dart         # 首页 Tab
│   │   │   ├── components/
│   │   │   │   ├── carousel_widget.dart
│   │   │   │   └── recommend_card.dart
│   │   ├── attendance/
│   │   │   └── attendance_screen.dart   # 工时/工资
│   │   ├── publish/
│   │   │   └── publish_screen.dart      # 发布图片/文章
│   │   ├── message/
│   │   │   ├── message_list_screen.dart
│   │   │   └── chat_detail_screen.dart
│   │   ├── profile/
│   │   │   ├── profile_screen.dart      # 个人中心
│   │   │   ├── personal_info_screen.dart
│   │   │   ├── my_articles_screen.dart
│   │   │   ├── my_favorites_screen.dart
│   │   │   ├── my_images_screen.dart
│   │   │   ├── feedback_screen.dart
│   │   │   └── settings_screen.dart
│   │   ├── content/
│   │   │   ├── article_detail_screen.dart
│   │   │   ├── card_detail_screen.dart
│   │   │   ├── announcement_detail_screen.dart
│   │   │   └── documentation_screen.dart
│   │   └── info/
│   │       ├── about_screen.dart
│   │       ├── privacy_policy_screen.dart
│   │       ├── user_agreement_screen.dart
│   │       └── check_update_screen.dart
│   └── widgets/                    # 公共 UI 组件
│       ├── nav_bar.dart            # 顶部导航栏
│       ├── loading_widget.dart
│       ├── empty_state.dart
│       └── error_widget.dart
├── pubspec.yaml
└── assets/
    └── images/
```

---

## 二、后端 API 对照表

| 前端当前调用 | Flutter 对应 | 说明 |
|-------------|-------------|------|
| `utils/api.js` → baseUrl | `lib/config/api_config.dart` | API 地址 |
| `utils/request.js` (fetch) | `lib/services/api_service.dart` (Dio) | HTTP 客户端 |
| `utils/auth.js` (mixin) | `lib/services/auth_service.dart` | Token + 登录状态 |
| `utils/cache.js` | shared_preferences 或本地缓存 | 缓存管理 |

---

## 三、分阶段执行计划

### 阶段 0：环境搭建（半天）

**Task 0.1: 创建 Flutter 项目**

```bash
flutter create --org com.doo --project-name doo_app E:\poo\doo_flutter
```

**Task 0.2: 配置 pubspec.yaml 依赖**

```yaml
dependencies:
  flutter:
    sdk: flutter
  dio: ^5.4.0          # HTTP 请求
  provider: ^6.1.0     # 状态管理
  shared_preferences: ^2.2.0  # 本地存储
  cached_network_image: ^3.3.0 # 图片缓存
  intl: ^0.19.0        # 日期格式化
  image_picker: ^1.0.0  # 图片选择（发布用）
  flutter_image_compress: ^2.1.0 # 图片压缩
```

**Task 0.3: 创建基础服务层**

- `lib/config/api_config.dart` — baseUrl + 所有 API 端点
- `lib/services/api_service.dart` — Dio 实例 + 拦截器（token、错误处理）
- `lib/services/auth_service.dart` — SharedPreferences 封装
- `lib/models/` 所有数据模型

**验证:** `flutter run` 能看到空白页面，无编译错误

---

### 阶段 1：核心框架 + Tab 导航（1天）

**Task 1.1: 路由配置 + 底部 TabBar**

- `main.dart` → MaterialApp + 路由表 + BottomNavigationBar
- 4 个 Tab：首页 / 工时 / 消息 / 我
- 原 tabbar-3（发布）不迁移

**Task 1.2: 启动页 + 自动登录**

- SplashScreen 检查本地 token
- 有 token → 跳首页
- 无 token → 跳登录

**Task 1.3: NavBar 公共组件**

- `lib/widgets/nav_bar.dart`
- 支持标题、返回按钮、背景色、标题颜色
- 替换所有页面顶部的导航栏

**验证:** 5 个 Tab 可以切换，启动页自动跳转逻辑正常

---

### 阶段 2：认证模块（1.5天）

**Task 2.1: 登录页面**

- 对应 `pages/auth/login.vue`
- 用户名 + 密码 + 登录/注册切换
- 调用 `login.php` / `register.php`
- 成功后存 token，跳首页

**Task 2.2: 修改密码**

- 对应 `pages/auth/change-password.vue`
- 旧密码 → 新密码 → 确认新密码
- 调用 `change_password.php`

**Task 2.3: 忘记密码 / 重置密码**

- 对应 `pages/auth/forgot-password.vue` + `reset-password.vue`
- 邮箱验证码流程
- 调用 `forgot_password.php` / `reset_password.php`

**验证:** 完整登录→登出→注册流程可跑通

---

### 阶段 3：首页（2天）

**Task 3.1: 轮播图**

- 对应 `components/modules/carousel/`
- 调用 `get_carousels.php`
- PageView 横向滑动

**Task 3.2: 推荐卡片流**

- 对应 `components/modules/recommend-card/`
- 调用 `recommend.php` / `content.php`
- 卡片网格布局，下拉刷新 + 上拉加载

**Task 3.3: 文章列表**

- 对应 tabbar-1 的文章 Tab
- 调用 `get_articles.php`
- 日期分组 + 文章列表

**验证:** 首页数据能加载，轮播图可滑动，卡片可点击

---

### 阶段 4：内容详情（1天）

**Task 4.1: 卡片/文章/公告/消息详情页**

- `card_detail_screen.dart`
- `article_detail_screen.dart`
- `announcement_detail_screen.dart`
- 调用对应的 `*.php` API
- 图片预览、富文本展示

**验证:** 从首页点击可跳转到详情页，数据正确

---

### 阶段 5：工时/考勤模块（1.5天）

**Task 5.1: 工资记录页面**

- 对应 `tabbar-2.vue`
- 月度汇总（加班天数、工时、加班费）
- 底薪/奖金展示
- 日历打卡记录
- 调用 `attendance.php` / `overtime.php`

**验证:** 数据正确展示，日历可切换月份

---

### 阶段 6：消息/聊天（2天）

**Task 6.1: 消息列表**

- 对应 `tabbar-4.vue` + `message-detail.vue`
- 消息列表（联系人 + 最后消息 + 时间）
- 调用 `messages.php`

**Task 7.2: 聊天详情**

- 消息气泡（自己/对方）
- 发送消息 → `send_message.php`
- 加载聊天历史 → `get_chat_history.php`
- 自动滚动到底部

**验证:** 能发消息、收消息，聊天界面可用

---

### 阶段 7：个人中心（2天）

**Task 7.1: 个人主页**

- 对应 `tabbar-5.vue` + `user-profile.vue`
- 头像/背景图、昵称、关注功能
- 调用 `user_profile.php` / `follow.php`

**Task 7.2: 子页面**

- 个人信息编辑 → `personal-info.vue`
- 我的文章 → `my-articles.vue`
- 我的收藏 → `my-favorites.vue`
- 我的图片 → `my-images.vue`
- 问题反馈 → `my-feedback.vue`
- 设置 → `settings.vue`

**验证:** 所有子页面数据正确，可编辑保存

---

### 阶段 8：信息页面（0.5天）

- 关于我们、隐私政策、用户协议、文档中心、检查更新
- 这些是纯静态页面，只需复制内容

---

### 阶段 9：收尾（1天）

- 错误处理完善（try/catch + 用户提示）
- 加载状态（骨架屏、loading）
- 空状态处理
- 图片缓存优化
- 打包 APK 测试

---

## 四、API 端点汇总（后端不动）

| 端点 | 方法 | 用途 | 阶段 |
|------|------|------|------|
| `login.php` | POST | 登录 | 2 |
| `register.php` | POST | 注册 | 2 |
| `change_password.php` | POST | 改密 | 2 |
| `forgot_password.php` | POST | 忘记密码 | 2 |
| `reset_password.php` | POST | 重置密码 | 2 |
| `get_carousels.php` | GET | 轮播图 | 3 |
| `recommend.php` | GET | 推荐内容 | 3 |
| `content.php` | GET | 内容列表 | 3 |
| `get_articles.php` | GET | 文章列表 | 3 |
| `user_profile.php` | GET/POST | 用户画像 | 8 |
| `follow.php` | POST | 关注/取关 | 8 |
| `check_follow.php` | GET | 检查关注 | 8 |
| `upload_image.php` | POST | 上传图片 | 6 |
| `upload_article.php` | POST | 上传文章 | 6 |
| `get_collections.php` | GET | 收藏列表 | 8 |
| `add_collection.php` | POST | 添加收藏 | 4 |
| `delete_article.php` | POST | 删除文章 | 8 |
| `messages.php` | GET/POST | 消息列表 | 7 |
| `send_message.php` | POST | 发送消息 | 7 |
| `get_chat_history.php` | GET | 聊天记录 | 7 |
| `feedback.php` | POST | 提交反馈 | 8 |
| `attendance.php` | GET/POST | 考勤 | 5 |
| `overtime.php` | GET | 加班费 | 5 |
| `update_user.php` | POST | 更新用户 | 8 |
| `check_update.php` | POST | 检查版本 | 9 |
| `delete_account.php` | POST | 注销账号 | 8 |

---

## 五、风险与注意事项

### 风险

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| DeepSeek API 响应慢 | 高 | 开发效率低 | 用中国镜像 npm registry |
| PHP 接口返回格式不统一 | 中 | 模型层需要适配 | 在 api_service 层统一解析 |
| 图片上传兼容性 | 中 | 发布功能受阻 | 用 Flutter image_picker + 压缩 |
| 消息实时性 | 低 | 聊天体验差 | 后期可加 WebSocket/轮询 |

### 注意事项

1. **后端不动** — PHP 代码零修改，Flutter 直接调现有 API
2. **Token 管理** — 用 SharedPreferences + Dio 拦截器自动附加
3. **后台管理** — `admin-web/` 保留为 HTML，不迁移
4. **先 UI 后逻辑** — 每个页面先搭骨架，再对接 API
5. **频繁验证** — 每做完一个页面就跑一次 `flutter run`

---

## 六、总工时估算

| 阶段 | 内容 | 工时 |
|------|------|------|
| 0 | 环境搭建 | 0.5天 |
| 1 | 核心框架 | 1天 |
| 2 | 认证模块 | 1.5天 |
| 3 | 首页 | 2天 |
| 4 | 内容详情 | 1天 |
| 5 | 考勤 | 1.5天 |
| 6 | 消息聊天 | 2天 |
| 7 | 个人中心 | 2天 |
| 8 | 信息页面 | 0.5天 |
| 9 | 收尾 | 1天 |
| **合计** | | **13天（2.5周）** |
