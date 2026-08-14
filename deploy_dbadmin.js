/**
 * 部署 Adminer 数据库管理工具到服务器
 * 用法: node deploy_dbadmin.js [--no-auth]
 *   --no-auth  跳过 Basic Auth（不推荐，公网必须加认证）
 * 访问: http://139.196.185.197:7070/dbadmin/adminer.php
 * 登录: 先过 Basic Auth（admin/随机密码），再用 MySQL 账号密码连接数据库
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '139.196.185.197';
const KEY = process.env.USERPROFILE + '/.ssh/claude.pem';
const REMOTE_ROOT = '/www/wwwroot/139.196.185.197_7070/doo';
const DIR = REMOTE_ROOT + '/dbadmin';

const noAuth = process.argv.includes('--no-auth');
const username = 'admin';
// 12 位随机密码（base64url 字符集，无特殊符号）
const password = crypto.randomBytes(9).toString('base64url').slice(0, 12);

// Adminer 下载源（多源尝试，国内服务器 GitHub 可能慢）
const DOWNLOAD_URLS = [
  'https://github.com/vrana/adminer/releases/download/v4.8.1/adminer-4.8.1.php',
  'https://www.adminer.org/latest-mysql-en.php',
];

// 远端 bash 脚本（经 stdin 传给 bash -s，避免转义问题）
const REMOTE_SH = `
set -e
mkdir -p ${DIR}
cd ${DIR}

# 1. 下载 Adminer（多源尝试）
ok=0
for url in ${DOWNLOAD_URLS.join(' ')}; do
  if curl -fsSL --connect-timeout 20 -o adminer.php "$url"; then ok=1; break; fi
done
if [ "$ok" != "1" ]; then echo "ERR: Adminer 所有下载源失败"; exit 1; fi
ls -la adminer.php

# 2. PHP 语法校验（用站点 PHP）
if command -v php >/dev/null 2>&1; then
  php -l adminer.php || echo "WARN: php -l 校验失败（可能版本不匹配），请人工确认"
fi

${noAuth ? `# --no-auth 模式：跳过 Basic Auth
echo "AUTH: 已跳过 Basic Auth（公网裸奔，风险自负！）"
` : `
# 3. 创建 Basic Auth 认证
if command -v htpasswd >/dev/null 2>&1; then
  htpasswd -bc .htpasswd ${username} '${password}' 2>/dev/null || true
fi
if [ ! -s .htpasswd ] && command -v php >/dev/null 2>&1; then
  php -r "file_put_contents('.htpasswd', '${username}:' . password_hash('${password}', PASSWORD_BCRYPT) . PHP_EOL);"
fi
if [ ! -s .htpasswd ]; then
  echo "ERR: 无法生成密码文件（无 htpasswd 且无 php）"; exit 1
fi

printf 'AuthType Basic\\nAuthName "DOO Database Admin"\\nAuthUserFile %s/.htpasswd\\nRequire valid-user\\n' "${DIR}" > .htaccess
echo "AUTH: Basic Auth 已创建（用户 ${username}）"

# 4. Nginx 检测提示（.htaccess 仅 Apache 生效）
if [ -d /www/server/nginx ]; then
  echo "NOTE: 服务器为 Nginx。若 .htaccess 不生效，请宝塔站点设置添加："
  echo "      auth_basic \"DB Admin\"; auth_basic_user_file ${DIR}/.htpasswd;"
fi
`}
echo "OK: Adminer 部署完成"
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH 已连接 ' + HOST);
  conn.exec('bash -s', (err, stream) => {
    if (err) { console.log('exec err:', err.message); process.exit(1); }
    stream.on('data', (d) => process.stdout.write(d));
    stream.stderr.on('data', (d) => process.stdout.write(d));
    stream.on('close', (code) => {
      console.log('----------------------------------------');
      console.log('访问地址: http://' + HOST + ':7070/dbadmin/adminer.php');
      if (!noAuth) {
        console.log('网页认证: 用户 ' + username + ' / 密码 ' + password);
        console.log('（请立即保存；改密码: cd ' + DIR + ' && htpasswd -b .htpasswd ' + username + ' 新密码）');
      }
      console.log('数据库登录: 用 MySQL 账号密码（root 或专用账号，host 填 localhost）');
      console.log('安全提醒: 公网数据库管理工具风险高，用完后建议删除: cd ' + REMOTE_ROOT + ' && rm -rf dbadmin');
      conn.end();
      process.exit(code || 0);
    });
    stream.write(REMOTE_SH);
    stream.end();
  });
});
conn.on('error', (e) => { console.log('SSH err:', e.message); process.exit(1); });
conn.connect({ host: HOST, port: 22, username: 'root', privateKey: fs.readFileSync(KEY) });
