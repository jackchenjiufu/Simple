/**
 * 部署 admin-vue 构建产物（增量合并版）
 *
 * 为什么不再 `rm -rf admin-vue && tar -x`：
 *   后台是 hash 命名的按路由分包。整目录替换会把旧分包删掉，而手机上
 *   App 的 web-view 往往还停在旧页面（或缓存了旧 index.html），此时点
 *   「系统设置 / API 管理 / 权限管理」会去请求已经不存在的 chunk，返回 404，
 *   动态 import 失败 → 路由不跳转 → 用户看到的就是"点了没反应"。
 *
 * 现在的做法：
 *   1) index.html 直接覆盖（它决定加载哪个入口 bundle）
 *   2) assets/ 做增量合并（同名覆盖，旧文件保留，hash 文件名不会冲突）
 *   3) 清理 14 天以前的旧分包，避免无限膨胀
 *
 * 用法：node deploy_admin_vue.js
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOST = '139.196.185.197';
const SSHPORT = 2341;
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const LOCAL_TAR = path.join(__dirname, 'admin-vue-dist.tar.gz');
const DIST_DIR = path.join(__dirname, 'admin-vue-dist');
const PHP_FILES = ['admin_api_docs.php', 'v2/admin_api_docs.php'];
const KEEP_DAYS = 14;

// 1. 本地打包（tar 里保留 admin-vue-dist/ 前缀，远端 --strip-components=1）
//    注意：Windows 自带 tar 对盘符路径不友好，统一走 git-bash 的 tar
console.log('PACK: admin-vue-dist → admin-vue-dist.tar.gz');
if (fs.existsSync(LOCAL_TAR)) fs.unlinkSync(LOCAL_TAR);
const packCmd = `cd "${__dirname.replace(/\\/g, '/')}" && tar -czf admin-vue-dist.tar.gz admin-vue-dist`;
execSync(packCmd, { stdio: 'inherit', shell: 'bash.exe' });
console.log('SIZE:', (fs.statSync(LOCAL_TAR).size / 1048576).toFixed(2), 'MB');

const conn = new Client();
const upload = (sftp, local, remote) =>
  new Promise((res, rej) => sftp.fastPut(local, remote, (e) => (e ? rej(e) : res())));

conn.on('ready', () => {
  console.log('SSH connected');
  conn.sftp((err, sftp) => {
    if (err) { console.log('SFTP err:', err.message); process.exit(1); }
    (async () => {
      for (const f of PHP_FILES) {
        const local = path.join(__dirname, 'server', 'api', f);
        if (!fs.existsSync(local)) { console.log('SKIP (missing):', f); continue; }
        await upload(sftp, local, `${REMOTE_ROOT}/server/api/${f}`);
        console.log('UP php:', f);
      }

      const remoteTar = `${REMOTE_ROOT}/admin-vue-dist.tar.gz`;
      await upload(sftp, LOCAL_TAR, remoteTar);
      console.log('UP: admin-vue-dist.tar.gz');

      // 解开到临时目录，再合并进线上目录
      const cmd = [
        `set -e`,
        `cd ${REMOTE_ROOT}`,
        // 备份 index.html（回滚用）
        `[ -f admin-vue/index.html ] && cp -f admin-vue/index.html admin-vue/index.html.prev || true`,
        // 解到临时目录
        `rm -rf admin-vue.new && mkdir -p admin-vue.new`,
        `tar -xzf ${remoteTar} -C admin-vue.new --strip-components=1`,
        `rm -f ${remoteTar}`,
        // assets 增量合并：old + new，同名以新为准
        `mkdir -p admin-vue/assets`,
        `cp -f admin-vue.new/assets/* admin-vue/assets/ 2>/dev/null || true`,
        // 根目录其余文件（index.html 等）覆盖
        `cp -f admin-vue.new/index.html admin-vue/index.html`,
        `for f in admin-vue.new/*; do b=$(basename "$f"); [ "$b" = "assets" ] || cp -rf "$f" "admin-vue/$b"; done`,
        `rm -rf admin-vue.new`,
        // 清理 14 天前的旧分包
        `find admin-vue/assets -type f -mtime +${KEEP_DAYS} -delete`,
        `chmod -R 755 admin-vue && find admin-vue -type f -exec chmod 644 {} \\;`,
        `echo "--- assets: $(ls admin-vue/assets | wc -l) 个"`,
        `grep -o 'assets/[a-zA-Z0-9_-]*\\.js' admin-vue/index.html | head -2`,
        `du -sh admin-vue`,
      ].join(' && ');

      conn.exec(cmd, (ee, s) => {
        let o = '';
        s.on('data', (d) => (o += d));
        s.stderr.on('data', (d) => (o += d));
        s.on('close', () => { console.log(o.trim()); conn.end(); });
      });
    })().catch((e) => { console.log('Error:', e.message); conn.end(); });
  });
});
conn.on('error', (e) => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: SSHPORT, username: 'root', privateKey: fs.readFileSync(KEY) });
