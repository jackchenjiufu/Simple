/** 创建测试账号 tester/REDACTED_ADMIN_PASSWORD（不存在才创建），测试完可删 */
const { Client } = require('ssh2');
const fs = require('fs');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const SQL_PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
$u = "tester";
$chk = $c->prepare("SELECT id FROM users WHERE username = ?");
$chk->execute([$u]);
if ($chk->fetch()) { echo "EXISTS\\n"; exit; }
$st = $c->prepare("INSERT INTO users (username, password, nickname, role, status, created_at) VALUES (?,?,?,?,0,NOW())");
$st->execute([$u, password_hash("REDACTED_ADMIN_PASSWORD", PASSWORD_DEFAULT), "测试账号", "user"]);
echo "CREATED id=" . $c->lastInsertId() . "\\n";
?>`;

const conn = new Client();
conn.on('ready', () => {
  const b64 = Buffer.from(SQL_PHP, 'utf-8').toString('base64');
  conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/tmp_mk_test.php && cd ${REMOTE_ROOT}/server && php tmp_mk_test.php 2>&1; rm -f ${REMOTE_ROOT}/server/tmp_mk_test.php`, (ee, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => { console.log(o.trim()); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
