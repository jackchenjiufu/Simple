// WiFiProbe — maze column router
import fs from "fs";
const model = JSON.parse(fs.readFileSync("probe-pcb/model_pretty.json", "utf8"));
const allPads = [];
for (const c of model.comps) for (const p of c.pads) allPads.push({ ref: c.ref, ...p });
const padsByNet = {};
for (const p of allPads) (padsByNet[p.net] ||= []).push(p);

const GS = 0.25, X0 = -50, Y0 = -40, W = 100, H = 80;
const gw = Math.round(W / GS), gh = Math.round(H / GS);
const master = new Uint8Array(gw * gh);
const CLR = 0.26;
const c2x = c => Math.round((c * GS + X0) * 40) / 40;
const c2y = c => Math.round((c * GS + Y0) * 40) / 40;
function markRect(g, x1, x2, y1, y2, v) {
  const gx1 = Math.max(0, Math.floor((x1 - X0) / GS)), gx2 = Math.min(gw - 1, Math.ceil((x2 - X0) / GS));
  const gy1 = Math.max(0, Math.floor((y1 - Y0) / GS)), gy2 = Math.min(gh - 1, Math.ceil((y2 - Y0) / GS));
  if (gx2 < gx1 || gy2 < gy1) return;
  for (let gy = gy1; gy <= gy2; gy++) { let b = gy * gw + gx1; for (let gx = gx1; gx <= gx2; gx++, b++) if (!g[b]) g[b] = v; }
}
const padCells = [];
for (const p of allPads) {
  if (p.kind === "npth") { markRect(master, p.x - p.w / 2, p.x + p.w / 2, p.y - p.h / 2, p.y + p.h / 2, 1); padCells.push({ p, gx1: Math.max(0, Math.floor((p.x - p.w / 2 - X0) / GS)), gx2: Math.min(gw - 1, Math.ceil((p.x + p.w / 2 - X0) / GS)), gy1: Math.max(0, Math.floor((p.y - p.h / 2 - Y0) / GS)), gy2: Math.min(gh - 1, Math.ceil((p.y + p.h / 2 - Y0) / GS)) }); continue; }
  markRect(master, p.x - p.w / 2 - CLR, p.x + p.w / 2 + CLR, p.y - p.h / 2 - CLR, p.y + p.h / 2 + CLR, 1);
  padCells.push({ p, gx1: Math.max(0, Math.floor((p.x - p.w / 2 - CLR - X0) / GS)), gx2: Math.min(gw - 1, Math.ceil((p.x + p.w / 2 + CLR - X0) / GS)), gy1: Math.max(0, Math.floor((p.y - p.h / 2 - CLR - Y0) / GS)), gy2: Math.min(gh - 1, Math.ceil((p.y + p.h / 2 + CLR - Y0) / GS)) });
}
markRect(master, -50, -49.7, -40, 40, 1); markRect(master, 49.7, 50, -40, 40, 1); markRect(master, -50, 50, -40, -39.7, 1); markRect(master, -50, 50, 39.7, 40, 1);

const thtBlocks = [];
for (const p of allPads) if (p.kind === "tht" || p.kind === "npth") thtBlocks.push([p.x - (Math.max(p.w, p.h) / 2 + 0.4), p.x + Math.max(p.w, p.h) / 2 + 0.4]);
const cols = [];
for (let x = -43; x <= 43; x += 0.6) if (thtBlocks.every(([a, b]) => x <= a || x >= b)) cols.push(+x.toFixed(3));
const powerNets = ["RAW", "V5", "V33", "AV33"];
const signalNets = Object.keys(padsByNet).filter(n => n !== "GND" && n !== "NC");
const centroid = n => { const ps = padsByNet[n].filter(p => p.kind !== "npth"); return ps.reduce((s, p) => s + p.x, 0) / ps.length; };
const ordered = [...powerNets, "CC1", "CC2", ...[...signalNets.filter(n => !powerNets.includes(n) && n !== "CC1" && n !== "CC2")].sort((a, b) => centroid(a) - centroid(b))];
if (ordered.length > cols.length) throw new Error("cols " + ordered.length + " > " + cols.length);
const netCol = {};
ordered.forEach((n, i) => { netCol[n] = cols[i]; });
const spareCols = cols.slice(ordered.length);

const segs = [];
const vias = [];
const addSeg = (net, layer, x1, y1, x2, y2, w) => segs.push({ net, layer, x1, y1, x2, y2, w });
const netW = n => (powerNets.includes(n) ? 0.4 : 0.3);
function rectFree(g, x1, x2, y1, y2) {
  const gx1 = Math.max(0, Math.floor((x1 - X0) / GS)), gx2 = Math.min(gw - 1, Math.ceil((x2 - X0) / GS));
  const gy1 = Math.max(0, Math.floor((y1 - Y0) / GS)), gy2 = Math.min(gh - 1, Math.ceil((y2 - Y0) / GS));
  for (let gy = gy1; gy <= gy2; gy++) { let b = gy * gw + gx1; for (let gx = gx1; gx <= gx2; gx++, b++) if (g[b]) return false; }
  return true;
}
function markTrace(g, x1, y1, x2, y2, w) {
  const half = w / 2 + CLR;
  markRect(g, Math.min(x1, x2) - half, Math.max(x1, x2) + half, Math.min(y1, y2) - half, Math.max(y1, y2) + half, 2);
}
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function mazeOn(g, sx, sy, tgtX, tgtYband) {
  const gx0 = Math.max(0, Math.min(gw - 1, Math.round((sx - X0) / GS)));
  const gy0 = Math.max(0, Math.min(gh - 1, Math.round((sy - Y0) / GS)));
  const startIdx = gy0 * gw + gx0;
  const dist = new Int32Array(gw * gh); dist.fill(-1);
  const prev = new Int32Array(gw * gh); prev.fill(-1);
  const q = []; dist[startIdx] = 0; q.push(startIdx);
  let qi = 0; const res = { goal: -1 };
  while (qi < q.length) {
    const cur = q[qi++];
    const cy = (cur / gw) | 0, cx = cur - cy * gw;
    const dyg = tgtYband ? Math.abs(c2y(cy) - tgtYband[0]) > tgtYband[1] : false;
    if (Math.abs(c2x(cx) - tgtX) <= 0.1 && !dyg) { res.goal = cur; break; }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || nx >= gw || ny < 0 || ny >= gh) continue;
      const idx = ny * gw + nx;
      if (dist[idx] >= 0 || g[idx]) continue;
      dist[idx] = dist[cur] + 1; prev[idx] = cur; q.push(idx);
    }
  }
  if (res.goal < 0) return null;
  const path = []; let cur = res.goal;
  while (prev[cur] >= 0) { path.push(cur); cur = prev[cur]; }
  path.push(startIdx); path.reverse();
  return path.map(i => { const cy = (i / gw) | 0, cx = i - cy * gw; return [c2x(cx), c2y(cy)]; });
}
function compressPath(path) {
  if (path.length <= 2) return path;
  const out = [path[0]];
  for (let i = 1; i < path.length - 1; i++) {
    const pp = path[i - 1], p = path[i], pn = path[i + 1];
    const collinear = (p[0] === pp[0] && p[0] === pn[0]) || (p[1] === pp[1] && p[1] === pn[1]);
    if (!collinear) out.push(p);
  }
  out.push(path[path.length - 1]);
  return out;
}
const pcByNet = {};
for (const pc of padCells) (pcByNet[pc.p.net] ||= []).push(pc);

const fails = [];
for (const net of ordered) {
  const CX0 = netCol[net];
  const w = netW(net);
  const g = master.slice();
  for (const pc of pcByNet[net] || []) {
    for (let gy = pc.gy1; gy <= pc.gy2; gy++) { let b = gy * gw + pc.gx1; for (let gx = pc.gx1; gx <= pc.gx2; gx++, b++) g[b] = 0; }
  }
  const rides = new Map();
  const addRide = (CX, y) => { if (!rides.has(CX)) rides.set(CX, []); rides.get(CX).push(y); };
  for (const p of padsByNet[net]) {
    if (p.kind === "npth") continue;
    let path = null, CX = CX0;
    path = mazeOn(g, p.x, p.y, CX0);
    if (!path) {
      for (const tv of vias.filter(v => v.net === net)) { path = mazeOn(g, p.x, p.y, tv.x, [tv.y, 1.2]); if (path) { CX = tv.x; break; } }
    }
    if (!path) {
      for (const sc of spareCols) { path = mazeOn(g, p.x, p.y, sc); if (path) { CX = sc; break; } }
    }
    if (!path) { fails.push({ c: p, p, net }); continue; }
    const end = path[path.length - 1];
    vias.push({ x: +end[0].toFixed(3), y: +end[1].toFixed(3), net, pad: 0.9, drill: 0.4 });
    addRide(CX, end[1]);
    const pth = compressPath(path);
    for (let i = 0; i < pth.length - 1; i++) {
      addSeg(net, "top", pth[i][0], pth[i][1], pth[i + 1][0], pth[i + 1][1], 0.25);
      markTrace(master, pth[i][0], pth[i][1], pth[i + 1][0], pth[i + 1][1], 0.25);
      markTrace(g, pth[i][0], pth[i][1], pth[i + 1][0], pth[i + 1][1], 0.25);
    }
  }
  for (const [CX, ys] of rides) {
    const ymin = Math.min(...ys), ymax = Math.max(...ys);
    addSeg(net, "bot", CX, ymin, CX, ymax, w);
    markTrace(master, CX, ymin, CX, ymax, w);
  }
  const cxs = [...rides.keys()];
  for (let i = 1; i < cxs.length; i++) {
    const a = cxs[0], b = cxs[i];
    const g2 = master.slice();
    for (const pc of pcByNet[net] || []) {
      for (let gy = pc.gy1; gy <= pc.gy2; gy++) { let b2 = gy * gw + pc.gx1; for (let gx = pc.gx1; gx <= pc.gx2; gx++, b2++) g2[b2] = 0; }
    }
    const yA = rides.get(a).reduce((s, v) => s + v, 0) / rides.get(a).length;
    const pathB = mazeOn(g2, a, yA, b);
    if (pathB && pathB.length > 1) {
      const endB = pathB[pathB.length - 1];
      vias.push({ x: a, y: +yA.toFixed(3), net, pad: 0.9, drill: 0.4 });
      vias.push({ x: +endB[0].toFixed(3), y: +endB[1].toFixed(3), net, pad: 0.9, drill: 0.4 });
      const pth = compressPath(pathB);
      for (let k = 0; k < pth.length - 1; k++) {
        addSeg(net, "top", pth[k][0], pth[k][1], pth[k + 1][0], pth[k + 1][1], 0.25);
        markTrace(master, pth[k][0], pth[k][1], pth[k + 1][0], pth[k + 1][1], 0.25);
      }
    }
  }
}
for (const c of model.comps) for (const p of c.pads) {
  if (p.net === "GND" && p.kind === "smd") {
    for (let t = 0; t < 14; t++) {
      const y = +(p.y - 1.0 - 0.5 * t).toFixed(3);
      if (rectFree(master, p.x - 0.5, p.x + 0.5, y - 0.5, y + 0.5)) { vias.push({ x: +p.x.toFixed(3), y, net: "GND", pad: 0.9, drill: 0.4 }); break; }
    }
  }
}
const botFeatures = [];
for (const s of segs.filter(s => s.layer === "bot")) {
  const w2 = s.w / 2 + 0.3;
  botFeatures.push({ x1: Math.min(s.x1, s.x2) - w2, x2: Math.max(s.x1, s.x2) + w2, y1: Math.min(s.y1, s.y2) - w2, y2: Math.max(s.y1, s.y2) + w2 });
}
for (const v of vias) botFeatures.push({ x1: v.x - 0.9, x2: v.x + 0.9, y1: v.y - 0.9, y2: v.y + 0.9 });
for (const p of allPads) if (p.net !== "GND" && (p.kind === "tht" || p.kind === "npth")) {
  const r = Math.max(p.w, p.h) / 2 + 0.4;
  botFeatures.push({ x1: p.x - r, x2: p.x + r, y1: p.y - r, y2: p.y + r });
}
const merged = [];
for (const f of botFeatures) {
  const x1 = Math.min(f.x1, f.x2), x2 = Math.max(f.x1, f.x2), y1 = Math.min(f.y1, f.y2), y2 = Math.max(f.y1, f.y2);
  if (merged.some(m => x1 + 0.05 >= m.x1 && x2 - 0.05 <= m.x2 && y1 + 0.05 >= m.y1 && y2 - 0.05 <= m.y2)) continue;
  merged.push({ x1, x2, y1, y2 });
}


// ============ RETRY PASS (only main-loop failures) ============
console.log("main-pass failures:", fails.length);
const markTrace2b = (s, g2) => {
  const half = s.w / 2 + 0.12;
  markRect(g2, Math.min(s.x1, s.x2) - half, Math.max(s.x1, s.x2) + half, Math.min(s.y1, s.y2) - half, Math.max(s.y1, s.y2) + half, 1);
};
const done = new Set();
for (const clearance of [0.12]) {
  const g2 = new Uint8Array(gw * gh);
  const mark2 = (x1, x2, y1, y2) => {
    const gx1 = Math.max(0, Math.floor((x1 - X0) / GS)), gx2 = Math.min(gw - 1, Math.ceil((x2 - X0) / GS));
    const gy1 = Math.max(0, Math.floor((y1 - Y0) / GS)), gy2 = Math.min(gh - 1, Math.ceil((y2 - Y0) / GS));
    for (let gy = gy1; gy <= gy2; gy++) { let b = gy * gw + gx1; for (let gx = gx1; gx <= gx2; gx++, b++) if (!g2[b]) g2[b] = 1; }
  };
  for (const p of allPads) {
    if (p.kind === "npth") { mark2(p.x - p.w / 2, p.x + p.w / 2, p.y - p.h / 2, p.y + p.h / 2); continue; }
    mark2(p.x - p.w / 2 - clearance, p.x + p.w / 2 + clearance, p.y - p.h / 2 - clearance, p.y + p.h / 2 + clearance);
  }
  mark2(-50, -49.7, -40, 40); mark2(49.7, 50, -40, 40); mark2(-50, 50, -40, -39.7); mark2(-50, 50, 39.7, 40);
  for (const s of segs) markTrace2b(s, g2);
  let fixed = 0;
  for (const f of fails) {
    if (done.has(f.net + f.c.ref + f.p.n)) continue;
    const p = f.p;
    if (p.net === "NC") { done.add(f.net + f.c.ref + f.p.n); continue; }
    for (const pc of padCells) if (pc.p.net === p.net) {
      for (let gy = pc.gy1; gy <= pc.gy2; gy++) { let b = gy * gw + pc.gx1; for (let gx = pc.gx1; gx <= pc.gx2; gx++, b++) g2[b] = 0; }
    }
    const targets = [];
    for (const v of vias) if (v.net === p.net) targets.push([v.x, v.y, true]);
    for (const c2 of cols) targets.push([c2, null, false]);
    let ok = false;
    for (const [tx, ty] of targets) {
      const path = mazeOn(g2, p.x, p.y, tx, ty == null ? null : [ty, 2.5]);
      if (path && path.length > 1) {
        const end = path[path.length - 1];
        vias.push({ x: +end[0].toFixed(3), y: +end[1].toFixed(3), net: p.net, pad: 0.9, drill: 0.4 });
        const pth = compressPath(path);
        for (let i = 0; i < pth.length - 1; i++) {
          addSeg(p.net, "top", pth[i][0], pth[i][1], pth[i + 1][0], pth[i + 1][1], 0.25);
          markTrace2b(segs[segs.length - 1], g2);
          markTrace(master, segs[segs.length - 1].x1, segs[segs.length - 1].y1, segs[segs.length - 1].x2, segs[segs.length - 1].y2, 0.12);
        }
        done.add(f.net + f.c.ref + f.p.n);
        fixed++; ok = true; break;
      }
    }
  }
  console.log("retry clearance=" + clearance + " fixed=" + fixed);
  if (fails.every(f => done.has(f.net + f.c.ref + f.p.n))) break;
}
const still = fails.filter(f => !done.has(f.net + f.c.ref + f.p.n)).map(f => f.net + "/" + f.c.ref + "." + f.p.n);
console.log("STILL UNCONNECTED: " + still.length);
if (still.length) console.log(still.join(", "));
const routedF = { board: { x1: -50, y1: -40, x2: 50, y2: 40 }, segments: segs, vias, carves: merged, ordered };
fs.writeFileSync("probe-pcb/routed.json", JSON.stringify(routedF, null, 1));
console.log("routed written: segs=" + segs.length + " vias=" + vias.length + " carves=" + merged.length);
