// WiFiProbe v1.0 — board model builder
import fs from "fs";
const R = "probe-pcb/research/";
const parsePads = (text) => {
  const pads = [];
  const re = /\(pad\s+"([^"]*)"\s+(\w+)\s+([\w.]+)\s+\(at\s+([-\d.]+)\s+([-\d.]+)(?:\s+(\d+))?\)\s+\(size\s+([-\d.]+)\s+([-\d.]+)\)(?:\s+\(drill\s+([-\d.]+)\))?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const kraw = m[2]; const kind = kraw === "thru_hole" ? "tht" : kraw === "np_thru_hole" ? "npth" : kraw; pads.push({ n: m[1], kind, shape: m[3], x: +m[4], y: +m[5], rot: m[6] ? +m[6] : 0, w: +m[7], h: +m[8], drill: m[9] ? +m[9] : (kind === "npth" ? 0 : null) });
  }
  return pads;
};
const PAD = (n, kind, shape, x, y, w, h, drill, rot = 0) => ({ n, kind, shape, x, y, rot, w, h, drill });
const FPS = {
  s3: { pads: parsePads(fs.readFileSync(R + "esp_s3mini1_fp.kicad_mod", "utf8")), body: [-8, -13.2, 8, 8.4] },
  hub16: { pads: parsePads(fs.readFileSync(R + "soic16.kicad_mod", "utf8")), body: [-5.1, -2.0, 5.1, 2.0] },
  w55: { pads: parsePads(fs.readFileSync(R + "lqfp48.kicad_mod", "utf8")), body: [-3.5, -3.5, 3.5, 3.5] },
  typec: { pads: parsePads(fs.readFileSync(R + "typec_31m12.kicad_mod", "utf8")), body: [-4.6, -4.5, 4.6, 2.0] },
  usb3a: { pads: parsePads(fs.readFileSync(R + "usb3a_wuerth.kicad_mod", "utf8")), body: [-7.1, -9.0, 7.1, 0.5] },
  rj45: { pads: parsePads(fs.readFileSync(R + "rj45_hr911105a.kicad_mod", "utf8")), body: [-3.6, -3.0, 12.5, 12.0] },
  soic8: { pads: parsePads(fs.readFileSync(R + "soic8.kicad_mod", "utf8")), body: [-2.5, -2.0, 2.5, 2.0] },
  dc005: { pads: [PAD("1","tht","round",0,0,3.6,3.6,2.0), PAD("2","tht","round",-3.8,0,2.4,2.4,1.2), PAD("3","tht","round",3.8,0,2.4,2.4,1.2), PAD("4","tht","round",-7.6,0,2.2,2.2,1.0), PAD("5","tht","round",7.6,0,2.2,2.2,1.0)], body: [-9,-7,9,7] },
  x49: { pads: [PAD("1","tht","round",-2.44,0,1.9,1.9,0.95), PAD("2","tht","round",2.44,0,1.9,1.9,0.95)], body: [-5.5,-2.6,5.5,2.6] },
  hdr1x4: { pads: [0,1,2,3].map(i => PAD(String(i+1),"tht","round",0,i*2.54,1.7,1.7,1.0)), body: [-0.8,-0.6,0.8,8.0] },
  led0603: { pads: [PAD("1","smd","rect",-0.75,0,0.8,0.9), PAD("2","smd","rect",0.75,0,0.8,0.9)], body: [-0.9,-0.5,0.9,0.5] },
  r0603: { pads: [PAD("1","smd","rect",-0.75,0,0.8,0.9), PAD("2","smd","rect",0.75,0,0.8,0.9)], body: [-0.9,-0.5,0.9,0.5] },
  r0805: { pads: [PAD("1","smd","rect",-1.0,0,1.0,1.2), PAD("2","smd","rect",1.0,0,1.0,1.2)], body: [-1.3,-0.7,1.3,0.7] },
  r1206: { pads: [PAD("1","smd","rect",-1.6,0,1.5,1.4), PAD("2","smd","rect",1.6,0,1.5,1.4)], body: [-1.9,-0.85,1.9,0.85] },
  ind6x6: { pads: [PAD("1","smd","rect",-2.1,0,2.0,2.2), PAD("2","smd","rect",2.1,0,2.0,2.2)], body: [-3.3,-3.3,3.3,3.3] },
  caprad: { pads: [PAD("+","tht","round",1.75,0,2.2,2.2,0.9), PAD("-","tht","round",-1.75,0,2.2,2.2,0.9)], body: [-2.5,-2.5,2.5,2.5] },
  sot223: { pads: [PAD("1","smd","rect",-2.29,1.45,1.5,1.55), PAD("2","smd","rect",0,1.45,2.6,1.95), PAD("3","smd","rect",2.29,1.45,1.5,1.55)], body: [-1.7,-1.7,1.7,1.7] },
  sw6x6: { pads: [PAD("1","tht","round",-2.9,-2.9,1.6,1.6,1.1), PAD("2","tht","round",2.9,-2.9,1.6,1.6,1.1), PAD("3","tht","round",-2.9,2.9,1.6,1.6,1.1), PAD("4","tht","round",2.9,2.9,1.6,1.6,1.1)], body: [-3.4,-3.4,3.4,3.4] },
  ss34: { pads: [PAD("1","smd","rect",-1.9,0,2.4,2.6), PAD("2","smd","rect",1.9,0,2.4,2.6)], body: [-2.6,-1.8,2.6,1.8] },
  mount: { pads: [PAD("1","npth","round",0,0,3.4,3.4,3.2)], body: [-2,-2,2,2] }
};
const C = [];
const A = (ref, fp, x, y, rot, nets) => C.push({ ref, fp, x, y, rot, nets });
A("J1","typec",-44.5,15,180,{A4:"RAW_L",B4:"RAW_L",A9:"RAW_L",B9:"RAW_L",A1:"GND",B1:"GND",A12:"GND",B12:"GND",A5:"CC1",B5:"CC2",SH:"GND","":"GND"});
A("RCC1","r0603",-42,21.6,0,{1:"CC1",2:"GND"});
A("RCC2","r0603",-45.75,21.2,90,{1:"CC2",2:"GND"});
A("J2","dc005",-41.8,-17,180,{1:"DC_IN",2:"GND",3:"GND",4:"NC",5:"NC"});
A("D1","ss34",-35,13,90,{1:"RAW_L",2:"RAW"});
A("D2","ss34",-35,2,90,{1:"DC_IN",2:"RAW"});
A("CVIN","r0805",-31,16.5,0,{1:"RAW",2:"GND"});
A("U1","soic8",-30,-5,0,{1:"BST",2:"RAW",3:"SW",4:"GND",5:"GND",6:"FB",7:"COMP",8:"EN"});
A("CBST","r0603",-24,-6.5,90,{1:"BST",2:"SW"});
A("L1","ind6x6",-22,-11,0,{1:"SW",2:"V5"});
A("RFBT","r0603",-24,-14.5,0,{1:"V5",2:"FB"});
A("RFBB","r0603",-22.5,-17.5,90,{1:"FB",2:"GND"});
A("CCOMP","r0603",-17,-6.5,90,{1:"COMP",2:"GND"});
A("CV5A","r0805",-17,-9.5,0,{1:"V5",2:"GND"});
A("CV5B","r0805",-15,-12.5,0,{1:"V5",2:"GND"});
A("CV5C","caprad",-11,-17,0,{"+":"V5","-":"GND"});
A("U2","sot223",-24,-24,0,{1:"GND",2:"V33",3:"V5"});
A("C33A","r0805",-19,-26.5,0,{1:"V33",2:"GND"});
A("C33B","r0805",-16,-29.5,0,{1:"V33",2:"GND"});
A("U3","s3",0,24,180,{3:"V33",1:"GND",2:"GND",42:"GND",43:"GND",45:"ENN",4:"BOOTN",8:"SCL",9:"SDA",10:"W_CS",11:"W_SCLK",12:"W_MOSI",13:"W_MISO",14:"W_RST",15:"W_INT",17:"LED2K",18:"LED3K",23:"HUB_DM",24:"HUB_DP",39:"UTX",40:"URX",61:"GND"});
A("REN","r0603",-8,33.5,90,{1:"ENN",2:"V33"});
A("CEN","r0603",-5,33,0,{1:"ENN",2:"GND"});
A("RBOOT","r0603",5,33.5,90,{1:"BOOTN",2:"V33"});
A("SW1","sw6x6",-26,-33,0,{1:"ENN",2:"ENN",3:"GND",4:"GND"});
A("SW2","sw6x6",-36,-33,0,{1:"BOOTN",2:"BOOTN",3:"GND",4:"GND"});
A("RP_I1","r0603",13,33,90,{1:"SCL",2:"V33"});
A("RP_I2","r0603",13,35.5,90,{1:"SDA",2:"V33"});
A("U4","hub16",-20,6,0,{1:"H4_DM",2:"H4_DP",3:"H3_DM",4:"H3_DP",5:"H2_DM",6:"H2_DP",7:"H1_DM",8:"H1_DP",9:"HUB_DM",10:"HUB_DP",11:"V5",12:"GND",13:"V33",14:"V18N",15:"X1B",16:"X1A"});
A("CHUB5","r0805",-15,8.5,0,{1:"V5",2:"GND"});
A("CHUB33","r0603",-14,11,0,{1:"V33",2:"GND"});
A("CV18","r0603",-11.5,9.5,0,{1:"V18N",2:"GND"});
A("X1","x49",-26,12,0,{1:"X1A",2:"X1B"});
A("CX1A","r0603",-24.5,17,90,{1:"X1A",2:"GND"});
A("CX1B","r0603",-21.5,17,90,{1:"X1B",2:"GND"});
A("U5","soic8",30.5,17.5,0,{1:"V5",2:"VU1",3:"GND",4:"SCL",5:"SDA",6:"NC",7:"V33",8:"VU1"});
A("U6","soic8",30.5,-17.5,0,{1:"V5",2:"VU2",3:"GND",4:"SCL",5:"SDA",6:"NC",7:"V33",8:"VU2"});
A("RS1","r1206",30.5,22,90,{1:"V5",2:"VU1"});
A("RS2","r1206",30.5,-22,90,{1:"V5",2:"VU2"});
A("J3","usb3a",44,15,270,{1:"VU1",2:"H1_DM",3:"H1_DP",4:"GND",SH:"GND","":"GND"});
A("J4","usb3a",44,-15,270,{1:"VU2",2:"H2_DM",3:"H2_DP",4:"GND",SH:"GND","":"GND"});
A("J5","hdr1x4",4,-34,0,{1:"V33",2:"UTX",3:"URX",4:"GND"});
A("J6","hdr1x4",10.6,1.5,0,{1:"V33",2:"SCL",3:"SDA",4:"GND"});
A("J7","hdr1x4",24,-34,0,{1:"V5",2:"H3_DM",3:"H3_DP",4:"GND"});
A("J8","hdr1x4",34,-34,0,{1:"V5",2:"H4_DM",3:"H4_DP",4:"GND"});
A("LED1","led0603",-20,-33.5,0,{1:"GND",2:"LED1A"});
A("RLED1","r0603",-15.5,-32.5,90,{1:"LED1A",2:"V5"});
A("LED2","led0603",-12,-33.5,0,{1:"LED2K",2:"LED2A"});
A("RLED2","r0603",-7.5,-32.5,90,{1:"LED2A",2:"V33"});
A("LED3","led0603",-4,-33.5,0,{1:"LED3K",2:"LED3A"});
A("RLED3","r0603",0.5,-32.5,90,{1:"LED3A",2:"V33"});
A("U7","w55",23,9,0,{1:"ETH_TXN",2:"ETH_TXP",3:"GND",4:"AV33",5:"ETH_RXN",6:"ETH_RXP",7:"NC",8:"AV33",9:"GND",10:"EXRES",11:"AV33",12:"NC",13:"NC",14:"GND",15:"AV33",16:"GND",17:"AV33",18:"VBGN",19:"GND",20:"TOCAPN",21:"AV33",22:"V12O",23:"NC",24:"NC",25:"LINKN",26:"NC",27:"ACTN",28:"AV33",29:"GND",30:"X2A",31:"X2B",32:"W_CS",33:"W_SCLK",34:"W_MISO",35:"W_MOSI",36:"W_INT",37:"W_RST",38:"NC",39:"NC",40:"NC",41:"NC",42:"NC",43:"PM2",44:"PM1",45:"PM0",46:"NC",47:"NC",48:"GND"});
A("REX","r0603",17.5,12,90,{1:"EXRES",2:"GND"});
A("CTOC","r0603",17.5,14.5,90,{1:"TOCAPN",2:"GND"});
A("CV12","r0603",15,15,0,{1:"V12O",2:"GND"});
A("CVBG","r0603",15,7.5,0,{1:"VBGN",2:"GND"});
A("FB1","r0805",8,9.5,90,{1:"V33",2:"AV33"});
A("CAV1","r0603",11.5,12.5,90,{1:"AV33",2:"GND"});
A("CAV2","r0603",11.5,15,90,{1:"AV33",2:"GND"});
A("CAV3","r0603",14,17.5,0,{1:"AV33",2:"GND"});
A("CAVB","r0805",18.5,8,0,{1:"AV33",2:"GND"});
A("X2","x49",26.5,3.5,0,{1:"X2A",2:"X2B"});
A("CX2A","r0603",25,-0.8,90,{1:"X2A",2:"GND"});
A("CX2B","r0603",28,-0.8,90,{1:"X2B",2:"GND"});
A("RX2","r0603",26.5,0.8,90,{1:"X2A",2:"X2B"});
A("J9","rj45",37.7,27.4,90,{1:"ETH_TXP",2:"ETH_TXN",3:"ETH_RXP",4:"NC",5:"NC",6:"ETH_RXN",7:"NC",8:"NC",9:"LEDG_A",10:"ACTN",11:"LEDY_A",12:"LINKN",SH:"GND","":"GND"});
A("RLEDG","r0603",30,26,90,{1:"LEDG_A",2:"V33"});
A("RLEDY","r0603",30,28.5,90,{1:"LEDY_A",2:"V33"});
A("RPM0","r0603",21,22.5,0,{1:"PM0",2:"V33"});
A("RPM1","r0603",18.5,22.5,0,{1:"PM1",2:"V33"});
A("RPM2","r0603",16,22.5,0,{1:"PM2",2:"V33"});
[["M1",-44,-34],["M2",-44,34],["M3",44,-34],["M4",44,34]].forEach(([r,x,y])=>A(r,"mount",x,y,0,{1:"GND"}));
const rotP = (x, y, rot) => { const r = ((rot % 360) + 360) % 360; if (r === 90) return [-y, x]; if (r === 180) return [-x, -y]; if (r === 270) return [y, -x]; return [x, y]; };
const comps = C.map(comp => {
  const fp = FPS[comp.fp];
  const pads = fp.pads.map(p => {
    const [x, y] = rotP(p.x, p.y, comp.rot);
    let w = p.w, h = p.h;
    const rtot = (((p.rot || 0) + comp.rot) % 360 + 360) % 360;
    if ((rtot === 90 || rtot === 270) && (p.shape === "rect" || p.shape === "roundrect")) [w, h] = [h, w];
    return { ...p, x: x + comp.x, y: y + comp.y, w, h, rtot };
  });
  return { ...comp, pads };
});
const netOf = (c, p) => c.nets[p.n] === undefined ? (p.kind === "npth" ? "GND" : "NC") : c.nets[p.n];
const model = {
  board: { w: 100, h: 80 },
  comps: comps.map(c => ({ ref: c.ref, fp: c.fp, x: c.x, y: c.y, rot: c.rot, pads: c.pads.map(p => ({ n: p.n, kind: p.kind, x: +p.x.toFixed(3), y: +p.y.toFixed(3), w: +p.w.toFixed(3), h: +p.h.toFixed(3), rot: p.rtot, drill: p.drill, shape: p.shape, net: netOf(c, p) })) }))
};
fs.writeFileSync("probe-pcb/model.json", JSON.stringify(model));
fs.writeFileSync("probe-pcb/model_pretty.json", JSON.stringify(model, null, 1));
console.log("model built:", comps.length, "comps,", comps.reduce((s, c) => s + c.pads.length, 0), "pads");