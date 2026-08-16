/**
 * App 构建入口（uni CLI 默认找 src/ 目录，本项目源码在根目录，必须显式指定 UNI_INPUT_DIR）
 * 用法：node scripts/build-app.js [h5|app|mp-weixin]
 */
const { spawnSync } = require('child_process');
const path = require('path');

const target = process.argv[2] || 'app';
process.env.UNI_INPUT_DIR = path.resolve(__dirname, '..');

const args = ['build', '-p', target];

const r = spawnSync('npx', ['uni', ...args], { stdio: 'inherit', shell: true });
process.exit(r.status || 0);
