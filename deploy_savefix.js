
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
    sftp.fastPut(path.join(__dirname, 'server/api/admin_carousels.php'), REMOTE_ROOT + '/server/api/admin_carousels.php', (e) => {
      if (e) { console.log('fail:', e.message); process.exit(1); }
      console.log('UP: admin_carousels.php');
      // 用全局 token 测试 POST 创建轮播（模拟后台保存）
      const cmd = 'cd ' + REMOTE_ROOT + ' && php -l server/api/admin_carousels.php && TK=$(grep -E "^ADMIN_TOKEN" server/config/.env | head -1 | cut -d= -f2) && echo "--- POST 创建 ---" && curl -s -m 10 -X POST -H "Content-Type: application/json" -d "{\"title\":\"测试轮播\",\"author\":\"admin\",\"image_url\":\"http://test/img.jpg\",\"sort_order\":99,\"is_active\":1,\"link_type\":\"none\"}" "http://127.0.0.1:7070/doo/server/api/v2/admin_carousels.php?admin_token=$TK"';
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

