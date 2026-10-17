/**
 * server-monitor —— 标准服务器状态监控(零依赖,通用版)
 *
 * 用法:
 *   node server.js              # 默认 8080,被占用时自动 +1 递增寻找可用端口
 *   PORT=9000 node server.js    # 指定端口
 *
 * 接口:
 *   GET /api/stats   采集快照 + 滚动历史(CPU/内存/网络 2s 采样,磁盘/进程 5s 采样)
 *   GET /            监控看板(public/ 目录)
 *
 * 兼容 Linux / macOS / Windows。
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT) || 8080;
const POLL_MS = 2000;        // 快指标:CPU / 内存 / 网络
const SLOW_POLL_MS = 5000;   // 慢指标:磁盘 / 进程
const HISTORY_MAX = 180;     // 历史点数 ≈ 6 分钟 @2s
const PUBLIC_DIR = path.join(__dirname, 'public');
const IS_WIN = process.platform === 'win32';

// ---------------------------------------------------------------------------
// CPU:整体 + 逐核,基于两次采样的增量计算
// ---------------------------------------------------------------------------

let lastAgg = null;   // 聚合时间片
let lastCores = null; // 逐核时间片

function sampleCpu() {
  const cpus = os.cpus();
  const agg = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
  for (const c of cpus) {
    agg.user += c.times.user;
    agg.nice += c.times.nice;
    agg.sys += c.times.sys;
    agg.idle += c.times.idle;
    agg.irq += c.times.irq;
  }
  const total = agg.user + agg.nice + agg.sys + agg.idle + agg.irq;

  let usage = 0;
  if (lastAgg && total > lastAgg.total) {
    const dt = total - lastAgg.total;
    const idle = agg.idle - lastAgg.idle;
    usage = dt > 0 ? Math.max(0, Math.min(100, (1 - idle / dt) * 100)) : 0;
  }
  lastAgg = Object.assign({}, agg, { total });

  const perCore = cpus.map((c, i) => {
    const prev = lastCores && lastCores[i];
    if (!prev) return 0;
    const dt = c.times.user + c.times.nice + c.times.sys + c.times.idle + c.times.irq -
      (prev.user + prev.nice + prev.sys + prev.idle + prev.irq);
    const idle = c.times.idle - prev.idle;
    return dt > 0 ? Math.max(0, Math.min(100, (1 - idle / dt) * 100)) : 0;
  });
  lastCores = cpus.map((c) => Object.assign({}, c.times));

  return {
    usage,
    cores: perCore,
    coresCount: cpus.length,
    model: cpus[0] ? cpus[0].model : '',
  };
}

// ---------------------------------------------------------------------------
// 内存 / Swap
// ---------------------------------------------------------------------------

function readMemory() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    total,
    free,
    used,
    percent: total > 0 ? (used / total) * 100 : 0,
  };
}

function readSwap() {
  if (!IS_WIN) {
    try {
      const txt = fs.readFileSync('/proc/meminfo', 'utf8');
      const mTotal = /SwapTotal:\s+(\d+) kB/.exec(txt);
      const mFree = /SwapFree:\s+(\d+) kB/.exec(txt);
      if (mTotal && mFree) {
        const total = Number(mTotal[1]) * 1024;
        const free = Number(mFree[1]) * 1024;
        return {
          total,
          free,
          used: total - free,
          percent: total > 0 ? ((total - free) / total) * 100 : 0,
        };
      }
    } catch {
      /* 非 Linux 或无 swap */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// CPU 温度(Linux: /sys/class/thermal;Windows 不支持返回 null)
// ---------------------------------------------------------------------------

function readTemp() {
  if (IS_WIN) return null;
  try {
    const dir = '/sys/class/thermal';
    const zones = [];
    for (let i = 0; i < 16; i++) {
      const base = `${dir}/thermal_zone${i}`;
      let raw = null;
      let type = null;
      try {
        raw = fs.readFileSync(`${base}/temp`, 'utf8');
      } catch {
        break;
      }
      try {
        type = fs.readFileSync(`${base}/type`, 'utf8').trim();
      } catch {
        type = `zone${i}`;
      }
      const v = Number(raw) / 1000; // 毫摄氏度 → 摄氏度
      if (!Number.isFinite(v)) continue;
      zones.push({ name: type || `zone${i}`, temp: v });
    }
    if (!zones.length) return null;
    return {
      zones,
      current: Math.max(...zones.map((z) => z.temp)),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 磁盘
// ---------------------------------------------------------------------------

function readDiskWindows(cb) {
  const cmd =
    '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;' +
    'Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ' +
    'Select-Object DeviceID,Size,FreeSpace | ConvertTo-Json -Compress';
  execFile('powershell.exe', ['-NoProfile', '-Command', cmd], { timeout: 8000 }, (err, stdout) => {
    if (err) return cb([]);
    try {
      const raw = JSON.parse(stdout);
      const list = Array.isArray(raw) ? raw : [raw];
      cb(
        list
          .filter((d) => d && Number(d.Size) > 0)
          .map((d) => {
            const total = Number(d.Size);
            const free = Number(d.FreeSpace) || 0;
            return {
              fs: d.DeviceID || '?',
              mount: d.DeviceID || '?',
              total,
              used: total - free,
              free,
              usePercent: total > 0 ? ((total - free) / total) * 100 : 0,
            };
          })
      );
    } catch {
      cb([]);
    }
  });
}

function readDiskPosix(cb) {
  execFile('df', ['-kP'], { timeout: 8000 }, (err, stdout) => {
    if (err) return cb([]);
    const drives = [];
    for (const line of stdout.split('\n').slice(1)) {
      const p = line.trim().split(/\s+/);
      if (p.length < 6) continue;
      const used = Number(p[2]) * 1024;
      const avail = Number(p[3]) * 1024;
      const cap = Number.parseFloat(p[4]) || 0;
      if (Number.isNaN(used) || Number.isNaN(avail)) continue;
      drives.push({
        fs: p[0],
        mount: p[5],
        total: used + avail,
        used,
        free: avail,
        usePercent: cap,
      });
    }
    cb(drives);
  });
}

function readDisk(cb) {
  if (IS_WIN) readDiskWindows(cb);
  else readDiskPosix(cb);
}

// ---------------------------------------------------------------------------
// 网络接口
// ---------------------------------------------------------------------------

function readNetwork() {
  const ifaces = [];
  let rx = 0;
  let tx = 0;

  if (!IS_WIN) {
    // Linux: 直接读 /proc/net/dev 的真实网卡字节计数(Node 的 os.networkInterfaces 不提供计数器)
    try {
      const txt = fs.readFileSync('/proc/net/dev', 'utf8');
      for (const line of txt.split('\n').slice(2)) {
        const m = /^\s*(\S+):\s*(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+\d+\s+(\d+)/.exec(line);
        if (!m) continue;
        const name = m[1];
        if (name === 'lo') continue; // 忽略回环
        const r = Number(m[2]);
        const t = Number(m[3]);
        rx += r;
        tx += t;
        ifaces.push({ name, address: '-', internal: false, rx: r, tx: t });
      }
      // 补 IP 地址
      const net = os.networkInterfaces();
      for (const i of ifaces) {
        const addrs = net[i.name];
        if (addrs) {
          const v4 = addrs.find((a) => a.family === 'IPv4' && !a.internal);
          if (v4) i.address = v4.address;
        }
      }
    } catch {
      /* /proc 不可读(少见) */
    }
  } else {
    // Windows: os.networkInterfaces 无计数器,保持"不支持"提示
    for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
      if (!addrs || !addrs.length) continue;
      const ipv4 = addrs.find((a) => a.family === 'IPv4' && !a.internal);
      if (!ipv4) continue;
      ifaces.push({ name, address: ipv4.address, internal: false, rx: null, tx: null });
    }
  }

  return {
    rx,
    tx,
    rxAvailable: ifaces.some((i) => i.rx !== null),
    txAvailable: ifaces.some((i) => i.tx !== null),
    ifaces,
  };
}

// ---------------------------------------------------------------------------
// 进程(Top 15,按 CPU 排序)
// ---------------------------------------------------------------------------

function readProcesses(cb) {
  if (IS_WIN) {
    const cmd =
      '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;' +
      'Get-Process | Sort-Object CPU -Descending | Select-Object -First 15 ' +
      'Id,ProcessName,@{n="cpu";e={[math]::Round($_.CPU,1)}},' +
      '@{n="memMB";e={[math]::Round($_.WorkingSet64/1MB,1)}} | ConvertTo-Json -Compress';
    execFile('powershell.exe', ['-NoProfile', '-Command', cmd], { timeout: 8000 }, (err, stdout) => {
      if (err) return cb([]);
      try {
        const raw = JSON.parse(stdout);
        const list = Array.isArray(raw) ? raw : [raw];
        cb(
          list
            .filter(Boolean)
            .map((p) => ({
              pid: Number(p.Id),
              name: p.ProcessName,
              cpu: Number(p.cpu) || 0,
              memPct: null,
              rss: (Number(p.memMB) || 0) * 1024 * 1024,
              cmd: p.ProcessName,
            }))
        );
      } catch {
        cb([]);
      }
    });
  } else {
    execFile(
      'ps',
      ['-eo', 'pid=,pcpu=,pmem=,rss=,comm=,args=', '--sort=-pcpu'],
      { timeout: 8000 },
      (err, stdout) => {
        if (err) return cb([]);
        const list = stdout
          .split('\n')
          .filter((l) => l.trim())
          .slice(0, 15)
          .map((l) => {
            const m = l.trim().match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(.*)$/);
            if (!m) return null;
            return {
              pid: Number(m[1]),
              cpu: Number(m[2]),
              memPct: Number(m[3]),
              rss: Number(m[4]) * 1024,
              name: m[5],
              cmd: m[6],
            };
          })
          .filter(Boolean);
        cb(list);
      }
    );
  }
}

// ---------------------------------------------------------------------------
// 状态聚合与采样循环
// ---------------------------------------------------------------------------

function buildBase() {
  return {
    generatedAt: Date.now(),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    uptime: os.uptime(),
    bootTime: Date.now() - os.uptime() * 1000,
    loadavg: os.loadavg(),
    cpu: sampleCpu(),
    memory: readMemory(),
    swap: readSwap(),
    temp: readTemp(),
    network: readNetwork(),
  };
}

const state = {
  // 单一可变快照对象:fastTick 只更新字段,不替换对象,
  // 避免 slowTick 异步写入的 disk/processes 被下一次重建冲掉
  snapshot: { disk: [], processes: [] },
  history: { t: [], cpu: [], mem: [], rx: [], tx: [], temp: [] },
};

function pushHistory(snap) {
  const h = state.history;
  h.t.push(snap.generatedAt);
  h.cpu.push(Number(snap.cpu.usage.toFixed(2)));
  h.mem.push(Number(snap.memory.percent.toFixed(2)));
  h.rx.push(snap.network.rx);
  h.tx.push(snap.network.tx);
  h.temp.push(snap.temp && isFinite(snap.temp.current) ? Number(snap.temp.current.toFixed(2)) : null);
  while (h.t.length > HISTORY_MAX) {
    h.t.shift();
    h.cpu.shift();
    h.mem.shift();
    h.rx.shift();
    h.tx.shift();
    h.temp.shift();
  }
}

function fastTick() {
  Object.assign(state.snapshot, buildBase());
  pushHistory(state.snapshot);
}

function slowTick() {
  readDisk((disks) => {
    readProcesses((processes) => {
      if (!state.snapshot) return;
      state.snapshot.disk = disks;
      state.snapshot.processes = processes;
    });
  });
}

fastTick();
slowTick();
setInterval(fastTick, POLL_MS);
setInterval(slowTick, SLOW_POLL_MS);

// ---------------------------------------------------------------------------
// HTTP 服务
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, obj) {
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(obj));
}

function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/stats') {
    if (!state.snapshot.generatedAt) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not ready');
      return;
    }
    sendJson(res, Object.assign({}, state.snapshot, { history: state.history }));
    return;
  }

  let rel = '';
  try {
    rel = decodeURIComponent(url.pathname).replace(/^[/\\]+/, '');
  } catch {
    rel = url.pathname.replace(/^[/\\]+/, '');
  }
  if (!rel || rel === 'index.html') rel = 'index.html';
  const file = path.join(PUBLIC_DIR, rel);
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

function listen(port, attempt) {
  const server = http.createServer(handler);
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && attempt < 10) {
      console.log(`[warn] 端口 ${port} 被占用,尝试 ${port + 1}`);
      listen(port + 1, attempt + 1);
    } else {
      console.error('[error] 启动失败:', e.message);
      process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log('----------------------------------------------');
    console.log('  服务器状态监控已启动');
    console.log(`  看板地址:  http://localhost:${port}`);
    console.log(`  API 地址:  http://localhost:${port}/api/stats`);
    console.log(`  主机:      ${os.hostname()}  (${os.type()} ${os.release()})`);
    console.log('----------------------------------------------');
  });
}

listen(PORT, 0);