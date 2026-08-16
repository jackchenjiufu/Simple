
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const PHP_FILES = ['server/config/Cache.php', 'server/api/system_cache.php'];
const LOCAL_TAR = path.join(__dirname, 'admin-vue-dist.tar.gz');

const REMOTE_SH = [
  'set -e',
  'cd ' + REMOTE_ROOT,
  'echo "=== 1. php -l 校验 ==="',
  'php -l server/config/Cache.php',
  'php -l server/api/system_cache.php',
  'echo "=== 2. 部署 admin-vue ==="',
  'rm -rf admin-vue',
  'mkdir -p admin-vue',
  'tar -xzf admin-vue-dist.tar.gz -C admin-vue --strip-components=1',
  'echo "assets: $(ls admin-vue/assets/ | wc -l) files, index: $(ls -la admin-vue/index.html | awk \"{print \$5\" bytes\"}\")"',
  'echo "=== 3. HTTP 鉴权冒烟（无凭证应 401）==="',
  'curl -s -m 10 -o /dev/null -w "system_cache.php 无凭证: HTTP %{http_code}\n" http://127.0.0.1:7070/doo/server/api/system_cache.php',
  'curl -s -m 10 -o /dev/null -w "admin-vue 页面: HTTP %{http_code}\n" http://127.0.0.1:7070/doo/admin-vue/',
  'echo "=== 4. Redis 缓存类 CLI 冒烟（php -r 直接验证）==="',
  'cd server && php -r "require \"config/Cache.php\"; echo \"isAvailable: \" . (Cache::isAvailable() ? \"yes\" : \"no\") . PHP_EOL; $s = Cache::stats(); echo \"keys: \" . ($s ? $s[\"count\"] : \"n/a\") . PHP_EOL; echo \"total_size: \" . ($s ? $s[\"total_size\"] : \"n/a\") . PHP_EOL;" 2>&1',
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
      for (const f of PHP_FILES) {
        const local = path.join(__dirname, f);
        if (!fs.existsSync(local)) { console.log('SKIP (missing):', f); continue; }
        await upload(sftp, local, REMOTE_ROOT + '/' + f);
        console.log('UP:', f);
      }
      if (fs.existsSync(LOCAL_TAR)) {
        await upload(sftp, LOCAL_TAR, REMOTE_ROOT + '/admin-vue-dist.tar.gz');
        console.log('UP: admin-vue-dist.tar.gz (' + (fs.statSync(LOCAL_TAR).size / 1024).toFixed(1) + ' KB)');
      } else {
        console.log('SKIP: admin-vue-dist.tar.gz 不存在');
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

