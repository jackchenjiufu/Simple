
const { Client } = require('ssh2');
const fs = require('fs');
const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const conn = new Client();
conn.on('ready', () => {
  // 检查 H5 bundle 是否包含推荐相关代码
  const cmd = 'cd ' + REMOTE_ROOT + '/h5 && grep -l "recommend_images\|为你推荐\|rec-section" assets/*.js 2>/dev/null | head -3; echo "---"; ls -la index.html; echo "--- 总 js 数 ---"; ls assets/*.js | wc -l';
  conn.exec(cmd, (err, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log('OUT>>>' + o.trim() + '<<<'); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });

