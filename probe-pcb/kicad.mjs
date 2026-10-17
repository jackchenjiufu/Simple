// kicad.mjs — emit a KiCad 7 project (.kicad_pcb/.kicad_pro) from model+routed
import fs from "fs";
const D = "probe-pcb/";
const model = JSON.parse(fs.readFileSync(D + "model_pretty.json", "utf8"));
const routed = JSON.parse(fs.readFileSync(D + "routed.json", "utf8"));
const out = D + "output/kicad/";
fs.mkdirSync(out, { recursive: true });
const netSet = new Set();
for (const c of model.comps) for (const p of c.pads) if (p.net && p.net !== "GND") netSet.add(p.net);
const nets = ["", "GND", ...[...netSet].sort()];
const netCode = {}; nets.forEach((n, i) => netCode[n] = i);
const ncode = (n) => netCode[n];
function invRot(x, y, rot) { const r = ((rot % 360) + 360) % 360; if (r === 90) return [y, -x]; if (r === 180) return [-x, -y]; if (r === 270) return [-y, x]; return [x, y]; }
const f2 = v => (Math.round(v * 1000) / 1000).toFixed(4);
const bodyRect = { s3: [16, 21.6], hub16: [11, 4.8], w55: [7, 7], typec: [9.2, 6.5], usb3a: [13, 9.5], rj45: [16.2, 16], soic8: [6, 4.4], dc005: [12, 11], x49: [8.4, 4.6], hdr1x4: [2.5, 9.2], led0603: [1.8, 1], r0603: [1.8, 1], r0805: [2.6, 1.4], r1206: [3.8, 1.7], ind6x6: [6.8, 6.8], caprad: [4, 4], sot223: [6.8, 3.8], sw6x6: [6.6, 6.6], ss34: [6.2, 4.6], mount: [3.4, 3.4] };
const VALUE = { RCC1: "5.1k", RCC2: "5.1k", D1: "SS34", D2: "SS34", L1: "10uH", U1: "MP1584EN", U2: "AMS1117-3.3", U3: "ESP32-S3-MINI-1", U4: "SL2.1A", U5: "INA219", U6: "INA219", U7: "W5500", J1: "TYPE-C-31-M-12", J2: "DC-005", J3: "USB3.0-A", J4: "USB3.0-A", J9: "HR911105A", X1: "12MHz", X2: "25MHz", SW1: "TACT", SW2: "TACT", J5: "HDR1x4", J6: "HDR1x4", J7: "HDR1x4", J8: "HDR1x4", LED1: "LED-0603", LED2: "LED-0603", LED3: "LED-0603", FB1: "FB-0805", RS1: "0.05R", RS2: "0.05R" };
const val = (ref, fp) => VALUE[ref] || (fp.includes("0603") ? "0603-P" : fp.includes("0805") ? "0805-P" : fp);
function fpBlock(c) {
  const rot = ((c.rot % 360) + 360) % 360;
  const [bw, bh] = bodyRect[c.fp] || [4, 4];
  let s = `  (footprint "probe:${c.ref}" (layer "F.Cu") (tedit 64A00000) (at ${f2(c.x)} ${f2(c.y)}${rot ? " " + rot : ""})\n`;
  s += `    (fp_text reference "${c.ref}" (at 0 ${f2(-bh / 2 - 1.2)}) (layer "F.SilkS") (effects (font (size 0.9 0.9) (thickness 0.15))))\n`;
  s += `    (fp_text value "${val(c.ref, c.fp)}" (at 0 ${f2(bh / 2 + 1.2)}) (layer "F.Fab") (effects (font (size 0.8 0.8) (thickness 0.15))))\n`;
  [[-bw/2, -bh/2, bw/2, -bh/2], [bw/2, -bh/2, bw/2, bh/2], [bw/2, bh/2, -bw/2, bh/2], [-bw/2, bh/2, -bw/2, -bh/2]].forEach(([x1, y1, x2, y2]) => s += `    (fp_line (start ${f2(x1)} ${f2(y1)}) (end ${f2(x2)} ${f2(y2)}) (stroke (width 0.12) (type solid)) (layer "F.SilkS"))\n`);
  for (const p of c.pads) {
    if (c.fp === "mount") continue;
    const [lx, ly] = invRot(p.x - c.x, p.y - c.y, c.rot);
    const prot = ((p.rot % 360) + 360) % 360;
    const shape = "rect";
    const layers = p.kind === "tht" ? '"*.Cu" "*.Mask"' : p.kind === "npth" ? '"*.Cu" "*.Mask"' : '"F.Cu" "F.Paste" "F.Mask"';
    const drill = p.drill ? ` (drill ${p.drill})` : "";
    const net = p.kind === "npth" ? 0 : ncode(p.net);
    const netS = net ? ` (net ${net} "${p.net}")` : "";
    const kindS = p.kind === "tht" ? "thru_hole" : p.kind === "npth" ? "np_thru_hole" : "smd";
    s += `    (pad "${p.n}" ${kindS} ${shape} (at ${f2(lx)} ${f2(ly)}${prot ? " " + prot : ""}) (size ${f2(p.w)} ${f2(p.h)})${drill} (layers ${layers})${netS})\n`;
  }
  return s + "  )\n";
}
let pcb = `(kicad_pcb (version 20231020) (generator pcbnew)\n`;
pcb += `  (general (thickness 1.6) (legacy_teardrops no))\n  (paper "A4")\n  (layers\n    (0 "F.Cu" signal)\n    (31 "B.Cu" signal)\n    (35 "F.Paste" user)\n    (36 "B.SilkS" user)\n    (37 "F.SilkS" user)\n    (38 "B.Mask" user)\n    (39 "F.Mask" user)\n    (44 "Edge.Cuts" user)\n    (46 "B.CrtYd" user)\n    (47 "F.CrtYd" user)\n  )\n`;
pcb += `  (setup (pad_to_mask_clearance 0.05) (solder_mask_min_width 0.1) (pcb_text_width 0.15) (line_width 0.15) (track_width 0.25) (clearance 0.2) (track_min 0.1) (via_size 0.9) (via_drill 0.4) (via_min_size 0.6) (hole_clearance 0.25))\n`;
for (const n of nets) pcb += `  (net ${nets.indexOf(n)} "${n}")\n`;
pcb += `  (net_class Default "This is the default net class." (clearance 0.2) (trace_width 0.25) (via_dia 0.9) (via_drill 0.4))\n`;
for (const c of model.comps) pcb += fpBlock(c);
pcb += `  (gr_rect (start -50 -40) (end 50 40) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts"))\n`;
for (const c of model.comps) for (const p of c.pads) if (c.fp === "mount") pcb += `  (gr_circle (center ${f2(c.x)} ${f2(c.y)}) (end ${f2(c.x + 1.6)} ${f2(c.y)}) (stroke (width 0.15) (type solid)) (layer "Edge.Cuts"))\n`;
for (const s of routed.segments) { const layer = s.layer === "top" ? "F.Cu" : "B.Cu"; pcb += `  (segment (start ${f2(s.x1)} ${f2(s.y1)}) (end ${f2(s.x2)} ${f2(s.y2)}) (width ${f2(s.w)}) (layer "${layer}") (net ${ncode(s.net)}))\n`; }
for (const v of routed.vias) pcb += `  (via (at ${f2(v.x)} ${f2(v.y)}) (size 0.9) (drill 0.4) (layers "F.Cu" "B.Cu") (net ${ncode(v.net)}))\n`;
pcb += ")\n";
fs.writeFileSync(out + "probe.kicad_pcb", pcb);
const pro = { "board": { "design_settings": { "rules": { "min_clearance": 0.2, "min_track_width": 0.1 } }, "layer_presets": [], "viewports": [] }, "meta": { "filename": "probe.kicad_pro", "version": 1 }, "project": { "boards": [], "libraries": { "pcm": [] }, "nets": nets.map(n => ({ name: n })), "sheets": [] }, "sheets": [] };
fs.writeFileSync(out + "probe.kicad_pro", JSON.stringify(pro, null, 1));
console.log("kicad written:", pcb.length, "bytes, nets:", nets.length);