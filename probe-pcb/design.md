# WiFiProbe v1.0 —— USB 探针监控板 设计文档

> 目标：为嘉立创（JLCPCB）下单打样的 2 层 PCB 探针监控板。
> 核心功能：监控连接在板上的 USB 设备（插拔/电流/电压），通过 **WiFi 或以太网**定时上传数据到服务器；USB-C 与 DC(5–12V) 双供电。

---

## 1. 系统框图

```
                     ┌────────────────────────────────────────────┐
                     │              WiFiProbe v1.0                │
  USB-C 5V ──D1──┐   │                                            │
                 ├─RAW─▶ U1 MP1584EN Buck ──V5(5.1V)─▶ U2 AMS1117 ─▶ V33(3.3V)
  DC 5–12V ─D2──┘   │                                            │
                     │   U3 ESP32-S3-MINI-1        (WiFi 上传/控制) │
                     │     ├─ I2C(IO4/IO5) ── U5/U6 INA219 ×2 ──▶ 2× 电流采样
                     │     ├─ SPI(IO6-9)   ── U7 W5500 ── J9 RJ45 网口 (通道2)
                     │     ├─ USB OTG(IO19/20) ── U4 SL2.1A ──▶ J3/J4 USB3.0-A ×2
                     │     └─ GPIO13/14 ── 状态 LED
                     └────────────────────────────────────────────┘
```

- 上传通道：WiFi（ESP32-S3 内置）与以太网（W5500）双通道，固件二选一/互为备份。
- 监控对象：两个 USB 3.0 蓝色 Type-A 口连接的设备；每路 VBUS 串接 0.05Ω 采样电阻，INA219 测电压+电流。
- USB 数据路径：ESP32-S3 作为 **USB Host** 经 SL2.1A 双口 Hub 枚举/检查设备（Type-A 口物理形态 USB 3.0，数据走 USB 2.0；SS 引脚悬空）。

---

## 2. 电源树

| 轨 | 说明 |
|---|---|
| RAW | USB-C VBUS(Schottky D1) 或 DC 5–12V(Schottky D2) |
| V5 | U1 MP1584EN 降压输出 **5.1V**（75k/10k），L1=10µH |
| V33 | U2 AMS1117-3.3 线性稳压 **3.3V** |
| VUSB1/VUSB2 | V5 经 0.05Ω 分流电阻直达 J3/J4 VBUS，常开 |

- C 口单独供电时 Buck 近直通，V5≈4.6–4.9V，设备可工作；更稳妥用 DC 供电。
- 去耦：U3 3V3 10µF+100nF；U7 各 AVDD 100nF + 4.7µF；U4 VDD5/VDD33 10µF+100nF。
- 推荐 DC：7–12V。

---

## 3. 引脚分配（官方数据为准）

### 3.1 ESP32-S3-MINI-1（模块，四边套筒焊盘 60+1）

| 焊盘 | 引脚 | 用途 | 连接 |
|---|---|---|---|
| 3 | 3V3 | 电源 | V33 |
| 1,2,42,43,46~60,61 | GND | 地 | GND |
| 45 | EN | 复位 | 10k上拉 V33 + 0.1µF；SW1→GND |
| 4 | GPIO0/BOOT | 下载 | 10k上拉；SW2→GND |
| 8 | GPIO4 | I2C SCL | 4.7k上拉；U5/U6；J6 |
| 9 | GPIO5 | I2C SDA | 4.7k上拉；U5/U6；J6 |
| 10 | GPIO6 | W5500 CS | U7 pin32 |
| 11 | GPIO7 | W5500 SCLK | U7 pin33 |
| 12 | GPIO8 | W5500 MOSI | U7 pin35 |
| 13 | GPIO9 | W5500 MISO | U7 pin34 |
| 14 | GPIO10 | W5500 RSTn | U7 pin37 |
| 15 | GPIO11 | W5500 INTn | U7 pin36 (10k上拉) |
| 17 | GPIO13 | LED2 WiFi | LED 1k |
| 18 | GPIO14 | LED3 监控 | LED 1k |
| 23 | GPIO19/USB_D− | 上游 D− | U4 pin9(DM) |
| 24 | GPIO20/USB_D+ | 上游 D+ | U4 pin10(DP) |
| 39 | GPIO43/TXD | 调试 TX | J5 |
| 40 | GPIO44/RXD | 调试 RX | J5 |
| 41,44 | GPIO45/46 | 保留 | 悬空 |

### 3.2 SL2.1A（USB2.0 4口 Hub，SOP-16，10×3.9mm P=1.27）

| 引脚 | 名称 | 连接 |
|---|---|---|
| 1,2 | DM4/DP4 | J8 扩展(端口4) |
| 3,4 | DM3/DP3 | J7 扩展(端口3) |
| 5,6 | DM2/DP2 | J4 USB3.0-A2 |
| 7,8 | DM1/DP1 | J3 USB3.0-A1 |
| 9,10 | DM/DP | 上游 ← S3 USB_D−/D+ |
| 11 | VDD5 | V5 |
| 12 | GND | GND |
| 13 | VDD33 | V33 |
| 14 | VDD18 | 1µF→GND |
| 15,16 | XOUT/XIN | X1 12MHz + 2×22pF |

### 3.3 W5500（LQFP-48，7×7mm P=0.5）

| 引脚 | 名称 | 连接 |
|---|---|---|
| 1,2 | TXN/TXP | → RJ45 TD−/TD+ |
| 5,6 | RXN/RXP | ← RJ45 RD−/RD+ |
| 3,9,14,16,19,29,48 | AGND/GND | GND |
| 4,8,11,15,17,21,28 | AVDD/VDD | V33（100nF各脚；经FB1磁珠共馈） |
| 10 | EXRES1 | 12.4kΩ→AGND |
| 18 | VBG | 0.1µF→GND |
| 20 | TOCAP | 8pF→AGND |
| 22 | 1V2O | 1µF→GND |
| 24~27 | SPD/LINK/DUPL/ACTLED | LINK/ACT 接 LED(1k 阳极接V33) |
| 30,31 | XI/XO | X2 25MHz + 22pF + 1MΩ |
| 32~35 | SCSn/SCLK/MISO/MOSI | ← GPIO6/7/9/8 |
| 36,37 | INTn/RSTn | INTn→GPIO11；RSTn→GPIO10（各自10k上拉） |
| 43,44,45 | PMODE2/1/0 | 各10k上拉（111 全能力自协商） |
| 7,12,13,23,38-42,46,47 | DNC/NC/RSVD | 悬空 |

### 3.4 USB3.0-A 说明
J3/J4 蓝色 9P 座（如 HC-USB3.0-L115-ZJ），仅用 2.0 端子：1=VBUS 2=D− 3=D+ 4=GND；SS 5 脚悬空。

---

## 4. 原理图关键点

- 电源：D1/D2=SS34；U1 MP1584EN(SOP-8：1=BST 2=IN 3=SW 4/5=GND 6=FB 7=COMP 8=EN)，BST 100nF，FB 75k/10k→5.1V，COMP 22nF→GND，VIN 22µF+100nF；U2 AMS1117-3.3(SOT-223：1=GND 2=OUT 3=IN Tab=GND)。
- USB：S3 USB_D± → SL2.1A DM/DP；下游 VBUS 常开；INA219 U5=0x40，U6=0x41；分流 0.05Ω 1% 1206。
- 以太网：HR911105A 引脚 1=TD+ 2=TD− 3=RD+ 6=RD−；TXP→1 TXN→2 RXP→3 RXN→6。
- 人机：SW1 复位、SW2 BOOT；J5 串口、J6 I2C、J7/J8 Hub 扩展；LED1 电源(V5,2k)、LED2 WiFi、LED3 监控。

---

## 5. BOM（LCSC 编号以实时库存为准）

| 位号 | 型号/参数 | 封装 | LCSC(参考) | 数量 |
|---|---|---|---|---|
| U3 | ESP32-S3-MINI-1-N8 | 模块 | 商城搜型 | 1 |
| U4 | SL2.1A | SOP-16 | C192893 | 1 |
| U7 | W5500 | LQFP-48 | C32843 | 1 |
| U1 | MP1584EN-LF-Z | SOP-8 | 搜型 | 1 |
| U2 | AMS1117-3.3 | SOT-223 | C6186 | 1 |
| U5,U6 | INA219AIDR | SOIC-8 | C8670 | 2 |
| J1 | TYPE-C-31-M-12 16P | 贴片 | C2765186 | 1 |
| J2 | DC-005 5.5×2.1 | 直插 | 搜型 | 1 |
| J3,J4 | USB3.0-A 蓝 9P | 直插 | HC-USB3.0-L115-ZJ | 2 |
| J9 | HR911105A | 16P | 搜型 | 1 |
| D1,D2 | SS34 | SMA | 搜型 | 2 |
| L1 | 10µH 2.2A | 6×6 SMD | 搜型 | 1 |
| X1,X2 | 12/25MHz | HC-49S | 搜型 | 2 |
| FB1 | 600Ω@100MHz | 0805 | 搜型 | 1 |
| RS1,RS2 | 0.05Ω 1% | 1206 | 搜型 | 2 |
| SW1,SW2 | 6×6×5 | 直插 | 搜型 | 2 |
| LED1-3 | 0603 | 0603 | 搜型 | 3 |
| J5-J8 | 排针 1×4 2.54 | 直插 | 搜型 | 4 |

阻容明细：10k×8、4.7k×2、1k×4、2k×1、75k×1、12.4k×1、5.1k×2、22pF×4、100nF×12、10µF×8、1µF×3、22µF/25V×1、100µF/16V×1、8pF×1、0.1µF(含 VBG)×1、22nF×1(COMP)。

---

## 6. PCB 规格

| 参数 | 值 |
|---|---|
| 尺寸 | 100 × 80 mm（四角 M3 Ø3.2） |
| 层数/板厚 | 2 层 / 1.6mm FR-4 |
| 表面 | 沉金(推荐) 或 喷锡 |
| 线宽/线距 | 信号 0.25/0.25；电源 0.5；D± 0.25 |
| 过孔 | 0.4/0.9mm |
| 布局 | 左电源；中上模块(天线朝上，禁铜)；右下 W5500+RJ45；右双 USB-A；底按键/LED/排针 |

---

## 7. 生产参数（嘉立创下单）
2 层、1.6mm、绿油、沉金、1oz 铜、最小 0.2mm；Gerber 上传，SMT 可选（BOM+坐标 CSV）。

---

## 8. 固件要点
1. INA219 轮询两路电流电压；2. TinyUSB Host 枚举；3. W5500 ioLibraryDriver + DHCP/MQTT/TCP；4. WiFi STA + HTTP POST/MQTT；5. 心跳 JSON 上报；6. IO45/46 勿用、GPIO0 复位逻辑。

---

## 9. 自检清单
- [ ] 器件方向/1脚、SL2.1A 上游 D± 不交叉、W5500 外围焊接、RJ45 差分对应、CC1/CC2 5.1k
- [ ] 上电顺序、首次烧录（BOOT 键）、天线区禁铜
- [ ] 首次打样后按第 4 节逐个测量 V5/V33/各 AVDD

---

## 10. 交付文件
output/gerber/*（GTL GBL GTS GBS GTO GBO GKO + TXT 钻孔）、output/bom.csv、output/pnp.csv、design.md、preview_*.png（核对用）


---

## A. 生成记录与验证结论（v1.0 生成版）

### A.1 最终摆位
- J1 Type-C（TYPE-C-31-M-12 立式）：(-44.5, 15) R180；CC1/CC2 的 5.1k 下拉 RCC1/RCC2 置于 J1 引脚排上方。
- J2 DC-005：(-45, -17) R180。
- U3 ESP32-S3-MINI-1：(0, 24) R180，天线朝板顶（上方保持禁铜区）。
- U4 SL2.1A：(-20, 6)；U7 W5500：(23, 9)；J9 RJ45（HR911105A）：(37.7, 28) R90，朝右上。
- J3/J4 USB3.0-A：右缘 (44, ±15) R270（开口朝右）。
- J6（I2C+电源排针）改放在 (9, 2) 开阔区；J5 串口在 (4, -34)；J7/J8 Hub 扩展在 (24/34, -34)。
- 四角 M3 安装孔 ±44/±34。

### A.2 布线与工艺
- 层数 2；信号线宽 0.25mm（电源 0.4mm）；列式+迷宫自动布线，过孔 0.4/0.9mm；
- 底层为 GND 整平面（对非地网络开隔离槽）。
- 遗留风险（务必先复核再打样）：
  1. 程序 DRC 存在约 130~390 处 ≤0.15mm 邻近/疑似重叠标记（多为 0.65mm 列距列间邻近及手工微调线段贴合），不代表已消除全部短路风险；
  2. W5500 ACTN（引脚 U7.27）与右侧引脚墙 0.5mm 间距无法引出——RJ45 绿灯通道不接（黄灯 LINKN→J9.12 正常）；
  3. USB 3.0 仅 2.0 数据、SS 引脚悬空（按需求确认）。
- 强烈建议：将本设计数据导入嘉立创EDA或 KiCad 做一次官方 DRC/ERC + 3D 预览后再下单；本包内 .mjs 脚本（build-model/router/gerber）可一键重生成。

### A.3 交付文件
- output/gerber/probe.GTL GBL GTS GBS GTO GBO GKO + probe.drl（PTH）+ probe-npth.drl（NPTH M3×4）+ probe-via.drl
- output/gerber/probe-bom.csv（SMT BOM）、probe-pnp.csv（贴片坐标）
- design.md、model.json/model_pretty.json、routed.json、build-model.mjs/router.mjs/gerber.mjs、research/


---


### B.2 原理图（可编辑 .kicad_sch 已补）
- 文件：`output/kicad/probe.kicad_sch`（KiCad 7，符号库内嵌，网络标签连接，与 PCB 网表同源一致）；
- 与 `probe.kicad_pcb` 一同导入嘉立创EDA即可获得"原理图+PCB"完整工程；
- 原理图采用"引脚网络标签"式连接（无长走线），导入后网络自动相连；如需美观重排，可后续在EDA里整理版面。


---

## B. 导入嘉立创EDA 步骤（已近官方文档核实）

文件：`probe-pcb/output/probe-kicad.zip`（含 probe.kicad_pcb/.kicad_sch/.kicad_pro，KiCad 打包结构）
单文件：`probe-pcb/output/kicad/probe.kicad_pcb` 等

### 专业版（推荐，支持"压缩包整体导入"）
1. 进入 嘉立创EDA专业版 开始页（新版客户端/网页版均可）；
2. 开始页顶部 → **导入（文件迁移）** → 选 **KiCad** 类型 → 选择 `probe-kicad.zip`；
   （或：新建/打开工程后 文件 → 导入 → 其他格式 → KiCad，选择该 zip）
3. 等迁移完成 → 打开的工程即包含 **原理图 + PCB + 网络**；
4. 官方提示：导入后**铺铜会自动重建，结果会有差异，请检查**（本板 GND 铺铜建议导入后手动重铺）；DRC 需重新跑。

### 标准版（立创EDA）
1. 文件 → **导入 → KiCad**；
2. 分别导入 `probe.kicad_sch`（原理图）与 `probe.kicad_pcb`（PCB）；
3. 若提示版本过低，请用 KiCad 6/7 打开任一文件"另存"一次再导入。

### 打样兜底路径
不导入也不影响下单：直接到 jlc.com 上传 `output/gerber/` 里的 Gerber+钻孔（只加工不可编辑）。
## C. 3D 预览告警处理（74 元件未绑定 3D）

**性质**：该告警只影响"3D 预览/结构检查"，不影响制造。原因是生成的封装未外挂 3D 模型。

**处理方式（任选其一）**：

1. **按 LCSC 编号自动匹配（推荐，最省事）**
   - 已把关键编号写入 `probe-pcb/output/gerber/probe-bom.csv` 的 "LCSC Part #" 列；
   - 嘉立创EDA 中：打开导入的 PCB → 菜单 **3D → 3D 模型管理器**（或 工具→3D模型管理器）→ 批量选中元件 → "从立创商城元件库匹配 3D 模型" → 软件按 LCSC 编号/封装自动下载并绑定；
   - 已核实编号：U3=C2913206(ESP32-S3-MINI-1-N8)，U4=C192893(SL2.1A)，U7=C32843(W5500)，U1=C15724(MP1584EN)，U2=C6186(AMS1117-3.3)，U5/U6=C2155799(INA219BIDR，替代 AIDR)，D1/D2=C83961 或 C379147(SS34)，J9=C12074(HR911105A)，J1=C2765186(16P Type-C)；其余按型号商城搜索（DC-005、USB3.0-A、12/25MHz 晶振、6×6 按键、排针、LED、0603/0805/1206 阻容等）。

2. **按通用封装手动绑 3D**
   - 每个元件 → 右键 → **属性 → 3D 模型** → "导入 3D 模型文件/从群库选择"；嘉立创EDA 群库含常用封装 3D（SOP-16、LQFP-48、SOT-223、SOP-8、Type-C、USB-A、RJ45、0603/0805/1206、排针等），逐个选完即可。

3. **不在意就不管**：告警可忽略，下单/生产完全不受影响。

---

## D. DRC 报告位置与用法

- **程序自动 DRC**：`probe-pcb/qa-report.json`（当前结论：NOT READY YET - 布线未完成，不能打样；未连接焊盘 27 个，清单在文件内；两类间距统计见 `programmatic_drc`）。
- **嘉立创EDA 官方 DRC（最终裁决）**：
  - 专业版：打开 PCB 编辑页 → 菜单 **设计 → 检查 DRC**（快捷键 Ctrl+Shift+D？以菜单为准；面板底部"DRC 检查"标签实时给结果）。
  - 标准版：PCB 页 → 菜单 **设计 → 设计规则** 设置规则 → **检查（DRC）**。
  - 导入后先在 EDA 重布线/补网络，再跑 DRC 清零后才可下单。
- 本设计当前"待办"：27 个焊盘未接入网络（多为 W5500 SPI/ETH/I2C/USB 供电网），详见 qa-report.json。
