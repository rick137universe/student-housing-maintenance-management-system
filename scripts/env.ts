import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (!process.env.DATABASE_URL) throw new Error('请配置 DATABASE_URL');
