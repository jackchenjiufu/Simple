#!/bin/bash
set -u
P=$(grep -E '^DB_PASS' /www/server/doo-node-v3/.env | cut -d= -f2- | tr -d '"')
T=$(mysql -uroot -p"$P" -N -e 'select auth_token from `doo-app`.users where auth_token is not null and auth_token<>"" order by id desc limit 1' 2>/dev/null)
E=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("本地服务器"))')
echo "=== 公网 URL 走 nginx ==="
curl -s -m 20 -H "Authorization: Bearer $T" "http://139.196.185.197:7070/doo/server/api/v3/monitor/hosts/$E/detail" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("code",d["code"]);x=d["data"];print("host",x["host"],"shell",x["shell"]);print("net",[(n["dev"],n["state"],n["speed_mbps"],n["rx_bps"],n["tx_bps"]) for n in x["net"]]);print("ports",len(x["ports"]["items"]),"source",x["ports"]["source"]);print("first5",x["ports"]["items"][:5])'
E2=$(python3 -c 'import urllib.parse;print(urllib.parse.quote("上海服务器"))')
echo "=== 公网 URL 日志 ==="
curl -s -m 20 -H "Authorization: Bearer $T" "http://139.196.185.197:7070/doo/server/api/v3/monitor/hosts/$E2/logs?lines=5&src=app" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin)["data"];print("available",d["available"],"n",len(d["items"]));[print(" ",i["t"],i["level"],i["msg"][:90]) for i in d["items"][:5]]'
