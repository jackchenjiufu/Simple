/** 清理：还原 cmttest01 角色 + 删除所有测试评论 */
const { Client } = require('ssh2');
const fs = require('fs');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const SQL_PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
$c->exec("UPDATE users SET role='user' WHERE username='cmttest01'");
echo "role restored\\n";
// 删除测试评论（user_id = cmttest01 的 id）
$uid = $c->query("SELECT id FROM users WHERE username='cmttest01'")->fetchColumn();
$c->exec("DELETE FROM comments WHERE user_id=$uid");
echo "test comments deleted\\n";
$c->exec("UPDATE articles SET comments = (SELECT COUNT(*) FROM comments WHERE article_id=articles.id)");
echo "counts resynced\\n";
$r = $c->query("SELECT id, role FROM users WHERE username='cmttest01'");
foreach ($r as $row) echo "cmttest01 id={$row['id']} role={$row['role']}\\n";
?>`;

const conn = new Client();
conn.on('ready', () => {
  const b64 = Buffer.from(SQL_PHP, 'utf-8').toString('base64');
  conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/cleanup_cmt.php && cd ${REMOTE_ROOT}/server && php cleanup_cmt.php 2>&1; rm -f ${REMOTE_ROOT}/server/cleanup_cmt.php`, (e, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o.trim()); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
