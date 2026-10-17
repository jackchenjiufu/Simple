import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok } from '../../common/response';
import { HttpFail, toInt, fmtDatetime } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** 角色权限名列表（复刻 admin_auth.php getUserPermissions） */
async function getUserPermissions(role: string): Promise<string[]> {
  const [rows] = await db.query(
    `SELECT p.name FROM role_permissions rp
     JOIN roles r ON rp.role_id = r.id
     JOIN permissions p ON rp.permission_id = p.id
     WHERE r.name = ?`,
    [role],
  );
  return (rows as Array<{ name: string }>).map((r) => r.name);
}

/** 格式化行内时间字段（created_at/updated_at） */
function fmtRow(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  for (const f of fields) {
    const v = row[f];
    if (v !== undefined && v !== null && String(v) !== '') row[f] = fmtDatetime(String(v));
  }
  return row;
}

/**
 * 权限管理（复刻 admin_permissions.php + admin_my_permissions.php）
 * - handle()         → /admin_permissions（GET/POST/PUT/DELETE，manage_permissions）
 * - myPermissions()  → /admin_my_permissions（GET，当前管理员角色与权限）
 */
@Injectable()
export class AdminPermissionsService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /** GET/POST/PUT/DELETE /admin_permissions —— 基于角色的权限管理（RBAC） */
  async handle(
    method: string,
    query: Record<string, string | undefined>,
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_permissions', headers, query);
    if (auth instanceof HttpFail) return auth;

    // 自动检查并创建权限相关表结构（roles/permissions/role_permissions/user_roles）
    try {
      await this.createPermissionTables();
    } catch (e) {
      return new HttpFail(500, '初始化权限表失败: ' + (e as Error).message);
    }

    // ── GET：获取角色或权限列表 ──
    if (method === 'GET') {
      const type = query?.type || 'roles';

      if (type === 'roles') {
        const [roleRows] = await db.query('SELECT * FROM roles ORDER BY id ASC');
        const roles = (roleRows as Array<Record<string, unknown>>).map((r) =>
          fmtRow(r, ['created_at', 'updated_at']),
        );
        // 获取每个角色的权限
        for (const role of roles) {
          const [permRows] = await db.query(
            'SELECT p.* FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?',
            [role.id],
          );
          role.permissions = (permRows as Array<Record<string, unknown>>).map((p) =>
            fmtRow(p, ['created_at', 'updated_at']),
          );
        }
        return ok('获取角色列表成功', roles);
      }

      if (type === 'permissions') {
        const [rows] = await db.query('SELECT * FROM permissions ORDER BY id ASC');
        const permissions = (rows as Array<Record<string, unknown>>).map((p) =>
          fmtRow(p, ['created_at', 'updated_at']),
        );
        return ok('获取权限列表成功', permissions);
      }

      if (type === 'user_roles') {
        const userIdRaw = query?.user_id;
        if (!userIdRaw) return new HttpFail(400, '缺少用户ID');
        const [rows] = await db.query(
          'SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
          [userIdRaw],
        );
        const roles = (rows as Array<Record<string, unknown>>).map((r) =>
          fmtRow(r, ['created_at', 'updated_at']),
        );
        return ok('获取用户角色成功', roles);
      }

      if (type === 'users') {
        // 获取全部用户及角色（权限管理-用户角色 Tab）
        const [rows] = await db.query(
          'SELECT u.id, u.username, u.nickname, u.role, u.created_at FROM users u ORDER BY u.id DESC LIMIT 200',
        );
        const users = (rows as Array<Record<string, unknown>>).map((u) => fmtRow(u, ['created_at']));
        for (const u of users) {
          const [roleRows] = await db.query(
            'SELECT r.* FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?',
            [u.id],
          );
          u.roles = (roleRows as Array<Record<string, unknown>>).map((r) =>
            fmtRow(r, ['created_at', 'updated_at']),
          );
        }
        return ok('获取用户列表成功', users);
      }

      // PHP 未命中任何 type 分支时不输出内容；Node 侧以空列表兜底
      return ok('获取成功', []);
    }

    // ── POST：创建角色或分配权限 ──
    if (method === 'POST') {
      if (body?.role_name !== undefined) {
        // 创建角色
        const roleName = String(body.role_name).trim();
        const description = body?.description !== undefined ? String(body.description) : '';
        let displayName = body?.display_name !== undefined ? String(body.display_name).trim() : '';
        if (roleName === '') return new HttpFail(400, '角色名不能为空');
        if (displayName === '') displayName = roleName;

        try {
          const [ins] = await db.query(
            'INSERT INTO roles (name, description, display_name) VALUES (?, ?, ?)',
            [roleName, description, displayName],
          );
          const roleId = toInt((ins as { insertId?: number }).insertId);

          // 分配权限
          if (Array.isArray(body?.permissions)) {
            for (const permissionId of body.permissions as unknown[]) {
              await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [
                roleId,
                permissionId,
              ]);
            }
          }
          return ok('创建角色成功', { role_id: roleId });
        } catch (e) {
          // roles.name 有唯一约束，重复名称给出友好提示（PDO SQLSTATE 23000 / mysql2 ER_DUP_ENTRY）
          const err = e as { sqlState?: string; errno?: number; code?: string; message?: string };
          if (err?.sqlState === '23000' || err?.errno === 1062 || err?.code === 'ER_DUP_ENTRY') {
            return new HttpFail(400, '角色名已存在，请更换名称');
          }
          return new HttpFail(500, '创建角色失败: ' + (err?.message || String(e)));
        }
      }

      if (body?.user_id !== undefined && body?.role_id !== undefined) {
        // 分配用户角色
        const userId = body.user_id;
        const roleId = body.role_id;

        try {
          // 先删除旧角色
          await db.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
          await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);

          // 同步 users.role 为精细角色名（super_admin/admin/editor/user）
          const [roleRows] = await db.query('SELECT name FROM roles WHERE id = ?', [roleId]);
          const roleRow = (roleRows as Array<{ name?: string | null }>)[0];
          const roleName = roleRow ? String(roleRow.name || '') : '';
          await db.query('UPDATE users SET role = ? WHERE id = ?', [roleName, userId]);

          return ok('分配角色成功');
        } catch (e) {
          return new HttpFail(400, '分配角色失败: ' + (e as Error).message);
        }
      }

      // PHP：role_name 与 user_id+role_id 均未提供时不输出内容
      return ok('');
    }

    // ── PUT：更新角色或权限 ──
    if (method === 'PUT') {
      if (body?.role_id !== undefined && body?.role_id !== null) {
        const roleId = body.role_id;
        const description = body?.description !== undefined ? String(body.description) : '';
        const displayName = body?.display_name !== undefined ? String(body.display_name).trim() : '';

        try {
          await db.query('UPDATE roles SET description = ?, display_name = ? WHERE id = ?', [
            description,
            displayName,
            roleId,
          ]);

          // 更新权限：先删除旧权限，再添加新权限
          if (Array.isArray(body?.permissions)) {
            await db.query('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
            for (const permissionId of body.permissions as unknown[]) {
              await db.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [
                roleId,
                permissionId,
              ]);
            }
          }
          return ok('更新角色成功');
        } catch {
          return new HttpFail(500, '更新角色失败');
        }
      }
      return ok('');
    }

    // ── DELETE：删除角色或移除用户角色 ──
    if (method === 'DELETE') {
      if (query?.role_id !== undefined) {
        // 删除角色
        try {
          await db.query('DELETE FROM roles WHERE id = ?', [query.role_id]);
          return ok('删除角色成功');
        } catch {
          return new HttpFail(500, '删除角色失败');
        }
      } else if (query?.user_id !== undefined && query?.role_id !== undefined) {
        // 移除用户角色（PHP 原文件中此分支不可达——role_id 已在上方拦截；保留复刻）
        try {
          await db.query('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [
            query.user_id,
            query.role_id,
          ]);
          return ok('移除角色成功');
        } catch {
          return new HttpFail(500, '移除角色失败');
        }
      }
      return ok('');
    }

    // 其他请求方法：返回405方法不允许
    return new HttpFail(405, '方法不允许');
  }

  /** GET /admin_my_permissions —— 当前登录管理员的角色与权限（前端菜单按权限过滤显示） */
  async myPermissions(
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined> = {},
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    const user = await this.adminAuth.getAuthUser(headers, query);

    let role: string;
    let permissions: string[];
    let uid: unknown;
    let username: string;
    let nickname: string;

    if (!user) {
      // 兼容旧客户端：token 认证但未带 admin_uid → 按 admin 角色返回（旧行为）
      role = 'admin';
      permissions = await getUserPermissions('admin');
      uid = query?.admin_uid !== undefined ? query.admin_uid : (headers['x-admin-uid'] ?? null);
      username = query?.admin_name !== undefined ? query.admin_name : '管理员';
      nickname = username;
    } else {
      role = user.role;
      // super_admin 全量放行：返回空权限列表，由前端按 is_super 放行
      permissions = role === 'super_admin' ? [] : await getUserPermissions(role);
      // 返回真实用户身份（uid/username/nickname），前端以本接口为准，不信任 URL 参数
      uid = user.id;
      username = user.username;
      const [rows] = await db.query('SELECT nickname FROM users WHERE id = ? LIMIT 1', [user.id]);
      const r = (rows as Array<{ nickname?: string | null }>)[0];
      nickname = r && r.nickname ? String(r.nickname) : username;
    }
    const isSuper = role === 'super_admin';

    return ok('获取成功', {
      role,
      permissions,
      is_super: isSuper,
      uid,
      username,
      nickname,
    });
  }

  /** 检查并创建权限相关表结构（复刻 admin_permissions.php createPermissionTables） */
  private async createPermissionTables() {
    // 创建 roles 表
    const [rolesTbl] = await db.query("SHOW TABLES LIKE 'roles'");
    if (!(rolesTbl as unknown[]).length) {
      await db.query(
        `CREATE TABLE roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
          description TEXT COMMENT '角色描述',
          display_name VARCHAR(50) DEFAULT '' COMMENT '显示名称',
          badge_color VARCHAR(20) DEFAULT '' COMMENT '徽章颜色',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表'`,
      );
      // 插入默认角色
      await db.query(
        `INSERT INTO roles (name, description) VALUES
          ('super_admin', '超级管理员，拥有所有权限'),
          ('admin', '管理员，拥有大部分权限'),
          ('editor', '编辑，拥有内容管理权限'),
          ('user', '普通用户，拥有基本权限')`,
      );
    }

    // 创建 permissions 表
    const [permsTbl] = await db.query("SHOW TABLES LIKE 'permissions'");
    if (!(permsTbl as unknown[]).length) {
      await db.query(
        `CREATE TABLE permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE COMMENT '权限名称',
          description TEXT COMMENT '权限描述',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表'`,
      );
      // 插入默认权限
      await db.query(
        `INSERT INTO permissions (name, description) VALUES
          ('manage_users', '管理用户'),
          ('manage_content', '管理内容'),
          ('manage_messages', '管理消息'),
          ('manage_follows', '管理关注关系'),
          ('manage_carousel', '管理轮播图'),
          ('manage_versions', '管理版本'),
          ('manage_announcements', '管理公告'),
          ('view_stats', '查看统计数据'),
          ('manage_logs', '管理系统日志'),
          ('manage_permissions', '管理权限'),
          ('manage_system', '管理系统设置'),
          ('manage_articles', '管理文章'),
          ('manage_feedback', '管理反馈'),
          ('manage_overtime', '管理加班'),
          ('manage_hotsearch', '管理热搜'),
          ('manage_splash', '管理启动页'),
          ('view_logs', '查看日志'),
          ('manage_comments', '管理评论'),
          ('manage_reports', '管理举报')`,
      );
    }

    // 创建 role_permissions 表
    const [rpTbl] = await db.query("SHOW TABLES LIKE 'role_permissions'");
    if (!(rpTbl as unknown[]).length) {
      await db.query(
        `CREATE TABLE role_permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          role_id INT NOT NULL COMMENT '角色ID',
          permission_id INT NOT NULL COMMENT '权限ID',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          UNIQUE KEY idx_role_permission (role_id, permission_id),
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表'`,
      );
      // 为超级管理员分配所有权限
      await db.query('INSERT INTO role_permissions (role_id, permission_id) SELECT 1, id FROM permissions');
      // 为管理员分配大部分权限
      await db.query(
        "INSERT INTO role_permissions (role_id, permission_id) SELECT 2, id FROM permissions WHERE name != 'manage_permissions'",
      );
      // 为编辑分配内容管理权限
      await db.query(
        "INSERT INTO role_permissions (role_id, permission_id) SELECT 3, id FROM permissions WHERE name IN ('manage_content', 'manage_carousel', 'manage_articles')",
      );
    }

    // 创建 user_roles 表
    const [urTbl] = await db.query("SHOW TABLES LIKE 'user_roles'");
    if (!(urTbl as unknown[]).length) {
      await db.query(
        `CREATE TABLE user_roles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL COMMENT '用户ID',
          role_id INT NOT NULL COMMENT '角色ID',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          UNIQUE KEY idx_user_role (user_id, role_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表'`,
      );
    }
  }
}
