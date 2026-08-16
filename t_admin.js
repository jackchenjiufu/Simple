
const { Client } = require('ssh2');
const fs = require('fs');
const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const conn = new Client();
conn.on('ready', () => {
  const cmd = 'TK=$(grep -E "^ADMIN_TOKEN" ' + REMOTE_ROOT + '/server/config/.env | head -1 | cut -d= -f2) && echo "--- admin_carousels GET ---" && curl -s -m 10 "http://127.0.0.1:7070/doo/server/api/v2/admin_carousels.php?admin_token=$TK" | head -c 400 && echo "" && echo "--- php -l ---" && php -l ' + REMOTE_ROOT + '/server/api/admin_carousels.php';
  conn.exec(cmd, (err, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log('OUT>>>' + o.trim() + '<<<'); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });

