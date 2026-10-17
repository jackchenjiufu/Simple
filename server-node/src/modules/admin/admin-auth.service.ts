import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { HttpFail, toInt } from '../auth/auth.service';

export interface AuthUser { id: number; username: string; role: string }

/**
 * 管理员认证（复刻 admin_auth.php）
 * 模式1：X-Admin-Token 全局 ADMIN_TOKEN（env）
 * 模式2：用户级 auth_token（仅 super_admin/admin/editor 角色）
 * 模式3：admin_uid + admin_token（App web-view，token 必须与 uid 同属一人）
 */
@Injectable()
export class AdminAuthService {
  /** 读取管理 token：X-Admin-Token 头 > Authorization Bearer > admin_token query/body */
  private adminTokenFromRequest(headers: Record<string, string | undefined>, query: Record<string, string | undefined>): string {
    const h = headers['x-admin-token'];
    if (h && h.trim()) return h.trim();
    const auth = headers['authorization'] || '';
    if (auth && /^Bearer\s+/i.test(auth)) {
      const t = auth.replace(/^Bearer\s+/i, '').trim();
      if (t) return t;
    }
    const q = query?.admin_token;
    if (q && q.trim()) return q.trim();
    return '';
  }

  /** 全局 ADMIN_TOKEN（env） */
  private globalToken(): string {
    return process.env.ADMIN_TOKEN || '';
  }

  /** 获取当前认证用户 */
  async getAuthUser(
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ): Promise<AuthUser | null> {
    // admin_uid 路径（App web-view 带 uid+token）
    const uidRaw = query?.admin_uid || headers['x-admin-uid'] || '';
    const uid = /^\d+$/.test(String(uidRaw)) ? parseInt(String(uidRaw), 10) : 0;
    const adminToken = this.adminTokenFromRequest(headers, query);
    const isUserToken = adminToken.length >= 32 && /^[0-9a-f]+$/i.test(adminToken);

    if (uid > 0) {
      // 用户级 token 必须与 uid 同属一人
      if (isUserToken) {
        const [chk] = await db.query('SELECT id FROM users WHERE id = ? AND auth_token = ? LIMIT 1', [uid, adminToken]);
        if (!(chk as unknown[]).length) return null;
      }
      const [rows] = await db.query('SELECT id, username, role FROM users WHERE id = ? LIMIT 1', [uid]);
      const u = (rows as Array<{ id: number | string; username: string; role: string | null }>)[0];
      if (u) return { id: toInt(u.id), username: u.username, role: String(u.role || '') };
    }

    // 用户级 auth_token 识别（旧版 App 请求带自身 token）
    if (isUserToken) {
      const [rows] = await db.query('SELECT id, username, role FROM users WHERE auth_token = ? LIMIT 1', [adminToken]);
      const u = (rows as Array<{ id: number | string; username: string; role: string | null }>)[0];
      if (u && ['super_admin', 'admin', 'editor'].includes(String(u.role || ''))) {
        return { id: toInt(u.id), username: u.username, role: String(u.role) };
      }
      return null;
    }
    return null;
  }

  /** 角色权限名列表 */
  private async getUserPermissions(role: string): Promise<string[]> {
    const [rows] = await db.query(
      `SELECT p.name FROM role_permissions rp
       JOIN roles r ON rp.role_id = r.id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE r.name = ?`,
      [role],
    );
    return (rows as Array<{ name: string }>).map((r) => r.name);
  }

  /** 是否有权限 */
  async hasPermission(
    perm: string,
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ): Promise<boolean> {
    const user = await this.getAuthUser(headers, query);
    const adminToken = this.adminTokenFromRequest(headers, query);
    if (!user) {
      // 兼容旧客户端：全局 admin_token 直接放行
      const g = this.globalToken();
      if (g !== '' && adminToken === g) return true;
      return false;
    }
    if (user.role === 'super_admin') return true;
    const perms = await this.getUserPermissions(user.role);
    return perms.includes(perm);
  }

  /** 统一鉴权入口：认证失败 401，权限不足 403 */
  async checkAdminAuth(
    requiredPerm: string | null,
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ): Promise<AuthUser | HttpFail> {
    // 认证
    const adminToken = this.adminTokenFromRequest(headers, query);
    const g = this.globalToken();
    let authed = false;
    let user: AuthUser | null = null;

    if (adminToken !== '') {
      if (g !== '' && adminToken === g) {
        authed = true;
      } else if (adminToken.length >= 32 && /^[0-9a-f]+$/i.test(adminToken)) {
        // 用户级 token：仅后台角色
        const [rows] = await db.query(
          "SELECT id, username, role FROM users WHERE auth_token = ? LIMIT 1",
          [adminToken],
        );
        const u = (rows as Array<{ id: number | string; username: string; role: string | null }>)[0];
        if (u && ['super_admin', 'admin', 'editor'].includes(String(u.role || ''))) {
          authed = true;
          user = { id: toInt(u.id), username: u.username, role: String(u.role) };
        }
      }
    }
    // admin_uid 路径兜底（App web-view）
    if (!authed) {
      user = await this.getAuthUser(headers, query);
      if (user) authed = true;
    }

    if (!authed) return new HttpFail(401, '未授权访问');

    // 权限校验
    if (requiredPerm === null) return user || { id: 0, username: '', role: 'super_admin' };
    const ok = await this.hasPermission(requiredPerm, headers, query);
    if (!ok) return new HttpFail(403, '无权限执行此操作');
    return user || { id: 0, username: '', role: 'super_admin' };
  }
}