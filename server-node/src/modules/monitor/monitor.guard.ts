import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { db } from '../../config/db';

interface MonitorUser {
  id: number;
  username: string;
  role: string;
}

/**
 * 监控模块鉴权：直接认 DOO 的登录态。
 * App 登录成功后把 users.auth_token 放在 Authorization: Bearer 里，
 * 这里只做一次索引查询，不需要任何额外的令牌体系。
 */
@Injectable()
export class MonitorGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: MonitorUser;
      deviceName?: string;
      ip?: string;
    }>();

    const raw = String(req.headers['authorization'] || '');
    const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('未登录');

    const [rows] = await db.query(
      'SELECT id, username, role, status FROM users WHERE auth_token = ? LIMIT 1',
      [token],
    );
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row) throw new UnauthorizedException('登录已失效，请重新登录');

    // status=1 封禁中，与 DOO 登录口径保持一致
    if (Number(row.status) === 1) throw new UnauthorizedException('账号已被封禁');

    req.user = {
      id: Number(row.id),
      username: String(row.username || ''),
      role: String(row.role || 'user'),
    };

    // 监控模块只给超级管理员：其余角色（含 admin/editor）一律 403
    // 前端页签隐藏只是体验层，这里才是真正的边界
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('该功能仅超级管理员可见');
    }

    const devName = String(req.headers['x-device-name'] || '');
    req.deviceName = devName ? decodeURIComponent(devName).slice(0, 64) : '';
    return true;
  }
}
