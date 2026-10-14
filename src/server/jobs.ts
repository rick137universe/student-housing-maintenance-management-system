import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Pool } from 'pg';
import { pool, query, transaction } from './db';
import { requireValue } from './errors';
import { generateBills } from './workflows';

function backupDirectory(){requireValue(process.env.BACKUP_DIR,'请配置 BACKUP_DIR',503);return path.resolve(process.env.BACKUP_DIR!);}
function checkedPath(filename:string){const base=backupDirectory();const full=path.resolve(filename);requireValue(full.startsWith(base+path.sep),'备份路径超出受控目录');return full;}
async function checksum(filename:string){return createHash('sha256').update(await readFile(filename)).digest('hex');}
function postgresTool(tool:string,database:string,args:string[]) {
 const connection=new URL(process.env.DATABASE_OPERATIONS_URL??process.env.DATABASE_ADMIN_URL??process.env.DATABASE_URL!);
 const binary=path.join(process.env.PG_BIN??'',process.platform==='win32'?`${tool}.exe`:tool);
 return new Promise<void>((resolve,reject)=>{
  const child=spawn(binary,['-h',connection.hostname,'-p',connection.port||'5432','-U',decodeURIComponent(connection.username),'-d',database,...args],{
   windowsHide:true,shell:false,env:{...process.env,PGPASSWORD:decodeURIComponent(connection.password),PGCLIENTENCODING:'UTF8'},stdio:['ignore','ignore','pipe'],
  });let error='';child.stderr.on('data',chunk=>{error+=(String(chunk)).slice(0,4000);});
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${tool} 执行失败（${code}）：${error.slice(0,2000)}`)));
 });
}
export async function validateRestore(database:string) {
 const connection=new URL(process.env.DATABASE_OPERATIONS_URL??process.env.DATABASE_ADMIN_URL??process.env.DATABASE_URL!);connection.pathname='/'+database;
 const restored=new Pool({connectionString:connection.href});
 try{
  const tableCount=Number((await restored.query("SELECT count(*) FROM information_schema.tables WHERE table_schema='housing' AND table_type='BASE TABLE'")).rows[0].count);
  const migrations=(await restored.query('SELECT version,checksum FROM housing.schema_migrations ORDER BY version')).rows;
  const expected=(await query('SELECT version,checksum FROM schema_migrations ORDER BY version')).rows;
  requireValue(JSON.stringify(migrations)===JSON.stringify(expected),'备份迁移版本与当前程序不一致');
  const invalidBeds=Number((await restored.query(`SELECT count(*) FROM housing.beds b WHERE (b.bed_status='occupied')<>EXISTS(SELECT 1 FROM housing.occupancy_records o WHERE o.bed_id=b.bed_id AND check_out_date IS NULL)`)).rows[0].count);
  const invalidBills=Number((await restored.query(`SELECT count(*) FROM housing.bill_balances WHERE bill_status<>CASE WHEN paid_amount>=total_amount THEN 'paid' WHEN paid_amount>0 THEN 'partial' ELSE 'unpaid' END OR outstanding_amount<0`)).rows[0].count);
  const constraints=Number((await restored.query("SELECT count(*) FROM pg_constraint WHERE connamespace='housing'::regnamespace AND NOT convalidated")).rows[0].count);
  const expectedCount=Number((await query("SELECT count(*) FROM information_schema.tables WHERE table_schema='housing' AND table_type='BASE TABLE'")).rows[0].count);
  requireValue(tableCount===expectedCount&&invalidBeds===0&&invalidBills===0&&constraints===0,'恢复数据完整性校验失败');
  return {database,tableCount,invalidBeds,invalidBills,invalidConstraints:constraints,migrations:migrations.map(m=>m.version)};
 }finally{await restored.end();}
}
export async function workerTick(workerId:string) {
 await query('INSERT INTO worker_heartbeats(worker_id) VALUES($1) ON CONFLICT(worker_id) DO UPDATE SET heartbeat_at=now()',[workerId]);
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
 const period=`${parts.year}-${parts.month}`;const date=`${period}-${parts.day}`;const minutes=Number(parts.hour)*60+Number(parts.minute);
 if(Number(parts.day)>1||minutes>=10)await generateBills(null,period);
 const policies=(await query('SELECT * FROM backup_policies WHERE enabled')).rows;
 for(const policy of policies){const [minute,hour]=policy.schedule_expression.split(' ').map(Number);if(minutes>=hour*60+minute)await query(`INSERT INTO backup_runs(policy_id,operation_type,run_status,scheduled_key) VALUES($1,'backup','queued',$2) ON CONFLICT(scheduled_key) DO NOTHING`,[policy.policy_id,`${policy.policy_id}:${date}`]);}
 const job=await transaction(async c=>{
  const row=(await query(`SELECT * FROM backup_runs WHERE run_status='queued' OR (run_status='running' AND lease_expires_at<now()) ORDER BY backup_run_id FOR UPDATE SKIP LOCKED LIMIT 1`,[],c)).rows[0];
  if(!row)return null;
  return (await query("UPDATE backup_runs SET run_status='running',worker_id=$2,lease_expires_at=now()+interval '2 minutes',finished_at=NULL WHERE backup_run_id=$1 RETURNING *",[row.backup_run_id,workerId],c)).rows[0];
 });
 if(job){
  const renew=setInterval(()=>{void query("UPDATE backup_runs SET lease_expires_at=now()+interval '2 minutes' WHERE backup_run_id=$1 AND worker_id=$2 AND run_status='running'",[job.backup_run_id,workerId]).catch(console.error);},20000);
  try{
   let filename:string|null=null;let sum:string|null=null;let database:string|null=null;let validation:unknown=null;
   if(job.operation_type==='backup'){
    await mkdir(backupDirectory(),{recursive:true});filename=checkedPath(path.join(backupDirectory(),`backup-${job.backup_run_id}-${randomUUID()}.dump`));
    const original=new URL(process.env.DATABASE_URL!).pathname.slice(1);
    await postgresTool('pg_dump',original,['--format=custom','--no-owner','--no-privileges','--file',filename]);sum=await checksum(filename);
   }else{
    const source=(await query('SELECT * FROM backup_runs WHERE backup_run_id=$1 AND file_deleted_at IS NULL',[job.source_backup_id])).rows[0];requireValue(source?.external_file_reference,'源备份不可用');
    filename=checkedPath(source.external_file_reference);await stat(filename);requireValue(await checksum(filename)===source.checksum,'备份校验值不匹配，拒绝恢复');
    database=`dorma_restore_${job.backup_run_id}_${Date.now()}`;
    const admin=new Pool({connectionString:process.env.DATABASE_OPERATIONS_URL??process.env.DATABASE_ADMIN_URL});
    try{await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0 ENCODING 'UTF8'`);}finally{await admin.end();}
    await postgresTool('pg_restore',database,['--no-owner','--no-privileges','--exit-on-error',filename]);validation=await validateRestore(database);sum=source.checksum;
   }
   await query(`UPDATE backup_runs SET run_status='succeeded',finished_at=now(),external_file_reference=$3,checksum=$4,restored_database=$5,validation_result=$6,result_description=$7,lease_expires_at=NULL WHERE backup_run_id=$1 AND worker_id=$2`,[job.backup_run_id,workerId,filename,sum,database,JSON.stringify(validation),database?'已恢复到独立数据库并通过校验':'备份完成']);
  }catch(error){await query("UPDATE backup_runs SET run_status='failed',finished_at=now(),lease_expires_at=NULL,result_description=$3 WHERE backup_run_id=$1 AND worker_id=$2",[job.backup_run_id,workerId,error instanceof Error?error.message:'任务失败']);}
  finally{clearInterval(renew);}
 }
 // 只清理数据库登记、位于受控目录内且超过策略保留期的文件。
 const expired=(await query(`SELECT r.* FROM backup_runs r JOIN backup_policies p USING(policy_id) WHERE operation_type='backup' AND run_status='succeeded' AND file_deleted_at IS NULL AND finished_at<now()-p.retention_days*interval '1 day'
 AND NOT EXISTS(SELECT 1 FROM backup_runs x WHERE x.source_backup_id=r.backup_run_id AND x.run_status IN('queued','running'))`)).rows;
 for(const row of expired){await unlink(checkedPath(row.external_file_reference)).catch(error=>{if(error.code!=='ENOENT')throw error;});await query('UPDATE backup_runs SET file_deleted_at=now() WHERE backup_run_id=$1',[row.backup_run_id]);}
 return job;
}
export async function runWorker(once=false) {
 const workerId=randomUUID();let stop=false;process.on('SIGINT',()=>{stop=true;});process.on('SIGTERM',()=>{stop=true;});
 try{do{try{await workerTick(workerId);}catch(error){console.error(error instanceof Error?error.message:error);}if(!once&&!stop)await new Promise(resolve=>setTimeout(resolve,15000));}while(!once&&!stop);}finally{await pool.end();}
}
