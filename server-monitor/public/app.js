/* server-monitor 前端逻辑:轮询 /api/stats,渲染仪表盘与历史曲线(悬浮可查看数值) */
'use strict';

const REFRESH_MS = 2000;
const MAX_POINTS = 120; // 画布最多显示的点数

/* ---------------- 工具函数 ---------------- */

const $ = (id) => document.getElementById(id);

const fmtBytes = (n) => {
  if (!isFinite(n) || n < 0) return '-';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' GB';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' MB';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + ' KB';
  return n.toFixed(0) + ' B';
};

const fmtDur = (s) => {
  s = Math.max(0, Math.floor(s));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(d + ' 天');
  if (h) parts.push(h + ' 小时');
  if (m) parts.push(m + ' 分');
  parts.push(sec + ' 秒');
  return parts.join(' ');
};

const fmtClock = (ts) => new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

/* 解析 CSS 变量为实际颜色(canvas 不支持 var()) */
const C = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const levelColor = (pct) => (pct >= 90 ? 'var(--red)' : pct >= 75 ? 'var(--amber)' : 'var(--green)');

function hexA(hex, a) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------------- 环形仪表 ---------------- */

const RING_C = 2 * Math.PI * 52; // 与 SVG r=52 对应
function setRing(fgEl, textEl, pct, color) {
  pct = Math.max(0, Math.min(100, pct));
  fgEl.style.strokeDashoffset = RING_C * (1 - pct / 100);
  fgEl.style.stroke = color.startsWith('var(') ? C(color.slice(4, -1)) : color;
  textEl.textContent = (pct >= 100 ? 100 : pct).toFixed(pct < 10 ? 1 : 0) + '%';
}

/* ---------------- 曲线(零依赖 canvas,悬浮查看数值) ---------------- */

function niceStep(raw) {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  let s = 1;
  if (n > 1) s = 2;
  if (n > 2) s = 5;
  if (n > 5) s = 10;
  return s * pow;
}

const charts = new Map(); // canvas -> { opts, idx }

function renderChart(canvas, opts) {
  let st = charts.get(canvas);
  if (!st) {
    st = { opts, idx: -1 };
    charts.set(canvas, st);
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      const s = (st.opts.series || []).find((x) => x.values.length > 1);
      if (!s) return;
      const n = s.values.length;
      const pw = r.width - 56;
      const idx = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - 46) / pw) * (n - 1))));
      if (idx !== st.idx) {
        st.idx = idx;
        paintChart(canvas, st);
      }
    });
    canvas.addEventListener('mouseleave', () => {
      if (st.idx !== -1) {
        st.idx = -1;
        paintChart(canvas, st);
      }
    });
  }
  st.opts = opts;
  st.idx = -1;
  paintChart(canvas, st);
}

function paintChart(canvas, st) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(60, rect.width);
  const H = Math.max(60, rect.height);
  const dpr = window.devicePixelRatio || 1;
  const cw = Math.round(W * dpr);
  const ch = Math.round(H * dpr);
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const opts = st.opts;
  const series = (opts.series || []).filter((s) => s.values.length > 1);
  if (!series.length) {
    ctx.fillStyle = C('--muted');
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('等待数据…', W / 2, H / 2);
    return;
  }

  const L = 46, R = 10, T = 16, B = 24;
  const pw = W - L - R;
  const ph = H - T - B;

  let max = 0;
  for (const s of series) for (const v of s.values) if (v > max) max = v;
  const yMax = Math.max(1, Math.ceil(max / niceStep(max)) * niceStep(max));
  const step = niceStep(yMax / 4);
  const n = series[0].values.length;

  const xOf = (i) => L + (i / (n - 1)) * pw;
  const yOf = (v) => T + ph - (v / yMax) * ph;

  // 网格 + y 轴
  ctx.strokeStyle = 'rgba(35,48,73,0.8)';
  ctx.lineWidth = 1;
  ctx.fillStyle = C('--muted');
  ctx.font = '11px Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let y = 0; y <= yMax; y += step) {
    const py = yOf(y);
    ctx.beginPath();
    ctx.moveTo(L, py);
    ctx.lineTo(W - R, py);
    ctx.stroke();
    ctx.fillText(opts.yFmt ? opts.yFmt(y) : String(y), L - 6, py);
  }

  // x 轴时间刻度(约 5 个)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const ticks = 5;
  for (let i = 0; i < ticks; i++) {
    const idx = Math.round((i / (ticks - 1)) * (n - 1));
    ctx.fillText(fmtClock(opts.labels[idx]).slice(0, 5), xOf(idx), H - B + 6);
  }

  // 曲线(渐变填充 + 平滑)
  series.forEach((s, si) => {
    const g = ctx.createLinearGradient(0, T, 0, T + ph);
    g.addColorStop(0, hexA(s.color, 0.25));
    g.addColorStop(1, hexA(s.color, 0));
    ctx.beginPath();
    s.values.forEach((v, i) => {
      const px = xOf(i);
      const py = yOf(v);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.lineTo(xOf(n - 1), T + ph);
    ctx.lineTo(xOf(0), T + ph);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(s.values[0]));
    for (let i = 1; i + 1 < n; i++) {
      const mx = (xOf(i) + xOf(i + 1)) / 2;
      const my = (yOf(s.values[i]) + yOf(s.values[i + 1])) / 2;
      ctx.quadraticCurveTo(xOf(i), yOf(s.values[i]), mx, my);
    }
    ctx.lineTo(xOf(n - 1), yOf(s.values[n - 1]));
    ctx.strokeStyle = s.color;
    ctx.lineWidth = si === 0 ? 2 : 1.6;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  });

  // 图例(右上,显示最新值)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '11px sans-serif';
  let lx = W - R - 4;
  for (let i = series.length - 1; i >= 0; i--) {
    const s = series[i];
    const last = s.values[s.values.length - 1];
    const label = `${s.name} ${opts.valFmt ? opts.valFmt(last) : last}`;
    const tw = ctx.measureText(label).width + 16;
    lx -= tw;
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, T / 2 - 4, 8, 8);
    ctx.fillStyle = C('--muted');
    ctx.fillText(label, lx + 12, T / 2);
    lx -= 8;
  }

  // 悬浮指示器
  if (st.idx >= 0 && st.idx < n) {
    const i = st.idx;
    ctx.strokeStyle = 'rgba(142,160,191,0.6)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xOf(i), T);
    ctx.lineTo(xOf(i), T + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    series.forEach((s) => {
      ctx.beginPath();
      ctx.arc(xOf(i), yOf(s.values[i]), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
    });

    // 工具提示框
    const rowTexts = series.map((s) => `${s.name}  ${opts.valFmt ? opts.valFmt(s.values[i]) : s.values[i]}`);
    ctx.font = '11px sans-serif';
    const pad = 8, rh = 16;
    const bw = Math.max(...rowTexts.map((t) => ctx.measureText(t).width)) + 2 * pad + 12;
    const bh = rowTexts.length * rh + 2 * pad + rh; // 首行时间
    let bx = xOf(i) + 12;
    let by = T + 6;
    if (bx + bw > W - R) bx = xOf(i) - bw - 12;
    if (bx < L) bx = L;
    ctx.fillStyle = 'rgba(11,18,32,0.92)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = C('--line');
    ctx.strokeRect(bx, by, bw, bh);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let ty = by + pad + 11;
    ctx.fillStyle = C('--muted');
    ctx.fillText('时间  ' + fmtClock(opts.labels[i]), bx + pad, ty);
    ty += rh;
    series.forEach((s, si) => {
      ctx.fillStyle = s.color;
      ctx.fillRect(bx + pad, ty - 3.5, 7, 7);
      ctx.font = '11px sans-serif';
      ctx.fillText(rowTexts[si], bx + pad + 12, ty);
      ty += rh;
    });
  }
}

/* ---------------- 状态管理 ---------------- */

let paused = false;
let lastNet = { rx: 0, tx: 0, t: 0 };
let netRates = { rx: 0, tx: 0 };

const refs = {
  dot: $('status-dot'),
  hostname: $('hostname'),
  platform: $('platform'),
  uptime: $('uptime'),
  updated: $('updated'),
  toggle: $('toggle'),

  tempSub: $('temp-sub'),
  tempRingFg: $('temp-ring-fg'),
  tempRingText: $('temp-ring-text'),
  tempCurrent: $('temp-current'),
  tempZones: $('temp-zones'),
  tempState: $('temp-state'),

  cpuModel: $('cpu-model'),
  cpuRingFg: $('cpu-ring-fg'),
  cpuRingText: $('cpu-ring-text'),
  cpuCount: $('cpu-count'),
  cpuLoad: $('cpu-load'),
  cpuState: $('cpu-state'),
  cpuCores: $('cpu-cores'),
  coreDetail: $('core-detail'),

  memSub: $('mem-sub'),
  memRingFg: $('mem-ring-fg'),
  memRingText: $('mem-ring-text'),
  memUsed: $('mem-used'),
  memFree: $('mem-free'),
  memSwap: $('mem-swap'),

  diskSub: $('disk-sub'),
  diskRingFg: $('disk-ring-fg'),
  diskRingText: $('disk-ring-text'),
  diskCount: $('disk-count'),
  diskUsed: $('disk-used'),
  diskFree: $('disk-free'),
  diskDetail: $('disk-detail'),

  sysArch: $('sys-arch'),
  sysUptime: $('sys-uptime'),
  sysBoot: $('sys-boot'),
  sysNode: $('sys-node'),

  chartCpu: $('chart-cpu'),
  chartCpuLast: $('chart-cpu-last'),
  chartMem: $('chart-mem'),
  chartMemLast: $('chart-mem-last'),
  chartNet: $('chart-net'),
  chartNetLast: $('chart-net-last'),
  chartTemp: $('chart-temp'),
  chartTempLast: $('chart-temp-last'),

  netRates: $('net-rates'),
  netDetail: $('net-detail'),
  procBody: $('proc-body'),
  footNode: $('foot-node'),
};

/* ---------------- 渲染 ---------------- */

function render(data) {
  // 顶栏
  refs.hostname.textContent = `${data.hostname}`;
  refs.platform.textContent = data.platform;
  refs.uptime.textContent = fmtDur(data.uptime);
  refs.updated.textContent = '更新于 ' + fmtClock(data.generatedAt);

  // 温度(Windows 不支持时显示 --)
  const temp = data.temp;
  if (temp && temp.zones && temp.zones.length) {
    const t = temp.current;
    setRing(refs.tempRingFg, refs.tempRingText, (t / 80) * 100, levelColor((t / 80) * 100));
    refs.tempRingText.textContent = t.toFixed(1) + '°';
    refs.tempSub.textContent = '℃';
    refs.tempCurrent.textContent = t.toFixed(1) + ' ℃';
    refs.tempZones.textContent = temp.zones.map((z) => `${z.name} ${z.temp.toFixed(1)}°`).join(' · ');
    const st = refs.tempState;
    st.textContent = t >= 75 ? '过热' : t >= 60 ? '偏高' : '正常';
    st.className = 'state-' + (t >= 75 ? 'bad' : t >= 60 ? 'warn' : 'ok');
  } else {
    refs.tempSub.textContent = '不支持';
    refs.tempCurrent.textContent = '--';
    refs.tempZones.textContent = '无传感器';
    refs.tempState.textContent = '--';
    refs.tempState.className = 'state-ok';
    setRing(refs.tempRingFg, refs.tempRingText, 0, 'var(--muted)');
    refs.tempRingText.textContent = '--';
  }

  // CPU
  const cpu = data.cpu;
  setRing(refs.cpuRingFg, refs.cpuRingText, cpu.usage, levelColor(cpu.usage));
  refs.cpuModel.textContent = cpu.coresCount + ' 核';
  refs.cpuCount.textContent = cpu.coresCount;
  refs.cpuLoad.textContent = data.loadavg.map((v) => v.toFixed(2)).join(' / ');
  const loadRatio = data.loadavg[0] / Math.max(1, cpu.coresCount);
  refs.cpuState.textContent = loadRatio >= 1 ? '负载高' : loadRatio >= 0.7 ? '偏高' : '正常';
  refs.cpuState.className = 'state-' + (loadRatio >= 1 ? 'bad' : loadRatio >= 0.7 ? 'warn' : 'ok') + '';

  const maxCore = Math.max(...cpu.cores, 1);
  refs.cpuCores.innerHTML = cpu.cores
    .map((v) => `<div class="bar" title="核 ${v.toFixed(1)}%"><i style="height:${(v / maxCore) * 100}%;background:${levelColor(v)}"></i></div>`)
    .join('');

  refs.coreDetail.innerHTML = cpu.cores
    .map(
      (v, i) =>
        `<div class="core-cell"><div class="id">核 ${i}</div><div class="val" style="color:${levelColor(v)}">${v.toFixed(0)}%</div></div>`
    )
    .join('');

  // 内存
  const mem = data.memory;
  setRing(refs.memRingFg, refs.memRingText, mem.percent, levelColor(mem.percent));
  refs.memSub.textContent = `共 ${fmtBytes(mem.total)}`;
  refs.memUsed.textContent = `${fmtBytes(mem.used)} (${mem.percent.toFixed(1)}%)`;
  refs.memFree.textContent = fmtBytes(mem.free);
  if (data.swap) {
    const swapPct = data.swap.total > 0 ? (data.swap.used / data.swap.total) * 100 : 0;
    refs.memSwap.textContent = `${fmtBytes(data.swap.used)} / ${fmtBytes(data.swap.total)} · ${swapPct.toFixed(0)}%`;
    refs.memSwap.style.color = levelColor(swapPct);
  } else {
    refs.memSwap.textContent = '不可用';
    refs.memSwap.style.color = '';
  }

  // 磁盘
  const disks = data.disk || [];
  const sumUsed = disks.reduce((a, d) => a + d.used, 0);
  const sumTotal = disks.reduce((a, d) => a + d.total, 0);
  const diskPct = sumTotal > 0 ? (sumUsed / sumTotal) * 100 : 0;
  setRing(refs.diskRingFg, refs.diskRingText, diskPct, levelColor(diskPct));
  refs.diskSub.textContent = disks.length ? `共 ${fmtBytes(sumTotal)}` : '无数据';
  refs.diskCount.textContent = disks.length;
  refs.diskUsed.textContent = fmtBytes(sumUsed);
  refs.diskFree.textContent = fmtBytes(Math.max(0, sumTotal - sumUsed));

  refs.diskDetail.innerHTML = disks.length
    ? disks
        .map(
          (d) => `
    <div class="row">
      <div class="row-top">
        <b title="${esc(d.fs)}">${esc(d.mount)}</b>
        <span>${fmtBytes(d.used)} / ${fmtBytes(d.total)} · <b style="color:${levelColor(d.usePercent)}">${d.usePercent.toFixed(1)}%</b></span>
      </div>
      <div class="progress"><i style="width:${Math.min(100, d.usePercent)}%;background:${levelColor(d.usePercent)}"></i></div>
    </div>`
        )
        .join('')
    : '<div class="empty">无法获取磁盘信息</div>';

  // 网络速率(相对上次快照)
  if (lastNet.t) {
    const dt = Math.max(0.1, (data.generatedAt - lastNet.t) / 1000);
    netRates.rx = Math.max(0, (data.network.rx - lastNet.rx) / dt);
    netRates.tx = Math.max(0, (data.network.tx - lastNet.tx) / dt);
  }
  lastNet = { rx: data.network.rx, tx: data.network.tx, t: data.generatedAt };

  const rateAvail = data.network.rxAvailable && data.network.txAvailable;
  refs.netRates.textContent = rateAvail
    ? `↓ ${fmtBytes(netRates.rx)}/s · ↑ ${fmtBytes(netRates.tx)}/s`
    : '系统不支持网卡计数器';

  refs.netDetail.innerHTML = (data.network.ifaces || [])
    .map(
      (i) => `
    <div class="row">
      <div class="row-top">
        <b>${esc(i.name)}</b>
        <span>${esc(i.address)}${i.internal ? ' (loopback)' : ''}</span>
      </div>
      <div class="row-top">
        <span style="color:var(--muted)">下行总量</span>
        <b>${i.rx != null ? fmtBytes(i.rx) : '不支持'}</b>
      </div>
      <div class="row-top">
        <span style="color:var(--muted)">上行总量</span>
        <b>${i.tx != null ? fmtBytes(i.tx) : '不支持'}</b>
      </div>
    </div>`
    )
    .join('') || '<div class="empty">无网络接口</div>';

  // 系统
  refs.sysArch.textContent = data.platform;
  refs.sysUptime.textContent = fmtDur(data.uptime);
  refs.sysBoot.textContent = new Date(data.bootTime).toLocaleString('zh-CN', { hour12: false });
  refs.sysNode.textContent = data.nodeVersion;
  refs.footNode.textContent = `Node ${data.nodeVersion}`;

  // 进程表
  const procs = data.processes || [];
  refs.procBody.innerHTML = procs.length
    ? procs
        .map(
          (p) => `
    <tr>
      <td class="mono">${p.pid}</td>
      <td>${esc(p.name)}</td>
      <td class="num">${p.cpu.toFixed(1)}</td>
      <td class="num">${p.memPct != null ? p.memPct.toFixed(1) : '-'}</td>
      <td class="num">${fmtBytes(p.rss)}</td>
      <td class="mono" title="${esc(p.cmd)}">${esc(p.cmd.length > 80 ? p.cmd.slice(0, 80) + '…' : p.cmd)}</td>
    </tr>`
        )
        .join('')
    : '<tr><td colspan="6" class="empty">无法获取进程列表</td></tr>';

  // 历史曲线
  const h = data.history || { t: [], cpu: [], mem: [], rx: [], tx: [] };
  const n = Math.min(MAX_POINTS, h.t.length);
  const labels = h.t.slice(-n);
  const tail = (arr) => arr.slice(-n);

  renderChart(refs.chartCpu, {
    labels,
    yFmt: (v) => v.toFixed(0),
    valFmt: (v) => v.toFixed(1) + '%',
    series: [{ name: 'CPU', color: C('--cyan'), values: tail(h.cpu) }],
  });
  renderChart(refs.chartMem, {
    labels,
    yFmt: (v) => v.toFixed(0),
    valFmt: (v) => v.toFixed(1) + '%',
    series: [{ name: '内存', color: C('--violet'), values: tail(h.mem) }],
  });

  const rxRate = diffRates(h.t, h.rx).map((v) => v / 1e6).slice(-n);
  const txRate = diffRates(h.t, h.tx).map((v) => v / 1e6).slice(-n);
  renderChart(refs.chartNet, {
    labels,
    yFmt: (v) => (v >= 1 ? v.toFixed(0) : v.toFixed(1)),
    valFmt: (v) => v.toFixed(2) + ' MB/s',
    series: [
      { name: '下行', color: C('--green'), values: rxRate },
      { name: '上行', color: C('--red'), values: txRate },
    ],
  });

  refs.chartCpuLast.textContent = `当前 ${cpu.usage.toFixed(1)}%`;
  refs.chartMemLast.textContent = `当前 ${mem.percent.toFixed(1)}%`;
  refs.chartNetLast.textContent = rateAvail
    ? `↓ ${(netRates.rx / 1e6).toFixed(2)} MB/s · ↑ ${(netRates.tx / 1e6).toFixed(2)} MB/s`
    : '不支持';

  const tempHist = tail(h.temp).filter((v) => v != null);
  renderChart(refs.chartTemp, {
    labels,
    yFmt: (v) => v.toFixed(0),
    valFmt: (v) => v.toFixed(1) + '°',
    series: tempHist.length > 1 ? [{ name: '温度', color: C('--amber'), values: tempHist }] : [],
  });
  refs.chartTempLast.textContent = temp && temp.zones && temp.zones.length
    ? `当前 ${temp.current.toFixed(1)}°`
    : '不支持';

  window.__last = data; // 供窗口缩放时重绘
}

/* 累积字节序列 → 每秒速率序列 */
function diffRates(tArr, vArr) {
  const out = [];
  for (let i = 1; i < vArr.length; i++) {
    const dt = (tArr[i] - tArr[i - 1]) / 1000;
    const d = vArr[i] - vArr[i - 1];
    out.push(dt > 0 && d >= 0 ? d / dt : 0);
  }
  return out;
}

/* ---------------- 轮询 ---------------- */

async function tick() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    render(data);
    refs.dot.className = 'dot ok';
    document.title = `服务器监控 · ${data.hostname} · CPU ${data.cpu.usage.toFixed(1)}%`;
  } catch (e) {
    refs.dot.className = 'dot err';
    refs.updated.textContent = '连接失败: ' + e.message;
  }
}

refs.toggle.addEventListener('click', () => {
  paused = !paused;
  refs.toggle.textContent = paused ? '继续' : '暂停';
  refs.toggle.classList.toggle('active', paused);
  if (!paused) tick();
});

/* 窗口缩放后重绘曲线(去抖) */
let resizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.__last) render(window.__last);
  }, 150);
});

tick();
setInterval(() => {
  if (!paused && !document.hidden) tick();
}, REFRESH_MS);