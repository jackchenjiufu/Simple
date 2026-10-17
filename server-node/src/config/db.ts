import mysql, { Pool } from 'mysql2/promise';
import { loadEnv } from './env';

loadEnv();

export const db: Pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'doo-app',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  connectionLimit: 10,
  charset: 'utf8mb4',
});