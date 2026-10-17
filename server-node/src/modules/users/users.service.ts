import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { AuthService, HttpFail, toInt, fmtDatetime } from '../auth/auth.service';
import { LEVEL_THRESHOLDS, growthFromCounts } from '../../level';

@Injectable()
export class UsersService {
  constructor(private readonly auth: AuthService) {}

  /** GET /users —— 用户列表（super_admin/admin 专属） */
  async list(headers: Record<string, string | undefined>) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');
    const role = await this.auth.getUserRole(userId);
    if (role !== 'super_admin' && role !== 'admin') {
      return new HttpFail(403, '无权限查看用户列表');
    }
    const [rows] = await db.query(
      'SELECT id, username, nickname, avatar, background_image, created_at FROM users ORDER BY id DESC',
    );
    const data = (rows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      created_at: r.created_at != null ? fmtDatetime(String(r.created_at)) : null,
    }));
    return ok('获取成功', data);
  }

  /** POST /change_password —— 改密（原密码校验） */
  async changePassword(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');

    const oldPwd = body?.old_password ? String(body.old_password) : '';
    const newPwd = body?.new_password ? String(body.new_password) : '';
    if (!oldPwd || !newPwd) return new HttpFail(400, '参数不完整');

    const [rows] = await db.query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [userId]);
    const row = (rows as Array<{ password: string }>)[0];
    if (!row) return new HttpFail(404, '用户不存在');

    if (!bcrypt.compareSync(oldPwd, row.password)) return new HttpFail(401, '原密码错误');

    const hashed = bcrypt.hashSync(newPwd, 10);
    const [res] = await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    if ((res as { affectedRows?: number }).affectedRows) return ok('密码修改成功');
    return new HttpFail(500, '密码修改失败');
  }

  /** GET /user_growth —— 成长值明细 */
  async growth(userId: number) {
    if (userId <= 0) return new HttpFail(400, '缺少 user_id');

    const [pRows] = await db.query('SELECT COUNT(*) AS c FROM articles WHERE user_id = ?', [userId]);
    const posts = toInt((pRows as Array<{ c: number | string }>)[0].c);

    const [cRows] = await db.query(
      'SELECT COUNT(*) AS c FROM comments WHERE user_id = ? AND status = 0 AND CHAR_LENGTH(content) >= 10',
      [userId],
    );
    const validComments = toInt((cRows as Array<{ c: number | string }>)[0].c);

    const [uRows] = await db.query('SELECT online_seconds, level FROM users WHERE id = ? LIMIT 1', [userId]);
    const user = (uRows as Array<{ online_seconds: number | string; level: number | string }>)[0];
    if (!user) return new HttpFail(404, '用户不存在');

    const onlineSeconds = toInt(user.online_seconds);
    const manualLevel = toInt(user.level);
    const growthVal = growthFromCounts(posts, validComments, onlineSeconds);
    const isManual = manualLevel > 0;
    const level = isManual ? Math.min(10, manualLevel) : (() => {
      let lv = 0;
      for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (growthVal >= LEVEL_THRESHOLDS[i]) lv = i + 1;
      }
      return lv;
    })();

    const fromPosts = posts * 20;
    const fromComments = validComments * 2;
    const fromOnline = Math.floor(onlineSeconds / 600);

    // 升级进度
    let percent = 100;
    let nextNeed = 0;
    let remaining = 0;
    if (level < 10) {
      const curNeed = level > 0 ? LEVEL_THRESHOLDS[level - 1] : 0;
      nextNeed = LEVEL_THRESHOLDS[level];
      percent = nextNeed > curNeed
        ? Math.max(0, Math.min(100, Math.round(((growthVal - curNeed) / (nextNeed - curNeed)) * 100)))
        : 0;
      remaining = Math.max(0, nextNeed - growthVal);
    }

    return ok('获取成功', {
      user_id: userId,
      posts,
      valid_comments: validComments,
      online_seconds: onlineSeconds,
      online_hours: Math.round((onlineSeconds / 3600) * 10) / 10,
      growth: growthVal,
      level,
      is_manual: isManual ? 1 : 0,
      breakdown: { from_posts: fromPosts, from_comments: fromComments, from_online: fromOnline },
      next_need: nextNeed,
      remaining,
      percent,
    });
  }

  /** POST /delete_account —— 注销（申请冷静期 / 取消） */
  async deleteAccount(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');

    const action = body?.action ? String(body.action) : 'request';
    if (action === 'cancel') {
      await db.query('UPDATE users SET delete_requested_at = NULL WHERE id = ?', [userId]);
      return ok('已取消注销申请，账号已恢复');
    }
    // 申请注销（冷静期 3 天）
    await db.query('UPDATE users SET delete_requested_at = NOW() WHERE id = ?', [userId]);
    return ok('已申请注销，3天冷静期内登录即可取消');
  }

  /** POST /update_user —— 更新资料（昵称/头像/背景/性别/生日/地区/简介/邮箱） */
  async updateUser(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');

    const setClauses: string[] = [];
    const params: unknown[] = [];
    const fields: Record<string, string> = {
      nickname: 'nickname', avatar: 'avatar', background_image: 'background_image',
      gender: 'gender', birthday: 'birthday', region: 'region', bio: 'bio',
    };
    for (const [k, col] of Object.entries(fields)) {
      if (body[k] !== undefined && body[k] !== null && String(body[k]) !== '') {
        setClauses.push(`${col} = ?`);
        params.push(String(body[k]));
      }
    }
    if (body.email !== undefined && body.email !== null && String(body.email) !== '') {
      const email = String(body.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new HttpFail(400, '邮箱格式不正确');
      setClauses.push('email = ?');
      params.push(email);
    }

    if (!setClauses.length) return new HttpFail(400, '没有需要更新的数据');
    params.push(userId);
    const [res] = await db.query(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`, params);
    if ((res as { affectedRows?: number }).affectedRows !== undefined) return ok('更新成功');
    return new HttpFail(503, '更新失败');
  }

  /** GET /get_user_articles —— 用户文章列表（分页） */
  async getUserArticles(userId: number, page: number, pageSize: number) {
    if (userId <= 0) return new HttpFail(400, '用户 ID 无效');
    const offset = (page - 1) * pageSize;

    const [rows] = await db.query(
      'SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset],
    );
    const [cnt] = await db.query('SELECT COUNT(*) AS c FROM articles WHERE user_id = ?', [userId]);
    const total = toInt((cnt as Array<{ c: number | string }>)[0].c);

    const articles = (rows as Array<Record<string, unknown>>).map((a) => {
      const out: Record<string, unknown> = { ...a };
      // tags 字符串转数组
      if (out.tags) out.tags = String(out.tags).split(',').filter(Boolean);
      else out.tags = [];
      // 摘要
      if (!out.summary && out.content) {
        out.summary = String(out.content).replace(/<[^>]*>/g, '').slice(0, 100) + '...';
      }
      if (!out.created_at && out.date) out.created_at = out.date;
      if (out.created_at) out.created_at = fmtDatetime(String(out.created_at));
      return out;
    });

    return {
      message: '获取用户文章列表成功',
      code: 200,
      success: true,
      data: { list: articles, total, page, page_size: pageSize },
    };
  }
}