import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { AuthService, HttpFail, toInt } from '../auth/auth.service';
import { AdminAuthService } from '../admin/admin-auth.service';

@Injectable()
export class GapFillService {
  constructor(
    private readonly auth: AuthService,
    private readonly adminAuth: AdminAuthService,
  ) {}

  /** POST /add_collection —— 收藏图片（复刻 add_collection.php） */
  async addCollection(body: Record<string, unknown>) {
    const userId = toInt(body?.user_id);
    const imageId = toInt(body?.image_id);
    if (!userId || !imageId) return new HttpFail(400, '缺少必要的参数');

    const [imgRows] = await db.query('SELECT id FROM images WHERE id = ?', [imageId]);
    if (!(imgRows as unknown[]).length) return new HttpFail(400, '图片不存在');

    // 建表
    await db.query(
      `CREATE TABLE IF NOT EXISTS collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        image_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_image (user_id, image_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    try {
      const [ins] = await db.query('INSERT INTO collections (user_id, image_id) VALUES (?, ?)', [userId, imageId]);
      return ok('收藏成功', { id: toInt((ins as { insertId?: number }).insertId), user_id: userId, image_id: imageId });
    } catch (e) {
      const msg = String((e as { message?: string }).message || '');
      if (msg.includes('unique_user_image') || msg.includes('Duplicate')) {
        return new HttpFail(400, '已经收藏过该图片');
      }
      return new HttpFail(400, '添加收藏失败');
    }
  }

  /** GET /get_collections —— 收藏列表 */
  async getCollections(userId: number) {
    if (userId <= 0) return new HttpFail(400, '缺少 user_id');
    const [rows] = await db.query(
      'SELECT c.id, c.image_id, c.created_at, i.* FROM collections c LEFT JOIN images i ON c.image_id = i.id WHERE c.user_id = ? ORDER BY c.created_at DESC',
      [userId],
    );
    return ok('获取成功', rows);
  }

  /** GET /article_authors —— 作者候选（manage_articles） */
  async articleAuthors(query: Record<string, string | undefined>, headers: Record<string, string | undefined>) {
    const auth = await this.adminAuth.checkAdminAuth('manage_articles', headers, query);
    if (auth instanceof HttpFail) return auth;
    const search = String(query?.search || '').trim();
    let rows: unknown[] = [];
    try {
      if (search) {
        const [r] = await db.query(
          'SELECT id, username, nickname FROM users WHERE status != 1 AND (username LIKE ? OR nickname LIKE ?) ORDER BY username LIMIT 50',
          [`%${search}%`, `%${search}%`],
        );
        rows = r as unknown[];
      } else {
        const [r] = await db.query('SELECT id, username, nickname FROM users WHERE status != 1 ORDER BY username LIMIT 200');
        rows = r as unknown[];
      }
    } catch { rows = []; }
    return ok('获取成功', rows);
  }

  /** POST /reset_password —— 邮箱验证码重置密码 */
  async resetPassword(body: Record<string, unknown>) {
    const email = body?.email ? String(body.email).trim() : '';
    const code = body?.code ? String(body.code).trim() : '';
    const newPassword = body?.new_password ? String(body.new_password) : '';
    if (!email || !code || !newPassword) return new HttpFail(400, '参数不完整');
    if (newPassword.length < 6) return new HttpFail(400, '密码长度至少6位');

    // 验证验证码（复刻 verify_code）
    const [rows] = await db.query(
      'SELECT * FROM email_verifications WHERE email = ? AND code = ? AND type = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1',
      [email, code, 'password_reset'],
    );
    const record = (rows as Array<{ id: number | string; user_id: number | string }>)[0];
    if (!record) return new HttpFail(400, '验证码错误或已过期');

    await db.query('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [record.id]);
    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, record.user_id]);
    return ok('密码重置成功');
  }

  /** POST /forgot_password —— 发送邮箱验证码（Node 侧无 PHPMailer，复用 SMTP 需 nodemailer；当前返回邮件服务依赖说明） */
  async forgotPassword(body: Record<string, unknown>) {
    // forgot_password 依赖 SMTP 邮件发送。Node 侧未接邮件后端时，转发给 PHP 引擎处理最稳妥。
    // 若未来接入 nodemailer，可在此实现 create_verification + send。
    return new HttpFail(503, '邮件服务在 PHP 引擎（Node 侧邮件后端待接入，请使用 v1/v2 路径）');
  }
}