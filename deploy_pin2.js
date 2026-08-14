/** 重新部署 comments.php(is_top) + 删 is_pinned 冗余字段 + 检查 manage_comments 权限 */
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
// 删除冗余字段
try { $c->exec("ALTER TABLE comments DROP COLUMN is_pinned"); echo "OK: drop is_pinned\\n"; }
catch (Exception $e) { echo "SKIP: ".$e->getMessage()."\\n"; }
// 检查 manage_comments 权限授予情况
echo "--- role_permissions (manage_comments) ---\\n";
$r = $c->query("SELECT r.name role, p.name perm FROM role_permissions rp JOIN roles r ON rp.role_id=r.id JOIN permissions p ON rp.permission_id=p.id WHERE p.name='manage_comments'");
foreach ($r as $row) echo $row["role"]."\\n";
if ($r->rowCount()==0) echo "(no grant)\\n";
echo "--- permissions (comment*) ---\\n";
foreach ($c->query("SELECT name FROM permissions WHERE name LIKE '%comment%'") as $row) echo $row["name"]."\\n";
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
      conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/run_pin2_sql.php && cd ${REMOTE_ROOT}/server && php run_pin2_sql.php 2>&1; rm -f ${REMOTE_ROOT}/server/run_pin2_sql.php`, (ee, s) => {
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
