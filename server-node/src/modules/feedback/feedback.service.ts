import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { AuthService, HttpFail, toInt, fmtYmdHi, fmtDatetime } from '../auth/auth.service';

const STATUS_MAP: Record<number, string> = { 0: '待处理', 1: '已查看', 2: '已回复', 3: '已完结' };

@Injectable()
export class FeedbackService {
  constructor(private readonly auth: AuthService) {}

  /** GET 我的反馈列表（含多轮回复） */
  async list(userId: number, page: number, limit: number) {
    if (userId <= 0) return new HttpFail(400, '缺少用户ID');
    const offset = (page - 1) * limit;

    const [cntRows] = await db.query('SELECT COUNT(*) AS total FROM feedback WHERE user_id = ?', [userId]);
    const total = toInt((cntRows as Array<{ total: number | string }>)[0].total);

    const [rows] = await db.query(
      'SELECT id, type, content, contact, status, created_at, updated_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset],
    );
    const list = rows as Array<Record<string, unknown>>;

    // 一次查所有回复
    const ids = list.map((i) => toInt(i.id));
    const repliesMap: Record<number, unknown[]> = {};
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      const [repRows] = await db.query(
        `SELECT * FROM feedback_replies WHERE feedback_id IN (${placeholders}) ORDER BY created_at ASC`,
        ids,
      );
      for (const r of repRows as Array<Record<string, unknown>>) {
        const fid = toInt(r.feedback_id);
        if (!repliesMap[fid]) repliesMap[fid] = [];
        repliesMap[fid].push(r);
      }
    }

    const data = list.map((item) => {
      const st = toInt(item.status);
      const replies = repliesMap[toInt(item.id)] || [];
      const out: Record<string, unknown> = { ...item };
      out.status_text = STATUS_MAP[st] ?? '未知';
      out.replies = replies;
      out.reply_count = replies.length;
      out.has_reply = replies.length > 0;
      if (item.created_at) {
        out.created_at = fmtDatetime(String(item.created_at));
        out.created_at_formatted = fmtYmdHi(String(item.created_at));
      }
      if (item.updated_at) out.updated_at = fmtDatetime(String(item.updated_at));
      return out;
    });

    return { message: '获取成功', code: 200, data, total, page, limit };
  }

  /** POST 提交新反馈 / 追问 / 完结 / 删除 */
  async create(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const userId = await this.auth.authenticate(headers);
    const authUserId = userId;
    const bodyUserId = toInt(body.user_id);
    const effectiveUserId = authUserId > 0 ? authUserId : bodyUserId;
    if (effectiveUserId <= 0) return new HttpFail(400, '缺少用户ID');

    const action = body?.action ? String(body.action) : 'new';

    // === 追问 ===
    if (action === 'reply') {
      const feedbackId = toInt(body.feedback_id);
      const content = body?.content ? String(body.content).trim() : '';
      if (feedbackId <= 0 || !content) return new HttpFail(400, '参数不完整');
      if (content.length > 500) return new HttpFail(400, '内容不能超过500字');

      const [chk] = await db.query('SELECT id, status FROM feedback WHERE id = ? AND user_id = ?', [feedbackId, effectiveUserId]);
      const row = (chk as Array<{ id: number | string; status: number | string }>)[0];
      if (!row) return new HttpFail(403, '无权操作');
      if (toInt(row.status) === 3) return new HttpFail(400, '该反馈已完结，无法继续追问');

      await db.query(
        "INSERT INTO feedback_replies (feedback_id, user_id, role, content) VALUES (?, ?, 'user', ?)",
        [feedbackId, effectiveUserId, content],
      );
      await db.query('UPDATE feedback SET status = 0 WHERE id = ?', [feedbackId]);
      return ok('追问已提交');
    }

    // === 完结 ===
    if (action === 'close') {
      const feedbackId = toInt(body.feedback_id);
      if (feedbackId <= 0) return new HttpFail(400, '参数不完整');
      const [chk] = await db.query('SELECT id, status FROM feedback WHERE id = ? AND user_id = ?', [feedbackId, effectiveUserId]);
      const row = (chk as Array<{ id: number | string; status: number | string }>)[0];
      if (!row) return new HttpFail(403, '无权操作');
      if (toInt(row.status) === 3) return new HttpFail(400, '该反馈已完结');
      await db.query('UPDATE feedback SET status = 3, updated_at = NOW() WHERE id = ?', [feedbackId]);
      return ok('反馈已完结');
    }

    // === 删除 ===
    if (action === 'delete') {
      const feedbackId = toInt(body.feedback_id);
      if (feedbackId <= 0) return new HttpFail(400, '参数不完整');
      const [chk] = await db.query('SELECT id, status FROM feedback WHERE id = ? AND user_id = ?', [feedbackId, effectiveUserId]);
      const row = (chk as Array<{ id: number | string; status: number | string }>)[0];
      if (!row) return new HttpFail(403, '无权操作');
      if (toInt(row.status) !== 3) return new HttpFail(400, '仅已完结的反馈可删除');
      await db.query('DELETE FROM feedback_replies WHERE feedback_id = ?', [feedbackId]);
      await db.query('DELETE FROM feedback WHERE id = ?', [feedbackId]);
      return ok('反馈已删除');
    }

    // === 提交新反馈 ===
    const type = body?.type ? String(body.type).trim() : '';
    const content = body?.content ? String(body.content).trim() : '';
    const contact = body?.contact ? String(body.contact).trim() : '';
    const allowed = ['功能建议', '界面反馈', '性能问题', '内容错误', '账号问题', '其他'];
    if (!allowed.includes(type)) return new HttpFail(400, '无效的反馈类型');
    if (!effectiveUserId || !type || !content) return new HttpFail(400, '请填写完整的反馈信息');
    if (content.length > 500) return new HttpFail(400, '反馈内容不能超过500字');

    const [ins] = await db.query(
      'INSERT INTO feedback (user_id, type, content, contact, status, created_at) VALUES (?, ?, ?, ?, 0, NOW())',
      [effectiveUserId, type, content, contact],
    );
    return { message: '反馈提交成功', code: 200, id: toInt((ins as { insertId?: number }).insertId) };
  }
}