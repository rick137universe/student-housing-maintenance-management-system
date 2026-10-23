import '../scripts/env';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes,randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { roleFeatures } from '../src/data/role-features';
import { workspaceSpec } from '../src/data/workspace-actions';
import type {RoleId} from '../src/types/auth';
import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { QueryResultRow } from 'pg';
import { browserRegression } from './browser';
import {navigationRegression} from './navigation';
import { workspacePath } from '../src/utils/workspace-route';

const name=`dorma_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
const admin=new Pool({connectionString:process.env.DATABASE_ADMIN_URL});
const origin='http://localhost:3101';
const connection=(value:string)=>{const url=new URL(value);url.pathname='/'+name;return url.href;};
const env={...process.env,DATABASE_URL:connection(process.env.DATABASE_URL!),DATABASE_ADMIN_URL:connection(process.env.DATABASE_ADMIN_URL!),DATABASE_OPERATIONS_URL:connection(process.env.DATABASE_OPERATIONS_URL!),APP_ORIGIN:origin,NEXT_DIST_DIR:'.next-integration',SEED_PASSWORD:'TestOnly2026',BACKUP_DIR:path.resolve('temp',name,'backups')};
const testPool=new Pool({connectionString:env.DATABASE_ADMIN_URL});
async function command(file:string,args:string[]=[]){return new Promise<void>((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs',file,...args],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('exit',code=>code===0?resolve():reject(new Error(`${file}: ${output}`)));child.on('error',reject);});}
class Session{
 cookie='';csrf='';
 async request(path:string,method='GET',body?:unknown,expected:number|number[]=200){const response=await fetch(origin+'/api/v1/'+path,{method,headers:{Origin:origin,Cookie:this.cookie,'X-CSRF-Token':this.csrf,...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});const result=await response.json();assert((Array.isArray(expected)?expected:[expected]).includes(response.status),`${method} ${path}: ${response.status} ${JSON.stringify(result)}`);if(response.headers.get('set-cookie'))this.cookie=response.headers.get('set-cookie')!.split(';')[0];if(path==='auth/login'&&result.data)this.csrf=result.data.csrfToken;return {...result,status:response.status};}
 async login(username:string){await this.request('auth/login','POST',{username,password:env.SEED_PASSWORD});}
}
let server:ReturnType<typeof spawn>|undefined;
const restoredNames:string[]=[];let serverLog='';let checks=0;
try{
 await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);
 await command('scripts/migrate.ts');await command('scripts/migrate.ts');
 await testPool.query(`GRANT USAGE ON SCHEMA housing TO dorma_app,dorma_ops; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA housing TO dorma_app,dorma_ops; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA housing TO dorma_app,dorma_ops;
 REVOKE UPDATE,DELETE ON housing.audit_events,housing.payment_records FROM dorma_app,dorma_ops; REVOKE INSERT,UPDATE,DELETE ON housing.schema_migrations FROM dorma_app,dorma_ops;`);
 await command('scripts/seed.ts');const count=(await testPool.query('SELECT count(*) FROM housing.occupancy_records')).rows[0].count;await command('scripts/seed.ts');assert.equal((await testPool.query('SELECT count(*) FROM housing.occupancy_records')).rows[0].count,count);checks++;
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','localhost','--port','3101'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});server.stdout!.on('data',b=>serverLog+=b);server.stderr!.on('data',b=>serverLog+=b);
 for(let i=0;i<90;i++){try{if((await fetch(origin+'/api/v1/health')).ok)break;}catch{}if(i===89)throw new Error('测试服务未启动：'+serverLog);await new Promise(r=>setTimeout(r,1000));}
 const student=new Session(),manager=new Session(),technician=new Session(),administrator=new Session(),second=new Session(),female=new Session(),incoming=new Session();
 for(const [session,username] of [[student,'stu202602341'],[manager,'dm0301'],[technician,'mt008'],[administrator,'admin'],[second,'stu202602114'],[female,'stu202602115'],[incoming,'stu202602116']] as const)await session.login(username);
 const legacy=new Session();for(const username of ['202602341','wx008'])await legacy.request('auth/login','POST',{username,password:env.SEED_PASSWORD},401);checks+=2;
 assert.equal((await testPool.query("SELECT count(*) FROM housing.user_accounts WHERE (role='student' AND username NOT LIKE 'stu%') OR (role='maintenance' AND username NOT LIKE 'mt%')")).rows[0].count,'0');checks++;
 const pairs:[Session,RoleId][]=[[student,'student'],[manager,'dormManager'],[technician,'maintenance'],[administrator,'admin']];
 for(const [session,role] of pairs){const entry=await fetch(origin+'/workspace?role=admin',{headers:{Cookie:session.cookie},redirect:'manual'});assert.equal(entry.status,307);assert.equal(entry.headers.get('location'),workspacePath(role));assert.equal(await entry.text(),'');assert.equal(entry.headers.get('cache-control'),'no-store');checks++;}
 for(const cookie of ['', 'dorma_session=invalid-session']){const entry=await fetch(origin+'/workspace',{headers:{Cookie:cookie},redirect:'manual'});assert.equal(entry.status,307);assert.equal(entry.headers.get('location'),'/login');assert.equal(await entry.text(),'');checks++;}
 for(const [session,role] of pairs)for(const feature of roleFeatures[role])for(const action of feature.actions){const spec=workspaceSpec(role,feature.id,action.id);const params=new URLSearchParams(spec.query);await session.request(spec.resource+'?'+params);checks++;}
 console.log('四类角色全部页面数据接口通过');
 await administrator.request('students','POST',{student_number:'RACE001',full_name:'并发学生',gender:'male',college:'计算机',grade:'2026',password:env.SEED_PASSWORD});
 const race=new Session();await race.login('stuRACE001');const raceApp=(await race.request('applications','POST',{preferredBuildingId:'NY3'})).data;
 const incomingApp=(await incoming.request('applications')).data[0];
 const allocations=await Promise.all([manager.request(`applications/${raceApp.application_id}/review`,'POST',{decision:'approve',bedId:'NY3-102-01'},[200,409]),manager.request(`applications/${incomingApp.application_id}/review`,'POST',{decision:'approve',bedId:'NY3-102-01'},[200,409])]);
 assert.deepEqual(allocations.map(r=>r.status).sort(),[200,409]);
 if(allocations[1].status===200){const raceStill=(await race.request('applications')).data[0];await manager.request(`applications/${raceStill.application_id}/review`,'POST',{decision:'approve',bedId:'NY3-102-02'});}
 const raceCheckout=(await race.request('changes','POST',{type:'checkout'})).data;await manager.request(`changes/${raceCheckout.change_id}/review`,'POST',{decision:'approve'});checks++;
 await administrator.request('students/202602341','PATCH',{gender:'female'},409);await administrator.request('buildings/NY3','PATCH',{gender_restriction:'female'},409);checks+=2;
 await administrator.request('rooms','POST',{room_id:'NY3-601',building_id:'NY3',floor_number:6,room_type:'单人间',bed_capacity:1,room_status:'available'});await administrator.request('beds','POST',{bed_id:'NY3-601-01',room_id:'NY3-601',bed_number:'01',bed_status:'available'});await administrator.request('beds','POST',{bed_id:'NY3-601-02',room_id:'NY3-601',bed_number:'02',bed_status:'available'},409);await administrator.request('beds/NY3-601-01','DELETE',{});await administrator.request('rooms/NY3-601','DELETE',{});checks++;
 const ann=(await administrator.request('announcements','POST',{title:'楼栋公告',content:'测试楼栋通知',type:'公寓通知',buildingId:'BY4',expiresAt:null,enabled:true})).data;assert(!(await student.request('announcements')).data.some((a:QueryResultRow)=>a.announcement_id===ann.announcementId));assert((await female.request('announcements')).data.some((a:QueryResultRow)=>a.announcement_id===ann.announcementId));checks++;
 await new Session().request('bills','GET',undefined,401);await student.request('accounts','GET',undefined,403);await manager.request('rooms/BY4-502','GET',undefined,404);checks+=3;
 const request=(await incoming.request('applications')).data[0];await manager.request(`applications/${request.application_id}/review`,'POST',{decision:'approve'});await manager.request(`applications/${request.application_id}/review`,'POST',{decision:'approve'});
 let stay=(await incoming.request('occupancies')).data.find((x:QueryResultRow)=>x.check_out_date===null);assert(stay);checks++;
 const allocatedBed=stay.bed_id,applicationDetail=(await incoming.request('applications/'+request.application_id)).data;
 assert.equal(applicationDetail.business_type,'checkin');assert.equal(applicationDetail.original_bed_id,null);assert.equal(applicationDetail.new_bed_id,allocatedBed);
 await second.request('applications/'+request.application_id,'GET',undefined,404);checks++;
 const change=(await incoming.request('changes','POST',{type:'transfer',preferredBuildingId:'NY3',note:'集成调宿'})).data;
 await manager.request(`changes/${change.change_id}/review`,'POST',{decision:'approve',bedId:'NY3-102-04'});stay=(await incoming.request('occupancies')).data.find((x:QueryResultRow)=>x.check_out_date===null);assert.equal(stay.bed_id,'NY3-102-04');checks++;
 const checkout=(await incoming.request('changes','POST',{type:'checkout',note:'集成退宿'})).data;await manager.request(`changes/${checkout.change_id}/review`,'POST',{decision:'approve'});assert(!(await incoming.request('occupancies')).data.some((x:QueryResultRow)=>x.check_out_date===null));checks++;
 assert.equal((await incoming.request('applications/'+request.application_id)).data.new_bed_id,allocatedBed,'入住申请应保留最初分配床位，不随调宿或退宿改变');
 await second.request('changes/'+change.change_id,'GET',undefined,404);checks++;
 // 性别不匹配时整笔审核回滚。
 const wrong=(await female.request('changes','POST',{type:'transfer',preferredBuildingId:'NY3',note:'性别验证'})).data;await administrator.request(`changes/${wrong.change_id}/review`,'POST',{decision:'approve',bedId:'NY3-102-01'},409);assert.equal((await female.request('changes/'+wrong.change_id)).data.review_status,'pending');checks++;
 const bill=(await student.request('bills')).data[0];await second.request(`bills/${bill.bill_id}`,'GET',undefined,404);
 const key=randomUUID();const payment={amount:'100.00',idempotencyKey:key};const p1=(await student.request(`bills/${bill.bill_id}/pay`,'POST',payment)).data;const p2=(await student.request(`bills/${bill.bill_id}/pay`,'POST',payment)).data;assert.equal(p1.payment_id,p2.payment_id);
 await student.request(`bills/${bill.bill_id}/pay`,'POST',{amount:'999999.00',idempotencyKey:randomUUID()},409);checks+=3;
 const remaining=(await student.request('bills/'+bill.bill_id)).data.outstanding_amount;
 const results=await Promise.all([student.request(`bills/${bill.bill_id}/pay`,'POST',{amount:remaining,idempotencyKey:randomUUID()},[200,409]),student.request(`bills/${bill.bill_id}/pay`,'POST',{amount:remaining,idempotencyKey:randomUUID()},[200,409])]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await student.request('bills/'+bill.bill_id)).data.bill_status,'paid');checks++;
 const generated=(await administrator.request('bills/generate','POST',{period:'2026-10'})).data;assert.equal((await administrator.request('bills/generate','POST',{period:'2026-10'})).data.batch_id,generated.batch_id);checks++;
 const repair=(await student.request('repairs','POST',{roomId:'NY3-502',faultType:'水电设施',description:'集成测试水龙头',phone:'13800000001'})).data;
 assert.equal(repair.repair_status,'pending_review');assert.deepEqual((await administrator.request('settings?key=repair')).data[0].setting_value,{autoReview:false});checks++;
 await second.request('repairs/'+repair.repair_id,'GET',undefined,404);await technician.request(`repairs/${repair.repair_id}/accept`,'POST',{},403);
 await manager.request(`repairs/${repair.repair_id}/review`,'POST',{decision:'approve'});await administrator.request(`repairs/${repair.repair_id}/dispatch`,'POST',{technicianId:(await testPool.query("SELECT account_id FROM housing.user_accounts WHERE username='mt008'")).rows[0].account_id});
 await technician.request(`repairs/${repair.repair_id}/accept`,'POST',{});await technician.request(`repairs/${repair.repair_id}/accept`,'POST',{},409);await technician.request(`repairs/${repair.repair_id}/start`,'POST',{});
 await technician.request(`repairs/${repair.repair_id}/progress`,'POST',{status:'waiting_parts',note:'等待零件'});await technician.request(`repairs/${repair.repair_id}/progress`,'POST',{status:'in_progress',note:'零件到达'});
 await technician.request(`repairs/${repair.repair_id}/complete`,'POST',{note:'更换完成且测试通过',hours:1.5,materials:'密封圈1个'});await student.request(`repairs/${repair.repair_id}/evaluate`,'POST',{rating:5,note:'测试评价'});await student.request(`repairs/${repair.repair_id}/evaluate`,'POST',{rating:5},409);
 const history=(await student.request(`repairs/${repair.repair_id}/history`)).data as QueryResultRow[];
 assert(history.length>=8);
 const storedNotices=(await testPool.query("SELECT notification_id,content FROM housing.notifications WHERE repair_id=$1 AND title='报修进度更新' ORDER BY notification_id",[repair.repair_id])).rows;
 assert(storedNotices.length>=8);
 for(const notice of storedNotices)assert(!/^工单状态：[a-z_]+/.test(notice.content),'新通知应保存中文状态');
 assert(storedNotices.some(row=>row.content==='工单状态：处理中；零件到达'));
 const legacyNotice=storedNotices[0],legacyContent='工单状态：in_progress；保留备注 in_progress / Good';
 await testPool.query('UPDATE housing.notifications SET content=$1 WHERE notification_id=$2',[legacyContent,legacyNotice.notification_id]);
 assert.equal((await student.request('notifications/'+legacyNotice.notification_id)).data.content,'工单状态：处理中；保留备注 in_progress / Good');
 assert((await student.request('notifications?limit=100')).data.some((row:QueryResultRow)=>row.notification_id===legacyNotice.notification_id&&row.content==='工单状态：处理中；保留备注 in_progress / Good'));
 assert.equal((await testPool.query('SELECT content FROM housing.notifications WHERE notification_id=$1',[legacyNotice.notification_id])).rows[0].content,legacyContent,'旧通知仅兼容显示，不重写历史记录');
 await second.request('notifications/'+legacyNotice.notification_id,'GET',undefined,404);
 await testPool.query('UPDATE housing.notifications SET content=$1 WHERE notification_id=$2',[legacyNotice.content,legacyNotice.notification_id]);checks++;
 const defaults=[['pending_dispatch','review','初审通过'],['dispatched','dispatch','已派发维修工单'],['accepted','accept','维修人员已接单'],['in_progress','start','开始维修']] as const;
 const storedHistory=(await testPool.query('SELECT status,description FROM housing.maintenance_updates WHERE repair_id=$1 ORDER BY created_at,update_id',[repair.repair_id])).rows;
 for(const [status,,description] of defaults){assert(history.some(row=>row.status===status&&row.description===description));assert(storedHistory.some(row=>row.status===status&&row.description===description),'新记录应存储中文默认说明');}
 for(const description of ['等待零件','零件到达','更换完成且测试通过','测试评价'])assert(history.some(row=>row.description===description),'保留填写的处理说明与评价');
 // Simulate old defaults in the disposable test database. All four roles share
 // the compatibility response, while the original database values remain intact.
 for(const [status,action,description] of defaults)await testPool.query('UPDATE housing.maintenance_updates SET description=$1 WHERE repair_id=$2 AND status=$3 AND description=$4',[action,repair.repair_id,status,description]);
 for(const session of [student,manager,technician,administrator]){
  const legacyHistory=(await session.request(`repairs/${repair.repair_id}/history`)).data as QueryResultRow[];
  for(const [status,,description] of defaults)assert(legacyHistory.some(row=>row.status===status&&row.description===description),'各角色历史默认说明应显示为中文');
 }
 for(const [status,action] of defaults)assert((await testPool.query('SELECT 1 FROM housing.maintenance_updates WHERE repair_id=$1 AND status=$2 AND description=$3',[repair.repair_id,status,action])).rowCount,'兼容展示不能重写历史数据');
 await testPool.query("UPDATE housing.maintenance_updates SET description='Good' WHERE repair_id=$1 AND status='evaluated'",[repair.repair_id]);
 assert((await student.request(`repairs/${repair.repair_id}/history`)).data.some((row:QueryResultRow)=>row.status==='evaluated'&&row.description==='Good'),'英文评价原文应保持不变');checks++;
 const repairDetail=(await student.request('repairs/'+repair.repair_id)).data;
 assert.equal(repairDetail.repair_status,'evaluated');assert.equal(Number(repairDetail.service_rating),5);assert.equal(repairDetail.evaluation_content,'测试评价');assert.equal(repairDetail.processing_description,'更换完成且测试通过');assert.equal(repairDetail.materials,'密封圈1个');assert(repairDetail.technician_name&&repairDetail.completed_at&&repairDetail.evaluated_at);
 await second.request('repairs/'+repair.repair_id,'GET',undefined,404);await second.request(`repairs/${repair.repair_id}/history`,'GET',undefined,403);checks++;
 // 报修自动初审：仅影响新提交的工单，保留人工流程、数据范围与真实操作归属。
 for(const session of [student,manager,technician])await session.request('settings/repair','PATCH',{autoReview:true},403);checks+=3;
 await administrator.request('settings/repair','PATCH',{autoReview:'true'},400);
 await administrator.request('settings/repair','PATCH',{autoReview:true,studentNumber:'202602114'},400);checks+=2;
 const manualRepair=(await student.request('repairs','POST',{roomId:'NY3-502',faultType:'其他',description:'保留人工初审的工单',phone:'13800000001'})).data;
 await administrator.request('settings/repair','PATCH',{autoReview:true});
 assert.equal((await student.request('repairs/'+manualRepair.repair_id)).data.repair_status,'pending_review');checks++;
 await student.request('repairs','POST',{roomId:'BY4-502',faultType:'其他',description:'不能越权报修',phone:'13800000001'},403);
 await student.request('repairs','POST',{roomId:'NY3-502',faultType:'其他',description:'不能覆盖流程设置',phone:'13800000001',autoReview:false},400);checks+=2;
 const automaticRepair=(await student.request('repairs','POST',{roomId:'NY3-502',faultType:'其他',description:'自动通过初审测试',phone:'13800000001'})).data;
 assert.equal(automaticRepair.repair_status,'pending_dispatch');assert.equal(automaticRepair.reviewer_account_id,null);assert(automaticRepair.reviewed_at);assert.match(automaticRepair.review_note,/系统自动通过初审/);
 const autoHistory=(await student.request(`repairs/${automaticRepair.repair_id}/history`)).data;
 assert.deepEqual(autoHistory.map((row:QueryResultRow)=>row.status),['pending_review','pending_dispatch']);assert.equal(autoHistory[1].actor_account_id,null);assert.equal(autoHistory[1].actor_name,'系统');assert.match(autoHistory[1].description,/无需宿管人工审核/);checks++;
 assert(!(await manager.request('repairs?status=pending_review')).data.some((row:QueryResultRow)=>row.repair_id===automaticRepair.repair_id));
 assert((await manager.request('repairs?status=pending_dispatch')).data.some((row:QueryResultRow)=>row.repair_id===automaticRepair.repair_id));
 assert((await administrator.request('repairs?status=pending_dispatch')).data.some((row:QueryResultRow)=>row.repair_id===automaticRepair.repair_id));
 assert((await student.request('notifications')).data.some((row:QueryResultRow)=>row.repair_id===automaticRepair.repair_id&&String(row.content).includes('待派工')));
 assert.equal((await testPool.query("SELECT count(*) FROM housing.notifications WHERE repair_id=$1 AND title='待初审报修'",[automaticRepair.repair_id])).rows[0].count,'0');checks++;
 await manager.request(`repairs/${automaticRepair.repair_id}/review`,'POST',{decision:'approve'},409);
 await second.request(`repairs/${automaticRepair.repair_id}/history`,'GET',undefined,403);checks+=2;
 await administrator.request('settings/repair','PATCH',{autoReview:false});
 assert.equal((await student.request('repairs/'+automaticRepair.repair_id)).data.repair_status,'pending_dispatch');
 const manualAgain=(await student.request('repairs','POST',{roomId:'NY3-502',faultType:'其他',description:'恢复人工初审测试',phone:'13800000001'})).data;
 assert.equal(manualAgain.repair_status,'pending_review');assert((await testPool.query("SELECT 1 FROM housing.notifications WHERE repair_id=$1 AND title='待初审报修'",[manualAgain.repair_id])).rowCount);checks++;
 for(const row of [manualRepair,manualAgain])await manager.request(`repairs/${row.repair_id}/review`,'POST',{decision:'reject',note:'人工审核路径测试完成'});
 await administrator.request(`repairs/${automaticRepair.repair_id}/dispatch`,'POST',{technicianId:(await testPool.query("SELECT account_id FROM housing.user_accounts WHERE username='mt008'")).rows[0].account_id});
 for(const action of ['accept','start'])await technician.request(`repairs/${automaticRepair.repair_id}/${action}`,'POST',{});
 await technician.request(`repairs/${automaticRepair.repair_id}/complete`,'POST',{note:'自动初审后完整维修测试',hours:1});
 await student.request(`repairs/${automaticRepair.repair_id}/evaluate`,'POST',{rating:5,note:'自动初审后完成评价'});checks++;
 const rejected=(await student.request('repairs','POST',{roomId:'NY3-502',faultType:'其他',description:'重复报修验证',phone:'13800000001'})).data;await manager.request(`repairs/${rejected.repair_id}/review`,'POST',{decision:'reject',note:'重复提交'});assert.equal((await student.request('repairs/'+rejected.repair_id)).data.repair_status,'rejected');checks++;
 await administrator.request(`bills/${bill.bill_id}/remind`,'POST',{});
 const reminders=(await student.request('notifications?type=payment-reminder')).data;assert(reminders.length>0);assert(reminders.every((row:QueryResultRow)=>row.title==='缴费提醒'&&row.bill_id));
 const otherNotice=(await student.request('notifications')).data.find((row:QueryResultRow)=>row.title!=='缴费提醒');assert(otherNotice);await student.request(`notifications/${otherNotice.notification_id}?type=payment-reminder`,'GET',undefined,404);await second.request(`notifications/${reminders[0].notification_id}?type=payment-reminder`,'GET',undefined,404);checks++;
 const notification=(await student.request('notifications?unread=true')).data[0];await student.request(`notifications/${notification.notification_id}/read`,'POST',{});assert((await student.request('notifications/'+notification.notification_id)).data.read_at);checks++;
 await administrator.request('accounts/'+(await administrator.request('auth/me')).data.id,'PATCH',{accountStatus:'disabled'},409);checks++;
 await administrator.request('permissions','POST',{role:'student',resource:'repairs',operation:'write',enabled:false});await student.request('repairs','POST',{roomId:'NY3-502',faultType:'其他',description:'无权限',phone:'123'},403);await administrator.request('permissions','POST',{role:'student',resource:'repairs',operation:'write',enabled:true});checks++;
 // 缺 CSRF 和外域写入。
 let res=await fetch(origin+'/api/v1/notifications/1/read',{method:'POST',headers:{Origin:origin,Cookie:student.cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403);
 res=await fetch(origin+'/api/v1/auth/login',{method:'POST',headers:{Origin:'http://evil.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(res.status,403);checks+=2;
 const csv='student_number,full_name,gender,college,grade,password\nCSV001,测试,male,计算机,2026,TestOnly2026\n202602341,重复,male,计算机,2026,TestOnly2026';res=await fetch(origin+'/api/v1/import/students',{method:'POST',headers:{Origin:origin,Cookie:administrator.cookie,'X-CSRF-Token':administrator.csrf,'Content-Type':'text/csv'},body:csv});assert.equal(res.status,400);assert.equal((await testPool.query("SELECT count(*) FROM housing.students WHERE student_number='CSV001'")).rows[0].count,'0');checks++;
 const backup=(await administrator.request('backups','POST',{})).data;await command('scripts/jobs.ts',['--once']);
 let backupRow=(await administrator.request('backups/'+backup.backup_run_id)).data;
 // 默认定时备份可能排在手动任务前；逐个处理当前队列。
 for(let i=0;i<5&&backupRow.run_status!=='succeeded';i++){await command('scripts/jobs.ts',['--once']);backupRow=(await administrator.request('backups/'+backup.backup_run_id)).data;}
 assert.equal(backupRow.run_status,'succeeded',backupRow.result_description);
 const restore=(await administrator.request('backups/restore','POST',{sourceBackupId:backup.backup_run_id})).data;await command('scripts/jobs.ts',['--once']);let restored=(await administrator.request('backups/'+restore.backup_run_id)).data;
 for(let i=0;i<5&&['queued','running'].includes(restored.run_status);i++){await command('scripts/jobs.ts',['--once']);restored=(await administrator.request('backups/'+restore.backup_run_id)).data;}
 assert.equal(restored.run_status,'succeeded',restored.result_description);restoredNames.push(restored.restored_database);assert(restored.validation_result.tableCount>=20);checks++;
 const content=await readFile(backupRow.external_file_reference);await writeFile(backupRow.external_file_reference,'damaged');const damaged=(await administrator.request('backups/restore','POST',{sourceBackupId:backup.backup_run_id})).data;await command('scripts/jobs.ts',['--once']);assert.equal((await administrator.request('backups/'+damaged.backup_run_id)).data.run_status,'failed');await writeFile(backupRow.external_file_reference,content);checks++;
 await navigationRegression(origin,env.SEED_PASSWORD,testPool);
 if(process.argv.includes('--format-browser')){
  const {chromium}=await import('@playwright/test');const {displayFormatBrowserRegression}=await import('./display-format-browser');
  const {adminBillingRegression}=await import('./admin-billing');const {managerBillingRegression}=await import('./manager-billing');const {adminAnnouncementRegression}=await import('./admin-announcements');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{await displayFormatBrowserRegression(browser,origin,env.SEED_PASSWORD);await adminBillingRegression(browser,origin,env.SEED_PASSWORD);await managerBillingRegression(browser,origin,env.SEED_PASSWORD);await adminAnnouncementRegression(browser,origin,env.SEED_PASSWORD);}finally{await browser.close();}
 }
 if(process.argv.includes('--navigation-browser')){
  const {chromium}=await import('@playwright/test');const {studentNavigationBadgeRegression,navigationRoleRegression}=await import('./student-navigation-badges');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{await studentNavigationBadgeRegression(browser,origin,env.SEED_PASSWORD);await navigationRoleRegression(browser,origin,env.SEED_PASSWORD);}finally{await browser.close();}
 }
 if(process.argv.includes('--repair-browser')){
  const {chromium}=await import('@playwright/test');const {adminRepairProcessRegression}=await import('./admin-repair-process');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{await adminRepairProcessRegression(browser,origin,env.SEED_PASSWORD);}finally{await browser.close();}
 }
 if(process.argv.includes('--statistics-browser')){
  const {chromium}=await import('@playwright/test');const {statisticsVisualizationRegression}=await import('./statistics-visualization');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{await statisticsVisualizationRegression(browser,origin,env.SEED_PASSWORD);}finally{await browser.close();}
 }
 if(process.argv.includes('--browser'))await browserRegression(origin,env.SEED_PASSWORD,testPool);
 // 原密码预校验只检查当前账号，不修改密码或撤销会话；最终提交仍重新验证。
 await new Session().request('profile/password/verify','POST',{currentPassword:env.SEED_PASSWORD},401);
 await student.request('profile/password/verify','POST',{currentPassword:'WrongOnly2026'},400);
 assert.equal((await student.request('profile/password/verify','POST',{currentPassword:env.SEED_PASSWORD})).data.verified,true);
 await student.request('auth/me');await student.request('profile/password/verify','POST',{currentPassword:''},400);
 await student.request('profile/password/verify','POST',{currentPassword:env.SEED_PASSWORD,accountId:'1'},400);
 await student.request('profile/password','POST',{currentPassword:'WrongOnly2026',newPassword:'ChangedOnly2026'},400);
 const verifyWithoutCsrf=await fetch(origin+'/api/v1/profile/password/verify',{method:'POST',headers:{Origin:origin,Cookie:student.cookie,'Content-Type':'application/json'},body:JSON.stringify({currentPassword:env.SEED_PASSWORD})});assert.equal(verifyWithoutCsrf.status,403);checks+=7;
 for(let attempt=0;attempt<10;attempt++)await incoming.request('profile/password/verify','POST',{currentPassword:'WrongOnly2026'},400);
 await incoming.request('profile/password/verify','POST',{currentPassword:env.SEED_PASSWORD},429);checks++;
 await student.request('profile/password','POST',{currentPassword:env.SEED_PASSWORD,newPassword:'ChangedOnly2026'});await student.request('auth/me','GET',undefined,401);checks++;
 await manager.request('auth/logout','POST',{});await manager.request('auth/me','GET',undefined,401);checks++;
 console.log(`集成测试通过：${checks} 项检查（包括全部页面接口、事务、权限、真实备份和隔离恢复）。`);
}catch(error){console.error(error);console.error(serverLog.slice(-5000));process.exitCode=1;}
finally{
 if(server){server.kill('SIGTERM');await new Promise(resolve=>setTimeout(resolve,2500));}
 await testPool.end();
 const names=[...restoredNames,name];for(const database of names){if(!/^dorma_(test|restore)_\d+(_[a-f0-9]+|_\d+)?$/.test(database))continue;await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH(FORCE)`);}
 await admin.end();
}
