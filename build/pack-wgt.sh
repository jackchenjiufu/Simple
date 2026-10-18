#!/usr/bin/env bash
# DOO wgt 热更新包构建脚本
#
# 与 pack-app.sh 共用同一套 5.15 离线编译器：热更新包也必须带正确的 compilerVersion，
# 否则装进 App 后运行时仍会比对版本并弹窗告警。
#
# 版本号规则（2026-10-18 起）：
#   版本号只属于 APK。wgt 不单独升号，而是「当前 APK 版本 + '.' + 构建时分」，
#   例如 APK 2.9.4 上打的热更新包版本是 2.9.4.1855。
#   原因：wgt 抢号和 APK 同号会导致两个问题 —— APK 号被跳空，
#   以及同号的热更新包因为「版本没变大」装不进去。
#   wgt 的 versionCode 与已装 APK 相同，plus.runtime.install(force:true) 可覆盖安装。
#
# 用法: bash build/pack-wgt.sh
# 产物: /c/Users/chenj/app_wgt_v<版本>_<时间戳>.wgt
#       版本号写在 /c/Users/chenj/app_wgt_version.txt

set -euo pipefail

PROJ="/e/poo/doo"
SDK_ROOT="/d/offline-sdk/Android-SDK@5.15.82650_20260710"
HX_CLI_W='D:\HBuilderX515\plugins\uniapp-cli-vite'
NODE="/d/HBuilderX515/plugins/node18/node.exe"
OUT="$PROJ/unpackage/dist/build/app-plus"

SDK_VER=$(basename "$SDK_ROOT" | sed -E 's/.*@([0-9]+\.[0-9]+).*/\1/')
if [ -z "$SDK_VER" ]; then echo "无法从 $SDK_ROOT 解析 SDK 版本"; exit 1; fi
echo "== SDK 版本: $SDK_VER"

VN=$(python -c "import json,io;print(json.load(io.open(r'E:\\poo\\doo\\manifest.json',encoding='utf-8'))['versionName'])")
VC=$(python -c "import json,io;print(json.load(io.open(r'E:\\poo\\doo\\manifest.json',encoding='utf-8'))['versionCode'])")
STAMP_NAME=$(date +%Y%m%d%H%M)
# wgt 版本 = APK 版本 + 构建时分（保证同号 APK 上多次热更新也能按版本递增装进去）
WGT_VER="$VN.${STAMP_NAME:8:4}"
echo "== wgt 版本: $WGT_VER （APK $VN / $VC，不升 APK 号）"

echo "== 编译前端资源（compilerVersion=$SDK_VER）"
rm -rf "$OUT"
export UNI_PLATFORM=app NODE_ENV=production
export UNI_INPUT_DIR='E:\poo\doo'
export UNI_OUTPUT_DIR='E:\poo\doo\unpackage\dist\build\app-plus'
export UNI_CLI_CONTEXT="$HX_CLI_W"
MSYS_NO_PATHCONV=1 UNI_COMPILER_VERSION="$SDK_VER" \
  "$NODE" "$HX_CLI_W\\node_modules\\@dcloudio\\vite-plugin-uni\\bin\\uni.js" build -p app

STAMP=$(grep -o '"compilerVersion":"[^"]*"' "$OUT/app-config-service.js" | head -1 | sed -E 's/.*:"([^"]*)".*/\1/')
if [ "$STAMP" != "$SDK_VER" ]; then
  echo "!! 产物 compilerVersion=$STAMP，与 SDK $SDK_VER 不一致，终止"; exit 1
fi
echo "== 资源 OK: compilerVersion=$STAMP"

# 本次修复必须在产物里：状态栏遮罩 + 服务详情页
if grep -q 'sb-mask' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含状态栏遮罩 sb-mask"
else
  echo "!! 产物里没有 sb-mask，说明改的源码没被编进来，终止"; exit 1
fi
if grep -q 'pages/monitor/service' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含服务详情页 pages/monitor/service"
else
  echo "!! 产物里没有服务详情页，终止"; exit 1
fi

# 仪表板页签必须真的编进来（数据源 Grafana，走后端 /monitor/dashboard）
if grep -q 'Grafana' "$OUT/app-service.js" && grep -q '仪表板' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含仪表板页签 + Grafana 数据源"
else
  echo "!! 产物里没有仪表板页签，终止"; exit 1
fi

# 播放页必须带上「从原生播放器返回自动回片库」这段逻辑
if grep -q '播放器已关闭' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含播放页返回自动回片库"
else
  echo "!! 产物里没有播放页返回逻辑，说明改的源码没被编进来，终止"; exit 1
fi

# 影片详情页必须真的编进来（点海报先进详情页，再选播放/选集）
if grep -q '正在读取影片信息' "$OUT/app-service.js" && grep -q 'pages/monitor/detail' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含影片详情页"
else
  echo "!! 产物里没有影片详情页，终止"; exit 1
fi

# 更新提示抽屉必须真的编进来，且「立即更新」指向版本更新页（2.9.3 起下载统一走那个页面）
if grep -q 'update-sheet' "$OUT/app-service.js" && grep -q 'pages/info/check-update' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含更新提示抽屉 + 跳转版本更新页"
else
  echo "!! 产物里没有更新提示抽屉或跳转目标，终止"; exit 1
fi

# 告警页签必须直接铺开全量内容（组件已编入、且不再有「查看全部」跳页）
if grep -q 'fchip' "$OUT/app-service.js" && grep -q '确认是真人' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含告警页签面板（统计/筛选/分组/裁决抽屉）"
else
  echo "!! 产物里没有告警面板，说明组件没被编进去，终止"; exit 1
fi
if grep -q '查看全部' "$OUT/app-service.js"; then
  echo "!! 产物里还有「查看全部」，说明跳独立告警页的入口没删干净，终止"; exit 1
fi

# 服务器卡片详情抽屉必须编进来（网口状态 / 监听端口 / 日志，同页弹出）
if grep -q 'hdx-nic' "$OUT/app-service.js" && grep -q '监听端口' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含主机详情抽屉（网口/端口/日志）"
else
  echo "!! 产物里没有主机详情抽屉，说明改动没被编进来，终止"; exit 1
fi

# 监控页签仅超级管理员可见（2.8.6）：权限工具与守卫必须真的编进来
if grep -q '该功能仅超级管理员可见' "$OUT/app-service.js" && grep -q 'setTabBarItem' "$OUT/app-service.js"; then
  echo "== 校验通过: 产物含超管权限守卫 + 页签显隐"
else
  echo "!! 产物里没有超管权限守卫，说明 perm.js 没被编进来，终止"; exit 1
fi

WGT="/c/Users/chenj/app_wgt_v${VN//./_}_${STAMP_NAME}.wgt"
echo "$WGT_VER" > /c/Users/chenj/app_wgt_version.txt

# wgt 就是 app-plus 产物的 zip（根目录直接是 manifest.json / app-service.js）
# 必须写入目录条目：plus.runtime.install 的解压器不会自动创建父目录，
# 少了 "pages/"、"static/" 这些条目，子目录里的 *.css 和图片会装不进去 ——
# 表现就是 JS 正常跑、页面样式全丢（白底纯文本）。
rm -f "$WGT"
cd "$OUT"
python - "$WGT" <<'PY'
import os, sys, zipfile
target = sys.argv[1]
root = os.getcwd()

dirs, files = [], []
for dirpath, dirnames, filenames in os.walk(root):
    dirnames.sort()
    for d in dirnames:
        p = os.path.join(dirpath, d)
        dirs.append(os.path.relpath(p, root).replace('\\', '/') + '/')
    for fn in sorted(filenames):
        p = os.path.join(dirpath, fn)
        files.append((p, os.path.relpath(p, root).replace('\\', '/')))

with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for d in sorted(dirs):
        z.writestr(zipfile.ZipInfo(d), b'')
    for p, arc in files:
        z.write(p, arc)
print(f"   打包 {len(files)} 个文件 + {len(dirs)} 个目录条目")
PY

# 复核：目录条目必须在，否则装到手机上是「无样式」
python - "$WGT" <<'PY'
import sys, zipfile
z = zipfile.ZipFile(sys.argv[1])
names = set(z.namelist())
need = ['pages/', 'pages/monitor/', 'static/', 'static/img/', 'static/img/icons/']
miss = [n for n in need if n not in names]
if miss:
    raise SystemExit(f"!! wgt 缺少目录条目: {miss}")
if z.testzip() is not None:
    raise SystemExit("!! wgt CRC 校验失败")
print("   复核通过：目录条目齐全、CRC 正常")
PY

echo
echo "== 完成: $WGT"
echo "   大小: $(stat -c %s "$WGT") 字节"
echo "   MD5 : $(md5sum "$WGT" | cut -d' ' -f1)"
echo "   版本: $VN ($VC)，compilerVersion=$STAMP"
