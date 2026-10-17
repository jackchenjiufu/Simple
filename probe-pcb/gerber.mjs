// gerber.mjs — emit production files from model+routed
import fs from "fs";
const D = "probe-pcb/";
const model = JSON.parse(fs.readFileSync(D + "model_pretty.json", "utf8"));
const routed = JSON.parse(fs.readFileSync(D + "routed.json", "utf8"));
const out = D + "output/gerber/";
fs.mkdirSync(out, { recursive: true });
const fmt = v => (Math.round(v * 10000) / 10000).toFixed(4);
const H = "%FSLAX24Y24*%\n%MOMM*%\n%IPPOS*%\n%AMRECT8*\n0 Rectangle*\n1 1*\n4 0 0*\n20 1 1*\n%\n";
const AT = [];
const apid = (k) => { const i = AT.findIndex(a => a.k === k); if (i >= 0) return AT[i].d; const d = 10 + AT.length; AT.push({ k, d }); return d; };
const rectAperture = (w, h) => "RECT8," + (+w).toFixed(3) + "X" + (+h).toFixed(3);
function rectPoly(x, y, w, h) { return "G36*\nG01X" + fmt(x - w / 2) + "Y" + fmt(y - h / 2) + "D02*\nG01X" + fmt(x + w / 2) + "Y" + fmt(y - h / 2) + "D01*\nG01X" + fmt(x + w / 2) + "Y" + fmt(y + h / 2) + "D01*\nG01X" + fmt(x - w / 2) + "Y" + fmt(y + h / 2) + "D01*\nG01X" + fmt(x - w / 2) + "Y" + fmt(y - h / 2) + "D01*\nG37*\n"; }
function circlePts(cx, cy, r, n) { n = n || 48; const pts = []; for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; }
let gtop = H;
for (const c of model.comps) for (const p of c.pads) {
  if (p.kind === "npth") continue;
  if (p.kind === "tht") { const d = Math.max(p.w, p.h); gtop += "%ADD" + apid("C" + d) + "C," + d.toFixed(3) + "*%\nX" + fmt(p.x) + "Y" + fmt(p.y) + "D03*\n"; continue; }
  gtop += "%ADD" + apid(rectAperture(p.w, p.h)) + rectAperture(p.w, p.h) + "*%\nX" + fmt(p.x) + "Y" + fmt(p.y) + "D03*\n";
}
for (const v of routed.vias) { gtop += "%ADD" + apid("C" + v.pad) + "C," + v.pad + "*%\nX" + fmt(v.x) + "Y" + fmt(v.y) + "D03*\n"; }
for (const s of routed.segments.filter(s => s.layer === "top")) { gtop += "%ADD" + apid("C" + s.w) + "C," + s.w + "*%\nG01X" + fmt(s.x1) + "Y" + fmt(s.y1) + "D02*\nG01X" + fmt(s.x2) + "Y" + fmt(s.y2) + "D01*\n"; }
let gbot = H;
gbot += "G36*\nG01X" + fmt(-50) + "Y" + fmt(-40) + "D02*\nG01X" + fmt(50) + "Y" + fmt(-40) + "D01*\nG01X" + fmt(50) + "Y" + fmt(40) + "D01*\nG01X" + fmt(-50) + "Y" + fmt(40) + "D01*\nG01X" + fmt(-50) + "Y" + fmt(-40) + "D01*\nG37*\n";
for (const cv of routed.carves) gbot += rectPoly(cv.x1, cv.y1, cv.x2, cv.y2);
for (const c of model.comps) for (const p of c.pads) if (p.kind === "npth") gbot += rectPoly(p.x, p.y, p.w, p.h);
for (const s of routed.segments.filter(s => s.layer === "bot")) { gbot += "%ADD" + apid("C" + s.w) + "C," + s.w + "*%\nG01X" + fmt(s.x1) + "Y" + fmt(s.y1) + "D02*\nG01X" + fmt(s.x2) + "Y" + fmt(s.y2) + "D01*\n"; }
for (const v of routed.vias) { gbot += "%ADD" + apid("C" + v.pad) + "C," + v.pad + "*%\nX" + fmt(v.x) + "Y" + fmt(v.y) + "D03*\n"; }
for (const c of model.comps) for (const p of c.pads) { if (p.kind === "tht") { const d = Math.max(p.w, p.h); gbot += "%ADD" + apid("C" + d) + "C," + d.toFixed(3) + "*%\nX" + fmt(p.x) + "Y" + fmt(p.y) + "D03*\n"; } }
let gts = H, gbs = H;
for (const c of model.comps) for (const p of c.pads) {
  if (p.kind === "npth") continue;
  const w = p.w + 0.06, h = p.h + 0.06;
  if (p.kind === "smd") { gts += "%ADD" + apid(rectAperture(w, h)) + rectAperture(w, h) + "*%\nX" + fmt(p.x) + "Y" + fmt(p.y) + "D03*\n"; } else { const d = Math.max(w, h); const k = "C" + d.toFixed(3); gts += "%ADD" + apid(k) + "C," + d.toFixed(3) + "*%\nX" + fmt(p.x) + "Y" + fmt(p.y) + "D03*\n"; gbs += "%ADD" + apid(k) + "C," + d.toFixed(3) + "*%\nX" + fmt(p.x) + "Y" + fmt(p.y) + "D03*\n"; }
}
for (const v of routed.vias) { const k = "C" + (v.pad + 0.08).toFixed(3); gts += "%ADD" + apid(k) + "C," + (v.pad + 0.08).toFixed(3) + "*%\nX" + fmt(v.x) + "Y" + fmt(v.y) + "D03*\n"; gbs += "%ADD" + apid(k) + "C," + (v.pad + 0.08).toFixed(3) + "*%\nX" + fmt(v.x) + "Y" + fmt(v.y) + "D03*\n"; }
const bodyRect = { s3: [8, 13.5], hub16: [5.5, 2.4], w55: [4, 4], typec: [4.8, 4.8], usb3a: [7.5, 9.5], rj45: [8.5, 8.5], soic8: [3, 2.4], dc005: [9, 7], x49: [5.5, 3], hdr1x4: [1, 8.5], led0603: [1, 0.8], r0603: [1, 0.8], r0805: [1.4, 1], r1206: [2, 1.2], ind6x6: [3.4, 3.4], caprad: [3, 3], sot223: [3.2, 3.4], sw6x6: [3.4, 3.4], ss34: [3, 2.4], mount: [2, 2] };
let gto = H + "%ADD" + apid("C0.15") + "C,0.150*%\n";
for (const c of model.comps) { const b = bodyRect[c.fp]; if (!b) continue; const hw = b[0] / 2, hh = b[1] / 2, x = c.x, y = c.y; gto += "G36*\nG01X" + fmt(x - hw) + "Y" + fmt(y - hh) + "D02*\nG01X" + fmt(x + hw) + "Y" + fmt(y - hh) + "D01*\nG01X" + fmt(x + hw) + "Y" + fmt(y + hh) + "D01*\nG01X" + fmt(x - hw) + "Y" + fmt(y + hh) + "D01*\nG01X" + fmt(x - hw) + "Y" + fmt(y - hh) + "D01*\nG37*\n"; }
let gko = H + "%ADD" + apid("C0.15") + "C,0.150*%\nG01X" + fmt(-50) + "Y" + fmt(-40) + "D02*\nG01X" + fmt(50) + "Y" + fmt(-40) + "D01*\nG01X" + fmt(50) + "Y" + fmt(40) + "D01*\nG01X" + fmt(-50) + "Y" + fmt(40) + "D01*\nG01X" + fmt(-50) + "Y" + fmt(-40) + "D01*\n";
for (const c of model.comps) for (const p of c.pads) if (p.kind === "npth") { gko += "G01X" + fmt(p.x + p.w / 2) + "Y" + fmt(p.y) + "D02*\n"; for (const pt of circlePts(p.x, p.y, p.w / 2)) gko += "G01X" + fmt(pt[0]) + "Y" + fmt(pt[1]) + "D01*\n"; }
const tail = "M02*\n";
fs.writeFileSync(out + "probe.GTL", gtop + tail);
fs.writeFileSync(out + "probe.GBL", gbot + tail);
fs.writeFileSync(out + "probe.GTS", gts + tail);
fs.writeFileSync(out + "probe.GBS", gbs + tail);
fs.writeFileSync(out + "probe.GTO", gto + tail);
fs.writeFileSync(out + "probe.GBO", H + "M02*\n");
fs.writeFileSync(out + "probe.GKO", gko + tail);
const holes = [];
for (const c of model.comps) for (const p of c.pads) if (p.kind === "tht" || p.kind === "npth") holes.push({ x: p.x, y: p.y, d: p.drill || p.w, npth: p.kind === "npth" });
const viasH = routed.vias.map(v => ({ x: v.x, y: v.y, d: v.drill, npth: false }));
function drillFile(list) { const tools = {}; for (const h of list) { const k = h.d.toFixed(2); tools[k] = (tools[k] || 0) + 1; } let s = "M48\nMETRIC,TZ\n"; const keys = Object.keys(tools).sort((a, b) => +a - +b); keys.forEach((k, i) => { s += "T" + (i + 1) + "C" + k + "\n"; }); s += "%\n"; for (const h of list) { const k = h.d.toFixed(2); s += "T" + (keys.indexOf(k) + 1) + "X" + fmt(h.x) + "Y" + fmt(h.y) + "\n"; } s += "T0\nM30\n"; return s; }
fs.writeFileSync(out + "probe.drl", drillFile(holes.filter(h => !h.npth)));
fs.writeFileSync(out + "probe-npth.drl", drillFile(holes.filter(h => h.npth)));
fs.writeFileSync(out + "probe-via.drl", drillFile(viasH.concat(holes)));
const VALUE = { RCC1: "5.1k 1%", RCC2: "5.1k 1%", D1: "SS34", D2: "SS34", L1: "10uH 2.2A", U1: "MP1584EN", U2: "AMS1117-3.3", U3: "ESP32-S3-MINI-1-N8", U4: "SL2.1A", U5: "INA219AIDR", U6: "INA219AIDR", U7: "W5500", J1: "TYPE-C-31-M-12", J2: "DC-005 5.5x2.1", J3: "USB3.0-A BLUE 9P", J4: "USB3.0-A BLUE 9P", J9: "HR911105A RJ45+mag", X1: "12MHz", X2: "25MHz", SW1: "6x6x5 tact", SW2: "6x6x5 tact", J5: "PinHeader 1x4", J6: "PinHeader 1x4", J7: "PinHeader 1x4", J8: "PinHeader 1x4", LED1: "LED 0603 red", LED2: "LED 0603 green", LED3: "LED 0603 yellow", FB1: "FB 600R@100MHz", RS1: "0.05R 1% 1206", RS2: "0.05R 1% 1206" };
function valFor(ref, fp) { if (VALUE[ref]) return VALUE[ref]; if (fp === "r0603") return "0603 pass"; if (fp === "r0805") return "0805 pass"; if (fp === "r1206") return "1206"; return fp; }
let bom = "Comment,Designator,Footprint,LCSC Part #,Qty\n";
const groups = {};
for (const c of model.comps) { const val = valFor(c.ref, c.fp); const key = val + "|" + c.fp; if (!groups[key]) groups[key] = { val, fp: c.fp, refs: [] }; groups[key].refs.push(c.ref); }
for (const g of Object.values(groups)) bom += g.val + "," + g.refs.join(",") + "," + g.fp + ",N/A," + g.refs.length + "\n";
fs.writeFileSync(out + "probe-bom.csv", bom);
let pnp = "Designator,Mid X,Mid Y,Rotation,Layer,Footprint\n";
for (const c of model.comps) pnp += c.ref + "," + (+(c.x + 50).toFixed(2)) + "," + (+(c.y + 40).toFixed(2)) + "," + c.rot + ",top," + c.fp + "\n";
fs.writeFileSync(out + "probe-pnp.csv", pnp);
console.log("EMITTED ok; GTL lines=" + (gtop.split("\n").length) + " GBL=" + (gbot.split("\n").length) + " vias=" + routed.vias.length);