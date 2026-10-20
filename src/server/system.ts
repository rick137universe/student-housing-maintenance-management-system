import { z } from 'zod';
import { query, transaction } from './db';
import { AppError, requireValue } from './errors';
import { accountSql, audit, authorize, passwordHash, verifyPassword, notify, dbRole } from './security';
import { listResource, resourceWrite, isResourceKind, type Row, managerScope } from './resources';
import type { Account } from '../types/auth';

export async function profile(account:Account) {
 const row=(await query(`SELECT a.account_id,a.username,a.role,a.student_number,COALESCE(s.full_name,a.full_name) full_name,
  COALESCE(s.phone,a.phone) phone,COALESCE(s.email,a.email) email,s.gender,s.college,s.grade
  FROM user_accounts a LEFT JOIN students s USING(student_number) WHERE account_id=$1`,[account.id])).rows[0];
 const stay=account.role==='student'?(await listResource(account,'occupancies',new URLSearchParams({limit:'100'}))).data:[];
 return {...row,occupancies:stay};
}
export async function changeProfile(account:Account,input:unknown) {
 await authorize(account,'profile','write');
 const data=z.object({fullName:z.string().trim().min(1).max(100),phone:z.string().max(32).nullable(),email:z.email().nullable()}).strict().parse(input);
 return transaction(async c=>{
  await query('UPDATE user_accounts SET full_name=$2,phone=$3,email=$4 WHERE account_id=$1',[account.id,data.fullName,data.phone,data.email],c);
  if(account.studentNumber)await query('UPDATE students SET full_name=$2,phone=$3,email=$4 WHERE student_number=$1',[account.studentNumber,data.fullName,data.phone,data.email],c);
  await audit(c,account,'update','profile',account.id);return {updated:true};
 });
}
async function assertCurrentPassword(account:Account,password:string) {
 const failures=Number((await query("SELECT count(*) FROM login_attempts WHERE username=$1 AND NOT succeeded AND attempted_at>now()-interval '15 minutes'",[account.username])).rows[0].count);
 if(failures>=10)throw new AppError(429,'RATE_LIMITED','密码校验失败次数过多，请15分钟后重试');
 const row=(await query(`${accountSql} WHERE a.account_id=$1`,[account.id])).rows[0];
 const valid=Boolean(row&&await verifyPassword(password,row.password_hash));
 await query("INSERT INTO login_attempts(username,source,succeeded) VALUES($1,'password-check',$2)",[account.username,valid]);
 requireValue(valid,'当前密码不正确',400);
}
export async function verifyCurrentPassword(account:Account,input:unknown) {
 await authorize(account,'profile','write');
 const data=z.object({currentPassword:z.string().min(1).max(128)}).strict().parse(input);
 await assertCurrentPassword(account,data.currentPassword);
 return {verified:true};
}
export async function changePassword(account:Account,input:unknown) {
 const data=z.object({currentPassword:z.string().max(128),newPassword:z.string().min(8).max(128)}).strict().parse(input);
 await assertCurrentPassword(account,data.currentPassword);
 return transaction(async c=>{
  await authorize(account,'profile','write',c);const hash=await passwordHash(data.newPassword);
  if(account.studentNumber)await query('UPDATE students SET password_hash=$2 WHERE student_number=$1',[account.studentNumber,hash],c);
  else await query('UPDATE user_accounts SET password_hash=$2 WHERE account_id=$1',[account.id,hash],c);
  await query('DELETE FROM auth_sessions WHERE account_id=$1',[account.id],c);await audit(c,account,'change-password','accounts',account.id);return {reauthenticate:true};
 });
}
export async function accountWrite(account:Account,method:string,recordId:string|undefined,input:unknown) {
 const data=z.object({username:z.string().min(1).max(64).optional(),fullName:z.string().min(1).max(100).optional(),
  role:z.enum(['student','dormManager','maintenance','admin']).optional(),studentNumber:z.string().min(1).optional(),
  accountStatus:z.enum(['active','disabled','locked']).optional(),password:z.string().min(8).max(128).optional(),
  email:z.email().nullable().optional(),phone:z.string().max(32).nullable().optional()}).strict().parse(input);
 return transaction(async c=>{
  await authorize(account,'accounts','write',c);requireValue(account.role==='admin','仅管理员可维护账号',403);
  await query('SELECT pg_advisory_xact_lock(7914333)',[],c);
  let target:Row|undefined;
  if(recordId){target=(await query(`${accountSql} WHERE a.account_id=$1 FOR UPDATE OF a`,[recordId],c)).rows[0];requireValue(target,'账号不存在',404);
   if(target.role==='admin'&&((data.role&&data.role!=='admin')||(data.accountStatus&&data.accountStatus!=='active'))){
    const count=Number((await query("SELECT count(*) FROM user_accounts WHERE role='admin' AND account_status='active'",[],c)).rows[0].count);requireValue(count>1,'不能停用或降权最后一个有效管理员');
   }
   if(data.role&&dbRole(data.role)!==target.role)requireValue(target.role!=='student'&&data.role!=='student','学生身份与员工身份不能直接互换');
   const updates:Row={};if(data.fullName)updates.full_name=data.fullName;if(data.role)updates.role=dbRole(data.role);if(data.accountStatus&&target.role!=='student')updates.account_status=data.accountStatus;
   if(data.password&&target.role!=='student')updates.password_hash=await passwordHash(data.password);
   if(data.phone!==undefined)updates.phone=data.phone;if(data.email!==undefined)updates.email=data.email;
   const keys=Object.keys(updates);if(keys.length)await query(`UPDATE user_accounts SET ${keys.map((k,i)=>`${k}=$${i+2}`).join(',')} WHERE account_id=$1`,[recordId,...keys.map(k=>updates[k])],c);
   if(target.student_number){const fields:Row={};if(data.fullName)fields.full_name=data.fullName;if(data.accountStatus)fields.account_status=data.accountStatus;if(data.password)fields.password_hash=await passwordHash(data.password);if(data.phone!==undefined)fields.phone=data.phone;if(data.email!==undefined)fields.email=data.email;
    const names=Object.keys(fields);if(names.length)await query(`UPDATE students SET ${names.map((k,i)=>`${k}=$${i+2}`).join(',')} WHERE student_number=$1`,[target.student_number,...names.map(k=>fields[k])],c);
   }
   if(data.password||(data.role&&dbRole(data.role)!==target.role)||(data.accountStatus&&data.accountStatus!==target.account_status))await query('DELETE FROM auth_sessions WHERE account_id=$1',[recordId],c);
  }else{
   requireValue(method==='POST'&&data.username&&data.fullName&&data.role,'新增账号需要用户名、姓名和角色',400);
   if(data.role==='student'){
    requireValue(data.studentNumber,'学生账号必须关联学号',400);
    const s=(await query('SELECT full_name FROM students WHERE student_number=$1',[data.studentNumber],c)).rows[0];requireValue(s,'请先创建学生档案',400);
    recordId=(await query("INSERT INTO user_accounts(username,full_name,role,student_number) VALUES($1,$2,'student',$3) RETURNING account_id",[data.username,s.full_name,data.studentNumber],c)).rows[0].account_id;
   }else{requireValue(data.password,'新增员工必须提供初始密码',400);recordId=(await query('INSERT INTO user_accounts(username,full_name,role,password_hash,account_status,email,phone) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING account_id',[data.username,data.fullName,dbRole(data.role),await passwordHash(data.password),data.accountStatus??'active',data.email??null,data.phone??null],c)).rows[0].account_id;}
  }
  await audit(c,account,target?'update':'create','accounts',recordId!);return {accountId:recordId};
 });
}
export async function adminSetting(account:Account,key:string,input:unknown) {
 const schema=key==='billing'?z.object({accommodationFee:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),utilityFee:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),dueDays:z.coerce.number().int().min(1).max(365)}).strict():
  key==='allocation'?z.object({automatic:z.boolean()}).strict():key==='accommodation'?z.object({reviewRequired:z.literal(true),processingDays:z.coerce.number().int().min(1).max(90)}).strict():null;
 requireValue(schema,'未知配置项',400);const data=schema.parse(input);
 return transaction(async c=>{await authorize(account,'settings','write',c);await query('INSERT INTO system_settings(setting_key,setting_value,description,updated_by) VALUES($1,$2,$1,$3) ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_by=excluded.updated_by,updated_at=now()',[key,JSON.stringify(data),account.id],c);await audit(c,account,'configure','settings',key);return data;});
}
export async function permissionWrite(account:Account,input:unknown) {
 const data=z.object({role:z.enum(['student','dorm_manager','maintenance','admin']),resource:z.string().min(1).max(80),operation:z.enum(['read','write','review','dispatch']),enabled:z.boolean()}).strict().parse(input);
 const allowed:Record<string,string[]>={student:['profile','resources','applications','changes','occupancies','bills','payments','repairs','announcements','notifications','statistics'],dorm_manager:['profile','resources','applications','changes','occupancies','bills','repairs','announcements','notifications','statistics'],maintenance:['profile','repairs','maintenance','announcements','notifications','statistics'],admin:['profile','resources','applications','changes','occupancies','bills','payments','repairs','maintenance','announcements','notifications','statistics','accounts','permissions','settings','audit','backups']};
 requireValue(allowed[data.role].includes(data.resource),'该角色不能获得此类资源权限',400);
 return transaction(async c=>{await authorize(account,'permissions','write',c);requireValue(account.role==='admin','仅管理员可配置权限',403);
  if(data.role==='admin'&&['accounts','permissions'].includes(data.resource))requireValue(data.enabled,'不能移除管理员的账号与权限恢复能力');
  if(data.enabled)await query('INSERT INTO role_permissions VALUES($1,$2,$3,$4) ON CONFLICT(role,resource,operation) DO NOTHING',[data.role,data.resource,data.operation,data.role==='admin'?'all':data.role==='dorm_manager'?'authorized_buildings':data.role==='maintenance'?'assigned_orders':'self'],c);
  else await query('DELETE FROM role_permissions WHERE role=$1 AND resource=$2 AND operation=$3',[data.role,data.resource,data.operation],c);
  await audit(c,account,'configure','permissions',data.role,{resource:data.resource,operation:data.operation,enabled:data.enabled});return data;
 });
}
export async function authorizationWrite(account:Account,method:string,input:unknown) {
 const data=z.object({accountId:z.string().regex(/^\d+$/),buildingId:z.string().min(1)}).strict().parse(input);
 return transaction(async c=>{await authorize(account,'accounts','write',c);
  if(method==='DELETE')await query('DELETE FROM building_authorizations WHERE account_id=$1 AND building_id=$2',[data.accountId,data.buildingId],c);
  else await query('INSERT INTO building_authorizations(account_id,building_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[data.accountId,data.buildingId],c);
  await audit(c,account,'authorize-building','accounts',data.accountId,{buildingId:data.buildingId,method});return data;
 });
}
export async function announcementWrite(account:Account,method:string,recordId:string|undefined,input:unknown) {
 const schema=z.object({title:z.string().min(1).max(200),content:z.string().min(1).max(10000),type:z.string().min(1).max(40),buildingId:z.string().nullable(),expiresAt:z.iso.datetime({offset:true}).nullable(),enabled:z.boolean().default(true)}).strict();
 const data=method==='PATCH'?schema.partial().parse(input):schema.parse(input);
 return transaction(async c=>{await authorize(account,'announcements','write',c);requireValue(account.role==='admin','公告由管理员维护',403);
  if(method==='POST'){const row=(await query('INSERT INTO announcements(title,content,announcement_type,building_id,expires_at,enabled,publisher_account_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING announcement_id',[data.title,data.content,data.type,data.buildingId,data.expiresAt,data.enabled,account.id],c)).rows[0];recordId=row.announcement_id;}
  else{const fields:Row={};for(const [a,b] of Object.entries({title:'title',content:'content',type:'announcement_type',buildingId:'building_id',expiresAt:'expires_at',enabled:'enabled'})){const value=(data as Row)[a];if(value!==undefined)fields[b]=value;}
   const names=Object.keys(fields);requireValue(names.length,'没有修改内容',400);const result=await query(`UPDATE announcements SET ${names.map((k,i)=>`${k}=$${i+2}`).join(',')} WHERE announcement_id=$1 RETURNING announcement_id`,[recordId,...names.map(k=>fields[k])],c);requireValue(result.rowCount,'公告不存在',404);}
  await audit(c,account,'publish','announcements',recordId!);return {announcementId:recordId};
 });
}
export async function billWrite(account:Account,method:string,billId:string|undefined,input:unknown) {
 const data=z.object({studentNumber:z.string().optional(),period:z.string().regex(/^\d{4}-\d{2}$/).optional(),accommodationFee:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),utilityFee:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),dueDate:z.iso.date()}).strict().parse(input);
 return transaction(async c=>{await authorize(account,'bills','write',c);requireValue(account.role==='admin','仅管理员可维护费用',403);
  if(method==='POST'){requireValue(data.studentNumber&&data.period,'新增账单需要学号和账期',400);billId=(await query('INSERT INTO accommodation_bills(student_number,billing_period,accommodation_fee,utility_fee,due_date) VALUES($1,$2,$3,$4,$5) RETURNING bill_id',[data.studentNumber,data.period,data.accommodationFee,data.utilityFee,data.dueDate],c)).rows[0].bill_id;}
  else{const result=await query('UPDATE accommodation_bills SET accommodation_fee=$2,utility_fee=$3,due_date=$4 WHERE bill_id=$1 RETURNING bill_id',[billId,data.accommodationFee,data.utilityFee,data.dueDate],c);requireValue(result.rowCount,'账单不存在',404);}
  await audit(c,account,'save','bills',billId!);return {billId};
 });
}
export async function billReview(account:Account,billId:string,action:string) {
 const bill=(await listResource(account,'bills',new URLSearchParams(),billId)).data as Row;
 return transaction(async c=>{await authorize(account,'bills','review',c);
  if(action==='check')await query('UPDATE accommodation_bills SET checked_by=$2,checked_at=now() WHERE bill_id=$1',[billId,account.id],c);
  else if(action==='remind')await notify(c,bill.student_number,'缴费提醒',`账单 ${billId} 尚有 ${bill.outstanding_amount} 元待缴。`,'bill_id',billId);
  else throw new AppError(404,'NOT_FOUND','操作不存在');await audit(c,account,action,'bills',billId);return {updated:true};
 });
}
export async function statistics(account:Account,params:URLSearchParams) {
 await authorize(account,'statistics','read');const values:unknown[]=[];let scope='true';
 if(account.role==='student'){values.push(account.studentNumber);scope='o.student_number=$1';}
 if(account.role==='dormManager')scope=managerScope('a',account,values);
 if(params.get('buildingId')){values.push(params.get('buildingId'));scope+=` AND a.building_id=$${values.length}`;}
 const beds=account.role==='maintenance'?[]:(await query(`SELECT a.building_id,a.building_name,count(DISTINCT b.bed_id) total_beds,
 count(DISTINCT b.bed_id) FILTER(WHERE b.bed_status='available') available_beds,count(DISTINCT o.occupancy_id) FILTER(WHERE o.check_out_date IS NULL) occupied_beds
 FROM apartment_buildings a LEFT JOIN rooms r USING(building_id) LEFT JOIN beds b USING(room_id)
 LEFT JOIN occupancy_records o ON o.bed_id=b.bed_id AND o.check_out_date IS NULL WHERE ${scope} GROUP BY a.building_id`,values)).rows;
 const pv:unknown[]=[];let repairScope='true';
 if(account.role==='student'){pv.push(account.studentNumber);repairScope='rr.student_number=$1';}
 if(account.role==='dormManager')repairScope=managerScope('a',account,pv);
 if(account.role==='maintenance'){pv.push(account.id);repairScope='m.technician_account_id=$1';}
 if(params.get('buildingId')){pv.push(params.get('buildingId'));repairScope+=` AND a.building_id=$${pv.length}`;}
 for(const [key,op] of [['from','>='],['to','<']] as const){const date=params.get(key);if(date){z.iso.date().parse(date);pv.push(date);repairScope+=` AND rr.submitted_at${op}$${pv.length}::date${key==='to'?"+interval '1 day'":''}`;}}
 const repairStats=(await query(`SELECT count(DISTINCT rr.repair_id) total_repairs,count(DISTINCT rr.repair_id) FILTER(WHERE rr.repair_status IN('completed','evaluated')) completed_repairs,
 COALESCE(round(avg(m.service_rating),2),0) average_rating,count(m.maintenance_id) FILTER(WHERE m.service_rating IS NOT NULL) rating_count
 FROM repair_requests rr JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id) LEFT JOIN maintenance_records m USING(repair_id) WHERE ${repairScope}`,pv)).rows[0];
 repairStats.completion_rate=Number(repairStats.total_repairs)?(100*Number(repairStats.completed_repairs)/Number(repairStats.total_repairs)).toFixed(2):'0.00';
 for(const building of beds)building.occupancy_rate=Number(building.total_beds)?(100*Number(building.occupied_beds)/Number(building.total_beds)).toFixed(2):'0.00';
 const workload=(await query(`SELECT to_char(m.dispatched_at AT TIME ZONE 'Asia/Shanghai','YYYY-MM') AS "month",count(m.maintenance_id) assigned,
 count(m.maintenance_id) FILTER(WHERE m.completed_at IS NOT NULL) completed FROM maintenance_records m JOIN repair_requests rr USING(repair_id)
 JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id) WHERE ${repairScope} GROUP BY 1 ORDER BY 1`,pv)).rows;
 let outstanding='0.00';if(account.role!=='maintenance'){
  const result=await listResource(account,'bills',new URLSearchParams({...Object.fromEntries(params),limit:'100'}));
  // 全部匹配账单汇总，分页只用于明细，不截断统计。
  const vv:unknown[]=[];let filter='true';if(account.role==='student'){vv.push(account.studentNumber);filter='bb.student_number=$1';}
  else if(account.role==='dormManager'){filter=`EXISTS(SELECT 1 FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id) WHERE o.student_number=bb.student_number AND o.check_out_date IS NULL AND ${managerScope('a',account,vv)})`;}
  if(params.get('buildingId')){vv.push(params.get('buildingId'));filter+=` AND EXISTS(SELECT 1 FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id) WHERE o.student_number=bb.student_number AND o.check_out_date IS NULL AND r.building_id=$${vv.length})`;}
  for(const [key,op] of [['from','>='],['to','<']] as const){const date=params.get(key);if(date){vv.push(date);filter+=` AND bx.generated_at ${op} $${vv.length}::date${key==='to'?"+interval '1 day'":''}`;}}
  outstanding=(await query(`SELECT COALESCE(sum(GREATEST(outstanding_amount,0)),0)::text amount FROM bill_balances bb JOIN accommodation_bills bx USING(bill_id) WHERE ${filter}`,vv)).rows[0].amount;
  repairStats.bill_count=result.meta?.total;
 }
 return {buildings:beds,repairs:repairStats,workload,outstandingAmount:outstanding};
}

export function parseCsv(text:string) {
 const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=ch;
 }
 requireValue(!quoted,'CSV 引号未闭合',400);if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export function encodeCsv(rows:Row[]) {
 if(!rows.length)return '\ufeff';const keys=Object.keys(rows[0]);const escape=(v:unknown)=>{let value=v===null?'':typeof v==='object'?JSON.stringify(v):String(v??'');if(/^[\s]*[=+@-]/.test(value))value="'"+value;return '"'+value.replaceAll('"','""')+'"';};
 return '\ufeff'+[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(escape).join(',')).join('\r\n');
}
export async function importCsv(account:Account,kind:string,text:string) {
 requireValue(account.role==='admin','批量导入需要管理员身份',403);requireValue(isResourceKind(kind),'不支持此类导入',400);
 requireValue(Buffer.byteLength(text,'utf8')<=5*1024*1024,'CSV 超过5MB',400);
 const rows=parseCsv(text.replace(/^\ufeff/,''));const headers=rows.shift();requireValue(headers?.length&&new Set(headers).size===headers.length,'CSV 表头无效或重复',400);
 requireValue(rows.length>0&&rows.length<=10000,'CSV 数据行数须为1～10000',400);
 const converted=rows.map((row,index)=>{requireValue(row.length===headers.length,`第${index+2}行列数不匹配`,400);const object=Object.fromEntries(headers.map((k,i)=>[k,row[i]]).filter(([,value])=>value!==''));return {object,line:index+2};});
 return transaction(async c=>{for(const row of converted){try{await resourceWrite(account,kind,'POST',undefined,row.object,c);}catch(error){throw new AppError(400,'IMPORT_FAILED',`第${row.line}行：${error instanceof Error?error.message:'数据无效'}`);}}return {imported:rows.length};});
}
