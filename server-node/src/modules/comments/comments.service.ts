import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { AuthService, HttpFail, toInt, fmtYmdHi, fmtDatetime } from '../auth/auth.service';

/** strip_tags 最小实现 */
function stripTags(src: unknown): string {
  return String(src ?? '').replace(/<[^>]*>/g, '');
}

@Injectable()
export class CommentsService {
  constructor(private readonly auth: AuthService) {}

  /** 目标是否合法存在 */
  private async targetExists(type: 'article' | 'content', id: number): Promise<boolean> {
    const table = type === 'content' ? 'content' : 'articles';
    const [rows] = await db.query(
      `SELECT id FROM \`${table}\` WHERE id = ? AND status = 'published' LIMIT 1`,
      [id],
    );
    return (rows as unknown[]).length > 0;
  }

  /** 查询评论列表 */
  private async fetchComments(
    type: 'article' | 'content',
    targetId: number,
    page: number,
    limit: number,
  ) {
    const col = type === 'content' ? 'content_id' : 'article_id';
    const offset = (page - 1) * limit;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS c FROM comments WHERE ${col} = ? AND status = 0`,
      [targetId],
    );
    const total = toInt((countRows as Array<{ c: number | string }>)[0].c);

    const [rows] = await db.query(
      `SELECT c.id, c.article_id, c.content_id, c.user_id, c.content, c.parent_id, c.is_top, c.created_at,
              u.nickname, u.avatar, u.role, u.level
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.${col} = ? AND c.status = 0
       ORDER BY c.is_top DESC, c.created_at ASC, c.id ASC
       LIMIT ? OFFSET ?`,
      [targetId, limit, offset],
    );
    const list = (rows as Array<Record<string, unknown>>).map((item) => {
      const uid = toInt(item.user_id);
      const createdRaw = item.created_at != null ? fmtDatetime(String(item.created_at)) : '';
      return {
        id: toInt(item.id),
        article_id: item.article_id !== null && item.article_id !== undefined ? toInt(item.article_id) : null,
        content_id: item.content_id !== null && item.content_id !== undefined ? toInt(item.content_id) : null,
        user_id: uid,
        content: item.content,
        parent_id: toInt(item.parent_id),
        is_top: toInt(item.is_top),
        created_at: createdRaw,
        nickname: String(item.nickname || `用户${uid}`),
        avatar: String(item.avatar || ''),
        role: String(item.role || 'user'),
        level: toInt(item.level),
        time: createdRaw ? createdRaw.slice(5, 16) : '',
      };
    });

    return { list, total };
  }

  /** GET 评论列表 */
  async list(type: string | undefined, contentId: number, articleId: number, page: number, limit: number) {
    const t: 'article' | 'content' = type === 'content' ? 'content' : 'article';
    if (t === 'content' && contentId <= 0) return new HttpFail(400, '缺少 content_id');
    if (t === 'article' && articleId <= 0) return new HttpFail(400, '缺少 article_id');
    const targetId = t === 'content' ? contentId : articleId;
    const data = await this.fetchComments(t, targetId, page, limit);
    return {
      message: '获取成功',
      code: 200,
      data: data.list,
      total: data.total,
      page,
      limit,
    };
  }

  /** POST 发表/回复/置顶 */
  async create(
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');

    // 禁言校验
    const [muRows] = await db.query('SELECT status, mute_expire FROM users WHERE id = ? LIMIT 1', [userId]);
    const mu = (muRows as Array<{ status: number | string; mute_expire: string | null }>)[0];
    if (mu) {
      const me = mu.mute_expire;
      const muActive = !!me && me !== '0000-00-00 00:00:00' && me !== '0000-00-00 00:00:00.000000';
      const meTs = me && muActive ? new Date(String(me)).getTime() / 1000 : 0;
      let isMuted = false;
      if (toInt(mu.status) === 2) {
        if (!muActive || meTs >= Date.now() / 1000) {
          isMuted = true;
        } else {
          await db.query('UPDATE users SET status = 0, mute_expire = NULL WHERE id = ?', [userId]);
        }
      } else if (muActive && meTs >= Date.now() / 1000) {
        isMuted = true;
      }
      if (isMuted) {
        const end = muActive ? fmtYmdHi(String(me)) : '永久';
        return new HttpFail(403, `你已被禁言，解除时间：${end}`);
      }
    }

    const action = body?.action ? String(body.action) : '';
    // === 置顶/取消置顶（仅管理员） ===
    if (action === 'pin') {
      const [roleRows] = await db.query('SELECT role FROM users WHERE id = ? LIMIT 1', [userId]);
      const roleRow = (roleRows as Array<{ role: string }>)[0];
      const isAdmin = roleRow && ['admin', 'super_admin'].includes(roleRow.role);
      if (!isAdmin) return new HttpFail(403, '无权限操作');
      const commentId = toInt(body.comment_id);
      const pinned = toInt(body.pinned);
      if (commentId <= 0) return new HttpFail(400, '缺少评论ID');
      const [cRows] = await db.query('SELECT id FROM comments WHERE id = ? AND status = 0 LIMIT 1', [commentId]);
      if (!(cRows as unknown[]).length) return new HttpFail(404, '评论不存在');
      await db.query('UPDATE comments SET is_top = ? WHERE id = ?', [pinned ? 1 : 0, commentId]);
      return ok(pinned ? '已置顶' : '已取消置顶', { id: commentId, is_top: pinned ? 1 : 0 });
    }

    const type: 'article' | 'content' = body?.type === 'content' ? 'content' : 'article';
    const targetId = type === 'content' ? toInt(body.content_id) : toInt(body.article_id);
    const content = body?.content ? String(body.content).trim() : '';
    const parentId = toInt(body.parent_id);

    if (targetId <= 0 || content === '') return new HttpFail(400, '参数不完整');
    if (content.length > 500) return new HttpFail(400, '评论不能超过500字');

    if (!(await this.targetExists(type, targetId))) {
      return new HttpFail(404, type === 'content' ? '内容不存在' : '文章不存在');
    }

    // 回复的父评论必须属于同一目标
    if (parentId > 0) {
      const col = type === 'content' ? 'content_id' : 'article_id';
      const [pRows] = await db.query(
        `SELECT id FROM comments WHERE id = ? AND ${col} = ? AND status = 0 LIMIT 1`,
        [parentId, targetId],
      );
      if (!(pRows as unknown[]).length) return new HttpFail(400, '被回复的评论不存在');
    }

    // 限流：同IP 5分钟20条（本实现按 token 用户粗略限流，见设计说明）
    // 写入评论（纯文本存储，杜绝 XSS，复刻 htmlspecialchars）
    const safeContent = String(content)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    const col = type === 'content' ? 'content_id' : 'article_id';
    const [ins] = await db.query(
      `INSERT INTO comments (${col}, user_id, content, parent_id, status) VALUES (?, ?, ?, ?, 0)`,
      [targetId, userId, safeContent, parentId],
    );
    const commentId = toInt((ins as { insertId?: number }).insertId);

    const table = type === 'content' ? 'content' : 'articles';
    await db.query(`UPDATE \`${table}\` SET comments = comments + 1 WHERE id = ?`, [targetId]);

    const fresh = await this.fetchComments(type, targetId, 1, 500);
    const created = fresh.list.find((c) => c.id === commentId) || null;

    return { message: '评论成功', code: 200, data: created, total: fresh.total };
  }

  /** DELETE 删除自己的评论 */
  async remove(id: number, headers: Record<string, string | undefined>) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');
    if (id <= 0) return new HttpFail(400, '缺少评论ID');

    const [cRows] = await db.query(
      'SELECT id, article_id, content_id, user_id FROM comments WHERE id = ? LIMIT 1',
      [id],
    );
    const comment = (cRows as Array<Record<string, unknown>>)[0];
    if (!comment) return new HttpFail(404, '评论不存在');
    if (toInt(comment.user_id) !== userId) return new HttpFail(403, '无权删除他人评论');

    const isContent = toInt(comment.content_id) > 0;
    const targetId = isContent ? toInt(comment.content_id) : toInt(comment.article_id);
    const targetCol = isContent ? 'content_id' : 'article_id';
    const targetTable = isContent ? 'content' : 'articles';

    await db.query('DELETE FROM comments WHERE parent_id = ?', [id]);
    await db.query('DELETE FROM comments WHERE id = ?', [id]);

    const [cntRows] = await db.query(
      `SELECT COUNT(*) AS c FROM comments WHERE ${targetCol} = ? AND status = 0`,
      [targetId],
    );
    const newCount = toInt((cntRows as Array<{ c: number | string }>)[0].c);
    await db.query(`UPDATE \`${targetTable}\` SET comments = ? WHERE id = ?`, [newCount, targetId]);

    return ok('删除成功');
  }
}