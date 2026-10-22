import {z} from 'zod';
import type {Account} from '../types/auth';
import {navigationSignals} from '../data/navigation-signals';
import {listResource} from './resources';
import {query} from './db';
import {AppError} from './errors';
import {authorize} from './security';
export async function navigationAttention(account:Account){
 return Promise.all(navigationSignals[account.role].map(async signal=>{
  try{const result=await listResource(account,signal.resource,new URLSearchParams({...signal.query,limit:'1'}));return {feature:signal.feature,actions:signal.actions,active:(result.meta?.total??0)>0};}
  catch(error){if(error instanceof AppError&&error.status===403)return {feature:signal.feature,actions:signal.actions,active:false};throw error;}
 }));
}
export async function navigationRead(account:Account,input:unknown){
 const data=z.object({resource:z.enum(['announcements','maintenance','backups','repairs','applications','changes']),id:z.string().regex(/^[1-9]\d{0,18}$/),version:z.string().max(64)}).strict().parse(input);
 const row=(await listResource(account,data.resource,new URLSearchParams(),data.id)).data as Record<string,unknown>;
 if(['repairs','applications','changes'].includes(data.resource)){
  if(account.role!=='student')return {read:true};
  await authorize(account,'notifications','write');
  const column={repairs:'repair_id',applications:'application_id',changes:'change_id'}[data.resource as 'repairs'|'applications'|'changes'];
  const cutoff=z.string().regex(/^\d{1,19}$/).parse(data.version);
  await query(`UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE recipient_account_id=$1 AND ${column}=$2 AND notification_id<=$3`,[account.id,data.id,cutoff]);
 }else{
  // A stale rendered version must never acknowledge a later edit or task result.
  if(row.navigation_version!==data.version)return {read:false};
  await query(`INSERT INTO navigation_reads(account_id,resource,record_id,version) VALUES($1,$2,$3,$4) ON CONFLICT(account_id,resource,record_id) DO UPDATE SET version=EXCLUDED.version,read_at=now()`,[account.id,data.resource,data.id,data.version]);
 }
 return {read:true};
}
