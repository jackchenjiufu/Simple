import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';

/** 将 MySQL 可能返回的 null/buffer 转整型 */
export function toInt(v: unknown): number {
  const n = parseInt(String(v ?? '0'), 10);
  return isNaN(n) ? 0 : n;
}

/** 生成与 PHP bin2hex(random_bytes(32)) 等价的 64 位 hex token */
function randomToken(): string {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf.toString('hex');
}

/** 格式化为 Y-m-d H:i（近似 PHP date 行为） */
export function fmtYmdHi(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 格式化为 Y-m-d H:i:s（PHP datetime 风格） */
export function fmtDatetime(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 当前服务器本地时间 Y-m-d H:i:s（与 PHP date() 一致；勿用 toISOString，那是 UTC 会少 8 小时） */
export function nowDatetime(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 封装带 HTTP 状态码的错误（对应 PHP http_response_code + json） */
export class HttpFail {
  readonly code: number;
  constructor(public readonly httpStatus: number, public readonly message: string) {
    this.code = httpStatus;
  }
}

/** 注销：清用户数据（复刻 user_delete_helper.purgeUserData 核心行为） */
export async function purgeUserData(userId: number): Promise<void> {
  const tables = [
    'content', 'articles', 'comments', 'feedback', 'feedback_replies',
    'ledger', 'overtime', 'messages', 'user_behavior', 'browse_history',
    'content_likes', 'notifications',
  ];
  for (const t of tables) {
    try { await db.query(`DELETE FROM \`${t}\` WHERE user_id = ?`, [userId]); } catch { /* 表可能不存在 */ }
  }
  try { await db.query('DELETE FROM users WHERE id = ?', [userId]); } catch { /* noop */ }
}

@Injectable()
export class AuthService {
  /** POST /login —— 完全复刻 login.php */
  async login(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const username = body?.username ? String(body.username) : '';
    const password = body?.password ? String(body.password) : '';
    if (!username || !password) return new HttpFail(400, '用户名和密码不能为空');

    const [rows] = await db.query(
      'SELECT id, username, password, nickname, avatar, background_image, email, role, status, ' +
        "ban_expire, mute_expire, delete_requested_at, created_at, level FROM users WHERE username = ? LIMIT 1",
      [username],
    );
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row || !bcrypt.compareSync(password, String(row.password || ''))) {
      return new HttpFail(401, '用户名或密码错误');
    }

    let status = toInt(row.status);
    const now = Date.now() / 1000;
    const rowId = toInt(row.id);

    // status=1 封禁
    if (status === 1) {
      const banExpire = row.ban_expire ? new Date(String(row.ban_expire)).getTime() / 1000 : 0;
      if (row.ban_expire && banExpire < now) {
        await db.query('UPDATE users SET status = 0, ban_expire = NULL WHERE id = ?', [rowId]);
        status = 0;
      } else {
        let msg = '账号已被封禁';
        msg += row.ban_expire ? '，解封时间：' + fmtYmdHi(String(row.ban_expire)) : '，请联系管理员';
        return new HttpFail(403, msg);
      }
    }
    // status=2 禁言过期自动解除
    if (status === 2) {
      const muteExpire = row.mute_expire ? new Date(String(row.mute_expire)).getTime() / 1000 : 0;
      if (row.mute_expire && muteExpire < now) {
        await db.query('UPDATE users SET status = 0, mute_expire = NULL WHERE id = ?', [rowId]);
        status = 0;
      }
    }

    // === 注销冷静期 ===
    let deleteNotice: string | undefined;
    if (row.delete_requested_at) {
      const reqTs = new Date(String(row.delete_requested_at)).getTime() / 1000;
      if (!isNaN(reqTs) && now - reqTs >= 3 * 86400) {
        await purgeUserData(rowId);
        return new HttpFail(403, '账号已注销');
      }
      await db.query('UPDATE users SET delete_requested_at = NULL WHERE id = ?', [rowId]);
      deleteNotice = '已取消注销申请，账号已恢复';
    }

    // 生成 token 并持久化
    const token = randomToken();
    await db.query('UPDATE users SET auth_token = ? WHERE id = ?', [token, rowId]);

    const user: Record<string, unknown> = { ...row };
    delete user.password;
    // mysql2 会把 DATETIME 转成 Date；PHP 返回 'Y-m-d H:i:s' 字符串 —— 格式化为一致
    if (user.created_at != null) {
      user.created_at = fmtDatetime(String(new Date(String(user.created_at)).toISOString().replace('T', ' ').slice(0, 19)));
    } else {
      user.created_at = fmtDatetime(new Date().toISOString().replace('T', ' ').slice(0, 19));
    }

    const data: Record<string, unknown> = { user, token };
    if (deleteNotice) data.notice = deleteNotice;
    const role = String(user.role || 'user');
    if (role === 'admin' || role === 'super_admin') {
      data.admin_token = process.env.ADMIN_TOKEN || '';
    }

    return ok('登录成功', data);
  }

  /** POST /register —— 完全复刻 register.php */
  async register(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const username = body?.username ? String(body.username) : '';
    const password = body?.password ? String(body.password) : '';
    if (!username || !password) return new HttpFail(400, '用户名和密码不能为空');

    const email = body?.email ? String(body.email) : '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new HttpFail(400, '邮箱格式不正确');

    const [exist] = await db.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if ((exist as unknown[]).length) return new HttpFail(400, '用户名已存在');

    const host = headers['host'] || 'localhost';
    const uploadBase = `http://${host}/doo/server/uploads/`;
    const hashed = bcrypt.hashSync(password, 10);

    const [res] = await db.query(
      'INSERT INTO users (username, password, nickname, email, avatar, background_image, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [username, hashed, username, email, uploadBase + 'default_avatar.png', uploadBase + 'default_background.png'],
    );
    if ((res as { affectedRows?: number }).affectedRows) {
      return { code: 201, message: '注册成功', data: { username } };
    }
    return new HttpFail(503, '注册失败');
  }

  /** Bearer token 鉴权 —— 复刻 comments.php authenticateUser 的 App 端路径 */
  async authenticate(headers: Record<string, string | undefined>): Promise<number> {
    const auth = headers['authorization'] || '';
    const m = /Bearer\s+(\S+)/i.exec(auth);
    if (!m) return 0;
    const [rows] = await db.query('SELECT id FROM users WHERE auth_token = ? LIMIT 1', [m[1]]);
    const r = (rows as Array<{ id: number | string }>)[0];
    return r ? toInt(r.id) : 0;
  }

  /** 取用户角色（不存在返回空串） */
  async getUserRole(userId: number): Promise<string> {
    if (userId <= 0) return '';
    const [rows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
    const r = (rows as Array<{ role: string | null }>)[0];
    return r ? String(r.role || '') : '';
  }
}