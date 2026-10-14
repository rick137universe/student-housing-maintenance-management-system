import { z } from 'zod';
import { query, transaction } from './db';
import { requireValue } from './errors';
import { authorize, audit } from './security';
import type { Account } from '../types/auth';

export async function backupPolicy(account:Account,id:string|undefined,input:unknown) {
 const data=z.object({name:z.string().min(1).max(100),schedule:z.string().regex(/^([0-5]?\d) (1\d|2[0-3]|\d) \* \* \*$/),retentionDays:z.coerce.number().int().min(1).max(365),enabled:z.boolean()}).strict().parse(input);
 return transaction(async c=>{await authorize(account,'backups','write',c);requireValue(account.role==='admin','仅管理员维护备份',403);
  const result=id?await query(`UPDATE backup_policies SET policy_name=$2,schedule_expression=$3,retention_days=$4,enabled=$5,configured_by=$6 WHERE policy_id=$1 RETURNING *`,[id,data.name,data.schedule,data.retentionDays,data.enabled,account.id],c):
   await query(`INSERT INTO backup_policies(policy_name,schedule_expression,destination_description,retention_days,enabled,configured_by) VALUES($1,$2,'BACKUP_DIR',$3,$4,$5) RETURNING *`,[data.name,data.schedule,data.retentionDays,data.enabled,account.id],c);
  requireValue(result.rows[0],'备份策略不存在',404);await audit(c,account,'configure','backup-policies',result.rows[0].policy_id);return result.rows[0];
 });
}
export async function enqueueBackup(account:Account,type:'backup'|'restore',input:unknown) {
 const data=z.object({sourceBackupId:z.string().regex(/^\d+$/).optional(),policyId:z.string().regex(/^\d+$/).optional()}).strict().parse(input);
 return transaction(async c=>{await authorize(account,'backups','write',c);requireValue(account.role==='admin','仅管理员执行备份恢复',403);
  if(type==='restore'){requireValue(data.sourceBackupId,'请选择备份',400);const source=(await query("SELECT * FROM backup_runs WHERE backup_run_id=$1 AND operation_type='backup' AND run_status='succeeded' AND file_deleted_at IS NULL",[data.sourceBackupId],c)).rows[0];requireValue(source,'备份不存在、失败或已过期',404);}
  const row=(await query(`INSERT INTO backup_runs(policy_id,operation_type,run_status,operator_account_id,source_backup_id) VALUES($1,$2,'queued',$3,$4) RETURNING *`,[data.policyId??null,type,account.id,data.sourceBackupId??null],c)).rows[0];
  await audit(c,account,`queue-${type}`,'backups',row.backup_run_id);return row;
 });
}
export async function health() {
 await query('SELECT 1');const row=(await query("SELECT max(heartbeat_at) last_heartbeat,bool_or(heartbeat_at>now()-interval '1 minute') active FROM worker_heartbeats")).rows[0];
 return {application:'ok',database:'ok',worker:row.active?'running':'offline',lastHeartbeat:row.last_heartbeat};
}
