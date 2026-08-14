/** 部署置顶功能：上传 comments.php + comments 表加 is_pinned 字段 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const SQL_PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
try { $c->exec("ALTER TABLE comments ADD COLUMN is_pinned TINYINT DEFAULT 0"); echo "OK: add is_pinned\\n"; }
catch (Exception $e) { echo "SKIP: ".$e->getMessage()."\\n"; }
foreach ($c->query("SHOW COLUMNS FROM comments") as $r) echo implode('|', $r)."\\n";
?>`;

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    const local = path.join(__dirname, 'server', 'api', 'comments.php');
    const remote = `${REMOTE_ROOT}/server/api/comments.php`;
    sftp.fastPut(local, remote, (e) => {
      if (e) { console.log('Upload err:', e.message); process.exit(1); }
      console.log('UP: comments.php');
      const b64 = Buffer.from(SQL_PHP, 'utf-8').toString('base64');
      conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/run_pin_sql.php && cd ${REMOTE_ROOT}/server && php run_pin_sql.php 2>&1; rm -f ${REMOTE_ROOT}/server/run_pin_sql.php`, (ee, s) => {
        let o = '';
        s.on('data', d => o += d);
        s.stderr.on('data', d => o += d);
        s.on('close', () => { console.log(o.trim()); conn.end(); });
      });
    });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
