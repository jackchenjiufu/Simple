#!/bin/bash
# 在 139 上验证 /monitor/hosts/:host 接口
set -u
P=$(grep -E '^DB_PASS' /www/server/doo-node-v3/.env | cut -d= -f2- | tr -d '"')
T=$(mysql -uroot -p"$P" -N -e 'select auth_token from `doo-app`.users where auth_token is not null and auth_token<>"" order by id desc limit 1' 2>/dev/null)
echo "token: ${T:0:10}... (${#T} chars)"
enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
for h in 上海服务器 本地服务器 盒子H68k; do
  E=$(enc "$h")
  echo "======== $h :: detail ========"
  curl -s -m 20 -H "Authorization: Bearer $T" "http://127.0.0.1:3100/api/v3/monitor/hosts/$E/detail" | head -c 1600
  echo
done
echo "======== 上海服务器 :: logs?src=err ========"
E=$(enc 上海服务器)
curl -s -m 20 -H "Authorization: Bearer $T" "http://127.0.0.1:3100/api/v3/monitor/hosts/$E/logs?lines=8&src=err" | head -c 1200
echo
echo "======== 本地服务器 :: logs?src=app ========"
E=$(enc 本地服务器)
curl -s -m 20 -H "Authorization: Bearer $T" "http://127.0.0.1:3100/api/v3/monitor/hosts/$E/logs?lines=6&src=app" | head -c 1200
echo
echo "======== 盒子H68k :: logs ========"
E=$(enc 盒子H68k)
curl -s -m 20 -H "Authorization: Bearer $T" "http://127.0.0.1:3100/api/v3/monitor/hosts/$E/logs?lines=6" | head -c 600
echo
