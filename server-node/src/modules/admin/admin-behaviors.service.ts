/**
 * admin-behaviors.service.ts —— 用户行为分析与管理（复刻 server/api/admin_behaviors.php）
 * 统一 action 入口（checkAdminAuth() 仅需登录）：
 *   GET  action=list        用户行为汇总列表(分页/搜索/按行为数排序)
 *   GET  action=detail      单用户行为明细(分页/类型筛选/关联内容标题)
 *   GET  action=types       行为类型统计(全站或单用户)
 *   POST action=delete      删除单条行为记录
 *   POST action=clear_user  清空某用户全部行为
 *   GET  action=trend       行为趋势（近 N 天，按日分类型）
 *   GET  action=hourly      24 小时活跃分布
 *   GET  action=type_dist   行为类型分布（环形图数据）
 *   GET  action=similar     相似用户（min-max 归一化 + 欧氏距离）
 */
import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** 毫秒时间戳 → 本地 Y-m-d H:i:s（对应 PHP date('Y-m-d H:i:s', ts/1000)） */
function fmtTs(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 保留两位小数（对应 PHP round(x, 2)） */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 相似用户全量特征向量 SQL */
const SIMILAR_SQL = `SELECT u.id, u.username, u.nickname, u.role,
       COUNT(b.id) AS total,
       SUM(b.type = 'content_click') AS clicks,
       SUM(b.type = 'page_view') AS views,
       SUM(b.type = 'page_stay') AS stays,
       SUM(b.type = 'rec_view') AS exposures,
       COALESCE(SUM(CASE WHEN b.type = 'page_stay' THEN b.duration ELSE 0 END), 0) AS stay_seconds,
       COUNT(DISTINCT DATE(FROM_UNIXTIME(b.timestamp / 1000))) AS active_days
FROM users u JOIN user_behaviors b ON b.user_id = u.id
GROUP BY u.id, u.username, u.nickname, u.role
HAVING COUNT(b.id) > 0`;

@Injectable()
export class AdminBehaviorsService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET/POST admin_behaviors?action=xxx —— 行为分析统一入口 */
  async handle(
    action: string,
    method: string,
    body: Record<string, unknown>,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    try {
      // action：入参优先，其次 GET query，再其次 body（PHP 仅认 $_GET/$_POST，此处兼容 JSON body），默认 list
      const act =
        String(action || '').trim() ||
        (query?.action !== undefined ? String(query.action).trim() : '') ||
        (body && (body as Record<string, unknown>).action !== undefined
          ? String((body as Record<string, unknown>).action).trim()
          : '') ||
        'list';

      // 取值：body 优先，其次 query（对应 PHP $in = POST body 或 $_GET）
      const get = (k: string): unknown => {
        if (body && body[k] !== undefined && body[k] !== null) return body[k];
        return query[k];
      };
      const rawInt = (k: string, d: number): number => {
        const v = get(k);
        return v !== undefined ? toInt(v) : d;
      };

      switch (act) {
        // ── 用户行为汇总列表 ──
        case 'list': {
          const rawPage = rawInt('page', 1);
          const page = Math.max(1, rawPage);
          const rawLimit = rawInt('limit', 20);
          const limit = Math.min(100, Math.max(1, rawLimit));
          const offset = (page - 1) * limit;
          const keyword = String(get('keyword') ?? '').trim();

          let where = '';
          const bind: unknown[] = [];
          if (keyword !== '') {
            where = ' AND (u.username LIKE ? OR u.nickname LIKE ?)';
            bind.push(`%${keyword}%`, `%${keyword}%`);
          }
          // 总数
          const [cntRows] = await db.query(
            `SELECT COUNT(*) c FROM (SELECT u.id FROM users u JOIN user_behaviors b ON b.user_id=u.id WHERE 1=1 ${where} GROUP BY u.id) t`,
            bind,
          );
          const total = toInt((cntRows as Array<{ c: number | string }>)[0].c);

          const [rows] = await db.query(
            `SELECT u.id, u.username, u.nickname, u.role, u.level,
                           COUNT(b.id) AS total,
                           SUM(b.type = 'content_click') AS clicks,
                           SUM(b.type = 'page_view') AS views,
                           SUM(b.type = 'page_stay') AS stays,
                           SUM(b.type = 'rec_view') AS exposures,
                           COALESCE(SUM(CASE WHEN b.type = 'page_stay' THEN b.duration ELSE 0 END), 0) AS stay_seconds,
                           COUNT(DISTINCT DATE(FROM_UNIXTIME(b.timestamp / 1000))) AS active_days,
                           MAX(b.timestamp) AS last_ts
                    FROM users u JOIN user_behaviors b ON b.user_id = u.id
                    WHERE 1=1 ${where}
                    GROUP BY u.id
                    ORDER BY total DESC, u.id ASC
                    LIMIT ${limit} OFFSET ${offset}`,
            bind,
          );

          const users: Array<Record<string, unknown>> = [];
          for (const r of rows as Array<Record<string, unknown>>) {
            // 偏好分类 TOP1：只分析图片（content 表）；图片创建时间须 ≤ 行为时间；只统计主动行为，排除 rec_view 曝光
            let topCat = '';
            const [qRows] = await db.query(
              `SELECT cat, COUNT(*) c FROM (
                        SELECT c.category COLLATE utf8mb4_general_ci AS cat
                        FROM user_behaviors b
                        JOIN content c ON c.id = b.content_id AND c.created_at <= FROM_UNIXTIME(b.timestamp / 1000)
                        WHERE b.user_id = ? AND b.content_id REGEXP '^[0-9]+$'
                          AND b.type IN ('content_click', 'page_view', 'page_stay')
                          AND c.category <> ''
                     ) t
                     GROUP BY cat ORDER BY c DESC LIMIT 1`,
              [r.id],
            );
            const tc = (qRows as Array<{ cat: string }>)[0];
            if (tc) topCat = tc.cat;

            users.push({
              user_id: toInt(r.id),
              username: r.username,
              nickname: r.nickname || r.username,
              role: r.role,
              level: toInt(r.level),
              total: toInt(r.total),
              clicks: toInt(r.clicks),
              views: toInt(r.views),
              stays: toInt(r.stays),
              exposures: toInt(r.exposures),
              stay_seconds: toInt(r.stay_seconds),
              active_days: toInt(r.active_days),
              top_category: topCat,
              last_active: r.last_ts ? fmtTs(toInt(r.last_ts)) : null,
            });
          }
          return ok('成功', { items: users, total });
        }

        // ── 单用户行为明细 ──
        case 'detail': {
          const userId = rawInt('user_id', 0);
          if (userId <= 0) return fail(400, 'user_id 必填');
          const rawPage = rawInt('page', 1);
          const page = Math.max(1, rawPage);
          const rawLimit = rawInt('limit', 30);
          const limit = Math.min(100, Math.max(1, rawLimit));
          const offset = (page - 1) * limit;
          const type = String(get('type') ?? '').trim();

          let where = 'b.user_id = ?';
          const bind: unknown[] = [userId];
          if (type !== '' && type !== 'all') {
            where += ' AND b.type = ?';
            bind.push(type);
          }
          const [cntRows] = await db.query(`SELECT COUNT(*) c FROM user_behaviors b WHERE ${where}`, bind);
          const total = toInt((cntRows as Array<{ c: number | string }>)[0].c);

          const [rows] = await db.query(
            `SELECT b.id, b.type, b.content_id, b.content_type, b.duration, b.timestamp,
                           NULLIF(c.title, '') AS title,
                           NULLIF(c.category, '') AS category,
                           c.image_url AS image_url
                    FROM user_behaviors b
                    LEFT JOIN content c ON c.id = b.content_id AND c.created_at <= FROM_UNIXTIME(b.timestamp / 1000)
                    WHERE ${where}
                    ORDER BY b.id DESC
                    LIMIT ${limit} OFFSET ${offset}`,
            bind,
          );
          const items = (rows as Array<Record<string, unknown>>).map((r) => ({
            id: toInt(r.id),
            type: r.type,
            content_id: r.content_id,
            content_type: r.content_type,
            title: r.title,
            category: r.category,
            image_url: r.image_url,
            duration: toInt(r.duration),
            timestamp: r.timestamp ? fmtTs(toInt(r.timestamp)) : null,
          }));
          // 用户信息
          let u: Record<string, unknown> | null = null;
          const [uRows] = await db.query('SELECT id, username, nickname, role, level FROM users WHERE id = ?', [userId]);
          const ur = (uRows as Array<Record<string, unknown>>)[0];
          if (ur) {
            u = {
              user_id: toInt(ur.id),
              username: ur.username,
              nickname: ur.nickname || ur.username,
              role: ur.role,
              level: toInt(ur.level),
            };
          }
          return ok('成功', { user: u, items, total });
        }

        // ── 行为类型统计 ──
        case 'types': {
          const userId = rawInt('user_id', 0);
          let where = '';
          const bind: unknown[] = [];
          if (userId > 0) {
            where = 'WHERE user_id = ?';
            bind.push(userId);
          }
          const [rows] = await db.query(
            `SELECT type, COUNT(*) c FROM user_behaviors ${where} GROUP BY type ORDER BY c DESC`,
            bind,
          );
          const list = (rows as Array<{ type: string; c: number | string }>).map((r) => ({
            type: r.type,
            count: toInt(r.c),
          }));
          return ok('成功', list);
        }

        // ── 删除单条行为 ──
        case 'delete': {
          const id = rawInt('id', 0);
          if (id <= 0) return fail(400, 'id 必填');
          await db.query('DELETE FROM user_behaviors WHERE id = ?', [id]);
          return ok('已删除', { id });
        }

        // ── 清空某用户全部行为 ──
        case 'clear_user': {
          const userId = rawInt('user_id', 0);
          if (userId <= 0) return fail(400, 'user_id 必填');
          await db.query('DELETE FROM user_behaviors WHERE user_id = ?', [userId]);
          return ok('已清空该用户全部行为', { user_id: userId });
        }

        // ── 行为趋势（近 N 天，按日分类型） ──
        case 'trend': {
          const rawDays = rawInt('days', 30);
          const days = Math.min(90, Math.max(1, rawDays));
          const since = (Math.floor(Date.now() / 1000) - days * 86400) * 1000;
          const [rows] = await db.query(
            'SELECT DATE(FROM_UNIXTIME(timestamp/1000)) AS d, type, COUNT(*) AS c FROM user_behaviors WHERE timestamp >= ? GROUP BY d, type ORDER BY d',
            [since],
          );
          // 摊平成 {date: {type: count}} 并补全 0
          const series: Record<string, Record<string, number>> = {};
          const dates: string[] = [];
          for (const r of rows as Array<{ d: string; type: string; c: number | string }>) {
            if (!series[r.d]) series[r.d] = {};
            series[r.d][r.type] = toInt(r.c);
            if (!dates.includes(r.d)) dates.push(r.d);
          }
          const types = ['page_view', 'rec_view', 'content_click', 'page_stay'];
          return { code: 200, data: { dates, types, series } };
        }

        // ── 24 小时活跃分布 ──
        case 'hourly': {
          const rawDays = rawInt('days', 7);
          const days = Math.min(30, Math.max(1, rawDays));
          const since = (Math.floor(Date.now() / 1000) - days * 86400) * 1000;
          const [rows] = await db.query(
            'SELECT HOUR(FROM_UNIXTIME(timestamp/1000)) AS h, COUNT(*) AS c FROM user_behaviors WHERE timestamp >= ? GROUP BY h',
            [since],
          );
          const hours = new Array<number>(24).fill(0);
          for (const r of rows as Array<{ h: number | string; c: number | string }>) {
            hours[toInt(r.h)] = toInt(r.c);
          }
          return { code: 200, data: { hours } };
        }

        // ── 行为类型分布（环形图数据） ──
        case 'type_dist': {
          const rawDays = rawInt('days', 30);
          const days = Math.min(90, Math.max(1, rawDays));
          const since = (Math.floor(Date.now() / 1000) - days * 86400) * 1000;
          const [rows] = await db.query(
            'SELECT type, COUNT(*) AS c FROM user_behaviors WHERE timestamp >= ? GROUP BY type ORDER BY c DESC',
            [since],
          );
          // PHP 原样返回 fetchAll 结果（字段 type / c）
          return { code: 200, data: rows };
        }

        // ── 相似用户（min-max 归一化 + 欧氏距离，纳入行为量级） ──
        case 'similar': {
          const userId = rawInt('user_id', 0);
          const rawTop = rawInt('top', 5);
          const topN = Math.min(10, Math.max(1, rawTop));
          const [uRows] = await db.query(SIMILAR_SQL);
          const users = uRows as Array<Record<string, unknown>>;

          // log1p 对数压缩：抑制超活跃离群值把维度压死
          const l1p = (x: unknown): number => Math.log(1 + Number(x || 0));
          const vec: Record<number, number[]> = {};
          for (const u of users) {
            vec[toInt(u.id)] = [
              l1p(u.clicks), l1p(u.views), l1p(u.stays),
              l1p(u.exposures), l1p(u.stay_seconds), l1p(u.active_days),
            ];
          }
          if (!vec[userId]) {
            return { code: 200, data: { similar: [] } };
          }
          // min-max 归一化 + 欧氏距离
          const dims = vec[userId].length;
          const mins = new Array<number>(dims).fill(Number.MAX_SAFE_INTEGER);
          const maxs = new Array<number>(dims).fill(0);
          for (const v of Object.values(vec)) {
            for (let i = 0; i < dims; i++) {
              if (v[i] < mins[i]) mins[i] = v[i];
              if (v[i] > maxs[i]) maxs[i] = v[i];
            }
          }
          const norm = (v: number[]): number[] => {
            const r: number[] = [];
            for (let i = 0; i < dims; i++) {
              const span = maxs[i] - mins[i];
              r[i] = span > 0 ? (v[i] - mins[i]) / span : 0.5;
            }
            return r;
          };
          const euclid = (a: number[], b: number[]): number => {
            let s = 0;
            for (let i = 0; i < a.length; i++) {
              const d = a[i] - b[i];
              s += d * d;
            }
            return Math.sqrt(s);
          };

          const targetN = norm(vec[userId]);
          const similar: Array<Record<string, unknown>> = [];
          for (const u of users) {
            const id = toInt(u.id);
            if (id === userId) continue;
            const dist = euclid(targetN, norm(vec[id]));
            const sim = 1 / (1 + dist);
            similar.push({
              id,
              username: u.username,
              nickname: u.nickname,
              role: u.role,
              similarity: Math.round(sim * 100 * 10) / 10,
              total: toInt(u.total),
              active_days: toInt(u.active_days),
            });
          }
          similar.sort((a, b) => Number(b.similarity) - Number(a.similarity));
          return { code: 200, data: { similar: similar.slice(0, topN) } };
        }

        default:
          return fail(400, '未知 action');
      }
    } catch (e) {
      return new HttpFail(500, '失败: ' + (e as Error).message);
    }
  }
}
