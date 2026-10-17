/**
 * 极简 .env 加载器（不引入 dotenv 依赖）
 * 从项目根 ./.env 读取 KEY=VALUE，不覆盖已设置的 process.env
 */
import * as fs from 'fs';
import * as path from 'path';

export function loadEnv(file = path.join(__dirname, '../../.env')): void {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}