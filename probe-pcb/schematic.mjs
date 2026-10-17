import fs from "fs";
const D = "probe-pcb/";
const model = JSON.parse(fs.readFileSync(D + "model_pretty.json", "utf8"));
function uid() { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); }); }
const U = () => uid();
function pinDecl(n, name, side, idx, total, elen) { const length = elen || 2.54; const span = (total - 1) * 2.54; const y = -span / 2 + idx * 2.54; const dir = { L: [180, -1], R: [0, 1] }[side]; return { n, name, x: dir[1] > 0 ? 7.62 : -7.62, y, angle: dir[0], len: length }; }
const T = {
  "probe:R": { p: [{ n: "1" }, { n: "2" }] },
  "probe:C": { p: [{ n: "1" }, { n: "2" }] },
  "probe:L": { p: [{ n: "1" }, { n: "2" }] },
  "probe:FB": { p: [{ n: "1" }, { n: "2" }] },
  "probe:LED": { p: [{ n: "1" }, { n: "2" }] },
  "probe:XTAL": { p: [{ n: "1" }, { n: "2" }] },
  "probe:D": { p: [{ n: "1" }, { n: "2" }] },
  "probe:SW": { p: [{ n: "1" }, { n: "2" }, { n: "3" }, { n: "4" }] },
  "probe:HDR4": { p: [{ n: "1" }, { n: "2" }, { n: "3" }, { n: "4" }] },
  "probe:DCJACK": { p: [{ n: "1" }, { n: "2" }, { n: "3" }] },
  "probe:MP1584": { p: "1 2 3 4 5 6 7 8".split(" ").map(n => ({ n })) },
  "probe:INA219": { p: "1 2 3 4 5 6 7 8".split(" ").map(n => ({ n })) },
  "probe:AMS1117": { p: [{ n: "1" }, { n: "2" }, { n: "3" }] },
  "probe:HUB16": { p: Array.from({ length: 16 }, (_, i) => ({ n: String(i + 1) })) },
  "probe:W5500": { p: Array.from({ length: 48 }, (_, i) => ({ n: String(i + 1) })) },
  "probe:S3": { p: Array.from({ length: 61 }, (_, i) => ({ n: String(i + 1) })) },
  "probe:TYPEC": { p: ["A1","A4","A5","A6","A7","A8","A9","A12","B1","B4","B5","B6","B7","B8","B9","B12","SH"].map(n => ({ n })) },
  "probe:USBA": { p: ["1","2","3","4","5","6","7","8","9","SH"].map(n => ({ n })) },
  "probe:RJ45": { p: ["1","2","3","4","5","6","7","8","9","10","11","12","SH"].map(n => ({ n })) }
};
const PN = {};
PN["probe:HUB16"] = ["DM4","DP4","DM3","DP3","DM2","DP2","DM1","DP1","DM","DP","VDD5","GND","VDD33","VDD18","XOUT","XIN"];
PN["probe:MP1584"] = ["BST","IN","SW","GND","GND","FB","COMP","EN"];
PN["probe:INA219"] = ["IN+","IN-","GND","SCL","SDA","ALERT","VS","VBUS"];
PN["probe:AMS1117"] = ["GND","VOUT","VIN"];
PN["probe:W5500"] = ["TXN","TXP","AGND","AVDD","RXN","RXP","DNC","AVDD","AGND","EXRES1","AVDD","NC","NC","AGND","AVDD","AGND","AVDD","VBG","AGND","TOCAP","AVDD","1V2O","RSVD","SPDLED","LINKLED","DUPLED","ACTLED","VDD","GND","XI","XO","SCSn","SCLK","MISO","MOSI","INTn","RSTn","RSVD","RSVD","RSVD","RSVD","RSVD","PMODE2","PMODE1","PMODE0","NC","NC","AGND"];
PN["probe:RJ45"] = ["TD+","TD-","RD+","NC","NC","RD-","NC","NC","LEDG_A","ACTN","LEDY_A","LINKN","SH"];
PN["probe:USBA"] = ["VBUS","D-","D+","GND","SSRX-","SSRX+","GND","SSTX-","SSTX+","SH"];
PN["probe:TYPEC"] = ["A1","A4","A5","A6","A7","A8","A9","A12","B1","B4","B5","B6","B7","B8","B9","B12","SH"];
PN["probe:S3"] = ["GND","GND","3V3","GPIO0/BOOT","GPIO1","GPIO2","GPIO3","GPIO4","GPIO5","GPIO6","GPIO7","GPIO8","GPIO9","GPIO10","GPIO11","GPIO12","GPIO13","GPIO14","GPIO15","GPIO16","GPIO17","GPIO18","GPIO19/USB_D-","GPIO20/USB_D+","GPIO21","GPIO26","GPIO47","SPIIO4/GPIO33","SPIIO5/GPIO34","GPIO48","SPIIO6/GPIO35","SPIIO7/GPIO36","SPIDQS/GPIO37","GPIO38","MTCK/GPIO39","MTDO/GPIO40","MTDI/GPIO41","MTMS/GPIO42","U0TXD/GPIO43","U0RXD/GPIO44","GPIO45","GND","GND","GPIO46","EN","GND","GND","GND","GND","GND","GND","GND","GND","GND","GND","GND","GND","GND","GND","GND","GND"];
PN["probe:DCJACK"] = ["+","-","NC"];
PN["probe:D"] = ["A","K"];
PN["probe:LED"] = ["K","A"];
function symName(comp) { const fp = comp.fp; if (fp === "r0603" || fp === "r0805" || fp === "r1206") return "probe:R"; if (fp.startsWith("cap") ) return "probe:C"; if (fp === "ind6x6") return "probe:L"; if (fp === "led0603") return "probe:LED"; if (fp === "x49") return "probe:XTAL"; if (fp === "ss34") return "probe:D"; if (fp === "sw6x6") return "probe:SW"; if (fp === "hdr1x4") return "probe:HDR4"; if (fp === "dc005") return "probe:DCJACK"; if (fp === "soic8") return comp.ref.startsWith("U5") || comp.ref.startsWith("U6") ? "probe:INA219" : "probe:MP1584"; if (fp === "sot223") return "probe:AMS1117"; if (fp === "hub16") return "probe:HUB16"; if (fp === "w55") return "probe:W5500"; if (fp === "s3") return "probe:S3"; if (fp === "typec") return "probe:TYPEC"; if (fp === "usb3a") return "probe:USBA"; if (fp === "rj45") return "probe:RJ45"; return null; }
const POS = { U1: [25, 30], U2: [25, 70], J1: [25, 110], J2: [25, 150], D1: [60, 110], D2: [60, 130], L1: [60, 40], RCC1: [60, 100], RCC2: [60, 90], CVIN: [25, 45], CBST: [60, 50], RFBT: [60, 60], RFBB: [60, 70], CCOMP: [60, 80], CV5A: [60, 20], CV5B: [60, 15], CV5C: [25, 55], C33A: [25, 85], C33B: [25, 95], U3: [130, 40], REN: [105, 75], CEN: [130, 80], RBOOT: [130, 90], SW1: [155, 100], SW2: [155, 115], RP_I1: [105, 60], RP_I2: [105, 50], U5: [225, 30], U6: [225, 60], RS1: [190, 30], RS2: [190, 60], J3: [260, 30], J4: [260, 60], U4: [190, 120], X1: [225, 140], CX1A: [225, 130], CX1B: [225, 120], CHUB5: [190, 100], CHUB33: [190, 90], CV18: [190, 80], J7: [260, 120], J8: [260, 135], J5: [155, 140], J6: [155, 160], LED1: [190, 160], RLED1: [190, 170], LED2: [190, 185], RLED2: [190, 195], LED3: [190, 210], RLED3: [190, 220], U7: [330, 55], REX: [295, 25], CTOC: [295, 35], CV12: [295, 45], CVBG: [295, 55], FB1: [360, 25], CAV1: [360, 35], CAV2: [360, 45], CAV3: [360, 55], CAVB: [360, 65], X2: [330, 15], CX2A: [295, 65], CX2B: [295, 75], RX2: [315, 75], J9: [395, 55], RLEDG: [395, 25], RLEDY: [395, 35], RPM0: [395, 70], RPM1: [395, 80], RPM2: [395, 90] };
const VALUE = { RCC1: "5.1k", RCC2: "5.1k", D1: "SS34", D2: "SS34", L1: "10uH", U1: "MP1584EN", U2: "AMS1117-3.3", U3: "ESP32-S3-MINI-1", U4: "SL2.1A", U5: "INA219", U6: "INA219", U7: "W5500", J1: "TYPE-C-31-M-12", J2: "DC-005", J3: "USB3.0-A", J4: "USB3.0-A", J9: "HR911105A", X1: "12MHz", X2: "25MHz", SW1: "TACT", SW2: "TACT", J5: "HDR1x4", J6: "HDR1x4", J7: "HDR1x4", J8: "HDR1x4", LED1: "LED-0603", LED2: "LED-0603", LED3: "LED-0603", FB1: "FB-0805", RS1: "0.05R", RS2: "0.05R" };
const TYPES = Object.keys(T); let lib = "";
for (const type of TYPES) { const t = T[type]; const pw = Math.ceil(t.p.length / 2);
  const pins = t.p.map((p, i) => { const side = i < t.p.length / 2 ? "L" : "R"; const idx = i < t.p.length / 2 ? i : t.p.length - 1 - i; return { n: p.n, name: (PN[type] || [])[i] || p.n, side, idx, x: side === "L" ? -7.62 : 7.62, y: -((pw - 1) * 2.54) / 2 + idx * 2.54, angle: side === "L" ? 180 : 0, len: 2.54, i }; });
  lib += `(symbol "${type}" (pin_names (offset 1.016)) (exclude_from_sim no) (in_bom yes) (on_board yes)\n`;
  lib += `  (property "Reference" "U" (at 0 0 0) (effects (font (size 1.27 1.27))))\n`;
  lib += `  (property "Value" "${type.split(":")[1]}" (at 0 0 0) (effects (font (size 1.27 1.27))))\n`;
  lib += `  (property "Footprint" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))\n`;
  lib += `  (property "Datasheet" "" (at 0 0 0) (effects (font (size 1.27 1.27)) hide))\n`;
  lib += `  (symbol "${type}_0_1"\n`;
  lib += `    (rectangle (start -7.62 ${-pw * 1.27}) (end 7.62 ${pw * 1.27}) (stroke (width 0.254) (type default)) (fill (type background)))\n`;
  for (const p of pins) {
    const ptype = p.name.includes("GND") ? "power_in" : "passive";
    lib += `    (pin ${ptype} line (at ${p.x} ${p.y} ${p.angle}) (length ${p.len}) (name "${p.name}" (effects (font (size 1.27 1.27)))) (number "${p.n}" (effects (font (size 1.27 1.27)))))\n`;
  }
  lib += `  )\n)\n`;
}
const comps = model.comps.filter(c => c.fp !== "mount");
const inst = []; const wires = []; const labels = [];
for (const c of comps) { const type = symName(c); if (!type) continue;
  const pos = POS[c.ref] || [100, 10 + comps.indexOf(c) * 5]; const x = pos[0], y = pos[1];
  const t = T[type]; const pw = Math.ceil(t.p.length / 2);
  inst.push(`\n  (symbol (lib_id "${type}") (at ${x} ${y} 0) (unit 1)`);
  inst.push(`    (in_bom yes) (on_board yes) (dnp no) (uuid ${U()})`);
  inst.push(`    (property "Reference" "${c.ref}" (at ${x + 5.08} ${y - pw} 0) (effects (font (size 1.27 1.27))))`);
  inst.push(`    (property "Value" "${VALUE[c.ref] || c.fp}" (at ${x + 5.08} ${y + pw + 2.54} 0) (effects (font (size 1.27 1.27))))`);
  inst.push(`    (property "Footprint" "probe:${c.ref}" (at ${x} ${y} 0) (effects (font (size 1.27 1.27)) hide))`);
  for (let i = 0; i < t.p.length; i++) { const pn = t.p[i].n;
    const side = i < t.p.length / 2 ? "L" : "R"; const idx = i < t.p.length / 2 ? i : t.p.length - 1 - i;
    const lx = side === "L" ? -7.62 : 7.62; const ly = -((pw - 1) * 2.54) / 2 + idx * 2.54;
    inst.push(`    (pin "${pn}" (uuid ${U()}))`);
    const pad = c.pads.find(p => String(p.n) === String(pn)); const net = pad ? pad.net : null;
    if (net && net !== "NC") { const wx = x + lx, wy = y + ly, tx = x + (side === "L" ? lx - 2.54 : lx + 2.54), ty = y + ly;
      wires.push(`  (wire (pts (xy ${wx} ${wy}) (xy ${tx} ${ty})) (stroke (width 0) (type default)) (uuid ${U()}))`);
      labels.push(`  (label "${net}" (at ${tx} ${ty} 0) (effects (font (size 1.27 1.27)) (justify left)))`);
    }
  }
  inst.push(`  )`);
}
lib = `(lib_symbols\n${lib})\n`;
const sch = `(kicad_sch (version 20231120) (generator eeschema)\n  (uuid ${U()})\n  (paper "A3")\n  (title_block (title "WiFiProbe v1.0") (rev "1.0") (company "probe"))\n${lib}  (sheet_instances (path "/" (page "1")))\n${inst.join("\n")}\n${wires.join("\n")}\n${labels.join("\n")}\n)\n`;
fs.writeFileSync(D + "output/kicad/probe.kicad_sch", sch);
console.log("sch OK: " + sch.length + " chars; syms=" + Object.keys(T).length + " inst=" + comps.length + " wires=" + wires.length + " labels=" + labels.length);