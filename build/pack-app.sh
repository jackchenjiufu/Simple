#!/usr/bin/env bash
# DOO Android APK 打包脚本（离线 SDK）
#
# 解决的核心问题：uni-app 运行时会比对「前端资源的 compilerVersion」和「离线 SDK 的版本」，
# 不一致就弹窗告警（例如资源 5.24 / SDK 5.15）。HBuilderX 主程序是靠环境变量
# UNI_COMPILER_VERSION 注入这个值的，所以本脚本直接从 SDK 目录名解析出版本号并注入，
# 保证两者永远一致，不再需要事后改产物里的字符串。
#
# 用法: bash build/pack-app.sh
# 前置: E:\poo\doo\manifest.json 里改好 versionName / versionCode

set -euo pipefail

PROJ="/e/poo/doo"
SDK_ROOT="/d/offline-sdk/Android-SDK@5.15.82650_20260710"
SHELL_PROJ="$SDK_ROOT/HBuilder-Integrate-AS"
MODULE="simpleDemo"
APPID="__UNI__F3BE11F"
HX_CLI="/d/HBuilderX515/plugins/uniapp-cli-vite"
HX_CLI_W='D:\HBuilderX515\plugins\uniapp-cli-vite'
NODE="/d/HBuilderX515/plugins/node18/node.exe"
OUT="$PROJ/unpackage/dist/build/app-plus"

# 1. 从 SDK 目录名解析版本，如 Android-SDK@5.15.82650_20260710 -> 5.15
SDK_VER=$(basename "$SDK_ROOT" | sed -E 's/.*@([0-9]+\.[0-9]+).*/\1/')
if [ -z "$SDK_VER" ]; then echo "无法从 $SDK_ROOT 解析 SDK 版本"; exit 1; fi
echo "== SDK 版本: $SDK_VER"

# 2. 从 manifest.json 读版本号（唯一真值来源）
VN=$(python -c "import json,io;print(json.load(io.open(r'E:\poo\doo\manifest.json',encoding='utf-8'))['versionName'])")
VC=$(python -c "import json,io;print(json.load(io.open(r'E:\poo\doo\manifest.json',encoding='utf-8'))['versionCode'])")
echo "== 打包版本: $VN ($VC)"

# 3. 编译前端资源，compilerVersion 与 SDK 对齐
echo "== 编译前端资源（compilerVersion=$SDK_VER）"
rm -rf "$OUT"
export UNI_PLATFORM=app NODE_ENV=production
export UNI_INPUT_DIR='E:\poo\doo'
export UNI_OUTPUT_DIR='E:\poo\doo\unpackage\dist\build\app-plus'
export UNI_CLI_CONTEXT="$HX_CLI_W"
# MSYS_NO_PATHCONV 只对这一条命令生效：防止 bash 把 D:\ 路径改写成 /d/，
# 若全局导出会破坏后面 gradlew 的 classpath 转换
MSYS_NO_PATHCONV=1 UNI_COMPILER_VERSION="$SDK_VER" \
  "$NODE" "$HX_CLI_W\\node_modules\\@dcloudio\\vite-plugin-uni\\bin\\uni.js" build -p app

# 4. 校验戳记（不一致就终止，绝不带病打包）
STAMP=$(grep -o '"compilerVersion":"[^"]*"' "$OUT/app-config-service.js" | head -1 | sed -E 's/.*:"([^"]*)".*/\1/')
if [ "$STAMP" != "$SDK_VER" ]; then
  echo "!! 产物 compilerVersion=$STAMP，与 SDK $SDK_VER 不一致，终止"; exit 1
fi
grep -q '"pages/monitor/index"' "$OUT/app-service.js" || echo "!! 警告: 产物里没找到监控页"
echo "== 资源 OK: compilerVersion=$STAMP，大小 $(du -sh "$OUT" | cut -f1)"

# 5. 换入 Android 壳工程（旧资源自动备份）
WWW="$SHELL_PROJ/$MODULE/src/main/assets/apps/$APPID/www"
if [ -d "$WWW" ]; then cp -r "$WWW" "$WWW.bak-$(date +%Y%m%d-%H%M%S)"; fi
rm -rf "$WWW"
cp -r "$OUT" "$WWW"
echo "== 资源已换入 $MODULE"

# 6. 同步 build.gradle 版本号
GRADLE="$SHELL_PROJ/$MODULE/build.gradle"
sed -i -E "s/versionCode [0-9]+/versionCode $VC/; s/versionName \"[^\"]*\"/versionName \"$VN\"/" "$GRADLE"
echo "== build.gradle -> $VN ($VC)"

# 7. 打包
echo "== Gradle 打包"
cd "$SHELL_PROJ"
./gradlew ":$MODULE:assembleRelease" --no-daemon 2>&1 | tr -d '\0' | iconv -f GBK -t UTF-8 2>/dev/null | tail -5

# 8. 输出产物信息
SRC="$SHELL_PROJ/$MODULE/build/outputs/apk/release/simpleDemo-release.apk"
DST="/c/Users/chenj/Simple-DOO-$VN.apk"
cp "$SRC" "$DST"
echo
echo "== 完成: $DST"
echo "   大小: $(stat -c %s "$DST") 字节"
echo "   MD5 : $(md5sum "$DST" | cut -d' ' -f1)"
echo "   版本: $VN ($VC)，compilerVersion=$STAMP"
echo "   签名: $(keytool -list -v -keystore "$SHELL_PROJ/$MODULE/simple.keystore" -storepass "$(grep -oP "storePassword '\K[^']+" "$GRADLE")" 2>/dev/null | grep -m1 'SHA256:')"
