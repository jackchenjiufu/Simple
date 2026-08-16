
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const FILES = [
  'server/config/Cache.php',
  'server/config/Config.php',
  'server/config/.env.example',
  'server/api/index.php',
  'server/api/get_carousels.php',
  'server/api/get_articles.php',
  'server/api/announcements.php',
  'server/api/admin_carousels.php',
  'server/api/admin_articles.php',
  'server/api/upload_article.php',
  'server/api/delete_article.php',
  'server/api/crawl_douyin_hotsearch.php',
  'server/api/crawl_hotsearch.php',
  'server/api/crawl_hackernews_hotsearch.php',
  'server/api/crawl_intl_news.php',
  'server/api/crawl_rednote_hotsearch.php',
  'server/api/crawl_toutiao_hotsearch.php',
  'server/api/crawl_zhihu_hotsearch.php',
  'server/api/v2/get_carousels.php',
];

const lintFiles = FILES.filter(f => f.endsWith('.php'));
const lintCmd = lintFiles.map(f => 'php -l ' + f).join('; ');

const REMOTE_SH = [
  'set -e',
  'cd ' + REMOTE_ROOT,
  'mkdir -p server/api/v2',
  'echo "=== 1. php -l 语法校验 ==="',
  lintCmd,
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
  'echo "=== 4. 冒烟测试（本机 127.0.0.1:7070）==="',
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
  'echo "--- v2 fallback: /doo/server/api/v2/login.php (无此文件应回退 v1) ---"',
  'curl -s -m 10 -D - -o /dev/null http://127.0.0.1:7070/doo/server/api/v2/login.php | grep -iE "HTTP/|x-api-version"',
  'echo "=== 5. Cache.php 存在性 ==="',
  'ls -la server/config/Cache.php',
  'echo "=== DEPLOY DONE ==="'
].join('\n');

const conn = new Client();
function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => sftp.fastPut(local, remote, err => err ? reject(err) : resolve()));
}
conn.on('ready', () => {
  console.log('SSH connected ' + HOST);
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    (async () => {
      for (const f of FILES) {
        const local = path.join(__dirname, f);
        if (!fs.existsSync(local)) { console.log('SKIP (missing):', f); continue; }
        await upload(sftp, local, REMOTE_ROOT + '/' + f);
        console.log('UP:', f);
      }
      conn.exec('bash -s', (ee, s) => {
        if (ee) { console.log('exec err:', ee.message); process.exit(1); }
        let o = '';
        s.on('data', d => o += d);
        s.stderr.on('data', d => o += d);
        s.on('close', () => { console.log(o.trim()); conn.end(); });
        s.write(REMOTE_SH);
        s.end();
      });
    })().catch(e => { console.log('Error:', e.message); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });

