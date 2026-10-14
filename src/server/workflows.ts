import { z } from 'zod';
import type { PoolClient } from 'pg';
import { query, transaction } from './db';
import { AppError, requireValue } from './errors';
import { assertBuilding, audit, authorize, notify } from './security';
import type { Account } from '../types/auth';
import type { Row } from './resources';

const id=z.string().min(1).max(150);
const note=z.string().trim().max(4000);
const money=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/);
export async function settings(key:string,client?:PoolClient):Promise<Row> { return (await query('SELECT setting_value FROM system_settings WHERE setting_key=$1',[key],client)).rows[0]?.setting_value??{}; }
const chinaDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());
export async function currentStay(student:string,client:PoolClient,lock=false) {
 return (await query(`SELECT o.*,b.room_id,r.building_id FROM occupancy_records o JOIN beds b USING(bed_id) JOIN rooms r USING(room_id)
 WHERE o.student_number=$1 AND o.check_out_date IS NULL${lock?' FOR UPDATE OF o':''}`,[student],client)).rows[0];
}
async function candidateBed(account:Account,student:string,preferred:string|null,chosen:string|undefined,c:PoolClient) {
 await query('SELECT 1 FROM students WHERE student_number=$1 FOR UPDATE',[student],c);
 const values:unknown[]=[student];let filter=`b.bed_status='available' AND r.room_status='available' AND (a.gender_restriction='any' OR a.gender_restriction=s.gender)`;
 if(preferred){values.push(preferred);filter+=` AND a.building_id=$${values.length}`;}
 if(chosen){values.push(chosen);filter+=` AND b.bed_id=$${values.length}`;}
 if(account.role==='dormManager'){values.push(account.id);filter+=` AND (a.manager_account_id=$${values.length} OR EXISTS(SELECT 1 FROM building_authorizations x WHERE x.building_id=a.building_id AND x.account_id=$${values.length}))`;}
 const rows=(await query(`SELECT b.bed_id,b.room_id,r.building_id FROM beds b JOIN rooms r USING(room_id) JOIN apartment_buildings a USING(building_id)
 CROSS JOIN students s WHERE s.student_number=$1 AND ${filter} ORDER BY a.building_id,r.floor_number,r.room_id,b.bed_number FOR UPDATE OF r,b SKIP LOCKED LIMIT 1`,values,c)).rows;
 requireValue(rows[0],'没有符合楼栋、性别和可用状态的空床位');return rows[0];
}
export async function submitAccommodation(account:Account,kind:'applications'|'changes',input:unknown) {
 await authorize(account,kind,'write');requireValue(account.role==='student','仅学生可以提交申请',403);
 const data=z.object({preferredBuildingId:id.optional(),expectedDate:z.iso.date().optional(),note:note.default(''),type:z.enum(['transfer','checkout']).optional()}).strict().parse(input);
 return transaction(async c=>{
  await query('SELECT 1 FROM students WHERE student_number=$1 FOR UPDATE',[account.studentNumber],c);
  const stay=await currentStay(account.studentNumber!,c);
  if(kind==='applications'){
   requireValue(!stay,'已经入住，不能重复申请入住');requireValue(data.preferredBuildingId,'请选择意向楼栋',400);
   requireValue(!(await query("SELECT 1 FROM accommodation_applications WHERE student_number=$1 AND review_status IN('pending','approved')",[account.studentNumber],c)).rowCount,'已有未办结入住申请');
  }else{requireValue(stay,'尚未入住，不能调宿或退宿');requireValue(data.type,'请选择业务类型',400);
   requireValue(!(await query("SELECT 1 FROM accommodation_changes WHERE student_number=$1 AND review_status IN('pending','approved')",[account.studentNumber],c)).rowCount,'已有未办结住宿变更');}
  const result=kind==='applications'?await query(`INSERT INTO accommodation_applications(student_number,preferred_building_id,expected_check_in_date,application_note) VALUES($1,$2,$3,$4) RETURNING *`,[account.studentNumber,data.preferredBuildingId,data.expectedDate??null,data.note],c):
   await query(`INSERT INTO accommodation_changes(student_number,business_type,original_bed_id,preferred_building_id,expected_date,application_note) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[account.studentNumber,data.type,stay.bed_id,data.preferredBuildingId??null,data.expectedDate??null,data.note],c);
  const row=result.rows[0];await audit(c,account,'submit',kind,String(row.application_id??row.change_id));return row;
 });
}
export async function reviewAccommodation(account:Account,kind:'applications'|'changes',recordId:string,input:unknown) {
 const data=z.object({decision:z.enum(['approve','reject']),bedId:id.optional(),note:note.default('')}).strict().parse(input);
 return transaction(async c=>{
  await authorize(account,kind,'review',c);
  const table=kind==='applications'?'accommodation_applications':'accommodation_changes';const pk=kind==='applications'?'application_id':'change_id';
  const row=(await query(`SELECT * FROM ${table} WHERE ${pk}=$1 FOR UPDATE`,[recordId],c)).rows[0];requireValue(row,'申请不存在',404);
  const stay=await currentStay(row.student_number,c,true);
  const scope=kind==='applications'?row.preferred_building_id:stay?.building_id??(await query('SELECT r.building_id FROM beds b JOIN rooms r USING(room_id) WHERE bed_id=$1',[row.original_bed_id],c)).rows[0]?.building_id;
  requireValue(scope,'申请缺少可审核楼栋');await assertBuilding(account,scope,c);
  if(row.review_status==='completed'&&data.decision==='approve')return row;
  if(row.review_status==='rejected'&&data.decision==='reject')return row;
  requireValue(row.review_status==='pending','该申请已审核');
  if(data.decision==='reject')requireValue(data.note,'驳回必须填写原因',400);
  if(data.decision==='reject'){
   await query(`UPDATE ${table} SET review_status='rejected',reviewer_account_id=$2,reviewed_at=now(),review_note=$3 WHERE ${pk}=$1`,[recordId,account.id,data.note],c);
  }else{
   if(kind==='applications')requireValue(!stay,'该学生已经入住');else requireValue(stay&&stay.bed_id===row.original_bed_id,'当前入住与申请原床位不一致');
   let bed:Row|undefined;
   if(kind==='applications'||row.business_type==='transfer'){
    const rule=await settings('allocation',c);requireValue(data.bedId||rule.automatic!==false,'自动分床已关闭，请选择床位',400);
    bed=await candidateBed(account,row.student_number,row.preferred_building_id,data.bedId,c);
   }
   await query(`UPDATE ${table} SET review_status='approved',reviewer_account_id=$2,reviewed_at=now(),review_note=$3 WHERE ${pk}=$1`,[recordId,account.id,data.note],c);
   if(stay)await query('UPDATE occupancy_records SET check_out_date=$2 WHERE occupancy_id=$1',[stay.occupancy_id,chinaDate()],c);
   if(bed)await query(`INSERT INTO occupancy_records(student_number,bed_id,check_in_date,allocation_method,operator_account_id,application_id) VALUES($1,$2,$3,$4,$5,$6)`,
     [row.student_number,bed.bed_id,chinaDate(),data.bedId?'manual':'automatic',account.id,kind==='applications'?recordId:null],c);
   await query(`UPDATE ${table} SET review_status='completed'${kind==='changes'?',completed_at=now(),new_bed_id=$2':''} WHERE ${pk}=$1`,kind==='changes'?[recordId,bed?.bed_id??null]:[recordId],c);
  }
  await notify(c,row.student_number,'住宿申请处理结果',data.decision==='approve'?'申请已办理完成':`申请已驳回：${data.note}`,kind==='applications'?'application_id':'change_id',recordId);
  await audit(c,account,data.decision,kind,recordId);return (await query(`SELECT * FROM ${table} WHERE ${pk}=$1`,[recordId],c)).rows[0];
 });
}
export async function generateBills(account:Account|null,period:string) {
 z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(period);
 return transaction(async c=>{
  if(account)await authorize(account,'bills','write',c);
  await query('SELECT pg_advisory_xact_lock(7914332)',[],c);
  const old=(await query('SELECT * FROM billing_batches WHERE billing_period=$1',[period],c)).rows[0];if(old)return old;
  const config=await settings('billing',c);requireValue(config.accommodationFee&&config.utilityFee,'请先配置固定月费');
  const batch=(await query('INSERT INTO billing_batches(billing_period,created_by,configuration) VALUES($1,$2,$3) RETURNING *',[period,account?.id??null,JSON.stringify(config)],c)).rows[0];
  const bills=(await query(`INSERT INTO accommodation_bills(student_number,billing_period,accommodation_fee,utility_fee,due_date,batch_id)
   SELECT student_number,$1,$2,$3,CURRENT_DATE+$4::integer,$5 FROM occupancy_records WHERE check_out_date IS NULL RETURNING *`,[period,config.accommodationFee,config.utilityFee,config.dueDays,batch.batch_id],c)).rows;
  for(const bill of bills)await notify(c,bill.student_number,'新账单',`${period}账单已生成，请及时缴费。`,'bill_id',bill.bill_id);
  await audit(c,account,'generate','billing-batches',batch.batch_id,{count:bills.length});return {...batch,billCount:bills.length};
 });
}
export async function payBill(account:Account,billId:string,input:unknown) {
 const data=z.object({amount:money,idempotencyKey:z.string().min(8).max(128),result:z.enum(['succeeded','failed','cancelled']).default('succeeded')}).strict().parse(input);
 const result=await transaction(async c=>{
  await authorize(account,'payments','write',c);requireValue(account.role==='student','只允许学生支付本人账单',403);
  await query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[data.idempotencyKey],c);
  const old=(await query('SELECT * FROM payment_attempts WHERE idempotency_key=$1',[data.idempotencyKey],c)).rows[0];
  if(old){requireValue(old.account_id===account.id&&old.bill_id===billId&&Number(old.amount)===Number(data.amount),'幂等键已被不同请求使用');return old;}
  const bill=(await query('SELECT * FROM accommodation_bills WHERE bill_id=$1 AND student_number=$2 FOR UPDATE',[billId,account.studentNumber],c)).rows[0];requireValue(bill,'账单不存在或不可访问',404);
  const paid=(await query('SELECT COALESCE(sum(amount),0) paid FROM payment_records WHERE bill_id=$1',[billId],c)).rows[0].paid;
  const exceeds=(await query('SELECT $1::numeric<=0 OR $1::numeric>$2::numeric-$3::numeric invalid',[data.amount,bill.total_amount,paid],c)).rows[0].invalid;
  const status=exceeds?'failed':data.result;let paymentId=null;
  if(status==='succeeded')paymentId=(await query(`INSERT INTO payment_records(bill_id,student_number,amount,payment_method,idempotency_key,operator_account_id) VALUES($1,$2,$3,'测试支付',$4,$5) RETURNING payment_id`,[billId,account.studentNumber,data.amount,data.idempotencyKey,account.id],c)).rows[0].payment_id;
  const attempt=(await query(`INSERT INTO payment_attempts VALUES($1,$2,$3,$4,$5,$6,$7,DEFAULT) RETURNING *`,[data.idempotencyKey,account.id,billId,data.amount,status,paymentId,exceeds?'金额超过剩余应缴金额或不大于零':status==='succeeded'?'测试支付成功':status==='failed'?'测试支付失败':'已取消测试支付'],c)).rows[0];
  if(status==='succeeded')await notify(c,account.studentNumber!,'缴费成功',`测试支付 ${data.amount} 元已入账。`,'bill_id',billId);
  await audit(c,account,`test-payment-${status}`,'bills',billId,{amount:data.amount},status);return attempt;
 });
 if(result.result==='failed')throw new AppError(409,'PAYMENT_REJECTED',result.message);return result;
}

async function scopedRepair(account:Account,repairId:string,c:PoolClient) {
 const row=(await query('SELECT x.*,r.building_id FROM repair_requests x JOIN rooms r USING(room_id) WHERE repair_id=$1 FOR UPDATE OF x',[repairId],c)).rows[0];requireValue(row,'工单不存在',404);
 if(account.role==='student')requireValue(row.student_number===account.studentNumber,'只能访问本人报修',403);
 else if(account.role==='dormManager')await assertBuilding(account,row.building_id,c);
 else if(account.role==='maintenance')requireValue((await query('SELECT 1 FROM maintenance_records WHERE repair_id=$1 AND technician_account_id=$2',[repairId,account.id],c)).rowCount,'工单不属于你',403);
 return row;
}
export async function repairHistory(account:Account,repairId:string) {
 return transaction(async c=>{await authorize(account,'repairs','read',c);await scopedRepair(account,repairId,c);return (await query('SELECT u.*,a.full_name actor_name FROM maintenance_updates u JOIN user_accounts a ON a.account_id=u.actor_account_id WHERE repair_id=$1 ORDER BY created_at,update_id',[repairId],c)).rows;});
}
export async function submitRepair(account:Account,input:unknown) {
 const data=z.object({roomId:id,faultType:z.string().min(1).max(80),description:note.min(1),phone:z.string().min(3).max(32)}).strict().parse(input);
 return transaction(async c=>{await authorize(account,'repairs','write',c);requireValue(account.role==='student','仅学生可以提交报修',403);
  const stay=await currentStay(account.studentNumber!,c);requireValue(stay?.room_id===data.roomId,'请选择本人当前入住的房间',403);
  const row=(await query('INSERT INTO repair_requests(student_number,room_id,fault_type,fault_description,contact_phone) VALUES($1,$2,$3,$4,$5) RETURNING *',[account.studentNumber,data.roomId,data.faultType,data.description,data.phone],c)).rows[0];
  await query(`INSERT INTO notifications(recipient_account_id,title,content,repair_id)
   SELECT DISTINCT u.account_id,'待初审报修',$2::text,$3::bigint FROM user_accounts u
   JOIN apartment_buildings a ON a.manager_account_id=u.account_id OR EXISTS(SELECT 1 FROM building_authorizations ba WHERE ba.building_id=a.building_id AND ba.account_id=u.account_id)
   WHERE a.building_id=$1`,[stay.building_id,data.description,row.repair_id],c);
  await query("INSERT INTO maintenance_updates(repair_id,actor_account_id,status,description) VALUES($1,$2,'pending_review','学生提交报修')",[row.repair_id,account.id],c);
  await audit(c,account,'submit','repairs',row.repair_id);return row;
 });
}
export async function repairAction(account:Account,repairId:string,action:string,input:unknown) {
 const data=z.object({decision:z.enum(['approve','reject']).optional(),note:note.default(''),technicianId:id.optional(),status:z.enum(['in_progress','waiting_parts']).optional(),expectedCompletionAt:z.iso.datetime({offset:true}).nullable().optional(),materials:note.optional(),hours:z.coerce.number().positive().max(999999).optional(),rating:z.coerce.number().int().min(1).max(5).optional()}).strict().parse(input);
 return transaction(async c=>{
  await authorize(account,action==='review'?'repairs':action==='dispatch'?'repairs':action==='evaluate'?'repairs':'maintenance',action==='review'?'review':action==='dispatch'?'dispatch':'write',c);
  const row=await scopedRepair(account,repairId,c);let status=row.repair_status;let maintenanceId:string|null=null;
  if(action==='review'){
   requireValue(['admin','dormManager'].includes(account.role),'不能初审工单',403);requireValue(status==='pending_review','工单已初审');requireValue(data.decision,'请选择审核结果',400);
   if(data.decision==='reject')requireValue(data.note,'驳回必须填写原因',400);
   status=data.decision==='approve'?'pending_dispatch':'rejected';
   // 核心模型限定初审人为宿管；管理员初审不伪装成宿管，操作者完整记录在审计和时间线。
   await query('UPDATE repair_requests SET reviewer_account_id=$2,reviewed_at=now(),review_note=$3 WHERE repair_id=$1',[repairId,account.role==='dormManager'?account.id:null,data.note],c);
  }else if(action==='dispatch'){
   requireValue(account.role==='admin','派工需要管理员身份',403);requireValue(status==='pending_dispatch','工单当前不能派工');
   await query('SELECT pg_advisory_xact_lock(7914334)',[],c);
   const technicians=(await query(`SELECT a.account_id FROM user_accounts a LEFT JOIN maintenance_records m ON m.technician_account_id=a.account_id AND m.completed_at IS NULL
     WHERE a.role='maintenance' AND a.account_status='active' ${data.technicianId?'AND a.account_id=$1':''}
     GROUP BY a.account_id ORDER BY count(m.maintenance_id),a.account_id LIMIT 1`,data.technicianId?[data.technicianId]:[],c)).rows;
   requireValue(technicians[0],'没有可派工的维修人员');
   maintenanceId=(await query('INSERT INTO maintenance_records(repair_id,technician_account_id,dispatcher_account_id) VALUES($1,$2,$3) RETURNING maintenance_id',[repairId,technicians[0].account_id,account.id],c)).rows[0].maintenance_id;status='dispatched';
   await query('INSERT INTO notifications(recipient_account_id,title,content,repair_id) VALUES($1,$2,$3,$4)',[technicians[0].account_id,'新维修工单',row.fault_description,repairId],c);
  }else{
   const record=(await query('SELECT * FROM maintenance_records WHERE repair_id=$1 ORDER BY maintenance_id DESC LIMIT 1 FOR UPDATE',[repairId],c)).rows[0];requireValue(record,'工单尚未派工');maintenanceId=record.maintenance_id;
   if(action==='evaluate'){
    requireValue(account.role==='student'&&status==='completed','只允许评价本人已完成工单');requireValue(data.rating,'请选择1～5星评分',400);requireValue(record.service_rating===null,'本次维修已经评价');
    await query('UPDATE maintenance_records SET service_rating=$2,evaluation_content=$3,evaluated_at=now() WHERE maintenance_id=$1',[maintenanceId,data.rating,data.note],c);status='evaluated';
   }else{
    requireValue(account.role==='maintenance'&&record.technician_account_id===account.id,'只允许本人处理工单',403);
    if(action==='accept'){requireValue(status==='dispatched','工单当前不能接单');await query('UPDATE maintenance_records SET accepted_at=now() WHERE maintenance_id=$1',[maintenanceId],c);status='accepted';}
    else if(action==='start'){requireValue(status==='accepted','请先接单');await query('UPDATE maintenance_records SET maintenance_at=now() WHERE maintenance_id=$1',[maintenanceId],c);status='in_progress';}
    else if(action==='progress'||action==='record'){
     requireValue(['in_progress','waiting_parts'].includes(status),'当前不能更新维修记录');requireValue(data.note,'请填写处理说明',400);status=data.status??status;
     await query('UPDATE maintenance_records SET processing_description=$2,expected_completion_at=COALESCE($3,expected_completion_at) WHERE maintenance_id=$1',[maintenanceId,data.note,data.expectedCompletionAt??null],c);
    }else if(action==='complete'){
     requireValue(['in_progress','waiting_parts'].includes(status),'当前不能确认完工');requireValue(data.note&&data.hours,'请填写结果和实际工时',400);
     await query('UPDATE maintenance_records SET completed_at=now(),processing_description=$2,materials=$3,hours=$4 WHERE maintenance_id=$1',[maintenanceId,data.note,data.materials??'',data.hours],c);status='completed';
    }else throw new AppError(404,'NOT_FOUND','操作不存在');
   }
  }
  await query('UPDATE repair_requests SET repair_status=$2 WHERE repair_id=$1',[repairId,status],c);
  await query('INSERT INTO maintenance_updates(repair_id,maintenance_id,actor_account_id,status,description) VALUES($1,$2,$3,$4,$5)',[repairId,maintenanceId,account.id,status,data.note||action],c);
  await notify(c,row.student_number,'报修进度更新',`工单状态：${status}${data.note?'；'+data.note:''}`,'repair_id',repairId);
  await audit(c,account,action,'repairs',repairId,{status});return {repairId,status};
 });
}
