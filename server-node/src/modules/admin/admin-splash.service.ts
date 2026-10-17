/**
 * admin-splash.service.ts —— 启动页配置 + 反馈表迁移
 *  - getConfig():       复刻 server/api/splash_config.php 的 GET（公开读取，前端启动时调用，无鉴权）
 *  - updateConfig():    复刻 server/api/splash_config.php 的 POST（管理后台更新，checkAdminAuth('manage_splash')）
 *  - migrateFeedback(): 复刻 server/api/migrate_feedback.php（检查 feedback 表结构并补列，checkAdminAuth('manage_feedback')）
 */
import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail } from '../auth/auth.service';
import { AdminAuthService } from './admin-auth.service';

/** splash_config 表可更新字段白名单（对应 PHP $fields 数组） */
const SPLASH_FIELDS = ['enabled', 'title', 'subtitle', 'logo_url', 'delay_ms', 'bg_color', 'image_url'];

@Injectable()
export class AdminSplashService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  /**
   * GET splash_config —— 获取配置（公开，无鉴权；对应 PHP GET 分支）
   * @param _headers 兼容 controller 调用传参（公开端点不消费），可省略
   */
  async getConfig(_headers?: Record<string, string | undefined>) {
    try {
      const [rows] = await db.query('SELECT * FROM splash_config WHERE id = 1');
      const config = (rows as Array<Record<string, unknown>>)[0];
      if (!config) {
        // 默认配置（对应 PHP 未查到时的兜底数组）
        return {
          code: 200,
          data: {
            enabled: 1,
            title: 'Simple Server',
            subtitle: '加载中...',
            logo_url: '',
            delay_ms: 300,
            bg_color: '#ffffff',
            image_url: '',
          },
        };
      }
      return { code: 200, data: config };
    } catch (e) {
      return new HttpFail(500, '操作失败: ' + (e as Error).message);
    }
  }

  /** POST splash_config —— 更新配置（manage_splash） */
  async updateConfig(
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_splash', headers, query);
    if (auth instanceof HttpFail) return auth;

    const input = body || {};
    const sets: string[] = [];
    const values: unknown[] = [];
    // 仅白名单字段可更新（对应 PHP foreach $fields + isset 检查）
    for (const f of SPLASH_FIELDS) {
      if (input[f] !== undefined && input[f] !== null) {
        sets.push(`${f} = ?`);
        values.push(input[f]);
      }
    }
    if (sets.length === 0) return new HttpFail(400, '无参数');
    try {
      await db.query(`UPDATE splash_config SET ${sets.join(', ')} WHERE id = 1`, values);
      return ok('保存成功');
    } catch (e) {
      return new HttpFail(500, '操作失败: ' + (e as Error).message);
    }
  }

  /** migrate_feedback —— 反馈表迁移修复（manage_feedback） */
  async migrateFeedback(
    headers: Record<string, string | undefined>,
    query: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth('manage_feedback', headers, query);
    if (auth instanceof HttpFail) return auth;

    try {
      // 检查 feedback 表是否存在
      const [tableRows] = await db.query("SHOW TABLES LIKE 'feedback'");
      if ((tableRows as unknown[]).length === 0) {
        // PHP 此处未设置 http_response_code（HTTP 200），返回 fail 而非 HttpFail
        return fail(400, 'feedback 表不存在，请先运行 create_feedback_table.sql');
      }

      // 获取现有列
      const [colRows] = await db.query('SHOW COLUMNS FROM feedback');
      const columns = (colRows as Array<{ Field: string }>).map((c) => c.Field);

      const results: string[] = [];

      // 添加 reply 列
      if (!columns.includes('reply')) {
        await db.query(
          "ALTER TABLE feedback ADD COLUMN `reply` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '管理员回复内容' AFTER `status`",
        );
        results.push('✓ 已添加 reply 列');
      } else {
        results.push('- reply 列已存在');
      }

      // 添加 updated_at 列
      if (!columns.includes('updated_at')) {
        await db.query(
          "ALTER TABLE feedback ADD COLUMN `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER `created_at`",
        );
        results.push('✓ 已添加 updated_at 列');
      } else {
        results.push('- updated_at 列已存在');
      }

      return ok('数据库检查完成', {
        table: 'feedback',
        columns,
        actions: results,
      });
    } catch (e) {
      return new HttpFail(500, '迁移失败: ' + (e as Error).message);
    }
  }
}
