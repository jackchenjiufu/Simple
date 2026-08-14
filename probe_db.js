/** 探查线上 DB：articles / users 表结构 + 是否已有评论表 */
const { Client } = require('ssh2');
const fs = require('fs');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
echo "--- TABLES (comment*) ---\\n";
foreach ($c->query("SHOW TABLES LIKE '%comment%'") as $r) { echo implode('|', $r)."\\n"; }
echo "--- articles DESC ---\\n";
foreach ($c->query("DESC articles") as $r) { echo implode('|', $r)."\\n"; }
echo "--- users DESC ---\\n";
foreach ($c->query("DESC users") as $r) { echo implode('|', $r)."\\n"; }
echo "--- articles count / sample ---\\n";
$n = $c->query("SELECT COUNT(*) FROM articles")->fetchColumn();
echo "total=".$n."\\n";
foreach ($c->query("SELECT id,title,user_id,created_at FROM articles ORDER BY id DESC LIMIT 3") as $r) { echo json_encode($r, JSON_UNESCAPED_UNICODE)."\\n"; }
echo "--- users sample ---\\n";
foreach ($c->query("SELECT id,username,nickname,role,level,status FROM users ORDER BY id LIMIT 8") as $r) { echo json_encode($r, JSON_UNESCAPED_UNICODE)."\\n"; }
?>`;

const conn = new Client();
conn.on('ready', () => {
  const b64 = Buffer.from(PHP, 'utf-8').toString('base64');
  conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/probe_db.php && cd ${REMOTE_ROOT}/server && php probe_db.php 2>&1; rm -f ${REMOTE_ROOT}/server/probe_db.php`, (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o.trim()); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
