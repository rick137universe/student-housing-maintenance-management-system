import { Pool, types, type PoolClient, type QueryResultRow } from 'pg';
types.setTypeParser(1082,value=>value); // 日历日期保持 YYYY-MM-DD，不转换为 UTC 的前一天。

if (typeof window !== 'undefined') throw new Error('数据库模块只能在服务端使用');
const shared = globalThis as typeof globalThis & { dormaPool?: Pool };
export const pool = shared.dormaPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  options: '-c search_path=housing,pg_catalog -c timezone=Asia/Shanghai',
  connectionTimeoutMillis: 5000,
});
if (process.env.NODE_ENV !== 'production') shared.dormaPool = pool;
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = [], client?: PoolClient) {
  return (client ?? pool).query<T>(sql, values);
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await work(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
