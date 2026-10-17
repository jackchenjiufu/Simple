import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { AuthService, HttpFail, toInt, fmtDatetime } from '../auth/auth.service';

/** HTML 实体转义（复刻 PHP htmlspecialchars ENT_QUOTES） */
function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const SENSITIVE_WORDS = ['赌博', '博彩', '代开发票', '办证', '裸聊', '约炮', '枪支', '毒品', '传销', '刷单'];

@Injectable()
export class MessagesService {
  constructor(private readonly auth: AuthService) {}

  private async getUserInfo(userId: number): Promise<Record<string, unknown> | null> {
    const [rows] = await db.query('SELECT id, username, nickname, avatar, role FROM users WHERE id = ? LIMIT 1', [userId]);
    const r = (rows as Array<Record<string, unknown>>)[0];
    if (!r) return null;
    return { ...r, id: toInt(r.id) };
  }

  private async getOrCreateConversation(uid: number, peerId: number): Promise<number> {
    const a = Math.min(uid, peerId);
    const b = Math.max(uid, peerId);
    const [rows] = await db.query('SELECT id FROM conversations WHERE user_a = ? AND user_b = ? LIMIT 1', [a, b]);
    const existing = (rows as Array<{ id: number | string }>)[0];
    if (existing) return toInt(existing.id);
    const [ins] = await db.query('INSERT INTO conversations (user_a, user_b) VALUES (?, ?)', [a, b]);
    return toInt((ins as { insertId?: number }).insertId);
  }

  private async isBlocked(uid: number, peerId: number): Promise<boolean> {
    const [rows] = await db.query('SELECT id FROM user_blocks WHERE user_id = ? AND blocked_id = ? LIMIT 1', [uid, peerId]);
    return (rows as unknown[]).length > 0;
  }

  /** 统一入口 POST /messages?action=xxx 或 body.action */
  async handle(action: string, body: Record<string, unknown>, query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const uid = await this.auth.authenticate(headers);
    if (uid <= 0) return new HttpFail(401, '未登录');

    const str = (v: unknown, d = '') => (v != null ? String(v) : d);
    const int = (v: unknown, d = 0) => {
      const n = parseInt(str(v), 10);
      return isNaN(n) ? d : n;
    };

    // 参数来源：body 优先，其次 query
    const get = (k: string) => {
      const b = body && body[k] != null ? body[k] : undefined;
      if (b !== undefined) return b;
      return query[k];
    };

    switch (action) {
      // ============ 会话列表 ============
      case 'conversations': {
        const [rows] = await db.query(
          `SELECT c.*, (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS msg_count
           FROM conversations c WHERE c.user_a = ? OR c.user_b = ?
           ORDER BY c.last_time DESC, c.id DESC`,
          [uid, uid],
        );
        const result = [];
        for (const c of rows as Array<Record<string, unknown>>) {
          const peerId = toInt(c.user_a) === uid ? toInt(c.user_b) : toInt(c.user_a);
          const peer = await this.getUserInfo(peerId);
          if (!peer) continue;
          const unread = toInt(c.user_a) === uid ? toInt(c.unread_a) : toInt(c.unread_b);
          const blocked = await this.isBlocked(uid, peerId);
          result.push({
            conversation_id: toInt(c.id),
            peer: {
              id: toInt(peer.id),
              username: peer.username,
              nickname: peer.nickname ? peer.nickname : peer.username,
              avatar: peer.avatar,
              role: peer.role,
            },
            last_message: c.last_message,
            last_sender_id: toInt(c.last_sender_id),
            last_time: c.last_time != null ? fmtDatetime(String(c.last_time)) : null,
            unread,
            blocked,
            msg_count: toInt(c.msg_count),
          });
        }
        return ok('获取成功', result);
      }

      // ============ 会话消息列表 ============
      case 'messages': {
        const cid = int(get('conversation_id'));
        const page = Math.max(1, int(get('page'), 1));
        const limit = Math.max(1, Math.min(50, int(get('limit'), 20)));
        if (cid <= 0) return new HttpFail(400, '缺少会话ID');
        const [cRows] = await db.query('SELECT user_a, user_b FROM conversations WHERE id = ? LIMIT 1', [cid]);
        const conv = (cRows as Array<{ user_a: number | string; user_b: number | string }>)[0];
        if (!conv || ![toInt(conv.user_a), toInt(conv.user_b)].includes(uid)) {
          return new HttpFail(403, '无权查看该会话');
        }
        const offset = (page - 1) * limit;
        const [mRows] = await db.query(
          'SELECT id, sender_id, receiver_id, content, is_read, reported, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
          [cid, limit, offset],
        );
        const messages = (mRows as Array<Record<string, unknown>>).map((m) => ({
          ...m,
          id: toInt(m.id),
          sender_id: toInt(m.sender_id),
          receiver_id: toInt(m.receiver_id),
          is_read: toInt(m.is_read),
          reported: toInt(m.reported),
          created_at: m.created_at != null ? fmtDatetime(String(m.created_at)) : null,
        })).reverse();

        const peerId = toInt(conv.user_a) === uid ? toInt(conv.user_b) : toInt(conv.user_a);
        const peer = await this.getUserInfo(peerId);
        const peerBlockedMe = await this.isBlocked(peerId, uid);
        return ok('获取成功', {
          messages,
          peer: peer ? {
            id: toInt(peer.id),
            username: peer.username,
            nickname: peer.nickname ? peer.nickname : peer.username,
            avatar: peer.avatar,
            role: peer.role,
          } : null,
          peer_blocked_me: peerBlockedMe,
          page,
          has_more: messages.length >= limit,
        });
      }

      // ============ 发送消息 ============
      case 'send': {
        const peerId = int(get('to_user_id'));
        let content = str(get('content'));
        if (peerId <= 0) return new HttpFail(400, '缺少接收人');
        if (peerId === uid) return new HttpFail(400, '不能给自己发消息');

        content = content.trim();
        if (!content) return new HttpFail(400, '消息内容不能为空');
        content = escHtml(content);
        if (content.length > 500) content = content.slice(0, 500);
        for (const w of SENSITIVE_WORDS) {
          if (content.includes(w)) return new HttpFail(400, '消息包含敏感内容');
        }

        const peer = await this.getUserInfo(peerId);
        if (!peer) return new HttpFail(404, '用户不存在');

        // 双向拉黑拦截
        if (await this.isBlocked(uid, peerId)) return new HttpFail(403, '无法发送：存在拉黑关系');
        if (await this.isBlocked(peerId, uid)) return new HttpFail(403, '无法发送：存在拉黑关系');

        const cid = await this.getOrCreateConversation(uid, peerId);
        const [ins] = await db.query(
          'INSERT INTO messages (conversation_id, sender_id, receiver_id, content, is_read, reported) VALUES (?, ?, ?, ?, 0, 0)',
          [cid, uid, peerId, content],
        );
        const msgId = toInt((ins as { insertId?: number }).insertId);

        // 更新会话摘要 + 未读
        if (uid === Math.min(uid, peerId)) {
          await db.query(
            'UPDATE conversations SET last_message = ?, last_sender_id = ?, last_time = NOW(), unread_a = 0, unread_b = unread_b + 1 WHERE id = ?',
            [content, uid, cid],
          );
        } else {
          await db.query(
            'UPDATE conversations SET last_message = ?, last_sender_id = ?, last_time = NOW(), unread_b = 0, unread_a = unread_a + 1 WHERE id = ?',
            [content, uid, cid],
          );
        }

        return ok('发送成功', { id: msgId, conversation_id: cid, created_at: fmtDatetime(new Date().toISOString().slice(0, 19).replace('T', ' ')) });
      }

      // ============ 标记已读 ============
      case 'read': {
        const cid = int(get('conversation_id'));
        if (cid <= 0) return new HttpFail(400, '缺少会话ID');
        const [cRows] = await db.query('SELECT user_a, user_b FROM conversations WHERE id = ? LIMIT 1', [cid]);
        const conv = (cRows as Array<{ user_a: number | string; user_b: number | string }>)[0];
        if (!conv || ![toInt(conv.user_a), toInt(conv.user_b)].includes(uid)) {
          return new HttpFail(403, '无权操作该会话');
        }
        const field = toInt(conv.user_a) === uid ? 'unread_a' : 'unread_b';
        await db.query(`UPDATE conversations SET ${field} = 0 WHERE id = ?`, [cid]);
        await db.query('UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND receiver_id = ? AND is_read = 0', [cid, uid]);
        return ok('已读', null);
      }

      // ============ 拉黑 ============
      case 'block': {
        const peerId = int(get('user_id'));
        if (peerId <= 0 || peerId === uid) return new HttpFail(400, '参数错误');
        const peer = await this.getUserInfo(peerId);
        if (!peer) return new HttpFail(404, '用户不存在');
        await db.query('INSERT IGNORE INTO user_blocks (user_id, blocked_id) VALUES (?, ?)', [uid, peerId]);
        return ok('已拉黑', null);
      }

      // ============ 取消拉黑 ============
      case 'unblock': {
        const peerId = int(get('user_id'));
        if (peerId <= 0) return new HttpFail(400, '参数错误');
        await db.query('DELETE FROM user_blocks WHERE user_id = ? AND blocked_id = ?', [uid, peerId]);
        return ok('已取消拉黑', null);
      }

      // ============ 举报消息 ============
      case 'report': {
        const msgId = int(get('message_id'));
        if (msgId <= 0) return new HttpFail(400, '缺少消息ID');
        const [rows] = await db.query(
          'SELECT m.id, c.user_a, c.user_b FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE m.id = ? LIMIT 1',
          [msgId],
        );
        const row = (rows as Array<{ user_a: number | string; user_b: number | string }>)[0];
        if (!row) return new HttpFail(404, '消息不存在');
        if (![toInt(row.user_a), toInt(row.user_b)].includes(uid)) return new HttpFail(403, '无权举报该消息');
        await db.query('UPDATE messages SET reported = 1 WHERE id = ?', [msgId]);
        return ok('已举报，管理员会尽快处理', null);
      }

      default:
        return new HttpFail(400, '未知操作');
    }
  }
}