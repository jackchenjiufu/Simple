/**
 * admin-system.service.ts —— 系统管理三合一
 *  - database():     复刻 server/api/admin_database.php（数据库管理，checkAdminAuth() 仅需登录）
 *  - systemConfig(): 复刻 server/api/admin_system_config.php（系统设置，checkAdminAuth() 仅需登录）
 *  - monitor():      复刻 server/api/system_monitor.php（系统监控，checkAdminAuth() 仅需登录）
 *
 * 服务器资源（内存/磁盘/CPU）在 Node 侧用 os 模块近似：
 *  - memory_usage : os.totalmem() - os.freemem()（PHP 为进程内存，Node 无等价物，取系统已用内存近似）
 *  - disk_space   : exec `df -k /` 解析（对应 PHP disk_free_space/disk_total_space）
 *  - cpu_load     : os.loadavg()（仅 Linux，与 PHP PHP_OS==='Linux' 条件一致）
 */
import { Injectable } from '@nestjs/common';
import * as os from 'os';
import * as bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt, fmtDatetime } from '../auth/auth.service';
import { AdminAuthService, AuthUser } from './admin-auth.service';

const execP = promisify(exec);

/** 毫秒时间戳 → 本地 Y-m-d H:i:s（对应 PHP date('Y-m-d H:i:s', ts/1000)） */
function fmtTs(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 保留两位小数（对应 PHP round(x, 2)） */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 校验表名：仅字母数字下划线且存在于当前库（SHOW 语句不支持占位符，白名单后拼接安全） */
async function validTable(table: string): Promise<boolean> {
  if (!/^[a-z0-9_]+$/i.test(table)) return false;
  const [rows] = await db.query(`SHOW TABLES LIKE '${table}'`);
  return (rows as unknown[]).length > 0;
}

/** 记录操作日志（复刻 logDbAction；日志失败不影响主流程） */
async function logDbAction(auth: AuthUser | null, action: string, detail: string): Promise<void> {
  try {
    const uid = auth && auth.id ? auth.id : 0;
    const ip = '';
    await db.query(
      "INSERT INTO logs (user_id, type, action, message, ip_address, created_at) VALUES (?, 'database', ?, ?, ?, NOW())",
      [uid, action, Array.from(detail).slice(0, 200).join(''), ip],
    );
  } catch { /* 日志失败不影响主流程 */ }
}

/** 读 api_settings 键值 */
async function readSetting(key: string, def = ''): Promise<string> {
  try {
    const [rows] = await db.query('SELECT svalue FROM api_settings WHERE skey = ?', [key]);
    const r = (rows as Array<{ svalue: string | null }>)[0];
    return r ? String(r.svalue ?? def) : def;
  } catch { return def; }
}

/** 写 api_settings 键值 */
async function writeSetting(key: string, value: string): Promise<void> {
  await db.query('INSERT INTO api_settings (skey, svalue) VALUES (?, ?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)', [key, value]);
}

@Injectable()
export class AdminSystemService {
  constructor(private readonly adminAuth: AdminAuthService) {}

  // ======================================================================
  // admin_database.php —— 数据库管理
  // GET/POST action=overview | structure | data | query
  // ======================================================================
  async database(
    action: string,
    method: string,
    body: Record<string, unknown>,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    try {
      // action：入参优先，其次 GET query，再其次 POST body，默认 overview
      const act =
        String(action || '').trim() ||
        (query?.action !== undefined ? String(query.action).trim() : '') ||
        (body && (body as Record<string, unknown>).action !== undefined
          ? String((body as Record<string, unknown>).action).trim()
          : '') ||
        'overview';

      // 取值：POST body 优先，其次 query（对应 PHP $input[...] ?? $_GET[...]）
      const get = (k: string): unknown => {
        if (body && body[k] !== undefined && body[k] !== null) return body[k];
        return query[k];
      };

      if (act === 'structure') {
        const table = String(get('table') ?? '').trim();
        if (!(await validTable(table))) return new HttpFail(400, '无效的表名');
        const [cols] = await db.query(`SHOW FULL COLUMNS FROM \`${table}\``);
        const [indexes] = await db.query(`SHOW INDEX FROM \`${table}\``);
        const [create] = await db.query(`SHOW CREATE TABLE \`${table}\``);
        const createRow = (create as Array<Record<string, unknown>>)[0];
        const createSql = createRow ? Object.values(createRow)[1] ?? '' : '';
        return ok('成功', { columns: cols, indexes: indexes, create_sql: createSql });
      }

      if (act === 'data') {
        const table = String(get('table') ?? '').trim();
        const rawPage = get('page') !== undefined ? toInt(get('page')) : 1;
        const page = Math.max(1, rawPage);
        const rawLimit = get('limit') !== undefined ? toInt(get('limit')) : 50;
        const limit = Math.min(100, Math.max(1, rawLimit));
        if (!(await validTable(table))) return new HttpFail(400, '无效的表名');
        const offset = (page - 1) * limit;
        const [cols] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
        const colNames = (cols as Array<{ Field: string }>).map((c) => c.Field);
        const [cntRows] = await db.query(`SELECT COUNT(*) FROM \`${table}\``);
        const total = toInt(Object.values((cntRows as Array<Record<string, unknown>>)[0])[0]);
        const [rows] = await db.query(`SELECT * FROM \`${table}\` LIMIT ${limit} OFFSET ${offset}`);
        // 单行超长字段截断显示（对应 PHP mb_substr 120 + '…'）
        for (const row of rows as Array<Record<string, unknown>>) {
          for (const k of Object.keys(row)) {
            const v = row[k];
            if (typeof v === 'string' && Array.from(v).length > 120) {
              row[k] = Array.from(v).slice(0, 120).join('') + '…';
            }
          }
        }
        return ok('成功', { columns: colNames, rows: rows, total, page, limit });
      }

      if (act === 'query' && method === 'POST') {
        const sql = String(get('sql') ?? '').trim();
        if (sql === '') return new HttpFail(400, 'SQL 不能为空');
        if (Array.from(sql).length > 4000) return new HttpFail(400, 'SQL 过长（限 4000 字符）');
        if (/;\s*(SELECT|INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|TRUNCATE|RENAME|GRANT)/i.test(sql)) {
          return new HttpFail(400, '禁止多语句执行，一次仅允许一条 SQL');
        }
        const isRead = /^(SELECT|SHOW|DESC|DESCRIBE|EXPLAIN|PRAGMA)\b/i.test(sql);
        if (!isRead && String(get('confirm') ?? '') !== '1') {
          return new HttpFail(400, '写操作需二次确认（confirm=1）');
        }
        try {
          if (isRead) {
            const [rows] = await db.query(sql);
            const arr = rows as Array<Record<string, unknown>>;
            const cols = arr.length ? Object.keys(arr[0]) : [];
            return ok('查询成功', { columns: cols, rows: arr, affected: null });
          }
          const [res] = await db.query(sql);
          const affected = toInt((res as { affectedRows?: number }).affectedRows);
          await logDbAction(auth, 'SQL执行', sql);
          return ok(`执行成功，影响 ${affected} 行`, { affected });
        } catch (e) {
          return new HttpFail(400, 'SQL 执行失败: ' + (e as Error).message);
        }
      }

      // overview（默认）
      const [vRows] = await db.query('SELECT VERSION()');
      const version = Object.values((vRows as Array<Record<string, unknown>>)[0])[0] ?? '';
      const [dbRows] = await db.query('SELECT DATABASE()');
      const database = Object.values((dbRows as Array<Record<string, unknown>>)[0])[0] ?? '';
      const [tRows] = await db.query('SHOW TABLE STATUS');
      const tables: Array<Record<string, unknown>> = [];
      let totalData = 0;
      let totalIndex = 0;
      for (const t of tRows as Array<Record<string, unknown>>) {
        const name = String(t.Name);
        // 精确行数（SHOW TABLE STATUS 的 Rows 是 InnoDB 估算值，大表不准确）
        let rowCnt: number;
        try {
          const [cRows] = await db.query(`SELECT COUNT(*) FROM \`${name}\``);
          rowCnt = toInt(Object.values((cRows as Array<Record<string, unknown>>)[0])[0]);
        } catch {
          rowCnt = toInt(t.Rows);
        }
        tables.push({
          name,
          engine: t.Engine ?? null,
          rows: rowCnt,
          data_size: toInt(t.Data_length),
          index_size: toInt(t.Index_length),
          collation: t.Collation ?? '',
          comment: t.Comment ?? '',
        });
        totalData += toInt(t.Data_length);
        totalIndex += toInt(t.Index_length);
      }
      return ok('成功', {
        version,
        database,
        tables,
        table_count: tables.length,
        total_data: totalData,
        total_index: totalIndex,
      });
    } catch (e) {
      return new HttpFail(500, '操作失败: ' + (e as Error).message);
    }
  }

  // ======================================================================
  // admin_system_config.php —— 系统设置
  // GET/POST action=site | config | password | flush
  // ======================================================================
  async systemConfig(
    action: string,
    method: string,
    body: Record<string, unknown>,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    try {
      const act =
        String(action || '').trim() ||
        (query?.action !== undefined ? String(query.action).trim() : '') ||
        (body && (body as Record<string, unknown>).action !== undefined
          ? String((body as Record<string, unknown>).action).trim()
          : '') ||
        'site';

      const get = (k: string): unknown => {
        if (body && body[k] !== undefined && body[k] !== null) return body[k];
        return query[k];
      };

      // 保证 api_settings 表存在（对应 PHP $db->exec("CREATE TABLE IF NOT EXISTS ...")）
      await db.query(
        'CREATE TABLE IF NOT EXISTS api_settings (skey VARCHAR(50) PRIMARY KEY, svalue VARCHAR(255)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
      );

      if (act === 'config') {
        // 系统配置展示（非敏感；对应 Config::get 各默认值）
        return ok('成功', {
          api_version: '1.0.0',
          download_base_url: process.env.DOWNLOAD_BASE_URL || '',
          cors_origins: (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim()),
          upload_max_size: toInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024,
          upload_types: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          smtp_enabled: (process.env.SMTP_ENABLED || 'true') !== 'false',
          smtp_from: process.env.SMTP_FROM || 'chensauce@qq.com',
          redis: {
            enabled: (process.env.REDIS_ENABLED || 'true') !== 'false',
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: toInt(process.env.REDIS_PORT) || 6379,
          },
          ai_model: process.env.AI_MODEL || 'deepseek-chat',
          server_software: headers?.server || '',
          php_version: process.version,
        });
      }

      if (act === 'password' && method === 'POST') {
        // 修改当前管理员密码（校验旧密码）
        const oldPwd = String(get('old_password') ?? '');
        const newPwd = String(get('new_password') ?? '');
        const adminId = auth && auth.id ? auth.id : 0;
        if (adminId <= 0) return new HttpFail(401, '未登录');
        if (newPwd.length < 6) return new HttpFail(400, '新密码至少 6 位');
        const [rows] = await db.query('SELECT password FROM users WHERE id = ?', [adminId]);
        const row = (rows as Array<{ password: string }>)[0];
        if (!row || !bcrypt.compareSync(oldPwd, String(row.password || ''))) {
          return new HttpFail(400, '旧密码错误');
        }
        await db.query('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(newPwd, 10), adminId]);
        return ok('密码已修改');
      }

      if (act === 'flush' && method === 'POST') {
        // 对应 PHP Cache::flushAll()；Node 侧无 Redis 依赖（内存缓存靠 TTL 自动过期），幂等返回 0
        const n = 0;
        return ok(`已清空 ${n} 个缓存 key`, { flushed: n });
      }

      // site（GET 读取或 POST 保存）
      if (method === 'POST') {
        const name = String(get('site_name') ?? '').trim();
        const desc = String(get('site_desc') ?? '').trim();
        const logo = String(get('logo_url') ?? '').trim();
        if (name === '') return new HttpFail(400, '站点名称不能为空');
        await writeSetting('site_name', name);
        await writeSetting('site_desc', desc);
        await writeSetting('logo_url', logo);
        return ok('站点信息已保存');
      }
      return ok('成功', {
        site_name: await readSetting('site_name', 'DOO'),
        site_desc: await readSetting('site_desc', ''),
        logo_url: await readSetting('logo_url', ''),
      });
    } catch (e) {
      return new HttpFail(500, '操作失败: ' + (e as Error).message);
    }
  }

  // ======================================================================
  // system_monitor.php —— 系统监控（仅 GET）
  // GET ?type=overview | server | database | api
  // ======================================================================
  async monitor(
    method: string,
    query: Record<string, string | undefined>,
    headers: Record<string, string | undefined>,
  ) {
    const auth = await this.adminAuth.checkAdminAuth(null, headers, query);
    if (auth instanceof HttpFail) return auth;

    if (method !== 'GET') return new HttpFail(405, '方法不允许');
    const type = query?.type || 'overview';

    if (type === 'overview') {
      const serverStatus = await this.getServerStatus(headers);
      const databaseStatus = await this.getDatabaseStatus();
      const apiResponseTimes = await this.getApiResponseTime();
      return ok('获取系统监控信息成功', {
        server_status: serverStatus,
        database_status: databaseStatus,
        api_response_times: apiResponseTimes,
      });
    }
    if (type === 'server') {
      return ok('获取服务器状态成功', await this.getServerStatus(headers));
    }
    if (type === 'database') {
      return ok('获取数据库状态成功', await this.getDatabaseStatus());
    }
    if (type === 'api') {
      return ok('获取API响应时间成功', await this.getApiResponseTime());
    }
    // PHP 对未知 type 不输出任何内容；Node 侧无法返回空响应，改为 400
    return fail(400, '未知类型');
  }

  /** 服务器状态（getServerStatus） */
  private async getServerStatus(headers: Record<string, string | undefined>): Promise<Record<string, unknown>> {
    const status: Record<string, unknown> = {
      php_version: process.version,
      server_software: headers?.server || 'Unknown',
      server_time: fmtDatetime(new Date().toISOString()),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    };

    // 内存使用情况：PHP memory_get_usage 为进程内存，Node 无等价物，用 os.totalmem/freemem 近似系统已用内存
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    status.memory_usage = {
      current: round2((totalMem - freeMem) / 1024 / 1024) + ' MB',
      peak: round2((totalMem - freeMem) / 1024 / 1024) + ' MB',
    };

    // 磁盘空间使用情况（exec df）
    try {
      const disk = await this.getDiskSpace();
      status.disk_space = disk !== null ? disk : '无法读取磁盘信息（受限）';
    } catch {
      status.disk_space = '无法获取磁盘空间信息';
    }

    // CPU 负载（仅 Linux，对应 PHP PHP_OS === 'Linux' 且 sys_getloadavg 存在）
    if (process.platform === 'linux' && typeof os.loadavg === 'function') {
      const la = os.loadavg();
      status.cpu_load = {
        '1min': round2(la[0]),
        '5min': round2(la[1]),
        '15min': round2(la[2]),
      };
    }

    return status;
  }

  /** 磁盘空间：exec `df -k /` 解析（对应 disk_free_space/disk_total_space） */
  private async getDiskSpace(): Promise<Record<string, unknown> | null> {
    try {
      const { stdout } = await execP('df -k /');
      const lines = stdout.trim().split('\n').filter((l) => l.trim() !== '');
      if (lines.length < 2) return null;
      const cols = lines[lines.length - 1].trim().split(/\s+/);
      const totalKB = parseFloat(cols[1]);
      const usedKB = parseFloat(cols[2]);
      const freeKB = parseFloat(cols[3]);
      if (isNaN(totalKB) || totalKB <= 0) return null;
      const total = totalKB * 1024;
      const used = usedKB * 1024;
      const free = freeKB * 1024;
      return {
        total: round2(total / 1024 / 1024 / 1024) + ' GB',
        used: round2(used / 1024 / 1024 / 1024) + ' GB',
        free: round2(free / 1024 / 1024 / 1024) + ' GB',
        usage_percent: round2((used / total) * 100) + '%',
      };
    } catch {
      return null;
    }
  }

  /** 数据库状态（getDatabaseStatus） */
  private async getDatabaseStatus(): Promise<Record<string, unknown>> {
    const status: Record<string, unknown> = {};
    try {
      status.connection_status = 'Connected';

      const [vRows] = await db.query('SELECT VERSION() as version');
      status.database_version = (vRows as Array<{ version: string }>)[0]?.version ?? 'Unknown';

      const [cRows] = await db.query("SHOW GLOBAL STATUS LIKE 'Threads_connected'");
      status.connections = (cRows as Array<{ Value: string }>)[0]?.Value ?? 'Unknown';

      const [qRows] = await db.query("SHOW GLOBAL STATUS LIKE 'Queries'");
      status.queries = (qRows as Array<{ Value: string }>)[0]?.Value ?? 'Unknown';

      const [tRows] = await db.query('SHOW TABLE STATUS');
      const details = (tRows as Array<Record<string, unknown>>).map((t) => ({
        name: t.Name,
        rows: t.Rows,
        data_size: round2(Number(t.Data_length) / 1024 / 1024) + ' MB',
        index_size: round2(Number(t.Index_length) / 1024 / 1024) + ' MB',
      }));
      status.tables = { count: details.length, details };
    } catch (e) {
      status.connection_status = 'Error';
      status.error_message = (e as Error).message;
    }
    return status;
  }

  /** API 响应时间监控（getApiResponseTime）：模拟 4 个 API 的查询耗时 */
  private async getApiResponseTime(): Promise<Array<Record<string, unknown>>> {
    const apis = ['/api/users.php', '/api/content.php', '/api/admin_stats.php', '/api/admin_logs.php'];
    const queries: Record<string, string> = {
      '/api/users.php': 'SELECT COUNT(*) as count FROM users LIMIT 1',
      '/api/content.php': 'SELECT COUNT(*) as count FROM content LIMIT 1',
      '/api/admin_stats.php': 'SELECT COUNT(*) as count FROM users',
      '/api/admin_logs.php': 'SELECT COUNT(*) as count FROM logs',
    };
    const responseTimes: Array<Record<string, unknown>> = [];
    for (const api of apis) {
      const start = Date.now();
      try {
        await db.query(queries[api]);
        responseTimes.push({
          api,
          response_time_ms: round2(Date.now() - start),
          status: 'OK',
        });
      } catch (e) {
        responseTimes.push({
          api,
          response_time_ms: round2(Date.now() - start),
          status: 'Error',
          error_message: (e as Error).message,
        });
      }
    }
    return responseTimes;
  }
}
