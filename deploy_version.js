/** 发布新版本：上传 APK 到 server/downloads + 写入 app_versions 记录
 * 用法：node deploy_version.js [版本号] [apk路径]
 * 默认版本号取 manifest.json 的 versionName，默认 APK 取项目根目录 doo.apk
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';

// 版本号：优先命令行参数，否则读 manifest.json
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf-8'));
const VERSION = process.argv[2] || manifest.versionName;
const APK_PATH = process.argv[3] ? path.resolve(process.argv[3]) : path.join(__dirname, 'doo.apk');
const REMOTE_FILE = 'app_v' + VERSION.replace(/\./g, '_') + '.apk';

if (!/^\d+\.\d+\.\d+$/.test(VERSION)) {
  console.log('ERROR: 版本号格式不正确:', VERSION);
  process.exit(1);
}
if (!fs.existsSync(APK_PATH)) {
  console.log('ERROR: APK 不存在:', APK_PATH);
  console.log('请在 HBuilderX 云打包后用新包覆盖 doo.apk（或指定路径 node deploy_version.js 2.5.0 D:/path/app.apk）');
  process.exit(1);
}
const apkSizeMB = (fs.statSync(APK_PATH).size / 1048576).toFixed(1);

const DESCRIPTION = `2.5.0 更新内容：
1. 修复登录页无限跳转死循环
2. 修复登录失败问题（Vuex 方法冲突）
3. 修复后台管理接口调用报错
4. 考勤页组件化重构（薪资汇总/日历/设置/记录）
5. 服务器地址统一配置管理`;

// 写入版本记录：download_url 存文件名；update_type 列存在则置为 apk（不存在自动跳过）
const SQL_PHP = `<?php
require "config/Database.php";
$d = new Database();
$c = $d->getConnection();
$ver = ${JSON.stringify(VERSION)};
$desc = ${JSON.stringify(DESCRIPTION)};
$url = ${JSON.stringify(REMOTE_FILE)};
// 避免重复发布同一版本
$chk = $c->prepare("SELECT id FROM app_versions WHERE version = ?");
$chk->execute([$ver]);
if ($chk->fetch()) { echo "SKIP: 版本 $ver 已存在\\n"; exit; }
$c->prepare("INSERT INTO app_versions (version, description, download_url, created_at) VALUES (?,?,?,NOW())")->execute([$ver, $desc, $url]);
echo "OK: inserted version $ver\\n";
try { $c->exec("UPDATE app_versions SET update_type='apk' WHERE version='$ver'"); echo "OK: update_type=apk\\n"; }
catch (Exception $e) { echo "SKIP: no update_type column\\n"; }
foreach ($c->query("SELECT id, version, download_url FROM app_versions WHERE version='$ver'") as $r) echo "ROW: ".implode('|', $r)."\\n";
?>`;

console.log(`发布版本 ${VERSION} → ${REMOTE_FILE} (${apkSizeMB} MB)`);

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    sftp.fastPut(APK_PATH, `${REMOTE_ROOT}/server/downloads/${REMOTE_FILE}`, (e) => {
      if (e) { console.log('APK 上传失败:', e.message); process.exit(1); }
      console.log('UP:', REMOTE_FILE, `(${apkSizeMB} MB)`);
      // 远端执行 SQL 写入版本记录
      const b64 = Buffer.from(SQL_PHP, 'utf-8').toString('base64');
      conn.exec(`echo ${b64} | base64 -d > ${REMOTE_ROOT}/server/run_version_sql.php && cd ${REMOTE_ROOT}/server && php run_version_sql.php 2>&1; rm -f ${REMOTE_ROOT}/server/run_version_sql.php`, (ee, s) => {
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
