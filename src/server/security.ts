import { randomBytes, scrypt as derive, timingSafeEqual, createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { query } from './db';
import { AppError } from './errors';
import type { Account, RoleId } from '../types/auth';

const scrypt = (password:string,salt:string,N:number,r:number,p:number) => new Promise<Buffer>((resolve,reject)=>{
  derive(password,salt,64,{N,r,p,maxmem:256*1024*1024},(error,key)=>error?reject(error):resolve(key));
});
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 131072, 8, 1);
  return `scrypt$131072$8$1$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [format,n,r,p,salt,hash] = encoded.split('$');
  if (format !== 'scrypt' || !hash) return false;
  const key = await scrypt(password, salt, Number(n), Number(r), Number(p));
  const expected = Buffer.from(hash, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export const roleNames: Record<RoleId,string> = { student:'学生', dormManager:'宿管人员', maintenance:'维修人员', admin:'系统管理员' };
export const dbRole = (role: RoleId) => role === 'dormManager' ? 'dorm_manager' : role;
export function mapAccount(row: Record<string, unknown>): Account {
  const role = (row.role === 'dorm_manager' ? 'dormManager' : row.role) as RoleId;
  return { id:String(row.account_id), role, username:String(row.username), displayName:String(row.full_name),
    roleName:roleNames[role], scope:role === 'admin' ? '全系统' : role === 'dormManager' ? '授权楼栋' : role === 'maintenance' ? '获派工单' : '本人业务',
    studentNumber:row.student_number ? String(row.student_number) : null };
}
export const accountSql = `SELECT a.account_id,a.username,a.role,a.student_number,
 COALESCE(s.full_name,a.full_name) full_name,COALESCE(s.password_hash,a.password_hash) password_hash,
 COALESCE(s.account_status,a.account_status) account_status FROM user_accounts a LEFT JOIN students s USING(student_number)`;
export async function currentAccount(request: Request) {
  const cookie = request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('dorma_session='))?.slice(14);
  if (!cookie) throw new AppError(401,'UNAUTHENTICATED','请先登录');
  const { rows } = await query(`${accountSql.replace('SELECT a.account_id','SELECT t.csrf_token,a.account_id')} JOIN auth_sessions t ON t.account_id=a.account_id
    WHERE t.token_hash=$1 AND t.expires_at>now()`,[digest(cookie)]);
  if (!rows[0] || rows[0].account_status !== 'active') throw new AppError(401,'UNAUTHENTICATED','登录已失效，请重新登录');
  return { ...mapAccount(rows[0]), csrfToken:rows[0].csrf_token };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN ?? new URL(request.url).origin;
  if (origin !== expected) throw new AppError(403,'ORIGIN_REJECTED','请求来源不被允许');
}
export async function authorize(account: Account, resource: string, operation: string, client?: PoolClient) {
  const maximum:Record<string,Record<string,string[]>>={
    student:{profile:['read','write'],resources:['read'],applications:['read','write'],changes:['read','write'],occupancies:['read'],bills:['read'],payments:['read','write'],repairs:['read','write'],announcements:['read'],notifications:['read','write'],statistics:['read']},
    dorm_manager:{profile:['read','write'],resources:['read','write'],applications:['read','review'],changes:['read','review'],occupancies:['read'],bills:['read','review'],repairs:['read','review'],announcements:['read'],notifications:['read','write'],statistics:['read']},
    maintenance:{profile:['read','write'],repairs:['read'],maintenance:['read','write'],announcements:['read'],notifications:['read','write'],statistics:['read']},
  };
  if(account.role!=='admin'&&!maximum[dbRole(account.role)]?.[resource]?.includes(operation))throw new AppError(403,'FORBIDDEN','此操作超出角色的业务范围');
  const { rows } = await query('SELECT data_scope FROM role_permissions WHERE role=$1 AND resource=$2 AND operation=$3',
    [dbRole(account.role),resource,operation],client);
  if (!rows.length) throw new AppError(403,'FORBIDDEN','当前账号没有此操作权限');
}
export async function buildingAllowed(account: Account, buildingId: string, client?: PoolClient) {
  if (account.role === 'admin') return true;
  if (account.role !== 'dormManager') return false;
  const { rows } = await query(`SELECT 1 FROM apartment_buildings b WHERE b.building_id=$1 AND
    (b.manager_account_id=$2 OR EXISTS(SELECT 1 FROM building_authorizations x WHERE x.building_id=b.building_id AND x.account_id=$2))`,[buildingId,account.id],client);
  return rows.length > 0;
}
export async function assertBuilding(account: Account, buildingId: string, client?: PoolClient) {
  if (!await buildingAllowed(account,buildingId,client)) throw new AppError(403,'FORBIDDEN','该楼栋不在你的管理范围');
}
export async function audit(client: PoolClient, account: Account | null, operation: string, type: string, id: string | null, details: Record<string, unknown> = {}, result='succeeded') {
  await query('INSERT INTO audit_events(actor_account_id,operation,entity_type,entity_id,result,details) VALUES($1,$2,$3,$4,$5,$6)',
    [account?.id ?? null,operation,type,id,result,JSON.stringify(details)],client);
}
export async function notify(client: PoolClient, studentNumber: string, title: string, content: string, kind?: 'bill_id'|'repair_id'|'application_id'|'change_id', id?: string) {
  await query(`INSERT INTO notifications(recipient_account_id,title,content${kind?`,${kind}`:''})
    SELECT account_id,$2,$3${kind?',$4':''} FROM user_accounts WHERE student_number=$1`,
    [studentNumber,title,content,...(kind?[id]:[])],client);
}
