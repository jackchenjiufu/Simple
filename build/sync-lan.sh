#!/usr/bin/env bash
# 把发布包同步到家里服务器的内网下载目录（nginx location /dl/ → /opt/dl）
#
# 为什么需要：App 在家连 WiFi 时会先探 http://192.168.1.32/dl/ping.txt，
# 探通了就从内网直接拉安装包/热更新包，46MB 不绕公网。发新包后忘了同步，
# App 会 404 → 自动退回公网（不会报错，但白跑一趟公网），所以发版顺手执行一次。
#
# 用法:
#   bash build/sync-lan.sh                       # 同步 139 上最新的 apk + wgt
#   bash build/sync-lan.sh app_v2_8_5.apk        # 只同步指定文件
set -euo pipefail

REL_PORT=2341
REL_HOST=root@139.196.185.197
DL_DIR=/www/wwwroot/139.196.185.197_7070/doo/server/downloads
LAN_PORT=3333
LAN_KEY=/root/.ssh/box_backup_ed25519

ssh_rel() { ssh -o BatchMode=yes -p "$REL_PORT" "$REL_HOST" "$@"; }

if [ "$#" -gt 0 ]; then
  FILES=("$@")
else
  APK=$(ssh_rel "ls -t $DL_DIR/app_v*.apk 2>/dev/null | head -1 | xargs -r basename")
  WGT=$(ssh_rel "ls -t $DL_DIR/app_wgt_*.wgt 2>/dev/null | head -1 | xargs -r basename")
  FILES=()
  [ -n "${APK:-}" ] && FILES+=("$APK")
  [ -n "${WGT:-}" ] && FILES+=("$WGT")
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "没找到可同步的包"; exit 1
fi

for f in "${FILES[@]}"; do
  SRC="$DL_DIR/$f"
  if ! ssh_rel "test -f '$SRC'"; then
    echo "!! 139 上不存在: $SRC"; continue
  fi
  echo "== 同步 $f → 192.168.1.32:/opt/dl/"
  ssh_rel "scp -P $LAN_PORT -i $LAN_KEY -o StrictHostKeyChecking=no '$SRC' root@127.0.0.1:/opt/dl/"
done

echo "== 校验（内网 nginx 直取）"
ssh_rel "ssh -p $LAN_PORT -i $LAN_KEY -o StrictHostKeyChecking=no -o BatchMode=yes root@127.0.0.1 \
  'ls -lh /opt/dl | tail -n +2; curl -s -o /dev/null -w \"ping=%{http_code}\\n\" http://127.0.0.1/dl/ping.txt'"
