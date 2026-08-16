
const { Client } = require('ssh2');
const fs = require('fs');
const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const conn = new Client();
conn.on('ready', () => {
  const cmd = 'grep -n "windowMs\|DATE_SUB\|INTERVAL 365\|timestamp >" ' + REMOTE_ROOT + '/server/api/recommend_images.php | head -10';
  conn.exec(cmd, (err, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log('OUT>>>' + o.trim() + '<<<'); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });

