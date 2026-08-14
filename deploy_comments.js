/** 部署评论区：上传 comments.php + 建 comments 表 + articles 加 comments 字段 */
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
$sqls = array(
  "CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    user_id INT NOT NULL,
    content VARCHAR(500) NOT NULL,
    parent_id INT DEFAULT 0,
    status TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_article (article_id),
    KEY idx_user (user_id),
    KEY idx_parent (parent_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
  "ALTER TABLE articles ADD COLUMN comments INT DEFAULT 0"
);
foreach ($sqls as $q) {
  try { $c->exec($q); echo "OK: ".substr($q, 0, 40)."\\n"; }
  catch (Exception $e) { echo "SKIP: ".$e->getMessage()."\\n"; }
}
echo "--- verify ---\\n";
foreach ($c->query("SHOW TABLES LIKE 'comments'") as $r) echo "table: ".implode('|', $r)."\\n";
foreach ($c->query("SHOW COLUMNS FROM articles LIKE 'comments'") as $r) echo "col: ".implode('|', $r)."\\n";
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
      conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/run_comment_sql.php && cd ${REMOTE_ROOT}/server && php run_comment_sql.php 2>&1; rm -f ${REMOTE_ROOT}/server/run_comment_sql.php`, (ee, s) => {
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
