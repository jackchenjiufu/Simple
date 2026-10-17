import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt, fmtDatetime } from '../auth/auth.service';
import { AdminAuthService, AuthUser } from './admin-auth.service';

/** 等级阈值（admin_users 列表用：按发文数） */
const LEVEL_THRESHOLDS = [5, 10, 30, 60, 80, 100, 120, 140, 160, 180];

@Injectable()
export class AdminService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** POST /admin_login —— 后台登录 */
  async login(body: Record<string, unknown>) {
    const username = body?.username ? String(body.username) : '';
    const password = body?.password ? String(body.password) : '';
    if (!username || !password) return new HttpFail(400, '用户名和密码不能为空');

    const [rows] = await db.query(
      'SELECT id, username, password, nickname, avatar, background_image, role FROM users WHERE username = ? LIMIT 1',
      [username],
    );
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row || !bcrypt.compareSync(password, String(row.password || ''))) {
      return new HttpFail(401, '用户名或密码错误');
    }

    const role = String(row.role || '');
    if (!['super_admin', 'admin', 'editor'].includes(role)) {
      return new HttpFail(403, '权限不足，仅管理员可登录');
    }

    const user = { ...row };
    delete user.password;
    const adminToken = process.env.ADMIN_TOKEN || '';
    if (['super_admin', 'admin'].includes(role) && adminToken !== '') {
      user.token = adminToken;
    } else {
      user.token = '';
    }

    return ok('登录成功', user);
  }

  /** GET/POST/PUT/DELETE /admin_users —— 用户管理（manage_users） */
  async users(
    method: string,
    query: Record<string, string | undefined>,
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_users', headers, query);
    if (auth instanceof HttpFail) return auth;

    if (method === 'GET') {
      const page = Math.max(1, parseInt(query?.page || '1', 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(query?.limit || '10', 10) || 10));
      const offset = (page - 1) * limit;

      const [cnt] = await db.query('SELECT COUNT(*) AS total FROM users');
      const total = toInt((cnt as Array<{ total: number | string }>)[0].total);

      const [rows] = await db.query(
        `SELECT u.id, u.username, u.nickname, u.avatar, u.background_image, u.role, u.status,
                u.ban_expire, u.mute_expire, u.created_at, u.level,
                (SELECT COUNT(*) FROM articles a WHERE a.user_id = u.id) AS article_count
         FROM users u ORDER BY u.id DESC LIMIT ? OFFSET ?`,
        [limit, offset],
      );
      const result = (rows as Array<Record<string, unknown>>).map((u) => {
        const cnt2 = toInt(u.article_count);
        const manual = toInt(u.level);
        if (manual > 0) {
          u.level = Math.min(10, manual);
        } else {
          u.level = 0;
          for (let lv = 0; lv < LEVEL_THRESHOLDS.length; lv++) {
            if (cnt2 >= LEVEL_THRESHOLDS[lv]) u.level = lv + 1;
          }
        }
        if (u.created_at) u.created_at = fmtDatetime(String(u.created_at));
        if (u.ban_expire) u.ban_expire = fmtDatetime(String(u.ban_expire));
        if (u.mute_expire) u.mute_expire = fmtDatetime(String(u.mute_expire));
        return u;
      });

      return { message: '获取成功', code: 200, data: result, total, page, limit };
    }

    if (method === 'POST') {
      const username = body?.username ? String(body.username) : '';
      const password = body?.password ? String(body.password) : '';
      if (!username || !password) return new HttpFail(400, '用户名和密码不能为空');

      const hashed = bcrypt.hashSync(password, 10);
      const nickname = body?.nickname != null ? String(body.nickname) : username;
      const role = body?.role != null ? String(body.role) : 'user';
      const [ins] = await db.query(
        'INSERT INTO users (username, password, nickname, role, created_at) VALUES (?, ?, ?, ?, NOW())',
        [username, hashed, nickname, role],
      );
      const userId = toInt((ins as { insertId?: number }).insertId);
      // 同步 user_roles
      await this.syncUserRole(userId, role);
      return { message: '创建成功', code: 201 };
    }

    if (method === 'PUT') {
      const id = toInt(body?.id);
      if (id <= 0) return new HttpFail(400, '缺少ID');

      const fields: string[] = [];
      const params: unknown[] = [];
      const str = (k: string) => (body[k] !== undefined && body[k] !== null ? String(body[k]) : undefined);

      const u = str('username');
      if (u !== undefined) { fields.push('username = ?'); params.push(u); }
      const n = str('nickname');
      if (n !== undefined) { fields.push('nickname = ?'); params.push(n); }
      if (body.level !== undefined && body.level !== null) {
        const lv = Math.max(0, Math.min(10, toInt(body.level)));
        fields.push('level = ?'); params.push(lv);
      }
      const role = str('role');
      if (role !== undefined) {
        fields.push('role = ?'); params.push(role);
        // 同步 user_roles
        await this.syncUserRole(id, role);
      }
      if (body.status !== undefined && body.status !== null) {
        fields.push('status = ?'); params.push(toInt(body.status));
      }
      // ban_expire / mute_expire：null/空 → SQL NULL
      for (const col of ['ban_expire', 'mute_expire']) {
        if (body[col] !== undefined) {
          const v = body[col];
          const empty = v === null || v === '' || v === '0' || v === '0000-00-00 00:00:00' || v === '0000-00-00 00:00:00.000000';
          if (empty) {
            fields.push(`${col} = NULL`);
          } else {
            fields.push(`${col} = ?`); params.push(String(v));
          }
        }
      }
      const a = str('avatar');
      if (a !== undefined) { fields.push('avatar = ?'); params.push(a); }
      const bg = str('background_image');
      if (bg !== undefined) { fields.push('background_image = ?'); params.push(bg); }
      const pwd = str('password');
      if (pwd && pwd !== '') {
        fields.push('password = ?'); params.push(bcrypt.hashSync(pwd, 10));
      }

      if (!fields.length) return new HttpFail(400, '没有要更新的字段');
      params.push(id);
      const [res] = await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
      if ((res as { affectedRows?: number }).affectedRows !== undefined) return ok('更新成功');
      return new HttpFail(503, '更新失败');
    }

    if (method === 'DELETE') {
      const id = toInt(query?.id);
      if (id <= 0) return new HttpFail(400, 'ID不能为空');
      await db.query('DELETE FROM users WHERE id = ?', [id]);
      return ok('删除成功');
    }

    return new HttpFail(405, '方法不允许');
  }

  /** 同步 user_roles（角色体系一致性） */
  private async syncUserRole(userId: number, role: string) {
    try {
      const [roleRows] = await db.query('SELECT id FROM roles WHERE name = ?', [role]);
      const roleRow = (roleRows as Array<{ id: number | string }>)[0];
      if (roleRow) {
        await db.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
        await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, toInt(roleRow.id)]);
      }
    } catch { /* 表可能不存在 */ }
  }

  /** GET /admin_stats?type=xxx —— 控制台统计（view_stats 权限裁剪） */
  async stats(
    type: string,
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;
    const user = auth as AuthUser;

    const hasViewStats = await this.adminAuth.hasPermission('view_stats', headers, query);

    const t = type || 'overview';
    let result: Record<string, unknown> = {};

    const safeCount = async (sql: string, params: unknown[] = []): Promise<number> => {
      try {
        const [rows] = await db.query(sql, params);
        const r = (rows as Array<Record<string, unknown>>)[0];
        const key = Object.keys(r || {})[0];
        return toInt(key ? r![key] : 0);
      } catch { return 0; }
    };

    if (t === 'overview') {
      const totalUsers = await safeCount('SELECT COUNT(*) AS c FROM users');
      const totalFollows = await safeCount('SELECT COUNT(*) AS c FROM follows');
      const totalContent = await safeCount('SELECT COUNT(*) AS c FROM content');
      let totalImages = 0, recommended = 0;
      try {
        const [rows] = await db.query("SELECT COUNT(*) AS c, SUM(recommended = 1) AS r FROM content WHERE image_url != ''");
        const r = (rows as Array<{ c: number | string; r: number | string | null }>)[0];
        totalImages = toInt(r.c); recommended = toInt(r.r);
      } catch { /* 0 */ }
      const totalComments = await safeCount('SELECT COUNT(*) AS c FROM comments');
      const totalReports = await safeCount('SELECT COUNT(*) AS c FROM reports');
      const totalBehaviors = await safeCount('SELECT COUNT(*) AS c FROM user_behaviors');
      const totalLikes = await safeCount('SELECT COUNT(*) AS c FROM content_likes');
      const totalBrowseHistory = await safeCount('SELECT COUNT(*) AS c FROM browse_history');
      const totalArticles = await safeCount('SELECT COUNT(*) AS c FROM articles');
      const totalMessages = await safeCount('SELECT COUNT(*) AS c FROM messages');
      const todayUsers = await safeCount('SELECT COUNT(*) AS c FROM users WHERE DATE(created_at) = CURDATE()');
      const todayContent = await safeCount('SELECT COUNT(*) AS c FROM content WHERE DATE(created_at) = CURDATE()');
      let userGrowth: Array<Record<string, unknown>> = [];
      try {
        const [rows] = await db.query(
          "SELECT DATE(created_at) AS date, COUNT(*) AS count FROM users WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date",
        );
        userGrowth = rows as Array<Record<string, unknown>>;
      } catch { /* [] */ }
      const totalPendingFeedback = await safeCount("SELECT COUNT(*) AS c FROM feedback WHERE status = 'pending'");
      let recentActivities: Array<Record<string, unknown>> = [];
      try {
        const [rows] = await db.query('SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 5');
        recentActivities = (rows as Array<{ username: string; created_at: string | null }>).map((ra) => ({
          text: `新用户注册：${ra.username}`,
          created_at: ra.created_at != null ? fmtDatetime(String(ra.created_at)) : null,
        }));
      } catch { /* [] */ }

      result = {
        total_users: totalUsers, total_follows: totalFollows, total_content: totalContent,
        total_images: totalImages, recommended,
        total_comments: totalComments, total_reports: totalReports, total_behaviors: totalBehaviors,
        total_likes: totalLikes, total_browse_history: totalBrowseHistory,
        total_articles: totalArticles, total_messages: totalMessages,
        today_users: todayUsers, today_content: todayContent,
        total_pending_feedback: totalPendingFeedback, pending_feedback: totalPendingFeedback,
        user_growth: userGrowth, recent_activities: recentActivities,
      };
    } else if (t === 'category_dist') {
      try {
        const [rows] = await db.query(
          "SELECT COALESCE(NULLIF(category, ''), '未分类') AS category, COUNT(*) AS count, SUM(recommended = 1) AS recommended FROM content WHERE image_url != '' AND status = 'published' GROUP BY category ORDER BY count DESC",
        );
        const cats = rows as Array<{ category: string; count: number | string; recommended: number | string | null }>;
        result = {
          distribution: cats.map((r) => ({ category: r.category, count: toInt(r.count), recommended: toInt(r.recommended) })),
          total: cats.reduce((s, r) => s + toInt(r.count), 0),
          recommended_total: cats.reduce((s, r) => s + toInt(r.recommended), 0),
        };
      } catch {
        result = { distribution: [], total: 0, recommended_total: 0 };
      }
    } else if (t === 'behavior_stats') {
      try {
        const [typeRows] = await db.query('SELECT type, COUNT(*) AS count FROM user_behaviors GROUP BY type ORDER BY count DESC');
        const [trendRows] = await db.query(
          'SELECT DATE(FROM_UNIXTIME(timestamp/1000)) AS date, COUNT(*) AS count FROM user_behaviors WHERE timestamp >= (UNIX_TIMESTAMP(CURDATE()) - 6*86400)*1000 GROUP BY date ORDER BY date',
        );
        const rawTrend: Record<string, number> = {};
        for (const r of trendRows as Array<{ date: string; count: number | string }>) rawTrend[r.date] = toInt(r.count);
        const trend = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 86400000);
          const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          trend.push({ date: ds, count: rawTrend[ds] || 0 });
        }
        result = { by_type: typeRows, trend, total: await safeCount('SELECT COUNT(*) AS c FROM user_behaviors') };
      } catch {
        result = { by_type: [], trend: [], total: 0 };
      }
    } else if (t === 'table_stats') {
      try {
        const [rows] = await db.query(
          `SELECT TABLE_NAME AS name, TABLE_ROWS AS row_count,
                  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS total_mb,
                  ROUND(DATA_LENGTH / 1024 / 1024, 2) AS data_mb,
                  ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS index_mb
           FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_ROWS DESC`,
        );
        const tables = rows as Array<{ row_count: number | string; total_mb: number | string }>;
        result = {
          tables,
          total_rows: tables.reduce((s, r) => s + toInt(r.row_count), 0),
          total_mb: Math.round(tables.reduce((s, r) => s + (parseFloat(String(r.total_mb)) || 0), 0) * 100) / 100,
        };
      } catch {
        result = { tables: [], total_rows: 0, total_mb: 0 };
      }
    } else if (t === 'active_users') {
      try {
        const [rows] = await db.query(
          `SELECT a.user_id, u.username, u.nickname, COUNT(*) AS content_count
           FROM articles a LEFT JOIN users u ON a.user_id = u.id
           GROUP BY a.user_id ORDER BY content_count DESC LIMIT 10`,
        );
        result = { list: rows };
      } catch { result = { list: [] }; }
    } else if (t === 'content_types') {
      try {
        const [rows] = await db.query(
          `SELECT CASE
             WHEN title LIKE '%微博热搜%' THEN '微博热搜'
             WHEN title LIKE '%抖音热榜%' THEN '抖音热榜'
             WHEN title LIKE '%头条热榜%' THEN '头条热榜'
             WHEN title LIKE '%知乎热榜%' THEN '知乎热榜'
             WHEN title LIKE '%小红书热榜%' THEN '小红书热榜'
             WHEN title LIKE '%HackerNews%' THEN 'HackerNews'
             WHEN title LIKE '%国际新闻%' THEN '国际新闻'
             ELSE '其他文章' END AS type,
             COUNT(*) AS count FROM articles GROUP BY type ORDER BY count DESC`,
        );
        result = { list: rows };
      } catch { result = { list: [] }; }
    } else if (t === 'version_downloads') {
      const dl: Record<string, number> = {};
      try {
        const [rows] = await db.query(
          "SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count FROM app_version_downloads WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY date ORDER BY date",
        );
        for (const r of rows as Array<{ date: string; count: number | string }>) dl[r.date] = toInt(r.count);
      } catch { /* empty */ }
      const arr = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        arr.push({ date: ds, count: dl[ds] || 0 });
      }
      result = arr as unknown as Record<string, unknown>;
    }

    // editor 等无 view_stats 权限只返回文章相关
    if (result && (result as { total_articles?: unknown }).total_articles !== undefined && !hasViewStats) {
      result = { total_articles: (result as { total_articles?: unknown }).total_articles };
    }

    return ok('获取成功', result);
  }
}