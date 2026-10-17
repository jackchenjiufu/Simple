#!/bin/bash
# 扫描 139 本地监听端口，找出真正说 SSH 协议的（跳过已知的 2222/2341/3333）
for p in $(ss -lnt 2>/dev/null | awk 'NR>1{print $4}' | sed 's/.*://' | sort -un); do
  case "$p" in 2222|2341|3333) continue;; esac
  out=$(timeout 3 ssh -p "$p" -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=2 -o PreferredAuthentications=publickey root@127.0.0.1 true 2>&1)
  case "$out" in
    *"Permission denied"*|*"publickey"*) echo "SSH-AUTH on $p  :: $(echo "$out" | head -1)";;
    *"kex_exchange"*|*"banner"*) echo "SSH-NOAUTH on $p :: $(echo "$out" | head -1)";;
  esac
done
echo "scan done"
