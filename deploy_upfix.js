
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected');
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    sftp.fastPut(path.join(__dirname, 'server/api/upload_image.php'), REMOTE_ROOT + '/server/api/upload_image.php', (e) => {
      if (e) { console.log('fail:', e.message); process.exit(1); }
      console.log('UP: upload_image.php');
      // 测试：服务器上生成一张测试图，curl -F 上传（带 X-Admin-Token 全局 token）
      const cmd = [
        'cd ' + REMOTE_ROOT,
        'php -l server/api/upload_image.php',
        'TK=$(grep -E "^ADMIN_TOKEN" server/config/.env | head -1 | cut -d= -f2)',
        // 生成 1x1 测试 png
        "php -r 'file_put_contents("/tmp/test_upload.png", base64_decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="));'",
        'echo "--- 上传测试（X-Admin-Token 头）---"',
        'curl -s -m 15 -X POST -H "X-Admin-Token: $TK" -F "image=@/tmp/test_upload.png" -F "title=test" -F "author=admin" "http://127.0.0.1:7070/doo/server/api/upload_image.php" | head -c 250',
        'echo ""',
        'rm -f /tmp/test_upload.png'
      ].join(' && ');
      conn.exec(cmd, (ee, s) => {
        let o = '';
        s.on('data', d => o += d);
        s.stderr.on('data', d => o += d);
        s.on('close', () => { console.log('OUT>>>' + o.trim() + '<<<'); conn.end(); });
      });
    });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });

