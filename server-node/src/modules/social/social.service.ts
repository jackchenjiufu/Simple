import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { AuthService, HttpFail, toInt, fmtDatetime } from '../auth/auth.service';

@Injectable()
export class SocialService {
  constructor(private readonly auth: AuthService) {}

  /** POST /heartbeat —— 在线时长上报（防刷上限 900s） */
  async heartbeat(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');

    let seconds = toInt(body?.seconds ?? 300);
    seconds = Math.max(1, Math.min(900, seconds));

    await db.query('UPDATE users SET online_seconds = online_seconds + ? WHERE id = ?', [seconds, userId]);
    const [rows] = await db.query('SELECT online_seconds FROM users WHERE id = ?', [userId]);
    const total = toInt((rows as Array<{ online_seconds: number | string }>)[0].online_seconds);

    return ok('心跳成功', {
      added: seconds,
      online_seconds: total,
      growth_from_online: Math.floor(total / 600),
    });
  }

  /** POST /report —— 举报（24h 防刷） */
  async report(body: Record<string, unknown>) {
    const reporterId = toInt(body?.reporter_id);
    const targetType = body?.target_type ? String(body.target_type).trim() : '';
    const targetId = toInt(body?.target_id);
    const reason = body?.reason ? String(body.reason).trim() : '';
    const detail = body?.detail ? String(body.detail).trim() : '';

    const allowed = ['user', 'message', 'article', 'comment'];
    if (reporterId <= 0 || !allowed.includes(targetType) || targetId <= 0) {
      return new HttpFail(400, '参数不完整');
    }
    if (!reason && !detail) return new HttpFail(400, '请填写举报原因');

    // 同一用户同一对象 24h 防刷
    const [dup] = await db.query(
      "SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1",
      [reporterId, targetType, targetId],
    );
    if ((dup as unknown[]).length) return new HttpFail(400, '您已举报过该内容，请勿重复举报');

    await db.query(
      'INSERT INTO reports (reporter_id, target_type, target_id, reason, detail, status, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
      [reporterId, targetType, targetId, reason, detail],
    );
    return ok('举报已提交，我们会尽快处理');
  }

  /** POST /user_behavior —— 行为上报（推荐闭环，幂等静默） */
  async userBehavior(body: Record<string, unknown>, query: Record<string, string | undefined>) {
    const type = body?.type ? String(body.type).trim() : '';
    const contentId = toInt(body?.content_id);
    const duration = toInt(body?.duration);
    const allowed = ['content_click', 'page_view', 'page_stay', 'rec_view'];
    if (!allowed.includes(type)) return new HttpFail(400, 'type 无效');

    // 用户识别：GET token 参数（64位hex）或 Bearer
    let userId = 0;
    const qToken = query?.token || '';
    if (/^[0-9a-f]{64}$/i.test(qToken)) {
      try {
        const [rows] = await db.query('SELECT id FROM users WHERE auth_token = ?', [qToken]);
        const r = (rows as Array<{ id: number | string }>)[0];
        if (r) userId = toInt(r.id);
      } catch { /* 忽略 */ }
    }
    if (userId <= 0) {
      return ok('未登录，跳过上报', { recorded: false });
    }

    try {
      await db.query(
        `CREATE TABLE IF NOT EXISTS user_behaviors (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          type VARCHAR(30) NOT NULL,
          content_id INT DEFAULT 0,
          duration INT DEFAULT 0,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          KEY idx_user (user_id, type),
          KEY idx_content (content_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
      );
      await db.query(
        'INSERT INTO user_behaviors (user_id, type, content_id, duration, timestamp) VALUES (?, ?, ?, ?, ?)',
        [userId, type, contentId, duration, Date.now()],
      );
      return ok('已记录', { recorded: true });
    } catch {
      return ok('记录失败（静默）', { recorded: false });
    }
  }
}