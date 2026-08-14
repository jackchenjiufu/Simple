/** 临时：tester → super_admin（测试后台用） */
const { Client } = require('ssh2');
const fs = require('fs');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const SQL_PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
$c->exec("UPDATE users SET role='super_admin' WHERE username='tester'");
echo "ROLE_UPDATED\\n";
foreach ($c->query("SELECT id, username, role FROM users WHERE username='tester'") as $r) echo implode('|', $r) . "\\n";
?>`;

const conn = new Client();
conn.on('ready', () => {
  const b64 = Buffer.from(SQL_PHP, 'utf-8').toString('base64');
  conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/tmp_perm.php && cd ${REMOTE_ROOT}/server && php tmp_perm.php 2>&1; rm -f ${REMOTE_ROOT}/server/tmp_perm.php`, (ee, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o.trim()); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
