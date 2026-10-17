import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { HttpFail, toInt, fmtDatetime } from '../auth/auth.service';

@Injectable()
export class OpsService {
  /** POST /announcements?action=get_announcements —— 公告列表 */
  async announcements(action: string) {
    if (action !== 'get_announcements') return new HttpFail(400, '无效的操作');
    const [rows] = await db.query('SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC');
    const data = (rows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      created_at: r.created_at != null ? fmtDatetime(String(r.created_at)) : null,
    }));
    return ok('获取成功', data);
  }

  /** GET /api_version —— 当前 API 版本（公开，App 启动调用；DB 异常降级 v1） */
  async apiVersion() {
    try {
      await db.query(
        'CREATE TABLE IF NOT EXISTS api_settings (skey VARCHAR(50) PRIMARY KEY, svalue VARCHAR(255)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4',
      );
      const [rows] = await db.query("SELECT svalue FROM api_settings WHERE skey = 'api_version'");
      const r = (rows as Array<{ svalue: string | null }>)[0];
      const version = r && r.svalue ? r.svalue : 'v1';
      return ok('成功', { version });
    } catch {
      return ok('成功', { version: 'v1' });
    }
  }

  /** GET /public_roles —— 公开角色列表（徽章显示） */
  async publicRoles() {
    let roles: unknown[] = [];
    try {
      const [rows] = await db.query(
        "SELECT id, name, display_name, badge_color FROM roles WHERE name != 'user' ORDER BY id ASC",
      );
      roles = rows as unknown[];
    } catch { /* 空列表 */ }
    return ok('获取成功', roles);
  }

  /** POST/GET /check_update —— 版本检查（复刻 check_update.php 全逻辑） */
  async checkUpdate(body: Record<string, unknown>, query: Record<string, string | undefined>, host: string) {
    let currentVersion = '1.0.0';
    const fromBody = body?.currentVersion != null ? String(body.currentVersion) : '';
    const fromQuery = query?.currentVersion ? String(query.currentVersion) : '';
    if (fromBody) currentVersion = fromBody;
    else if (fromQuery) currentVersion = fromQuery;

    // downloadBaseUrl：默认 http://host/doo/server/downloads/
    const serverName = host.split(':')[0] || 'localhost';
    const portMatch = /:(\d+)/.exec(host);
    const serverPort = portMatch ? parseInt(portMatch[1], 10) : 80;
    const portSuffix = serverPort !== 80 && serverPort !== 443 ? `:${serverPort}` : '';
    const downloadBaseUrl = `http://${serverName}${portSuffix}/doo/server/downloads/`;

    // downloads 目录：env DOWNLOADS_DIR 覆盖（生产指向 7070 站点），默认相对 dist 路径
    const downloadsDir = process.env.DOWNLOADS_DIR || path.join(__dirname, '../../../downloads');

    const [rows] = await db.query(
      "SELECT version, description, download_url, update_type, force_update FROM app_versions WHERE update_type='apk' ORDER BY id DESC LIMIT 1",
    );
    const latest = (rows as Array<Record<string, unknown>>)[0];

    const [logRows] = await db.query(
      "SELECT version, description, created_at FROM app_versions WHERE update_type='apk' ORDER BY created_at DESC",
    );
    const changelog = (logRows as Array<Record<string, unknown>>).map((r) => ({
      ...r,
      created_at: r.created_at != null ? fmtDatetime(String(r.created_at)) : null,
    }));

    let latestVersion = '1.0.0';
    let hasUpdate = false;
    let downloadUrl = '';
    let apkDownloadUrl = '';
    let description = '';
    let forceUpdate = 0;

    if (latest) {
      latestVersion = String(latest.version);
      hasUpdate = versionCompare(latestVersion, currentVersion) > 0;
      const updateType = String(latest.update_type || 'wgt');
      const vUnderscore = latestVersion.replace(/\./g, '_');

      const fileExists = (name: string) => {
        try { return fs.existsSync(path.join(downloadsDir, name)); } catch { return false; }
      };

      if (updateType === 'apk') {
        const apkName = `app_v${vUnderscore}.apk`;
        downloadUrl = fileExists(apkName) ? `${downloadBaseUrl}${apkName}` : '';
      } else {
        const wgtName = `app_wgt_v${vUnderscore}.wgt`;
        const wgtExists = fileExists(wgtName);
        const apkName = `app_v${vUnderscore}.apk`;
        const apkExists = fileExists(apkName);
        if (wgtExists) {
          downloadUrl = `${downloadBaseUrl}${wgtName}`;
          apkDownloadUrl = apkExists ? `${downloadBaseUrl}${apkName}` : '';
        } else {
          downloadUrl = apkExists ? `${downloadBaseUrl}${apkName}` : '';
        }
      }
      description = String(latest.description || '新版本已发布');
      forceUpdate = toInt(latest.force_update);
    }

    // 热更新（wgt）：只走静默通道，不参与版本号提示与更新日志（与 check_update.php 对齐）
    let hotUpdate: Record<string, unknown> | null = null;
    try {
      const [hotRows] = await db.query(
        "SELECT version, download_url, description FROM app_versions WHERE update_type='wgt' ORDER BY id DESC LIMIT 1",
      );
      const hotRow = (hotRows as Array<Record<string, unknown>>)[0];
      if (hotRow && hotRow.download_url) {
        const wgtFile = path.basename(String(hotRow.download_url));
        if (fs.existsSync(path.join(downloadsDir, wgtFile))) {
          hotUpdate = {
            version: String(hotRow.version || ''),
            downloadUrl: `${downloadBaseUrl}${wgtFile}`,
            description: String(hotRow.description || ''),
          };
        }
      }
    } catch (e) {
      console.warn(`[check_update] hotUpdate query failed: ${(e as Error).message}`);
    }

    return ok('检查成功', {
      currentVersion,
      latestVersion,
      hasUpdate,
      downloadUrl,
      apkDownloadUrl,
      description,
      forceUpdate,
      hotUpdate,
      changelog,
    });
  }
}

/** 复刻 PHP version_compare（数字点分版本比较） */
function versionCompare(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}