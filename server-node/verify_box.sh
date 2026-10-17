#!/bin/bash
set -u
P=$(grep -E '^DB_PASS' /www/server/doo-node-v3/.env | cut -d= -f2- | tr -d '"')
T=$(mysql -uroot -p"$P" -N -e 'select auth_token from `doo-app`.users where auth_token is not null and auth_token<>"" order by id desc limit 1' 2>/dev/null)
enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
B="http://139.196.185.197:7070/doo/server/api/v3/monitor"
E=$(enc 盒子H68k)
echo "=== 盒子 detail ==="
curl -s -m 25 -H "Authorization: Bearer $T" "$B/hosts/$E/detail" | python3 -c '
import sys,json
d=json.load(sys.stdin)["data"]
print("shell",d["shell"])
for n in d["net"]: print("  NIC",n["dev"],n["state"],n["speed_mbps"],"rx",n["rx_bps"],"tx",n["tx_bps"],n["mac"])
p=d["ports"]; print("  ports",p.get("source"),len(p["items"]))
for x in p["items"][:12]: print("   ",x)
'
echo "=== 盒子 logs app ==="
curl -s -m 25 -H "Authorization: Bearer $T" "$B/hosts/$E/logs?lines=6&src=app" | python3 -c '
import sys,json
d=json.load(sys.stdin)["data"]
print("available",d["available"],"n",len(d["items"]))
for i in d["items"][:6]: print("  ",i["t"],i["level"],i["msg"][:100])
'
