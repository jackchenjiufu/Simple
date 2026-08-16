
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
    sftp.fastPut(path.join(__dirname, 'admin-vue-dist.tar.gz'), REMOTE_ROOT + '/admin-vue-dist.tar.gz', (e) => {
      if (e) { console.log('fail:', e.message); process.exit(1); }
      console.log('UP: admin-vue-dist.tar.gz');
      conn.exec('cd ' + REMOTE_ROOT + ' && rm -rf admin-vue && mkdir -p admin-vue && tar -xzf admin-vue-dist.tar.gz -C admin-vue --strip-components=1 && rm -f admin-vue-dist.tar.gz && echo "assets: $(ls admin-vue/assets/ | wc -l)" && curl -s -m 10 -o /dev/null -w "admin-vue: %{http_code}\n" http://127.0.0.1:7070/doo/admin-vue/', (ee, s) => {
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

