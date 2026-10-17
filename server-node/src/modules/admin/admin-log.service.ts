/**
 * admin-log.service.ts —— AI 操作记录查询（复刻 server/api/admin_ai_logs.php）
 * 独立 AI 审计页：分页获取 AI 客服/超管指令的操作记录（feedback_replies 中 role='admin' 的记录）。
 * 支持：分页、按来源筛选、按类型筛选、关键字搜索、时间范围；附带各来源数量角标。
 * 鉴权：checkAdminAuth('manage_logs')，仅 GET。
 */
import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { HttpFail, toInt } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** 来源筛选白名单（对应 PHP in_array 白名单） */
const SOURCE_WHITELIST = ['ai_reply', 'super_admin_cmd', 'manual'];

@Injectable()
export class AdminLogService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET admin_ai_logs —— AI 操作记录分页查询 */
  async aiLogs(
    method: string,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_logs', headers, query);
    if (auth instanceof HttpFail) return auth;

    if (method !== 'GET') return new HttpFail(405, '方法不允许');

    const rawPage = query?.page !== undefined ? toInt(query.page) : 1;
    const page = Math.max(1, rawPage);
    const rawLimit = query?.limit !== undefined ? toInt(query.limit) : 20;
    const limit = Math.max(1, Math.min(100, rawLimit));
    const offset = (page - 1) * limit;

    const source = (query?.source || '').trim();   // ai_reply / super_admin_cmd / manual / ''
    const type = (query?.type || '').trim();        // 反馈类型
    const search = (query?.search || '').trim();    // 关键字
    const dateFrom = (query?.date_from || '').trim();
    const dateTo = (query?.date_to || '').trim();

    const where: string[] = ["r.role = 'admin'"];
    const params: unknown[] = [];

    if (source !== '' && SOURCE_WHITELIST.includes(source)) {
      where.push('r.source = ?');
      params.push(source);
    }
    if (type !== '') {
      where.push('f.type = ?');
      params.push(type);
    }
    if (search !== '') {
      where.push('(r.content LIKE ? OR f.content LIKE ? OR u.username LIKE ? OR u.nickname LIKE ?)');
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw);
    }
    if (dateFrom !== '') {
      where.push('r.created_at >= ?');
      params.push(`${dateFrom} 00:00:00`);
    }
    if (dateTo !== '') {
      where.push('r.created_at <= ?');
      params.push(`${dateTo} 23:59:59`);
    }

    const whereSql = where.join(' AND ');

    const fromSql = `FROM feedback_replies r
             INNER JOIN feedback f ON r.feedback_id = f.id
             LEFT JOIN users u ON f.user_id = u.id
             WHERE ${whereSql}`;

    const [rows] = await db.query(
      `SELECT r.id, r.feedback_id, r.source, r.content, r.created_at,
              f.type AS fb_type, f.content AS fb_content,
              u.id AS user_id, u.username, u.nickname
       ${fromSql}
       ORDER BY r.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const [cntRows] = await db.query(`SELECT COUNT(*) as total ${fromSql}`, params);
    const total = toInt((cntRows as Array<{ total: number | string }>)[0].total);

    // 各来源数量（供筛选标签角标）
    const srcCounts: Record<string, number> = {};
    try {
      const [scRows] = await db.query("SELECT source, COUNT(*) n FROM feedback_replies WHERE role='admin' GROUP BY source");
      for (const r of scRows as Array<{ source: string; n: number | string }>) {
        srcCounts[String(r.source)] = toInt(r.n);
      }
    } catch { /* 角标失败不影响主流程 */ }

    return {
      message: '获取成功',
      code: 200,
      data: rows,
      total,
      page,
      limit,
      source_counts: srcCounts,
    };
  }
}
