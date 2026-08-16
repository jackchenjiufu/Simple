
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const V2_FILE = 'server/api/v2/get_carousels.php';

const REMOTE_SH = [
  'set -e',
  'cd ' + REMOTE_ROOT,
  'mkdir -p server/api/v2',
  'echo "=== 上传 v2 文件后校验 ==="',
  'php -l server/api/v2/get_carousels.php',
  'echo "=== 冒烟测试（本机 127.0.0.1:7070）==="',
  'echo "--- v1: /doo/server/api/get_carousels.php ---"',
  'curl -s -m 10 -D - -o /dev/null http://127.0.0.1:7070/doo/server/api/get_carousels.php | grep -iE "HTTP/|x-api-version"',
  'echo "--- v1 数据(前160字符) ---"',
  'curl -s -m 10 http://127.0.0.1:7070/doo/server/api/get_carousels.php | head -c 160',
  'echo ""',
  'echo "--- v2: /doo/server/api/v2/get_carousels.php ---"',
  'curl -s -m 10 -D - -o /dev/null http://127.0.0.1:7070/doo/server/api/v2/get_carousels.php | grep -iE "HTTP/|x-api-version"',
  'echo "--- v2 数据(前160字符) ---"',
  'curl -s -m 10 http://127.0.0.1:7070/doo/server/api/v2/get_carousels.php | head -c 160',
  'echo ""',
  'echo "--- v2 fallback: /doo/server/api/v2/login.php ---"',
  'curl -s -m 10 -D - -o /dev/null http://127.0.0.1:7070/doo/server/api/v2/login.php | grep -iE "HTTP/|x-api-version"',
  'echo "=== 2. phpredis 扩展检查 ==="',
  'php -m | grep -i redis && echo "OK: phpredis 已安装" || echo "NO: phpredis 未安装 -> 缓存自动降级走 DB（功能不受影响）"',
  'echo "=== 3. .env REDIS 配置 ==="',
  'if [ -f server/config/.env ]; then',
  '  if grep -q "^REDIS_ENABLED" server/config/.env; then',
  '    echo "OK: .env 已含 REDIS 配置"',
  '  else',
  '    printf "\\n# Redis 缓存配置（本次部署追加）\\nREDIS_ENABLED=true\\nREDIS_HOST=127.0.0.1\\nREDIS_PORT=6379\\nREDIS_PASSWORD=\\nREDIS_DB=0\\nREDIS_PREFIX=doo:\\n" >> server/config/.env',
  '    echo "OK: 已追加 REDIS 配置到 .env"',
  '  fi',
  'else',
  '  echo "WARN: 远端无 .env（使用默认配置，不影响）"',
  'fi',
  'echo "=== 4. Cache.php 存在性 ==="',
  'ls -la server/config/Cache.php',
  'echo "=== DONE ==="'
].join('\n');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected ' + HOST);
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    // 先建远端目录
    conn.exec('mkdir -p ' + REMOTE_ROOT + '/server/api/v2 && echo MKDIR_OK', (ee, s) => {
      let o = '';
      s.on('data', d => o += d);
      s.stderr.on('data', d => o += d);
      s.on('close', () => {
        console.log('mkdir:', o.trim());
        // 再上传 v2 文件
        sftp.fastPut(path.join(__dirname, V2_FILE), REMOTE_ROOT + '/' + V2_FILE, (e) => {
          if (e) { console.log('v2 上传失败:', e.message); process.exit(1); }
          console.log('UP:', V2_FILE);
          // 跑校验+冒烟
          conn.exec('bash -s', (ee2, s2) => {
            if (ee2) { console.log('exec err:', ee2.message); process.exit(1); }
            let o2 = '';
            s2.on('data', d => o2 += d);
            s2.stderr.on('data', d => o2 += d);
            s2.on('close', () => { console.log(o2.trim()); conn.end(); });
            s2.write(REMOTE_SH);
            s2.end();
          });
        });
      });
      s.write(''); s.end();
    });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });

