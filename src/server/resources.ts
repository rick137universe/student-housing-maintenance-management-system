import type { PoolClient, QueryResultRow } from 'pg';
import { z } from 'zod';
import { query, transaction } from './db';
import { AppError, requireValue } from './errors';
import { assertBuilding, audit, authorize, passwordHash } from './security';
import type { Account } from '../types/auth';

export type Row = QueryResultRow;
const str = z.string().trim().min(1).max(150);
export const resourceDefinitions = {
 students:{table:'students',id:'student_number',schema:z.object({student_number:str,full_name:str,gender:z.enum(['male','female']),college:str,grade:str,phone:z.string().max(32).nullable().optional(),email:z.email().nullable().optional(),password:z.string().min(8).max(128).optional(),account_status:z.enum(['active','disabled','locked']).optional()}).strict()},
 buildings:{table:'apartment_buildings',id:'building_id',schema:z.object({building_id:str,building_name:str,total_floors:z.coerce.number().int().positive(),building_attribute:str,manager_account_id:z.string().regex(/^\d+$/),location_description:z.string().max(2000).nullable().optional(),gender_restriction:z.enum(['male','female','any'])}).strict()},
 rooms:{table:'rooms',id:'room_id',schema:z.object({room_id:str,building_id:str,floor_number:z.coerce.number().int().positive(),room_type:str,bed_capacity:z.coerce.number().int().positive(),room_status:z.enum(['available','maintenance','closed'])}).strict()},
 beds:{table:'beds',id:'bed_id',schema:z.object({bed_id:str,room_id:str,bed_number:str,bed_status:z.enum(['available','occupied','maintenance','closed'])}).strict()},
} as const;
export type ResourceKind = keyof typeof resourceDefinitions;
export function isResourceKind(value:string): value is ResourceKind { return value in resourceDefinitions; }
export async function resourceBuilding(kind:ResourceKind, id:string, client?:PoolClient) {
 const sql = kind==='buildings'?'SELECT building_id FROM apartment_buildings WHERE building_id=$1':kind==='rooms'?'SELECT building_id FROM rooms WHERE room_id=$1':kind==='beds'?'SELECT r.building_id FROM beds b JOIN rooms r USING(room_id) WHERE bed_id=$1':
 'SELECT r.building_id FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) WHERE student_number=$1 AND check_out_date IS NULL';
 return (await query(sql,[id],client)).rows[0]?.building_id as string|undefined;
}
export async function resourceWrite(account:Account,kind:ResourceKind,method:string,id:string|undefined,input:unknown,client?:PoolClient) {
 await authorize(account,'resources','write',client);
 const def=resourceDefinitions[kind];
 const execute=async(c:PoolClient) => {
  if(account.role!=='admin') {
   const rawInput=input as Row;
   const building=method==='POST'&&kind==='rooms'?rawInput.building_id:method==='POST'&&kind==='beds'?
    (await query('SELECT building_id FROM rooms WHERE room_id=$1',[rawInput.room_id],c)).rows[0]?.building_id:id?await resourceBuilding(kind,id,c):undefined;
   requireValue(building,'资源不存在',404);await assertBuilding(account,building,c);
   if(kind==='buildings'||(kind==='students'&&method==='POST'))throw new AppError(403,'FORBIDDEN','楼栋和新学生档案由管理员维护');
  }
  if(method==='DELETE') {
   requireValue(id,'缺少资源编号',400);
   if(kind==='students')throw new AppError(409,'CONFLICT','学生身份通过停用处理，不删除历史');
   const result=await query(`DELETE FROM ${def.table} WHERE ${def.id}=$1 RETURNING ${def.id}`,[id],c);
   requireValue(result.rows[0],'资源不存在',404);await audit(c,account,'delete',kind,id);return result.rows[0];
  }
  const raw=method==='PATCH'?def.schema.partial().parse(input):def.schema.parse(input);
  const data:Row={...raw};
  if(method==='PATCH')delete data[def.id];
  if(kind==='students'){
   if(data.password){data.password_hash=await passwordHash(data.password);delete data.password;}
   if(method==='POST')requireValue(data.password_hash,'新增学生必须提供初始密码',400);
   if(account.role!=='admin'&&(data.password_hash||data.account_status))throw new AppError(403,'FORBIDDEN','账号凭据与状态由管理员维护');
  }
  if(account.role!=='admin'&&(data.building_id||data.room_id)){
   const target=data.building_id??(await query('SELECT building_id FROM rooms WHERE room_id=$1',[data.room_id],c)).rows[0]?.building_id;
   requireValue(target,'目标房间不存在',404);await assertBuilding(account,target,c);
  }
  const keys=Object.keys(data);requireValue(keys.length,'没有可更新字段',400);
  const values=keys.map(k=>data[k]);
  const result=method==='PATCH'?await query(`UPDATE ${def.table} SET ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} WHERE ${def.id}=$${keys.length+1} RETURNING ${def.id}`,[...values,id],c):
   await query(`INSERT INTO ${def.table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>`$${i+1}`).join(',')}) RETURNING ${def.id}`,values,c);
  requireValue(result.rows[0],'资源不存在',404);
  const targetId=String(result.rows[0][def.id]);
  if(kind==='students') {
   if(method==='POST')await query(`INSERT INTO user_accounts(username,full_name,role,student_number) VALUES($1,$2,'student',$1)`,[targetId,data.full_name],c);
   else await query(`UPDATE user_accounts a SET full_name=s.full_name,phone=s.phone,email=s.email FROM students s WHERE a.student_number=s.student_number AND s.student_number=$1`,[targetId],c);
   if(data.password_hash||data.account_status)await query('DELETE FROM auth_sessions WHERE account_id IN(SELECT account_id FROM user_accounts WHERE student_number=$1)',[targetId],c);
  }
  await audit(c,account,method==='POST'?'create':'update',kind,targetId);return result.rows[0];
 };
 return client?execute(client):transaction(execute);
}

export function managerScope(alias:string,account:Account,values:unknown[]) {
 values.push(account.id);const param=`$${values.length}`;
 return `(${alias}.manager_account_id=${param} OR EXISTS(SELECT 1 FROM building_authorizations ba WHERE ba.building_id=${alias}.building_id AND ba.account_id=${param}))`;
}
export async function listResource(account:Account,kind:string,params:URLSearchParams,id?:string) {
 const values:unknown[]=[];let from='';let columns='';let condition='true';let key='';let resource=kind;
 const add=(v:unknown)=>{values.push(v);return `$${values.length}`;};
 const student=()=>`s.student_number=${add(account.studentNumber)}`;
 const manager=()=>managerScope('a',account,values);
 switch(kind){
 case 'students':resource='resources';from='students s';columns='s.student_number,s.full_name,s.gender,s.college,s.grade,s.phone,s.email,s.account_status';key='s.student_number';
  if(account.role==='dormManager'){from+=` JOIN occupancy_records o ON o.student_number=s.student_number AND o.check_out_date IS NULL JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id)`;condition=manager();}else if(account.role==='student')condition=student();break;
 case 'buildings':resource='resources';from='apartment_buildings a';columns='a.*';key='a.building_id';if(account.role==='dormManager')condition=manager();break;
 case 'rooms':resource='resources';from='rooms r JOIN apartment_buildings a USING(building_id)';columns='r.*,a.building_name';key='r.room_id';if(account.role==='dormManager')condition=manager();break;
 case 'beds':case 'anomalies':{
  resource='resources';from='beds b JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id)';
  const occupied='EXISTS(SELECT 1 FROM occupancy_records o WHERE o.bed_id=b.bed_id AND o.check_out_date IS NULL)';
  columns=`b.*,r.building_id,a.building_name,r.floor_number,r.room_type,r.room_status,a.gender_restriction,${occupied} actual_occupied`;key='b.bed_id';
  if(account.role==='dormManager')condition=manager();
  if(kind==='anomalies'){
   requireValue(account.role==='admin'||account.role==='dormManager','不能检查资源异常',403);
   condition+=` AND ((b.bed_status='occupied')<>${occupied} OR b.bed_status='maintenance')`;
   columns+=`,b.bed_id "bedId",concat_ws('；',CASE WHEN (b.bed_status='occupied')<>${occupied} THEN '床位状态与有效入住不一致' END,CASE WHEN b.bed_status='maintenance' THEN '维修停用，需人工检查后恢复' END) issue`;
  }
  break;
 }
 case 'occupancies':from='occupancy_records o JOIN students s USING(student_number) JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id)';columns='o.*,s.full_name,r.room_id,r.building_id';key='o.occupancy_id';if(account.role==='student')condition=student();else if(account.role==='dormManager')condition=manager();break;
 case 'applications':from='accommodation_applications x JOIN students s USING(student_number) LEFT JOIN apartment_buildings a ON a.building_id=x.preferred_building_id';columns="x.*,s.full_name,s.gender,'checkin'::text business_type,NULL::text original_bed_id,(SELECT o.bed_id FROM occupancy_records o WHERE o.application_id=x.application_id) new_bed_id,x.applied_at+make_interval(days=>COALESCE((SELECT (setting_value->>'processingDays')::int FROM system_settings WHERE setting_key='accommodation'),7)) processing_due_at";key='x.application_id';if(account.role==='student')condition=student();else if(account.role==='dormManager')condition=manager();break;
 case 'changes':from='accommodation_changes x JOIN students s USING(student_number) JOIN beds b ON b.bed_id=x.original_bed_id JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id)';columns="x.*,s.full_name,x.applied_at+make_interval(days=>COALESCE((SELECT (setting_value->>'processingDays')::int FROM system_settings WHERE setting_key='accommodation'),7)) processing_due_at";key='x.change_id';if(account.role==='student')condition=student();else if(account.role==='dormManager')condition=manager();break;
 case 'bills':from='accommodation_bills x JOIN students s USING(student_number) JOIN bill_balances balance USING(bill_id)';columns='x.*,s.full_name,balance.paid_amount,balance.outstanding_amount';key='x.bill_id';if(account.role==='student')condition=student();else if(account.role==='dormManager')condition=`EXISTS(SELECT 1 FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id) WHERE o.student_number=s.student_number AND o.check_out_date IS NULL AND ${manager()})`;break;
 case 'payments':from='payment_records x JOIN students s USING(student_number)';columns='x.payment_id,x.bill_id,x.student_number,x.amount,x.paid_at,x.payment_method,s.full_name';key='x.payment_id';if(account.role==='student')condition=student();break;
 case 'reminders':requireValue(account.role==='admin'||account.role==='dormManager','不能查看催缴记录',403);resource='bills';from='notifications x JOIN accommodation_bills bb USING(bill_id) JOIN students s ON s.student_number=bb.student_number';columns='x.*,s.full_name,s.student_number,bb.billing_period';key='x.notification_id';condition="x.title='缴费提醒'";if(account.role==='dormManager')condition+=` AND EXISTS(SELECT 1 FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id) WHERE o.student_number=s.student_number AND o.check_out_date IS NULL AND ${manager()})`;break;
 case 'repairs':from='repair_requests x JOIN students s USING(student_number) JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id)';columns='x.*,s.full_name,a.building_name';key='x.repair_id';if(account.role==='student'){
  condition=student();
  from+=' LEFT JOIN LATERAL (SELECT * FROM maintenance_records mr WHERE mr.repair_id=x.repair_id ORDER BY mr.maintenance_id DESC LIMIT 1) latest ON true LEFT JOIN user_accounts technician ON technician.account_id=latest.technician_account_id';
  columns+=',latest.maintenance_id,latest.dispatched_at,latest.accepted_at,latest.maintenance_at,latest.processing_description,latest.expected_completion_at,latest.completed_at,latest.materials,latest.hours,latest.service_rating,latest.evaluation_content,latest.evaluated_at,technician.full_name technician_name';
 }else if(account.role==='dormManager')condition=manager();else if(account.role==='maintenance')condition=`EXISTS(SELECT 1 FROM maintenance_records m WHERE m.repair_id=x.repair_id AND m.technician_account_id=${add(account.id)})`;break;
 case 'maintenance':from='maintenance_records x JOIN repair_requests rr USING(repair_id)';columns='x.*,rr.fault_description,rr.repair_status,rr.room_id';key='x.maintenance_id';if(account.role==='maintenance')condition=`x.technician_account_id=${add(account.id)}`;break;
 case 'announcements':from='announcements x';columns='x.*';key='x.announcement_id';if(account.role!=='admin')condition=`x.enabled AND (x.expires_at IS NULL OR x.expires_at>now()) AND (x.building_id IS NULL OR EXISTS(SELECT 1 FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) WHERE o.student_number=${add(account.studentNumber)} AND o.check_out_date IS NULL AND r.building_id=x.building_id))`;break;
 case 'notifications':from='notifications x';columns='x.*';key='x.notification_id';condition=`x.recipient_account_id=${add(account.id)}`;break;
 case 'accounts':from='user_accounts x LEFT JOIN students s USING(student_number)';columns='x.account_id,x.username,x.role,x.student_number,COALESCE(s.full_name,x.full_name) full_name,COALESCE(s.account_status,x.account_status) account_status,COALESCE(s.email,x.email) email';key='x.account_id';break;
 case 'permissions':from='role_permissions x';columns='x.*';key='x.role';break;
 case 'authorizations':resource='accounts';from='building_authorizations x';columns='x.*';key='x.account_id';break;
 case 'settings':from='system_settings x';columns='x.*';key='x.setting_key';condition="x.setting_key<>'seed.initialized'";break;
 case 'audit':from='audit_events x';columns='x.*';key='x.audit_id';break;
 case 'backup-policies':resource='backups';from='backup_policies x';columns='x.*';key='x.policy_id';break;
 case 'backups':from='backup_runs x';columns='x.*';key='x.backup_run_id';break;
 default:throw new AppError(404,'NOT_FOUND','接口不存在');
 }
 await authorize(account,resource,'read');
 if(id)condition+=` AND ${key}=${add(id)}`;
 const q=params.get('q');if(q){const alias=kind==='students'?'s':kind==='buildings'?'a':kind==='rooms'?'r':['beds','anomalies'].includes(kind)?'b':kind==='occupancies'?'o':'x';condition+=` AND (to_jsonb(${alias})-'password_hash')::text ILIKE ${add(`%${q.slice(0,100)}%`)}`;}
 const status=params.get('status');const statusColumn:Record<string,string>={applications:'x.review_status',changes:'x.review_status',repairs:'x.repair_status',maintenance:'rr.repair_status',bills:'x.bill_status',backups:'x.run_status',beds:'b.bed_status'};
 if(status&&statusColumn[kind])condition+=` AND ${statusColumn[kind]}=ANY(${add(status.split(','))}::text[])`;
 if(params.get('type')&&kind==='changes')condition+=` AND x.business_type=${add(params.get('type'))}`;
 const period=params.get('period');if(period&&kind==='bills')condition+=` AND x.billing_period=${add(period)}`;
 if(params.get('unpaid')==='true'&&kind==='bills')condition+=' AND balance.outstanding_amount>0';
 if(params.get('unread')==='true'&&kind==='notifications')condition+=' AND x.read_at IS NULL';
 if(params.get('type')==='payment-reminder'&&kind==='notifications')condition+=" AND x.title='缴费提醒' AND x.bill_id IS NOT NULL";
 const building=params.get('buildingId');if(building&&['rooms','beds','anomalies','repairs','occupancies','buildings'].includes(kind))condition+=` AND a.building_id=${add(building)}`;
 const dateColumn:Record<string,string>={audit:'x.occurred_at',repairs:'x.submitted_at',maintenance:'x.dispatched_at',payments:'x.paid_at',bills:'x.generated_at'};
 for(const [filter,op] of [['from','>='],['to','<']] as const){const value=params.get(filter);if(value&&dateColumn[kind]){z.iso.date().parse(value);condition+=` AND ${dateColumn[kind]} ${op} ${add(value)}::date${filter==='to'?"+interval '1 day'":''}`;}}
 const page=z.coerce.number().int().min(1).parse(params.get('page')??1);const limit=z.coerce.number().int().min(1).max(100).parse(params.get('limit')??20);
 const total=Number((await query(`SELECT count(*) FROM ${from} WHERE ${condition}`,values)).rows[0].count);
 const rows=(await query(`SELECT ${columns} FROM ${from} WHERE ${condition} ORDER BY ${key} DESC LIMIT ${add(id?1:limit)} OFFSET ${add(id?0:(page-1)*limit)}`,values)).rows;
 if(id){requireValue(rows[0],'记录不存在或不可访问',404);return {data:rows[0]};}
 return {data:rows,meta:{page,limit,total}};
}
