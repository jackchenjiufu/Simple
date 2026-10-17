import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt, fmtDatetime } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminCarouselsService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET /admin_carousels —— 轮播列表 */
  async list(headers: Record<string, string | undefined>, query: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_carousel', headers, query);
    if (auth instanceof HttpFail) return auth;
    const [rows] = await db.query(
      'SELECT id, title, author, image_url, sort_order, is_active, link_type, link_id, link_url, created_at FROM carousels ORDER BY sort_order ASC, id ASC',
    );
    const data = (rows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      created_at: r.created_at != null ? fmtDatetime(String(r.created_at)) : null,
    }));
    return ok('获取成功', data);
  }

  /** POST /admin_carousels —— 新增 */
  async create(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_carousel', headers, {});
    if (auth instanceof HttpFail) return auth;
    const title = body?.title ? String(body.title) : '';
    const imageUrl = body?.image_url ? String(body.image_url) : '';
    if (!title || !imageUrl) return new HttpFail(400, '数据不完整');
    await db.query(
      'INSERT INTO carousels SET title = ?, author = ?, image_url = ?, sort_order = ?, is_active = ?, link_type = ?, link_id = ?, link_url = ?',
      [
        title,
        body?.author != null ? String(body.author) : '',
        imageUrl,
        body?.sort_order != null ? toInt(body.sort_order) : 0,
        body?.is_active != null ? toInt(body.is_active) : 1,
        body?.link_type != null ? String(body.link_type) : 'none',
        body?.link_id != null ? toInt(body.link_id) : 0,
        body?.link_url != null ? String(body.link_url) : '',
      ],
    );
    return { message: '创建成功', code: 201 };
  }

  /** PUT /admin_carousels —— 更新 */
  async update(body: Record<string, unknown>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_carousel', headers, {});
    if (auth instanceof HttpFail) return auth;
    const id = toInt(body?.id);
    if (id <= 0) return new HttpFail(400, '缺少ID');
    await db.query(
      'UPDATE carousels SET title = ?, author = ?, image_url = ?, sort_order = ?, is_active = ?, link_type = ?, link_id = ?, link_url = ? WHERE id = ?',
      [
        body?.title != null ? String(body.title) : '',
        body?.author != null ? String(body.author) : '',
        body?.image_url != null ? String(body.image_url) : '',
        body?.sort_order != null ? toInt(body.sort_order) : 0,
        body?.is_active != null ? toInt(body.is_active) : 1,
        body?.link_type != null ? String(body.link_type) : 'none',
        body?.link_id != null ? toInt(body.link_id) : 0,
        body?.link_url != null ? String(body.link_url) : '',
        id,
      ],
    );
    return ok('更新成功');
  }

  /** DELETE /admin_carousels?id= —— 删除 */
  async remove(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_carousel', headers, query);
    if (auth instanceof HttpFail) return auth;
    const id = toInt(query?.id);
    if (id <= 0) return new HttpFail(400, 'ID不能为空');
    await db.query('DELETE FROM carousels WHERE id = ?', [id]);
    return ok('删除成功');
  }
}