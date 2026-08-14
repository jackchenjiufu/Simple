/** 部署等级机制：上传 level_helper/heartbeat/user_growth/get_articles + users 加 online_seconds */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const FILES = ['level_helper.php', 'heartbeat.php', 'user_growth.php', 'get_articles.php'];

const SQL_PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
try { $c->exec("ALTER TABLE users ADD COLUMN online_seconds INT DEFAULT 0"); echo "OK: add online_seconds\\n"; }
catch (Exception $e) { echo "SKIP: ".$e->getMessage()."\\n"; }
foreach ($c->query("SHOW COLUMNS FROM users LIKE 'online_seconds'") as $r) echo "col: ".implode('|', $r)."\\n";
?>`;

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    let pending = FILES.length;
    const upload = (f) => {
      const local = path.join(__dirname, 'server', 'api', f);
      const remote = `${REMOTE_ROOT}/server/api/${f}`;
      sftp.fastPut(local, remote, (e) => {
        if (e) { console.log('Upload err:', f, e.message); process.exit(1); }
        console.log('UP:', f);
        if (--pending === 0) {
          const b64 = Buffer.from(SQL_PHP, 'utf-8').toString('base64');
          conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/run_level_sql.php && cd ${REMOTE_ROOT}/server && php run_level_sql.php 2>&1; rm -f ${REMOTE_ROOT}/server/run_level_sql.php`, (ee, s) => {
            let o = '';
            s.on('data', d => o += d);
            s.stderr.on('data', d => o += d);
            s.on('close', () => { console.log(o.trim()); conn.end(); });
          });
        }
      });
    };
    FILES.forEach(upload);
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
