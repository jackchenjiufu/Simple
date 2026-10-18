/**
 * 创建临时测试账号 tester（仅当不存在时创建），联调用，用完请删除。
 *
 * 凭据一律不写死：
 *   DEPLOY_HOST=1.2.3.4 DEPLOY_ROOT=/www/wwwroot/1.2.3.4_7070/doo \
 *   SSH_KEY=~/.ssh/xxx.pem TESTER_PASS='临时密码' node deploy_mk_test_user.js
 *
 * 不传 TESTER_PASS 时会随机生成一个并打印出来，不会使用任何默认密码。
 */
const crypto = require('crypto');
const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');

const HOST = process.env.DEPLOY_HOST;
if (!HOST) {
  console.error('缺少环境变量 DEPLOY_HOST（服务器地址），已中止。');
  process.exit(1);
}
const KEY = process.env.SSH_KEY || `${os.homedir()}/.ssh/claude.pem`;
const REMOTE_ROOT = process.env.DEPLOY_ROOT || `/www/wwwroot/${HOST}_7070/doo`;
const TESTER_PASS = process.env.TESTER_PASS || crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '');

const SQL_PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
$u = "tester";
$chk = $c->prepare("SELECT id FROM users WHERE username = ?");
$chk->execute([$u]);
if ($chk->fetch()) { echo "EXISTS\\n"; exit; }
$st = $c->prepare("INSERT INTO users (username, password, nickname, role, status, created_at) VALUES (?,?,?,?,0,NOW())");
$st->execute([$u, password_hash(${JSON.stringify(TESTER_PASS)}, PASSWORD_DEFAULT), "测试账号", "user"]);
echo "CREATED id=" . $c->lastInsertId() . "\\n";
?>`;

const conn = new Client();
conn.on('ready', () => {
  const b64 = Buffer.from(SQL_PHP, 'utf-8').toString('base64');
  conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/tmp_mk_test.php && cd ${REMOTE_ROOT}/server && php tmp_mk_test.php 2>&1; rm -f ${REMOTE_ROOT}/server/tmp_mk_test.php`, (ee, s) => {
    let o = '';
    s.on('data', d => o += d);
    s.stderr.on('data', d => o += d);
    s.on('close', () => {
      console.log(o.trim());
      if (/CREATED/.test(o)) {
        console.log(`账号 tester 已创建，密码：${TESTER_PASS}`);
        console.log('联调结束请立即删除该账号。');
      }
      conn.end();
    });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
