import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok } from '../../common/response';
import { HttpFail, toInt, fmtDatetime } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** 复刻 admin_feedback.php —— 反馈管理（GET 列表 / PUT 更新状态+回复 / DELETE 删除） */
@Injectable()
export class AdminFeedbackService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET /admin_feedback —— 反馈列表（分页 + 状态筛选 + 多轮回复） */
  async list(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_feedback', headers, query);
    if (auth instanceof HttpFail) return auth;

    const page = Math.max(1, parseInt(String(query?.page ?? '1'), 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(String(query?.limit ?? '10'), 10) || 0));
    const offset = (page - 1) * limit;
    const statusRaw = String(query?.status ?? '');

    const where: string[] = [];
    const params: unknown[] = [];
    // PHP: $status !== '' && ctype_digit($status)
    if (statusRaw !== '' && /^\d+$/.test(statusRaw)) {
      where.push('f.status = ?');
      params.push(parseInt(statusRaw, 10));
    }
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT f.id, f.user_id, f.type, f.content, f.contact, f.status, f.reply,
              f.created_at, f.updated_at, u.username, u.nickname, u.avatar
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       ${whereSql}
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    // 附带多轮对话（含用户追问），管理端实时看到追问内容
    const list = rows as Array<Record<string, unknown>>;
    const ids = list.map((r) => toInt(r.id)).filter((x) => x > 0);
    const repliesMap = new Map<number, Record<string, unknown>[]>();
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [rRows] = await db.query(
        `SELECT * FROM feedback_replies WHERE feedback_id IN (${placeholders}) ORDER BY created_at ASC`,
        ids,
      );
      for (const r of rRows as Array<Record<string, unknown>>) {
        if (r.created_at) r.created_at = fmtDatetime(String(r.created_at));
        if (r.updated_at) r.updated_at = fmtDatetime(String(r.updated_at));
        const fid = toInt(r.feedback_id);
        if (!repliesMap.has(fid)) repliesMap.set(fid, []);
        repliesMap.get(fid)!.push(r);
      }
    }

    const result = list.map((r) => {
      if (r.created_at) r.created_at = fmtDatetime(String(r.created_at));
      if (r.updated_at) r.updated_at = fmtDatetime(String(r.updated_at));
      const replies = repliesMap.get(toInt(r.id)) || [];
      return { ...r, replies, reply_count: replies.length };
    });

    const [cnt] = await db.query(`SELECT COUNT(*) AS total FROM feedback f ${whereSql}`, params);
    const total = toInt((cnt as Array<{ total: number | string }>)[0].total);

    // 各状态数量（供前端筛选标签角标显示）
    let statusCounts: Record<string, number> = {};
    try {
      statusCounts = {};
      const [scRows] = await db.query('SELECT status, COUNT(*) AS cnt FROM feedback GROUP BY status');
      for (const row of scRows as Array<{ status: number | string; cnt: number | string }>) {
        statusCounts[String(toInt(row.status))] = toInt(row.cnt);
      }
    } catch {
      statusCounts = {};
    }

    return { message: '获取成功', code: 200, data: result, total, page, limit, status_counts: statusCounts };
  }

  /** PUT /admin_feedback —— 更新状态或添加回复（写入 feedback_replies 表） */
  async update(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_feedback', headers, {});
    if (auth instanceof HttpFail) return auth;

    const id = toInt(body?.id);
    let status = body?.status !== undefined && body?.status !== null ? toInt(body.status) : -1;
    const reply = body?.reply !== undefined && body?.reply !== null ? String(body.reply).trim() : '';

    if (!id) return new HttpFail(400, '缺少反馈ID');

    // 如果有回复内容，写入 feedback_replies 表
    if (reply !== '') {
      await db.query(
        "INSERT INTO feedback_replies (feedback_id, user_id, role, content, source) VALUES (?, 0, 'admin', ?, 'manual')",
        [id, reply],
      );
      // 自动设置状态为已回复
      status = 2;
    }

    // 更新状态
    if (status >= 0 && status <= 3) {
      await db.query('UPDATE feedback SET status = ? WHERE id = ?', [status, id]);
    }

    return ok('更新成功');
  }

  /** DELETE /admin_feedback?id= —— 删除反馈（兼容 query 和 body 两种方式） */
  async remove(
    query: Record<string, string | undefined>,
    body: Record<string, unknown> | undefined,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_feedback', headers, query);
    if (auth instanceof HttpFail) return auth;

    const id = query?.id !== undefined ? toInt(query.id) : toInt(body?.id);
    if (!id) return new HttpFail(400, 'ID不能为空');

    try {
      await db.query('DELETE FROM feedback WHERE id = ?', [id]);
      return ok('删除成功');
    } catch {
      return new HttpFail(503, '删除失败');
    }
  }
}

/** 复刻 admin_reports.php —— 举报管理（GET 列表 / PUT 处理·驳回 / DELETE 删除） */
@Injectable()
export class AdminReportsService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET /admin_reports —— 举报列表（分页 + 状态筛选 + 类型筛选 + 搜索） */
  async list(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_reports', headers, query);
    if (auth instanceof HttpFail) return auth;

    const page = Math.max(1, parseInt(String(query?.page ?? '1'), 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(String(query?.limit ?? '10'), 10) || 0));
    const offset = (page - 1) * limit;
    const status = query?.status !== undefined ? parseInt(String(query.status), 10) || 0 : -1; // -1=全部
    const type = String(query?.type ?? '').trim();
    const search = String(query?.search ?? '').trim();

    const where: string[] = [];
    const params: unknown[] = [];
    if (status >= 0) {
      where.push('r.status = ?');
      params.push(status);
    }
    if (type !== '' && ['user', 'message', 'article', 'comment'].includes(type)) {
      where.push('r.target_type = ?');
      params.push(type);
    }
    if (search !== '') {
      where.push('(r.reason LIKE ? OR r.detail LIKE ? OR u1.username LIKE ? OR u2.username LIKE ?)');
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw);
    }
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

    // 目标信息字段（按类型 JOIN）
    const target = `CASE r.target_type
        WHEN 'user' THEN u2.username
        WHEN 'message' THEN CONCAT('消息#', r.target_id)
        WHEN 'article' THEN a.title
        WHEN 'comment' THEN LEFT(c.content, 50)
        ELSE CONCAT(r.target_type, '#', r.target_id)
      END AS target_name`;

    const [rows] = await db.query(
      `SELECT r.*, u1.username AS reporter_name, u1.nickname AS reporter_nick, ${target}
       FROM reports r
       LEFT JOIN users u1 ON r.reporter_id = u1.id
       LEFT JOIN users u2 ON r.target_type = 'user' AND r.target_id = u2.id
       LEFT JOIN articles a ON r.target_type = 'article' AND r.target_id = a.id
       LEFT JOIN comments c ON r.target_type = 'comment' AND r.target_id = c.id
       ${whereSql}
       ORDER BY r.status ASC, r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [cnt] = await db.query(
      `SELECT COUNT(*) AS total FROM reports r
       LEFT JOIN users u1 ON r.reporter_id = u1.id
       LEFT JOIN users u2 ON r.target_type = 'user' AND r.target_id = u2.id
       ${whereSql}`,
      params,
    );
    const total = toInt((cnt as Array<{ total: number | string }>)[0].total);

    const statusCounts: Record<string, number> = { '0': 0, '1': 0, '2': 0 };
    const [scRows] = await db.query('SELECT status, COUNT(*) AS n FROM reports GROUP BY status');
    for (const row of scRows as Array<{ status: number | string; n: number | string }>) {
      statusCounts[String(row.status)] = toInt(row.n);
    }

    const result = (rows as Array<Record<string, unknown>>).map((r) => {
      if (r.created_at) r.created_at = fmtDatetime(String(r.created_at));
      if (r.updated_at) r.updated_at = fmtDatetime(String(r.updated_at));
      if (r.handled_at) r.handled_at = fmtDatetime(String(r.handled_at));
      return r;
    });

    return { message: '获取成功', code: 200, data: result, total, status_counts: statusCounts, page, limit };
  }

  /** PUT /admin_reports —— 处理 / 驳回 */
  async update(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_reports', headers, {});
    if (auth instanceof HttpFail) return auth;

    const id = toInt(body?.id);
    const statusRaw = body?.status;
    if (id <= 0 || statusRaw === undefined || statusRaw === null) {
      return new HttpFail(400, '参数不完整');
    }
    const status = toInt(statusRaw);
    if (![0, 1, 2].includes(status)) {
      return new HttpFail(400, '无效状态');
    }
    await db.query('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
    return ok('更新成功');
  }

  /** DELETE /admin_reports?id= —— 删除举报记录 */
  async remove(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_reports', headers, query);
    if (auth instanceof HttpFail) return auth;

    const id = query?.id !== undefined ? toInt(query.id) : 0;
    if (id <= 0) return new HttpFail(400, '缺少ID');
    await db.query('DELETE FROM reports WHERE id = ?', [id]);
    return ok('删除成功');
  }
}

/** 复刻 admin_comments.php —— 文章评论管理（GET 列表 / PUT 置顶·隐藏·恢复 / DELETE 连带子评论删除） */
@Injectable()
export class AdminCommentsService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET /admin_comments —— 评论列表（分页 + 状态/文章/搜索筛选） */
  async list(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_comments', headers, query);
    if (auth instanceof HttpFail) return auth;

    const page = Math.max(1, parseInt(String(query?.page ?? '1'), 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(String(query?.limit ?? '10'), 10) || 0));
    const offset = (page - 1) * limit;
    const status = query?.status !== undefined ? parseInt(String(query.status), 10) || 0 : -1; // -1=全部
    const search = String(query?.search ?? '').trim();
    const articleId = query?.article_id !== undefined ? parseInt(String(query.article_id), 10) || 0 : 0;

    const where: string[] = [];
    const params: unknown[] = [];
    if (status >= 0) {
      where.push('c.status = ?');
      params.push(status);
    }
    if (articleId > 0) {
      where.push('c.article_id = ?');
      params.push(articleId);
    }
    if (search !== '') {
      where.push('(c.content LIKE ? OR u.username LIKE ? OR a.title LIKE ?)');
      const kw = `%${search}%`;
      params.push(kw, kw, kw);
    }
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query(
      `SELECT c.*, a.title AS article_title, u.username, u.nickname, u.avatar
       FROM comments c
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN users u ON c.user_id = u.id
       ${whereSql}
       ORDER BY c.is_top DESC, c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [cnt] = await db.query(
      `SELECT COUNT(*) AS total FROM comments c
       LEFT JOIN articles a ON c.article_id = a.id
       LEFT JOIN users u ON c.user_id = u.id ${whereSql}`,
      params,
    );
    const total = toInt((cnt as Array<{ total: number | string }>)[0].total);

    const statusCounts: Record<string, number> = { '0': 0, '1': 0 };
    const [scRows] = await db.query('SELECT status, COUNT(*) AS n FROM comments GROUP BY status');
    for (const row of scRows as Array<{ status: number | string; n: number | string }>) {
      statusCounts[String(row.status)] = toInt(row.n);
    }

    const result = (rows as Array<Record<string, unknown>>).map((r) => {
      if (r.created_at) r.created_at = fmtDatetime(String(r.created_at));
      if (r.updated_at) r.updated_at = fmtDatetime(String(r.updated_at));
      return r;
    });

    return { message: '获取成功', code: 200, data: result, total, status_counts: statusCounts, page, limit };
  }

  /** PUT /admin_comments —— 置顶 / 隐藏 / 恢复 */
  async update(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_comments', headers, {});
    if (auth instanceof HttpFail) return auth;

    const id = toInt(body?.id);
    if (id <= 0) return new HttpFail(400, '缺少评论ID');

    const sets: string[] = [];
    const params: unknown[] = [];
    // 置顶切换
    if (body?.is_top !== undefined && body?.is_top !== null) {
      sets.push('is_top = ?');
      params.push(body.is_top ? 1 : 0);
    }
    // 隐藏/恢复
    if (body?.status !== undefined && body?.status !== null) {
      sets.push('status = ?');
      params.push(toInt(body.status));
    }
    if (!sets.length) return new HttpFail(400, '无更新字段');

    params.push(id);
    await db.query(`UPDATE comments SET ${sets.join(', ')} WHERE id = ?`, params);
    return ok('更新成功');
  }

  /** DELETE /admin_comments?id= —— 删除评论及其子评论 */
  async remove(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_comments', headers, query);
    if (auth instanceof HttpFail) return auth;

    const id = query?.id !== undefined ? toInt(query.id) : 0;
    if (id <= 0) return new HttpFail(400, '缺少评论ID');

    // 删除评论及其子评论
    await db.query('DELETE FROM comments WHERE parent_id = ?', [id]);
    await db.query('DELETE FROM comments WHERE id = ?', [id]);
    return ok('删除成功');
  }
}
