import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../config/db';
import { HttpFail } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** PHP api 目录（env 覆盖，生产 7070 站点；index.php 路由表 / v2 / docs 均在该目录下） */
const API_DIR = process.env.PHP_API_DIR || '/www/wwwroot/139.196.185.197_7070/doo/server/api';

/** API 完整信息：分组 -> [name => desc]（复刻 admin_apis.php $apiDocs） */
const API_DOCS: Record<string, Record<string, string>> = {
  '🔐 认证': {
    login: '用户登录（POST）',
    register: '用户注册（POST）',
    forgot_password: '忘记密码-发送重置邮件（POST）',
    reset_password: '重置密码（POST）',
    change_password: '修改密码（POST）',
    delete_account: '注销账号（DELETE）',
    admin_login: '管理员登录（POST）',
    admin_logout: '管理员登出（POST）',
  },
  '👤 用户': {
    get_users: '用户列表（GET）',
    update_user: '更新用户信息（PUT）',
    user_level: '用户等级管理（GET/PUT）',
    update_user_level: '更新用户等级（PUT）',
  },
  '📄 内容': {
    content: '内容 CRUD（GET/POST/PUT/DELETE）',
    feed: '内容 Feed 流（GET）',
    feedback: '提交/查询反馈（GET/POST）',
    get_articles: '文章列表（GET）',
    get_user_articles: '用户文章列表（GET）',
    simple_articles: '简化文章列表（GET）',
    upload_article: '发布文章（POST）',
    delete_article: '删除文章（DELETE）',
  },
  '⭐ 收藏': {
    get_collections: '收藏列表（GET）',
    add_collection: '添加收藏（POST）',
  },
  '🖼 轮播公告': {
    get_carousels: '轮播图列表（GET）',
    announcements: '公告 CRUD（GET/POST）',
  },
  '📁 文件': {
    upload: '通用文件上传（POST）',
    upload_image: '图片上传（POST）',
    files: '文件列表/删除（GET/DELETE）',
    files_preview: '文件预览（GET）',
    files_upload: '文件上传（POST）',
    get_images: '图片列表（GET）',
    import_images: '批量导入图片（POST）',
    download_proxy: '下载代理（GET）',
    upload_version: '上传版本包（POST）',
    delete_version: '删除版本（DELETE）',
    get_versions: '版本列表（GET）',
  },
  '⏱ 加班': {
    overtime: '加班记录 CRUD（GET/POST/PUT/DELETE）',
  },
  '🕷 爬虫': {
    crawl_douyin_hotsearch: '抖音热榜爬虫（GET）',
    crawl_hotsearch: '热搜爬虫（GET）',
    crawl_images: 'Picsum 随机图爬虫（GET）',
  },
  '⚙️ 系统': {
    deploy: '远程部署（POST）',
    ai_proxy: 'AI 聊天代理/配置管理（POST）',
    system_monitor: '服务器/数据库/API 监控（GET）',
    check_update: 'App 版本更新检查（GET/POST）',
    check_database: '数据库连接检查（GET）',
    check_app_data: 'App 数据检查（GET）',
    check_admin: '管理员状态检查（GET）',
    check_admin_setup: '管理员设置检查（GET）',
    check_users_table: '用户表检查（GET）',
    check_created_at_format: '创建时间格式检查（GET）',
    test_connection: '连接测试（GET）',
    test_articles: '文章测试（GET）',
    test_content_system: '内容系统测试（GET）',
    init_database: '初始化数据库（GET）',
    init_images_table: '初始化图片表（GET）',
    reset_admin: '重置管理员账号（GET）',
    setup_admin_role: '设置管理员角色（GET）',
    create_content_table: '创建内容表（GET）',
    create_logs_table: '创建日志表（GET）',
    update_users_created_at: '批量更新用户创建时间（GET）',
  },
  '🛠 管理后台': {
    admin_users: '用户管理（GET/POST/PUT/DELETE）',
    admin_content: '内容管理（GET/POST/PUT/DELETE）',
    admin_carousels: '轮播管理（GET/POST/PUT/DELETE）',
    admin_follows: '关注管理（GET/DELETE）',
    admin_messages: '私信管理（GET/DELETE）',
    admin_stats: '数据统计（GET）',
    admin_logs: '操作日志（GET）',
    admin_articles: '文章管理（GET/PUT/DELETE）',
    admin_feedback: '反馈管理（GET/PUT/DELETE）',
    admin_permissions: '权限管理（GET/POST/PUT/DELETE）',
    admin_overtime: '加班管理（GET/POST/PUT/DELETE）',
    admin_apis: 'API 列表查询（GET）',
  },
  '🔧 运维': {
    migrate_feedback: '反馈表结构迁移（GET）',
    wgt_manager: 'WGT 热更新包管理（GET/POST/DELETE）',
  },
};

/** RESTful 路由（复刻 admin_apis.php $restfulCases / $restfulDocs） */
const RESTFUL_CASES = ['auth', 'users', 'content', 'carousels'];
const RESTFUL_DOCS: Record<string, { desc: string; methods: string[] }> = {
  auth: { desc: '认证 RESTful 路由（login/register/logout）', methods: ['POST'] },
  users: { desc: '用户 RESTful 路由（列表/详情/更新）', methods: ['GET', 'PUT'] },
  content: { desc: '内容 RESTful 路由（列表/详情/创建/更新/删除）', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  carousels: { desc: '轮播图 RESTful 路由（列表）', methods: ['GET'] },
};

/**
 * API 管理（复刻 admin_apis.php + admin_api_version.php + admin_v2api.php + admin_api_docs.php）
 * - apis()       → /admin_apis（GET，列出所有已注册路由）
 * - apiVersion() → /admin_api_version（GET/POST，v1/v2 版本切换，api_settings 表）
 * - v2api()      → /admin_v2api（GET/POST，v2 软链/接口迁移，api/v2/*.php 文件）
 * - apiDocs()    → /admin_api_docs（GET/POST，接口文档 CRUD，api/docs/vN.json 文件）
 */
@Injectable()
export class AdminApisService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET /admin_apis —— 列出所有已注册路由 */
  async apis(
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    // 读取 index.php 路由表
    const indexFile = path.join(API_DIR, 'index.php');
    const allRoutes: string[] = [];
    try {
      const content = fs.readFileSync(indexFile, 'utf8');
      const re = /case '([a-z_]+)'/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(content)) !== null) allRoutes.push(m[1]);
    } catch { /* index.php 不存在 → 空路由表 */ }
    const uniqueRoutes = Array.from(new Set(allRoutes));

    // v2 目录已创建的转发文件
    const v2Dir = path.join(API_DIR, 'v2');
    let v2Files: string[] = [];
    try {
      v2Files = fs.readdirSync(v2Dir).filter((f) => f.endsWith('.php'));
    } catch { /* v2 目录不存在 */ }

    // 当前 API 版本（api_settings.api_version 或默认 v1）
    let apiVersion = 'v1';
    try {
      const [rows] = await db.query("SELECT svalue FROM api_settings WHERE skey = 'api_version'");
      const r = (rows as Array<{ svalue?: string | null }>)[0];
      if (r && r.svalue) apiVersion = String(r.svalue);
    } catch { /* 忽略，默认 v1 */ }

    const result: Array<Record<string, unknown>> = [];
    for (const [groupName, apis] of Object.entries(API_DOCS)) {
      const items: Array<Record<string, unknown>> = [];
      for (const [name, desc] of Object.entries(apis)) {
        const isRESTful = RESTFUL_CASES.includes(name);
        const exists = uniqueRoutes.includes(name) || isRESTful;

        let methods: string[];
        if (isRESTful && RESTFUL_DOCS[name]) {
          methods = RESTFUL_DOCS[name].methods;
        } else {
          // 从 desc 末尾提取 HTTP 方法
          const m = desc.match(/\b(GET|POST|PUT|DELETE)\b/g);
          methods = m ? Array.from(new Set(m)) : ['GET'];
        }

        items.push({
          name,
          path: isRESTful ? `/api/${name}/...` : `/api/${name}.php`,
          methods,
          desc,
          exists,
          v2: v2Files.includes(name + '.php'),
        });
      }
      result.push({ group: groupName, count: items.length, items });
    }

    return {
      code: 200,
      data: result,
      total: uniqueRoutes.length + RESTFUL_CASES.length,
      api_version: apiVersion,
      v2_count: v2Files.length,
    };
  }

  /** GET/POST /admin_api_version —— API 版本切换管理（v1/v2 切换，全局生效） */
  async apiVersion(
    method: string,
    query: Record<string, string | undefined>,
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    const input = method === 'POST' ? body || {} : {};
    const actionRaw =
      query?.action !== undefined ? query.action : input.action !== undefined ? String(input.action) : 'status';
    const action = actionRaw.trim();

    try {
      await db.query(
        "CREATE TABLE IF NOT EXISTS api_settings (skey VARCHAR(50) PRIMARY KEY, svalue VARCHAR(255)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
      );

      if (method === 'POST' && action === 'switch') {
        const version = String(input.version ?? '').trim();
        if (version !== 'v1' && version !== 'v2' && version !== 'v3') {
          return new HttpFail(400, 'version 仅支持 v1、v2 或 v3');
        }
        await db.query(
          "INSERT INTO api_settings (skey, svalue) VALUES ('api_version', ?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)",
          [version],
        );
        return { code: 200, message: '已切换到 ' + version + '（App 端下次启动自动跟随）', data: { version } };
      }

      // 默认 status：返回当前版本 + 可切换版本列表
      const [rows] = await db.query("SELECT svalue FROM api_settings WHERE skey = 'api_version'");
      const row = (rows as Array<{ svalue?: string | null }>)[0];
      const current = row && row.svalue ? String(row.svalue) : 'v1';
      return { code: 200, message: '成功', data: { version: current, supported: ['v1', 'v2', 'v3'] } };
    } catch (e) {
      return new HttpFail(500, '操作失败: ' + (e as Error).message);
    }
  }

  /** GET/POST /admin_v2api —— v2 接口迁移管理（v2/xxx.php 转发文件创建/删除/列表） */
  async v2api(
    method: string,
    query: Record<string, string | undefined>,
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    const input = method === 'POST' ? body || {} : {};
    const actionRaw =
      query?.action !== undefined ? query.action : input.action !== undefined ? String(input.action) : 'list';
    const action = actionRaw.trim();

    const V2_DIR = path.join(API_DIR, 'v2');

    try {
      if (method === 'POST' && action === 'create') {
        const file = String(input.file ?? '').trim();
        // 安全：file 参数白名单 [a-z0-9_]+.php 且必须存在于 api/ 根目录，防路径穿越
        if (!/^[a-z0-9_]+\.php$/i.test(file) || !fs.existsSync(path.join(API_DIR, file))) {
          return new HttpFail(400, '无效的接口文件名');
        }
        try {
          fs.mkdirSync(V2_DIR, { recursive: true });
        } catch {
          return new HttpFail(500, '创建失败（目录无写入权限）');
        }
        const target = path.join(V2_DIR, file);
        if (fs.existsSync(target)) {
          return { code: 200, message: 'v2/' + file + ' 已存在（未改动）' };
        }
        const content =
          `<?php\n` +
          `/**\n` +
          ` * v2/${file} — v2 版本（转发到 v1 实现）\n` +
          ` * 由后台「v2 接口迁移」创建。如需真正的 v2 实现，直接改写本文件即可。\n` +
          ` */\n` +
          `require_once dirname(__DIR__) . '/${file}';\n`;
        try {
          fs.writeFileSync(target, content);
        } catch {
          return new HttpFail(500, '创建失败（目录无写入权限）');
        }
        return { code: 200, message: '已创建 v2/' + file };
      }

      if (method === 'POST' && action === 'delete') {
        const file = String(input.file ?? '').trim();
        if (!/^[a-z0-9_]+\.php$/i.test(file)) {
          return new HttpFail(400, '无效的接口文件名');
        }
        const target = path.join(V2_DIR, file);
        if (!fs.existsSync(target)) {
          return { code: 200, message: 'v2/' + file + ' 不存在' };
        }
        try {
          fs.unlinkSync(target);
        } catch {
          return new HttpFail(500, '删除失败（目录无写入权限）');
        }
        return { code: 200, message: '已删除 v2/' + file };
      }

      // list —— 列出 v1 接口文件 + v2 状态
      let v1: string[] = [];
      try {
        v1 = fs
          .readdirSync(API_DIR)
          .filter((f) => f.endsWith('.php') && f !== 'index.php') // 路由入口非业务接口
          .sort();
      } catch { /* api 目录不存在 */ }
      let v2: string[] = [];
      try {
        v2 = fs.readdirSync(V2_DIR).filter((f) => f.endsWith('.php'));
      } catch { /* v2 目录不存在 */ }
      const list = v1.map((f) => ({ file: f, v2: v2.includes(f) }));
      return { code: 200, message: '成功', data: { list, total: v1.length, v2_count: v2.length } };
    } catch (e) {
      return new HttpFail(500, '操作失败: ' + (e as Error).message);
    }
  }

  /** GET/POST /admin_api_docs —— 分版本文档管理（docs/{version}.json 纯文件存储） */
  async apiDocs(
    method: string,
    query: Record<string, string | undefined>,
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    const input = method === 'POST' ? body || {} : {};
    const actionRaw =
      query?.action !== undefined ? query.action : input.action !== undefined ? String(input.action) : 'list';
    const action = actionRaw.trim();

    const DOCS_DIR = path.join(API_DIR, 'docs');

    /** 校验版本号：仅 v + 数字 */
    const validVersion = (v: string): boolean => /^v\d+$/.test(v);

    /** 读取某版本文档；不存在返回 null */
    const readDocs = (version: string): unknown => {
      const file = path.join(DOCS_DIR, version + '.json');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    };

    /** 扫描 docs 目录，返回已存在的版本号列表 */
    const listVersions = (): string[] => {
      let versions: string[] = [];
      try {
        versions = fs
          .readdirSync(DOCS_DIR)
          .filter((f) => /^v\d+\.json$/.test(f))
          .map((f) => f.slice(0, -5))
          .filter(validVersion)
          .sort();
      } catch { /* docs 目录不存在 */ }
      return versions;
    };

    try {
      if (method === 'POST' && action === 'save') {
        const version = String(input.version ?? '').trim();
        if (!validVersion(version)) {
          return new HttpFail(400, '无效的版本号（须为 v1/v2/...）');
        }
        const docs = input.docs ?? [];
        if (!Array.isArray(docs)) {
          return new HttpFail(400, 'docs 须为数组');
        }
        try {
          fs.mkdirSync(DOCS_DIR, { recursive: true });
        } catch {
          return new HttpFail(500, '目录创建失败（无写入权限）');
        }
        // JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT（JS 默认不转义 unicode）
        const json = JSON.stringify(docs, null, 2);
        try {
          fs.writeFileSync(path.join(DOCS_DIR, version + '.json'), json);
        } catch {
          return new HttpFail(500, '保存失败（目录无写入权限）');
        }
        return {
          code: 200,
          message: '已保存 ' + version + ' 版本文档（' + docs.length + ' 个接口）',
          data: { version, count: docs.length },
        };
      }

      if (method === 'POST' && action === 'delete') {
        const version = String(input.version ?? '').trim();
        if (!validVersion(version)) {
          return new HttpFail(400, '无效的版本号');
        }
        const file = path.join(DOCS_DIR, version + '.json');
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return { code: 200, message: version + ' 文档不存在' };
        }
        try {
          fs.unlinkSync(file);
        } catch {
          return new HttpFail(500, '删除失败');
        }
        return { code: 200, message: '已删除 ' + version + ' 文档' };
      }

      // list —— 返回所有已保存版本文档
      const versions = listVersions();
      const docsResult: Record<string, unknown> = {};
      for (const v of versions) docsResult[v] = readDocs(v);
      return { code: 200, message: '成功', data: { versions, docs: docsResult } };
    } catch (e) {
      return new HttpFail(500, '操作失败: ' + (e as Error).message);
    }
  }
}
