import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt, fmtDatetime, nowDatetime } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** 上传目录（env 覆盖，生产 7070 站点） */
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/www/wwwroot/139.196.185.197_7070/doo/server/uploads';

@Injectable()
export class AdminContentService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET /admin_content —— 内容列表（图片/视频/回收站/搜索/分类/审核筛选） */
  async list(
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_content', headers, query);
    if (auth instanceof HttpFail) return auth;

    const userId = query?.user_id ? parseInt(query.user_id, 10) : 0;
    const page = Math.max(1, parseInt(query?.page || '1', 10) || 1);
    const limit = Math.max(1, parseInt(query?.limit || '10', 10) || 10);
    const offset = (page - 1) * limit;
    const type = String(query?.type || 'all'); // all/image/video/trash
    const status = String(query?.status || '');
    const search = String(query?.search || '').trim();
    const category = String(query?.category || '').trim();
    const moderation = String(query?.moderation || '');
    const sort = String(query?.sort || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC'; // asc正序/desc倒序（默认），置顶始终最前

    const where: string[] = [];
    const params: unknown[] = [];

    if (userId > 0) { where.push('c.user_id = ?'); params.push(userId); }

    if (type === 'image') {
      where.push(`c.image_url IS NOT NULL AND c.image_url != '' AND (c.video_url IS NULL OR c.video_url = '')`);
      where.push(status ? 'c.status = ?' : "c.status = 'published'");
      if (status) params.push(status);
    } else if (type === 'video') {
      where.push(`c.video_url IS NOT NULL AND c.video_url != ''`);
      where.push(status ? 'c.status = ?' : "c.status = 'published'");
      if (status) params.push(status);
    } else if (type === 'trash') {
      where.push("c.status = 'deleted'");
    } else {
      if (status) { where.push('c.status = ?'); params.push(status); }
      else if (type !== 'all') { where.push("c.status != 'deleted'"); }
    }

    if (search) {
      where.push('(c.title LIKE ? OR u.username LIKE ? OR u.nickname LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) { where.push('c.category = ?'); params.push(category); }
    if (moderation) {
      if (moderation === 'pending') where.push("(c.moderation_status IS NULL OR c.moderation_status = 'pending')");
      else { where.push('c.moderation_status = ?'); params.push(moderation); }
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [rows] = await db.query(
      `SELECT c.id, c.user_id, c.title, c.content, c.image_url, c.video_url, c.likes, c.comments,
              c.views_count, c.status, c.tags, c.category, c.recommended, c.is_pinned,
              c.moderation_status, c.moderated_at, c.source, c.created_at, c.updated_at,
              u.username, u.nickname, u.avatar
       FROM content c LEFT JOIN users u ON c.user_id = u.id
       ${whereSql} ORDER BY c.is_pinned DESC, c.pin_time DESC, c.id ${sort} LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    const [cnt] = await db.query(
      `SELECT COUNT(*) AS total FROM content c LEFT JOIN users u ON c.user_id = u.id ${whereSql}`,
      params,
    );
    const total = toInt((cnt as Array<{ total: number | string }>)[0].total);

    const result = (rows as Array<Record<string, unknown>>).map((r) => {
      if (r.created_at) r.created_at = fmtDatetime(String(r.created_at));
      if (r.updated_at) r.updated_at = fmtDatetime(String(r.updated_at));
      if (r.moderated_at) r.moderated_at = fmtDatetime(String(r.moderated_at));
      return r;
    });

    return { message: '获取成功', code: 200, data: result, total, page, limit };
  }

  /** DELETE /admin_content?id=&hard=1 —— 软删/硬删 */
  async remove(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_content', headers, query);
    if (auth instanceof HttpFail) return auth;

    const id = toInt(query?.id);
    const hard = query?.hard === '1';
    if (id <= 0) return new HttpFail(400, 'ID不能为空');

    if (hard) {
      await this.deleteUploadFile(id);
      await db.query('DELETE FROM content WHERE id = ?', [id]);
      await db.query('DELETE FROM content_likes WHERE content_id = ?', [id]);
      await db.query('DELETE FROM browse_history WHERE content_id = ?', [id]);
      return ok('彻底删除成功');
    }
    await db.query("UPDATE content SET status = 'deleted' WHERE id = ?", [id]);
    return ok('已移入回收站');
  }

  /** POST /admin_content?action=xxx */
  async create(
    action: string,
    body: Record<string, unknown>,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_content', headers, query);
    if (auth instanceof HttpFail) return auth;

    if (action === 'update_meta') {
      const id = toInt(body?.id);
      if (id <= 0) return new HttpFail(400, 'ID无效');
      const sets: string[] = [];
      const params: unknown[] = [];
      if (body.tags !== undefined && body.tags !== null) {
        const tags = body.tags;
        const tagsVal = Array.isArray(tags)
          ? JSON.stringify((tags as unknown[]).map((t) => String(t).trim()).filter(Boolean))
          : String(tags);
        sets.push('tags = ?'); params.push(tagsVal);
      }
      if (body.category !== undefined && body.category !== null) {
        sets.push('category = ?'); params.push(String(body.category) === '' ? null : String(body.category));
      }
      if (body.recommended !== undefined && body.recommended !== null) {
        sets.push('recommended = ?'); params.push(toInt(body.recommended) ? 1 : 0);
      }
      if (!sets.length) return new HttpFail(400, '没有要更新的字段');
      sets.push('updated_at = NOW()');
      params.push(id);
      await db.query(`UPDATE content SET ${sets.join(', ')} WHERE id = ?`, params);
      return ok('更新成功');
    }

    if (action === 'restore') {
      const id = toInt(body?.id);
      if (id <= 0) return new HttpFail(400, 'ID无效');
      await db.query("UPDATE content SET status = 'published' WHERE id = ?", [id]);
      return ok('已恢复');
    }

    if (action === 'set_moderation') {
      const id = toInt(body?.id);
      let modStatus = body?.moderation_status ? String(body.moderation_status) : 'safe';
      if (!['safe', 'unsafe', 'pending'].includes(modStatus)) modStatus = 'safe';
      if (id <= 0) return new HttpFail(400, 'ID无效');
      await db.query(
        'UPDATE content SET moderation_status = ?, moderation_result = ?, moderated_at = NOW() WHERE id = ?',
        [modStatus, JSON.stringify({ source: 'admin', time: nowDatetime() }), id],
      );
      return ok('审核状态已更新');
    }

    if (action === 'glm_moderate') {
      // GLM 审核依赖 PHP tag_glm.php 的视觉模型——Node 侧暂返回能力提示（后台可走 PHP 路径）
      return new HttpFail(500, 'GLM 审核请在 PHP 引擎执行（Node 侧视觉管线待接入）');
    }

    if (action === 'batch') {
      const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).map((x) => toInt(x)).filter((x) => x > 0) : [];
      const op = body?.op ? String(body.op) : '';
      if (!ids.length || !['soft_delete', 'restore', 'hard_delete', 'safe', 'unsafe'].includes(op)) {
        return new HttpFail(400, '参数无效');
      }
      const idStr = ids.join(',');
      let affected = 0;
      if (op === 'soft_delete') {
        const [r] = await db.query(`UPDATE content SET status = 'deleted' WHERE id IN (${idStr})`);
        affected = toInt((r as { affectedRows?: number }).affectedRows);
      } else if (op === 'restore') {
        const [r] = await db.query(`UPDATE content SET status = 'published' WHERE id IN (${idStr})`);
        affected = toInt((r as { affectedRows?: number }).affectedRows);
      } else if (op === 'hard_delete') {
        for (const cid of ids) await this.deleteUploadFile(cid);
        const [r] = await db.query(`DELETE FROM content WHERE id IN (${idStr})`);
        affected = toInt((r as { affectedRows?: number }).affectedRows);
        await db.query(`DELETE FROM content_likes WHERE content_id IN (${idStr})`);
        await db.query(`DELETE FROM browse_history WHERE content_id IN (${idStr})`);
      } else {
        const st = op;
        const ts = nowDatetime();
        const [r] = await db.query(
          `UPDATE content SET moderation_status = '${st}', moderation_result = ?, moderated_at = NOW() WHERE id IN (${idStr})`,
          [JSON.stringify({ source: 'admin', time: ts })],
        );
        affected = toInt((r as { affectedRows?: number }).affectedRows);
      }
      return ok('批量操作完成', { affected });
    }

    return new HttpFail(400, '无效的操作');
  }

  /** PUT /admin_content —— 更新标题/内容 */
  async update(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_content', headers, {});
    if (auth instanceof HttpFail) return auth;

    const id = toInt(body?.id);
    const title = body?.title ? String(body.title) : '';
    const content = body?.content != null ? String(body.content) : '';
    if (id <= 0 || !title) return new HttpFail(400, '缺少必要参数');
    await db.query('UPDATE content SET title = ?, content = ?, updated_at = NOW() WHERE id = ?', [title, content, id]);
    return ok('更新成功');
  }

  /** 硬删前清理上传文件 */
  private async deleteUploadFile(contentId: number) {
    try {
      const [rows] = await db.query('SELECT image_url FROM content WHERE id = ?', [contentId]);
      const r = (rows as Array<{ image_url: string | null }>)[0];
      if (r && r.image_url && r.image_url.includes('/doo/server/uploads/')) {
        const localPath = path.join(UPLOADS_DIR, path.basename(r.image_url));
        if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      }
    } catch { /* 忽略 */ }
  }
}