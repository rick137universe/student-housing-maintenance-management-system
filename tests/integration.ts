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
 for(const [session,username] of [[student,'202602341'],[manager,'dm0301'],[technician,'wx008'],[administrator,'admin'],[second,'202602114'],[female,'202602115'],[incoming,'202602116']] as const)await session.login(username);
 const pairs:[Session,RoleId][]=[[student,'student'],[manager,'dormManager'],[technician,'maintenance'],[administrator,'admin']];
 for(const [session,role] of pairs)for(const feature of roleFeatures[role])for(const action of feature.actions){const spec=workspaceSpec(role,feature.id,action.id);const params=new URLSearchParams(spec.query);await session.request(spec.resource+'?'+params);checks++;}
 console.log('四类角色全部页面数据接口通过');
 await administrator.request('students','POST',{student_number:'RACE001',full_name:'并发学生',gender:'male',college:'计算机',grade:'2026',password:env.SEED_PASSWORD});
 const race=new Session();await race.login('RACE001');const raceApp=(await race.request('applications','POST',{preferredBuildingId:'NY3'})).data;
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
 const change=(await incoming.request('changes','POST',{type:'transfer',preferredBuildingId:'NY3',note:'集成调宿'})).data;
 await manager.request(`changes/${change.change_id}/review`,'POST',{decision:'approve',bedId:'NY3-102-04'});stay=(await incoming.request('occupancies')).data.find((x:QueryResultRow)=>x.check_out_date===null);assert.equal(stay.bed_id,'NY3-102-04');checks++;
 const checkout=(await incoming.request('changes','POST',{type:'checkout',note:'集成退宿'})).data;await manager.request(`changes/${checkout.change_id}/review`,'POST',{decision:'approve'});assert(!(await incoming.request('occupancies')).data.some((x:QueryResultRow)=>x.check_out_date===null));checks++;
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
 await second.request('repairs/'+repair.repair_id,'GET',undefined,404);await technician.request(`repairs/${repair.repair_id}/accept`,'POST',{},403);
 await manager.request(`repairs/${repair.repair_id}/review`,'POST',{decision:'approve'});await administrator.request(`repairs/${repair.repair_id}/dispatch`,'POST',{technicianId:(await testPool.query("SELECT account_id FROM housing.user_accounts WHERE username='wx008'")).rows[0].account_id});
 await technician.request(`repairs/${repair.repair_id}/accept`,'POST',{});await technician.request(`repairs/${repair.repair_id}/accept`,'POST',{},409);await technician.request(`repairs/${repair.repair_id}/start`,'POST',{});
 await technician.request(`repairs/${repair.repair_id}/progress`,'POST',{status:'waiting_parts',note:'等待零件'});await technician.request(`repairs/${repair.repair_id}/progress`,'POST',{status:'in_progress',note:'零件到达'});
 await technician.request(`repairs/${repair.repair_id}/complete`,'POST',{note:'更换完成且测试通过',hours:1.5,materials:'密封圈1个'});await student.request(`repairs/${repair.repair_id}/evaluate`,'POST',{rating:5,note:'测试评价'});await student.request(`repairs/${repair.repair_id}/evaluate`,'POST',{rating:5},409);
 assert((await student.request(`repairs/${repair.repair_id}/history`)).data.length>=8);checks++;
 const rejected=(await student.request('repairs','POST',{roomId:'NY3-502',faultType:'其他',description:'重复报修验证',phone:'13800000001'})).data;await manager.request(`repairs/${rejected.repair_id}/review`,'POST',{decision:'reject',note:'重复提交'});assert.equal((await student.request('repairs/'+rejected.repair_id)).data.repair_status,'rejected');checks++;
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
 if(process.argv.includes('--browser'))await browserRegression(origin,env.SEED_PASSWORD);
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
