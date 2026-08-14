/** 部署 PHP 修复 + admin-vue 构建产物
 * 1. 上传 server/api/delete_article.php
 * 2. 上传 admin-vue-dist.tar.gz → 远端清目录解压
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const LOCAL_TAR = path.join(__dirname, 'admin-vue-dist.tar.gz');
const PHP_FILES = ['delete_article.php'];

if (!fs.existsSync(LOCAL_TAR)) {
  console.log('ERROR: admin-vue-dist.tar.gz 不存在，请先打包');
  process.exit(1);
}

const conn = new Client();

function upload(sftp, local, remote) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(local, remote, (err) => err ? reject(err) : resolve());
  });
}

conn.on('ready', () => {
  console.log('SSH connected');
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    (async () => {
      // 1. PHP 文件
      for (const f of PHP_FILES) {
        const local = path.join(__dirname, 'server', 'api', f);
        if (!fs.existsSync(local)) { console.log('SKIP (missing):', f); continue; }
        await upload(sftp, local, `${REMOTE_ROOT}/server/api/${f}`);
        console.log('UP php:', f);
      }
      // 2. admin-vue tar
      const remoteTar = `${REMOTE_ROOT}/admin-vue-dist.tar.gz`;
      await upload(sftp, LOCAL_TAR, remoteTar);
      console.log('UP: admin-vue-dist.tar.gz (' + (fs.statSync(LOCAL_TAR).size / 1048576).toFixed(1) + ' MB)');
      // 远端清目录解压 + 校验
      const cmd =
        `rm -rf ${REMOTE_ROOT}/admin-vue && ` +
        `mkdir -p ${REMOTE_ROOT}/admin-vue && ` +
        `tar -xzf ${remoteTar} -C ${REMOTE_ROOT}/admin-vue --strip-components=1 && ` +
        `rm -f ${remoteTar} && ` +
        `echo "--- verify ---" && ` +
        `php -l ${REMOTE_ROOT}/server/api/delete_article.php && ` +
        `ls ${REMOTE_ROOT}/admin-vue/ && ls ${REMOTE_ROOT}/admin-vue/assets/ | wc -l`;
      conn.exec(cmd, (ee, s) => {
        let o = ''; s.on('data', d => o += d); s.stderr.on('data', d => o += d);
        s.on('close', () => { console.log(o.trim()); conn.end(); });
      });
    })().catch(e => { console.log('Error:', e.message); conn.end(); });
  });
});
conn.on('error', e => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
