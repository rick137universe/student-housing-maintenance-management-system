import './env';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

const pool = new Pool({ connectionString:process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(7914330)");
  const existing = (await client.query("SELECT to_regclass('housing.students') present")).rows[0].present;
  if (!existing) await client.query(await readFile('database/001_schema.sql','utf8'));
  const tableCount = Number((await client.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='housing' AND table_type='BASE TABLE'")).rows[0].count);
  if (tableCount < 20) throw new Error('现有 housing 初始化结构不完整，迁移已停止');
  await client.query(`CREATE TABLE IF NOT EXISTS housing.schema_migrations(version text PRIMARY KEY,checksum char(64) NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())`);
  for (const version of ['003_backend','004_resource_guards','005_metadata','006_account_usernames']) {
    const sql = await readFile(`database/migrations/${version}.sql`,'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const old = (await client.query('SELECT checksum FROM housing.schema_migrations WHERE version=$1',[version])).rows[0];
    if (old) { if (old.checksum !== checksum) throw new Error(`已执行迁移 ${version} 的校验值发生变化`); continue; }
    await client.query('BEGIN');
    try { await client.query(sql); await client.query('INSERT INTO housing.schema_migrations(version,checksum) VALUES($1,$2)',[version,checksum]); await client.query('COMMIT'); }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    console.log(`迁移 ${version} 完成`);
  }
} finally { await client.query('SELECT pg_advisory_unlock(7914330)'); client.release(); await pool.end(); }
