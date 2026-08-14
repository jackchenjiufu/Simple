/**
 * 部署 RBAC 权限改造：
 * 1. 上传 server/api/ 下改动的 PHP 文件
 * 2. 递归上传 admin-vue-dist 构建产物
 * 3. 通过 PHP（站点自身数据库连接）执行 SQL 补权限
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

const PHP_FILES = [
  'admin_auth.php', 'admin_login.php', 'admin_stats.php', 'admin_feedback.php',
  'admin_users.php', 'admin_articles.php', 'admin_carousels.php', 'admin_content.php',
  'admin_follows.php', 'admin_messages.php', 'admin_logs.php', 'admin_overtime.php',
  'admin_permissions.php', 'admin_my_permissions.php',
];

// PHP 执行的 SQL（用站点自身连接，绕过 mysql CLI 凭据）
const PHP_SQL = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
$sqls = array(
  "INSERT IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name='admin' AND p.name IN ('manage_articles','manage_feedback','manage_overtime','manage_hotsearch','manage_splash','view_logs')",
  "INSERT IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name='super_admin' AND p.name IN ('manage_feedback','manage_overtime','manage_hotsearch','manage_splash','view_logs')"
);
foreach ($sqls as $q) { $c->exec($q); }
echo "SQL_DONE\\n";
$r = $c->query("SELECT r.name role, p.name perm FROM role_permissions rp JOIN roles r ON rp.role_id=r.id JOIN permissions p ON rp.permission_id=p.id WHERE r.name IN ('admin','super_admin','editor') ORDER BY r.name, p.name");
foreach ($r as $row) echo $row["role"]."|".$row["perm"]."\\n";
?>`;

const conn = new Client();

function uploadFile(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => err ? reject(err) : resolve());
  });
}

async function uploadDir(sftp, localDir, remoteDir) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  for (const e of entries) {
    const lp = path.join(localDir, e.name);
    const rp = `${remoteDir}/${e.name}`;
    if (e.isDirectory()) {
      await new Promise((res) => sftp.mkdir(rp, (err) => res())); // ignore exists
      await uploadDir(sftp, lp, rp);
    } else {
      await uploadFile(sftp, lp, rp);
      console.log('UP:', rp.replace(REMOTE_ROOT, ''));
    }
  }
}

conn.on('ready', () => {
  console.log('SSH connected');
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    (async () => {
      // 1. PHP 文件
      for (const f of PHP_FILES) {
        const local = path.join(__dirname, 'server', 'api', f);
        const remote = `${REMOTE_ROOT}/server/api/${f}`;
        if (!fs.existsSync(local)) { console.log('SKIP (missing):', f); continue; }
        await uploadFile(sftp, local, remote);
        console.log('UP php:', f);
      }
      // 2. dist 递归上传
      await uploadDir(sftp, path.join(__dirname, 'admin-vue-dist'), `${REMOTE_ROOT}/admin-vue`);
      console.log('--- upload done, running SQL via PHP ---');
      // 3. PHP 执行 SQL
      const b64 = Buffer.from(PHP_SQL, 'utf-8').toString('base64');
      conn.exec(`echo ${b64} | base64 -d > /www/wwwroot/139.196.185.197_7070/doo/server/run_rbac_sql.php && cd /www/wwwroot/139.196.185.197_7070/doo/server && php run_rbac_sql.php 2>&1; rm -f /www/wwwroot/139.196.185.197_7070/doo/server/run_rbac_sql.php`, (e, s) => {
        let o = ''; s.on('data', d => o += d); s.stderr.on('data', d => o += d);
        s.on('close', () => { console.log(o.trim()); conn.end(); });
      });
    })().catch(e => { console.log('Error:', e.message); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
