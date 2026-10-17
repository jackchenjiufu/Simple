import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { execFile } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { db } from '../../config/db';
import { httpCheck, tcpCheck } from './probe';

/**
 * 主机详情（网口 / 端口 / 日志）的取数方式：
 *  - local：Nest 就跑在这台机器上，直接 execFile
 *  - ssh  ：走 .32 反连到 139 的 3333 隧道（139:3333 -> 127.0.0.1:22 of .32）
 *  - none ：只反连了 HTTP 端口（盒子），拿不到 shell，只能探活
 */
const HOST_REMOTE: Record<string, { kind: 'local' | 'ssh'; port?: number; key?: string }> = {
  上海服务器: { kind: 'local' },
  本地服务器: { kind: 'ssh', port: 3333, key: '/root/.ssh/box_backup_ed25519' },
  // 盒子 H68k 把 22 反连到 139 的 0.0.0.0:2222（box-ssh-tunnel.service），
  // 所以从后端看就是本机 2222，同一把 box_backup 密钥
  盒子H68k: { kind: 'ssh', port: 2222, key: '/root/.ssh/box_backup_ed25519' },
};

/** 盒子 ssh 不通时的兜底：它把面板/取帧/导出器反连到 139，这些入口可以真探活 */
const BOX_TUNNELS: Array<{ port: number; name: string; note: string }> = [
  { port: 18095, name: 'BOX 管理面板', note: '网口 / IP / 电源控制' },
  { port: 18099, name: '摄像头监控', note: '取帧预览' },
  { port: 19101, name: 'node_exporter', note: 'Prometheus 指标源' },
];

/** 日志里的密钥类字段脱敏，避免把 token 甩到手机屏幕上 */
function redact(line: string): string {
  return line
    .replace(/((?<![a-z])token|password|passwd|secret|api[_-]?key|authorization)(\s*[:=]\s*)([^\s,;"']+)/gi, '$1$2***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1***');
}

/** 虚拟网卡不展示：屏掉 lo / docker / veth / 网桥 */
const SKIP_DEV = /^(lo|docker|veth|br-|virbr|tap|tun|vnet)/i;


/** 告警图片落盘目录（nginx 直接对外，路径与 DOO 的 uploads 同源） */
const UPLOAD_DIR =
  process.env.HUB_UPLOAD_DIR || '/www/wwwroot/139.196.185.197_7070/doo/server/uploads/hub';
/** 对外可访问的图片路径前缀 */
const UPLOAD_WEB = process.env.HUB_UPLOAD_WEB || '/doo/server/uploads/hub';
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const KINDS = new Set(['human', 'pending', 'other', 'unknown']);

/** 通道名归一：'NVR-鹅厂前' / '道路（192.168.2.190）' / '192.168.2.190' -> 短名 */
export function normalizeChannel(raw: unknown, camera: unknown): string {
  const pick = String(raw || camera || 'unknown').trim();
  const byIp: Record<string, string> = {
    '192.168.2.190': '道路',
    '192.168.2.7': '鹅厂前',
    '192.168.2.3': '鹅厂后',
  };
  if (byIp[pick]) return byIp[pick];
  const s = pick.replace(/^NVR-/, '').replace(/[（(].*?[）)]/g, '');
  return s.trim() || 'unknown';
}

/** base64 图片落盘，返回对外路径；失败返回 null（不影响告警入库） */
function saveImage(b64: string): string | null {
  try {
    const m = /^data:image\/[a-z]+;base64,/i.exec(b64);
    const raw = m ? b64.slice(m[0].length) : b64;
    const buf = Buffer.from(raw, 'base64');
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;
    const d = new Date();
    const ym = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    const dir = join(UPLOAD_DIR, ym);
    mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
    writeFileSync(join(dir, name), buf);
    return `${UPLOAD_WEB}/${ym}/${name}`;
  } catch {
    return null;
  }
}

export interface PushSettings {
  enabled: boolean;
  human: boolean;
  pending: boolean;
  quiet_start: string;
  quiet_end: string;
}

const PUSH_DEFAULTS: PushSettings = {
  enabled: true,
  human: true,
  pending: true,
  quiet_start: '',
  quiet_end: '',
};

@Injectable()
export class MonitorService {
  private readonly logger = new Logger('monitor');
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // 每 60 秒探活一次；启动 8 秒后先跑一轮，避免开机空窗
    setTimeout(() => void this.tick(), 8000);
    this.timer = setInterval(() => void this.tick(), 60_000);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  private async tick(): Promise<void> {
    try {
      const r = await this.probeAll();
      if (r.total) this.logger.log(`probe ${r.online}/${r.total} online`);
    } catch (e) {
      this.logger.error(`probe failed: ${(e as Error)?.message || e}`);
    }
  }

  // ---------------- 服务探活 ----------------

  async serviceList(): Promise<Array<Record<string, unknown>>> {
    const [rows] = await db.query(
      `SELECT s.id, s.skey, s.name, s.grp, s.kind, s.target, s.check_url, s.enabled, s.sort,
              h.ok, h.latency_ms, h.ts AS checked_at
       FROM hub_services s
       LEFT JOIN hub_health_samples h
         ON h.id = (SELECT id FROM hub_health_samples WHERE service_id = s.id ORDER BY id DESC LIMIT 1)
       WHERE s.enabled = 1
       ORDER BY s.grp ASC, s.sort ASC, s.id ASC`,
    );
    return rows as Array<Record<string, unknown>>;
  }

  private async probeOne(s: Record<string, unknown>): Promise<{ ok: number; ms: number; status: number }> {
    const t0 = Date.now();
    let ok = 0;
    let status = 0;
    try {
      if (String(s.kind) === 'tcp') {
        const [host, port] = String(s.target || '').split(':');
        ok = (await tcpCheck(host, Number(port))) ? 1 : 0;
      } else {
        const r = await httpCheck(String(s.check_url || ''));
        ok = r.ok;
        status = r.status;
      }
    } catch {
      ok = 0;
    }
    const ms = Date.now() - t0;
    await db.query(
      'INSERT INTO hub_health_samples (service_id, ts, ok, latency_ms, http_status) VALUES (?, NOW(), ?, ?, ?)',
      [s.id, ok, ms, status],
    );
    return { ok, ms, status };
  }

  async probeAll(): Promise<{ total: number; online: number }> {
    if (this.running) return { total: 0, online: 0 };
    this.running = true;
    try {
      const [rows] = await db.query('SELECT * FROM hub_services WHERE enabled = 1');
      const list = rows as Array<Record<string, unknown>>;
      let online = 0;
      for (const s of list) {
        const r = await this.probeOne(s);
        if (r.ok) online += 1;
      }
      await db.query('DELETE FROM hub_health_samples WHERE ts < DATE_SUB(NOW(), INTERVAL 7 DAY)');
      return { total: list.length, online };
    } finally {
      this.running = false;
    }
  }

  async history(serviceId: number, hours = 24): Promise<Array<Record<string, unknown>>> {
    const [rows] = await db.query(
      `SELECT ts, ok, latency_ms FROM hub_health_samples
       WHERE service_id = ? AND ts > DATE_SUB(NOW(), INTERVAL ? HOUR) ORDER BY ts ASC`,
      [serviceId, hours],
    );
    return rows as Array<Record<string, unknown>>;
  }

  /** 总览：服务健康 + 今日告警口径（与告警页同源） */
  async overview(): Promise<Record<string, unknown>> {
    const list = await this.serviceList();
    const online = list.filter((s) => Number(s.ok) === 1).length;
    const groups = list.reduce<Array<{ grp: string; total: number; online: number }>>((acc, s) => {
      const grp = String(s.grp || 'other');
      let g = acc.find((x) => x.grp === grp);
      if (!g) {
        g = { grp, total: 0, online: 0 };
        acc.push(g);
      }
      g.total += 1;
      if (Number(s.ok) === 1) g.online += 1;
      return acc;
    }, []);

    const [rows] = await db.query(
      `SELECT COUNT(*) AS total,
              CAST(COALESCE(SUM(kind='human'),0) AS SIGNED) AS human,
              CAST(COALESCE(SUM(kind='pending'),0) AS SIGNED) AS pending,
              CAST(COALESCE(SUM(pushed=1),0) AS SIGNED) AS pushed
       FROM hub_alert_events WHERE DATE(ts) = CURDATE()`,
    );
    const t = ((rows as Array<Record<string, unknown>>)[0] || {}) as Record<string, unknown>;
    const total = Number(t.total) || 0;
    const human = Number(t.human) || 0;
    const pending = Number(t.pending) || 0;

    return {
      services: { total: list.length, online, groups, list },
      alerts: {
        today_total: total,
        today_human: human,
        today_pending: pending,
        today_pushed: Number(t.pushed) || 0,
        today_filtered: Math.max(total - human - pending, 0),
      },
      ts: new Date().toISOString(),
    };
  }

  // ---------------- 告警 ----------------

  async alertList(limit = 50, since?: string): Promise<Array<Record<string, unknown>>> {
    const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const [rows] = since
      ? await db.query('SELECT * FROM hub_alert_events WHERE ts > ? ORDER BY ts DESC LIMIT ?', [since, n])
      : await db.query('SELECT * FROM hub_alert_events ORDER BY ts DESC LIMIT ?', [n]);
    return rows as Array<Record<string, unknown>>;
  }

  async alertDetail(id: number): Promise<Record<string, unknown>> {
    const [rows] = await db.query('SELECT * FROM hub_alert_events WHERE id = ? LIMIT 1', [id]);
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row) throw new NotFoundException('告警不存在');
    return row;
  }

  async ingest(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const ts = body.ts ? new Date(String(body.ts)) : new Date();
    const imagePath =
      body.image_path ||
      (typeof body.image_b64 === 'string' && body.image_b64 ? saveImage(body.image_b64) : null);
    const kindRaw = String(body.kind || 'unknown').toLowerCase();
    const kind = KINDS.has(kindRaw) ? kindRaw : 'unknown';
    const channel = normalizeChannel(body.channel, body.camera);
    const verdict = kind === 'pending' ? 'pending' : '';
    const [r] = await db.query(
      `INSERT INTO hub_alert_events (ts, channel, camera, kind, verdict, score, image_path, pushed, meta)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        ts,
        channel,
        String(body.camera || '').slice(0, 48),
        kind,
        verdict,
        body.score != null ? Number(body.score) : null,
        imagePath,
        body.pushed ? 1 : 0,
        body.meta ? JSON.stringify(body.meta) : null,
      ],
    );
    const ins = r as { insertId: number };
    return { id: ins.insertId, image_path: imagePath, channel, kind, verdict };
  }

  /** 人工裁决：human=确认是真人；reject=确认不是；reset=退回待裁决 */
  async setVerdict(id: number, action: string): Promise<Record<string, unknown>> {
    const row = await this.alertDetail(id);
    let kind = String(row.kind || 'unknown');
    let verdict = '';
    if (action === 'human') {
      kind = 'human';
      verdict = 'confirmed';
    } else if (action === 'reject') {
      kind = 'other';
      verdict = 'rejected';
    } else if (action === 'reset') {
      kind = 'pending';
      verdict = 'pending';
    } else {
      throw new BadRequestException('不支持的裁决动作');
    }
    await db.query('UPDATE hub_alert_events SET kind = ?, verdict = ? WHERE id = ?', [kind, verdict, id]);
    return { id, kind, verdict };
  }

  /** 通道清单：含「有配置但今天没数据」的通道，供 App 做筛选 chips */
  async channels(): Promise<Array<Record<string, unknown>>> {
    const [rows] = await db.query(
      `SELECT c.name AS name,
              CAST(COALESCE(t.cnt,0) AS SIGNED) AS today,
              CAST(COALESCE(a.cnt,0) AS SIGNED) AS total
       FROM hub_alert_channels c
       LEFT JOIN (SELECT channel, COUNT(*) AS cnt FROM hub_alert_events
                  WHERE DATE(ts) = CURDATE() GROUP BY channel) t ON t.channel = c.name
       LEFT JOIN (SELECT channel, COUNT(*) AS cnt FROM hub_alert_events
                  GROUP BY channel) a ON a.channel = c.name
       WHERE c.enabled = 1
       ORDER BY c.sort ASC`,
    );
    return (rows as Array<Record<string, unknown>>).map((r) => ({
      name: r.name,
      today: Number(r.today) || 0,
      total: Number(r.total) || 0,
    }));
  }

  async stats(days = 7): Promise<Record<string, unknown>> {
    const [dailyRows] = await db.query(
      `SELECT DATE(ts) AS d, COUNT(*) AS total,
              CAST(COALESCE(SUM(kind='human'),0) AS SIGNED) AS human,
              CAST(COALESCE(SUM(pushed=1),0) AS SIGNED) AS pushed
       FROM hub_alert_events
       WHERE ts > DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(ts) ORDER BY d ASC`,
      [days],
    );
    const [todayRows] = await db.query(
      `SELECT COUNT(*) AS total,
              CAST(COALESCE(SUM(kind='human'),0) AS SIGNED) AS human,
              CAST(COALESCE(SUM(kind='pending'),0) AS SIGNED) AS pending,
              CAST(COALESCE(SUM(pushed=1),0) AS SIGNED) AS pushed
       FROM hub_alert_events WHERE DATE(ts) = CURDATE()`,
    );
    const t = ((todayRows as Array<Record<string, unknown>>)[0] || {}) as Record<string, unknown>;
    const total = Number(t.total) || 0;
    const human = Number(t.human) || 0;
    const pending = Number(t.pending) || 0;
    return {
      today: {
        total,
        human,
        pending,
        pushed: Number(t.pushed) || 0,
        /** 已过滤 = 命中 - 真人 - 待裁决（与列表分组同一口径） */
        filtered: Math.max(total - human - pending, 0),
      },
      daily: dailyRows as Array<Record<string, unknown>>,
    };
  }

  // ---------------- Grafana 仪表板 ----------------

  /**
   * Grafana 存活在 .32（192.168.1.32:3000），139 用 nginx 反代到 127.0.0.1:3002。
   * 账号密码只放后端 .env，App 一律走 /api/v3/monitor/dashboard，不接触 Grafana 凭证。
   */
  private gCache: Record<string, unknown> | null = null;
  private gCacheAt = 0;

  private gUrl(path: string, params: Record<string, string>): string {
    const base = (process.env.GRAFANA_URL || 'http://127.0.0.1:3002').replace(/\/+$/, '');
    const ds = process.env.GRAFANA_DS_UID || 'PBFA97CFB590B2093';
    const qs = new URLSearchParams(params).toString();
    return `${base}/api/datasources/proxy/uid/${ds}/api/v1/${path}?${qs}`;
  }

  private async gFetch(path: string, params: Record<string, string>): Promise<any> {
    const user = process.env.GRAFANA_USER || 'admin';
    const pass = process.env.GRAFANA_PASS || '';
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 9000);
    try {
      const res = await fetch(this.gUrl(path, params), {
        headers: {
          Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
          Accept: 'application/json',
        },
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`grafana ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  /** 瞬时查询：返回原始序列，保留 metric 标签（磁盘要按 mountpoint 分、温度要按 sensor 去重） */
  private async gInstant(expr: string): Promise<Array<{ metric: Record<string, string>; value: number }>> {
    try {
      const d = await this.gFetch('query', { query: expr });
      return (d?.data?.result || [])
        .map((r: any) => ({ metric: r.metric || {}, value: Number(r.value?.[1]) }))
        .filter((r: any) => Number.isFinite(r.value));
    } catch (e) {
      this.logger.warn(`[grafana] instant failed: ${(e as Error).message} expr=${expr.slice(0, 60)}`);
      return [];
    }
  }

  /** 区间查询：返回 host -> [[秒级时间戳, 值], ...] */
  private async gRange(
    expr: string,
    from: number,
    to: number,
    step: number,
  ): Promise<Record<string, Array<[number, number]>>> {
    try {
      const d = await this.gFetch('query_range', {
        query: expr,
        start: String(from),
        end: String(to),
        step: String(step),
      });
      const out: Record<string, Array<[number, number]>> = {};
      for (const r of d?.data?.result || []) {
        const host = r.metric?.host || r.metric?.instance || '未知';
        out[host] = (r.values || [])
          .map((v: any) => [Math.round(Number(v[0])), Number(v[1])] as [number, number])
          .filter((v: [number, number]) => Number.isFinite(v[1]));
      }
      return out;
    } catch (e) {
      this.logger.warn(`[grafana] range failed: ${(e as Error).message}`);
      return {};
    }
  }

  /** App「仪表板」页签的数据源：与 Grafana simple-overview 面板同一套 PromQL 口径 */
  async dashboard(): Promise<Record<string, unknown>> {
    const now = Date.now();
    if (this.gCache && now - this.gCacheAt < 20 * 1000) return this.gCache;

    const cpuExpr = '100 - (avg by (host) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)';
    const memExpr =
      'max by (host) ((1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)';
    const swapExpr =
      'max by (host) ((1 - node_memory_SwapFree_bytes / node_memory_SwapTotal_bytes) * 100)';
    const loadExpr = 'max by (host) (node_load1)';
    const diskExpr =
      'max by (host, mountpoint) ((1 - node_filesystem_avail_bytes{fstype=~"ext4|xfs",mountpoint=~"/|/mnt/data"} / node_filesystem_size_bytes{fstype=~"ext4|xfs",mountpoint=~"/|/mnt/data"}) * 100)';
    const upExpr = 'up{job="node"}';
    const bootExpr = 'max by (host) (time() - node_boot_time_seconds)';
    const tempExpr =
      'max by (host) ((node_hwmon_temp_celsius{chip=~"platform_coretemp.*"}) or (node_thermal_zone_temp{type=~"soc.*|cpu.*"}))';
    const rxExpr =
      'sum by (host) (rate(node_network_receive_bytes_total{device!~"lo|docker.*|veth.*|br-.*|vnet.*|virbr.*|tap.*"}[5m])) * 8 / 1000000';
    const txExpr =
      'sum by (host) (rate(node_network_transmit_bytes_total{device!~"lo|docker.*|veth.*|br-.*|vnet.*|virbr.*|tap.*"}[5m])) * 8 / 1000000';

    const to = Math.floor(now / 1000);
    const from = to - 24 * 3600;

    // 镜像站 + 视频站（Jellyfin）：这两个指标不带 host 标签，是全局单值
    const mirrorSpeedExpr = 'mirror_live_speed_bytes_per_second';
    const mirror24hExpr = 'sum(increase(mirror_download_bytes_total{kind="file"}[24h]))';
    const mirrorActiveExpr = 'mirror_active_connections';
    const mirrorEstExpr = 'mirror_established_connections';
    const mirrorInflightExpr = 'mirror_inflight_connections';
    const mirrorLastExpr = 'mirror_last_download_timestamp_seconds';
    const mirrorSyncExpr = 'mirror_sync_running';
    const mirrorProgExpr = 'mirror_sync_progress_ratio * 100';
    const jfPlayingExpr = 'jellyfin_sessions_playing';
    const jfTotalExpr = 'jellyfin_sessions_total';
    const jfBitrateExpr = 'sum(jellyfin_session_bitrate_bps)';
    const jfTxExpr = 'rate(jellyfin_network_tx_bytes_total[5m]) * 8';
    const jfUpExpr = 'jellyfin_sessions_collector_up';
    const jfSessExpr =
      'jellyfin_session_bitrate_bps * on(user, device, item) group_left(client, ip, method) jellyfin_session_info or (jellyfin_session_info * 0)';

    const [
      cpu, mem, swap, load, disk, up, boot, temp, rx, tx, cpuR, memR,
      mSpeed, m24, mActive, mEst, mInflight, mLast, mSync, mProg,
      jfPlaying, jfTotal, jfBit, jfTx, jfUp, jfSess,
    ] = await Promise.all([
      this.gInstant(cpuExpr),
      this.gInstant(memExpr),
      this.gInstant(swapExpr),
      this.gInstant(loadExpr),
      this.gInstant(diskExpr),
      this.gInstant(upExpr),
      this.gInstant(bootExpr),
      this.gInstant(tempExpr),
      this.gInstant(rxExpr),
      this.gInstant(txExpr),
      this.gRange(cpuExpr, from, to, 3600),
      this.gRange(memExpr, from, to, 3600),
      this.gInstant(mirrorSpeedExpr),
      this.gInstant(mirror24hExpr),
      this.gInstant(mirrorActiveExpr),
      this.gInstant(mirrorEstExpr),
      this.gInstant(mirrorInflightExpr),
      this.gInstant(mirrorLastExpr),
      this.gInstant(mirrorSyncExpr),
      this.gInstant(mirrorProgExpr),
      this.gInstant(jfPlayingExpr),
      this.gInstant(jfTotalExpr),
      this.gInstant(jfBitrateExpr),
      this.gInstant(jfTxExpr),
      this.gInstant(jfUpExpr),
      this.gInstant(jfSessExpr),
    ]);

    /** 单值指标压成 host -> 数值（同一 host 多条序列取最大） */
    const flat = (rows: Array<{ metric: Record<string, string>; value: number }>) => {
      const out: Record<string, number> = {};
      rows.forEach((r) => {
        const h = r.metric.host || r.metric.instance || '未知';
        out[h] = Math.max(out[h] === undefined ? -Infinity : out[h], r.value);
      });
      return out;
    };

    const cpuM = flat(cpu);
    const memM = flat(mem);
    const swapM = flat(swap);
    const loadM = flat(load);
    const upM = flat(up);
    const bootM = flat(boot);
    const tempM = flat(temp);
    const rxM = flat(rx);
    const txM = flat(tx);

    /** 磁盘按 host 汇总成 [{mp, pct}] */
    const disks: Record<string, Array<{ mp: string; pct: number }>> = {};
    disk.forEach((r) => {
      const h = r.metric.host || '未知';
      (disks[h] = disks[h] || []).push({ mp: r.metric.mountpoint || '/', pct: r.value });
    });

    const hosts = Object.keys(upM).length
      ? Object.keys(upM)
      : Array.from(new Set([...Object.keys(cpuM), ...Object.keys(memM)]));

    const r1 = (v: number | undefined) => (v === undefined ? null : Math.round(v * 10) / 10);
    const list = hosts
      .map((h) => {
        const ds = (disks[h] || []).sort((a, b) => b.pct - a.pct);
        return {
          host: h,
          up: upM[h] === 1 ? 1 : 0,
          cpu: r1(cpuM[h]),
          mem: r1(memM[h]),
          swap: r1(swapM[h]),
          load: r1(loadM[h]),
          disk_max: r1(ds.length ? ds[0].pct : undefined),
          disk: ds.map((d) => ({ mp: d.mp, pct: Math.round(d.pct * 10) / 10 })),
          uptime_days: bootM[h] === undefined ? null : Math.round((bootM[h] / 86400) * 10) / 10,
          temp: r1(tempM[h]),
          net_rx: r1(rxM[h]),
          net_tx: r1(txM[h]),
        };
      })
      .sort((a, b) => {
        const order = ['上海服务器', '本地服务器', '盒子H68k'];
        const ia = order.indexOf(a.host);
        const ib = order.indexOf(b.host);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });

    const trendHosts = Array.from(new Set([...Object.keys(cpuR), ...Object.keys(memR)])).map((h) => ({
      host: h,
      cpu: (cpuR[h] || []).map((p) => [p[0], Math.round(p[1] * 10) / 10]),
      mem: (memR[h] || []).map((p) => [p[0], Math.round(p[1] * 10) / 10]),
    }));
    trendHosts.sort((a, b) => {
      const order = ['上海服务器', '本地服务器', '盒子H68k'];
      const ia = order.indexOf(a.host);
      const ib = order.indexOf(b.host);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    /** 全局单值指标：取最大（正常只有一条序列） */
    const maxOf = (rows: Array<{ metric: Record<string, string>; value: number }>): number | null => {
      let m: number | null = null;
      rows.forEach((r) => {
        if (m === null || r.value > m) m = r.value;
      });
      return m;
    };

    const out = {
      ts: new Date(now).toISOString(),
      source: 'grafana',
      hosts: list,
      mirror: {
        speed_bps: maxOf(mSpeed),
        bytes_24h: maxOf(m24),
        active: maxOf(mActive),
        established: maxOf(mEst),
        inflight: maxOf(mInflight),
        last_ts: maxOf(mLast),
        sync_running: maxOf(mSync),
        sync_progress: maxOf(mProg),
      },
      jellyfin: {
        collector_up: maxOf(jfUp),
        playing: maxOf(jfPlaying),
        sessions: maxOf(jfTotal),
        bitrate_bps: maxOf(jfBit),
        tx_mbps: maxOf(jfTx),
        list: jfSess.slice(0, 6).map((r) => ({
          user: r.metric.user || '',
          device: r.metric.device || '',
          client: r.metric.client || '',
          item: r.metric.item || '',
          method: r.metric.method || '',
          bitrate: Math.round(r.value),
        })),
      },
      trend: { from, to, step: 3600, hosts: trendHosts },
    };
    this.gCache = out as unknown as Record<string, unknown>;
    this.gCacheAt = now;
    return this.gCache as Record<string, unknown>;
  }

  // ---------------- 主机详情：网口 / 端口 / 日志 ----------------

  /** 执行本地命令，失败返回空串（不抛，页面照常渲染） */
  private exec(cmd: string, args: string[], timeoutMs = 9000): Promise<string> {
    return new Promise((resolve) => {
      execFile(
        cmd,
        args,
        { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' },
        (err, stdout) => resolve(stdout ? String(stdout) : ''),
      );
    });
  }

  /** 在目标主机上跑一条只读命令；拿不到 shell 的主机返回空串 */
  private async onHost(host: string, remote: string): Promise<string> {
    const r = HOST_REMOTE[host];
    if (!r) return '';
    if (r.kind === 'local') return this.exec('/bin/bash', ['-lc', remote]);
    return this.exec('/usr/bin/ssh', [
      '-p',
      String(r.port || 22),
      '-i',
      String(r.key || ''),
      '-o',
      'BatchMode=yes',
      '-o',
      'StrictHostKeyChecking=no',
      '-o',
      'ConnectTimeout=5',
      'root@127.0.0.1',
      remote,
    ]);
  }

  /** 网口：Prometheus 里 node_network_* 按 device 展开 */
  private async hostNet(host: string): Promise<Array<Record<string, unknown>>> {
    const sel = `{host="${host}"}`;
    const [info, up, speed, rx, tx, erx, etx, drx, dtx] = await Promise.all([
      this.gInstant(`node_network_info${sel}`),
      this.gInstant(`node_network_up${sel}`),
      this.gInstant(`node_network_speed_bytes${sel}`),
      this.gInstant(`rate(node_network_receive_bytes_total${sel}[2m])`),
      this.gInstant(`rate(node_network_transmit_bytes_total${sel}[2m])`),
      this.gInstant(`rate(node_network_receive_errs_total${sel}[5m])`),
      this.gInstant(`rate(node_network_transmit_errs_total${sel}[5m])`),
      this.gInstant(`rate(node_network_receive_drop_total${sel}[5m])`),
      this.gInstant(`rate(node_network_transmit_drop_total${sel}[5m])`),
    ]);

    /** 同一 device 只保留一条；值取最大，避免重复序列 */
    const byDev = (rows: Array<{ metric: Record<string, string>; value: number }>) => {
      const m: Record<string, number> = {};
      rows.forEach((r) => {
        const d = String(r.metric.device || '');
        if (!d) return;
        m[d] = Math.max(m[d] === undefined ? -Infinity : m[d], r.value);
      });
      return m;
    };

    const upM = byDev(up);
    const spM = byDev(speed);
    const rxM = byDev(rx);
    const txM = byDev(tx);
    const erxM = byDev(erx);
    const etxM = byDev(etx);
    const drxM = byDev(drx);
    const dtxM = byDev(dtx);

    const out: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    info.forEach((r) => {
      const dev = String(r.metric.device || '');
      if (!dev || seen.has(dev) || SKIP_DEV.test(dev)) return;
      seen.add(dev);
      const ms = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? null : Math.round(v));
      out.push({
        dev,
        mac: String(r.metric.address || ''),
        state: String(r.metric.operstate || (upM[dev] === 1 ? 'up' : 'down')),
        up: upM[dev] === 1 || String(r.metric.operstate) === 'up',
        duplex: String(r.metric.duplex || ''),
        speed_mbps: spM[dev] && spM[dev] > 0 ? Math.round((spM[dev] * 8) / 1000000) : null,
        rx_bps: ms(rxM[dev]),
        tx_bps: ms(txM[dev]),
        speed_rx: ms(rxM[dev]),
        err_in: ms(erxM[dev]),
        err_out: ms(etxM[dev]),
        drop_in: ms(drxM[dev]),
        drop_out: ms(dtxM[dev]),
      });
    });

    // 网口按 状态（up 在前）+ 名字 排，主口自然排在前面
    out.sort((a, b) => Number(b.up) - Number(a.up) || String(a.dev).localeCompare(String(b.dev)));
    return out;
  }

  /** 端口：真实 ss 监听表；没有 shell 的主机退化为隧道探活 */
  private async hostPorts(host: string): Promise<Record<string, unknown>> {
    const raw = await this.onHost(host, 'ss -lntup 2>/dev/null || ss -lntu 2>/dev/null');

    if (!raw.trim()) {
      if (host === '盒子H68k') {
        const items = await Promise.all(
          BOX_TUNNELS.map(async (t) => ({
            port: t.port,
            proto: 'tcp',
            proc: t.name,
            note: t.note,
            ok: await tcpCheck('127.0.0.1', t.port, 1500),
          })),
        );
        return { available: true, source: 'tunnel', items, hint: '盒子未开放 shell，这里是反连到 139 的入口' };
      }
      return { available: false, source: '', items: [], hint: '该主机未开放远程命令' };
    }

    const items: Array<Record<string, unknown>> = [];
    const seen = new Set<string>();
    raw
      .split('\n')
      .slice(1)
      .forEach((line) => {
        const p = line.trim().split(/\s+/);
        if (p.length < 5) return;
        const proto = p[0];
        const local = p[4] || '';
        const port = Number(String(local).split(':').pop());
        if (!Number.isFinite(port)) return;
        if (port === 22 && host !== '上海服务器') return; // 隧道端口不展示
        const key = `${proto}:${port}`;
        if (seen.has(key)) return;
        seen.add(key);
        const procMatch = /users:\(\("([^"]+)"/.exec(line);
        items.push({
          port,
          proto,
          addr: local,
          proc: procMatch ? procMatch[1] : '',
        });
      });

    items.sort((a, b) => Number(a.port) - Number(b.port));
    return { available: true, source: 'ss', items: items.slice(0, 60) };
  }

  /** 一次拿齐：网口 + 端口（日志单独走 /logs，方便单独刷新） */
  async hostDetail(host: string): Promise<Record<string, unknown>> {
    const name = String(host || '').trim();
    if (!name) throw new BadRequestException('缺少主机名');
    const [net, ports] = await Promise.all([this.hostNet(name), this.hostPorts(name)]);
    return {
      host: name,
      ts: new Date().toISOString(),
      shell: !!HOST_REMOTE[name],
      net,
      ports,
    };
  }

  /** 日志：journalctl 取最近 N 行；src=all/err/app */
  async hostLogs(host: string, lines = 120, src = 'all'): Promise<Record<string, unknown>> {
    const name = String(host || '').trim();
    if (!name) throw new BadRequestException('缺少主机名');
    const n = Math.min(Math.max(Number(lines) || 120, 20), 400);

    if (!HOST_REMOTE[name]) {
      return {
        host: name,
        available: false,
        source: '',
        items: [],
        hint: '这台主机还没接入 shell（没有 SSH 通道）',
      };
    }

    const appUnits =
      name === '上海服务器'
        ? '-u doo-node-v3 -u nginx'
        : name === '盒子H68k'
          ? '-u camctl -u camctl-person3 -u camctl-person2 -u camctl-ocr -u boxpanel -u box-ssh-tunnel'
          : '-u nginx -u docker -u feishu-relay';
    const args =
      src === 'err'
        ? `journalctl -p err -n ${n} --no-pager -o short-iso`
        : src === 'app'
          ? `journalctl ${appUnits} -n ${n} --no-pager -o short-iso`
          : `journalctl -n ${n} --no-pager -o short-iso`;

    const raw = await this.onHost(name, args);
    if (!raw.trim()) {
      return { host: name, available: false, source: '', items: [], hint: '读取日志失败（命令无输出）' };
    }

    const items = raw
      .split('\n')
      .filter((l) => l.trim() && !/^-- /i.test(l.trim()))
      .map((line) => {
        // 2026-10-17T23:08:05+08:00 simpleos systemd[1]: msg（时区也可能是不带冒号的 +0800）
        const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:?\d{2})?)\s+(\S+)\s+(.*)$/.exec(line);
        const t = m ? m[1] : '';
        const body = m ? m[3] : line;
        const low = body.toLowerCase();
        const level = /error|failed|fatal|exception|panic|traceback|refused/.test(low)
          ? 'err'
          : /\bwarn|deprecated|timeout|retry\b/.test(low)
            ? 'warn'
            : 'info';
        return { t, level, msg: redact(body).slice(0, 400) };
      });

    return { host: name, available: true, source: src, items };
  }

  // ---------------- 设备 ----------------

  /** 每次带 token 的调用都刷新一次设备心跳；同名设备复用，不重复插行 */
  async touchDevice(userId: number, name: string, ip: string): Promise<number | null> {
    const devName = (name || '').trim();
    if (!devName) return null;
    const [rows] = await db.query(
      'SELECT id FROM hub_devices WHERE user_id = ? AND name = ? AND revoked = 0 ORDER BY id DESC LIMIT 1',
      [userId, devName],
    );
    const hit = (rows as Array<Record<string, unknown>>)[0];
    if (hit) {
      const id = Number(hit.id);
      await db.query('UPDATE hub_devices SET last_seen_at = NOW(), last_ip = ? WHERE id = ?', [ip, id]);
      return id;
    }
    const [r] = await db.query(
      'INSERT INTO hub_devices (user_id, name, platform, last_seen_at, last_ip) VALUES (?,?,?,NOW(),?)',
      [userId, devName, 'app', ip],
    );
    return Number((r as { insertId: number }).insertId);
  }

  async devices(): Promise<Array<Record<string, unknown>>> {
    const [rows] = await db.query(
      'SELECT id, user_id, name, platform, created_at, last_seen_at, last_ip, revoked FROM hub_devices ORDER BY last_seen_at DESC',
    );
    return rows as Array<Record<string, unknown>>;
  }

  // ---------------- 推送设置 ----------------

  async getPush(userId: number): Promise<PushSettings> {
    const [rows] = await db.query('SELECT push_json FROM hub_user_settings WHERE user_id = ?', [userId]);
    const row = (rows as Array<Record<string, unknown>>)[0];
    if (!row || !row.push_json) return { ...PUSH_DEFAULTS };
    try {
      const raw = row.push_json;
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { ...PUSH_DEFAULTS, ...(obj as Partial<PushSettings>) };
    } catch {
      return { ...PUSH_DEFAULTS };
    }
  }

  async setPush(userId: number, patch: Record<string, unknown>): Promise<PushSettings> {
    const cur = await this.getPush(userId);
    const next: PushSettings = {
      enabled: patch.enabled != null ? !!patch.enabled : cur.enabled,
      human: patch.human != null ? !!patch.human : cur.human,
      pending: patch.pending != null ? !!patch.pending : cur.pending,
      quiet_start:
        patch.quiet_start != null ? String(patch.quiet_start).slice(0, 5) : cur.quiet_start,
      quiet_end: patch.quiet_end != null ? String(patch.quiet_end).slice(0, 5) : cur.quiet_end,
    };
    await db.query(
      `INSERT INTO hub_user_settings (user_id, push_json) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE push_json = VALUES(push_json)`,
      [userId, JSON.stringify(next)],
    );
    return next;
  }
}
