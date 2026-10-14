import './env';
import { pool, query, transaction } from '../src/server/db';
import { passwordHash } from '../src/server/security';
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 8) throw new Error('请设置至少8字符的 SEED_PASSWORD');
const hash = await passwordHash(password);
try {
await transaction(async c => {
  await query('SELECT pg_advisory_xact_lock(7914331)',[],c);
  for (const [id,name,gender,college] of [['202602341','林晓屿','male','计算机学院'],['202602114','刘知行','male','计算机学院'],['202602115','陈嘉禾','female','外国语学院'],['202602116','周子涵','male','计算机学院']]) {
    await query(`INSERT INTO students(student_number,full_name,gender,college,grade,phone,password_hash) VALUES($1,$2,$3,$4,'2026','13800000000',$5) ON CONFLICT DO NOTHING`,[id,name,gender,college,hash],c);
    await query(`INSERT INTO user_accounts(username,full_name,role,student_number) VALUES($1,$2,'student',$3) ON CONFLICT DO NOTHING`,['stu'+id,name,id],c);
  }
  for (const [username,name,role] of [['dm0301','周老师','dorm_manager'],['dm0401','李老师','dorm_manager'],['mt008','陈师傅','maintenance'],['mt009','赵师傅','maintenance'],['admin','系统管理员','admin']])
    await query(`INSERT INTO user_accounts(username,full_name,role,password_hash,account_status) VALUES($1,$2,$3,$4,'active') ON CONFLICT DO NOTHING`,[username,name,role,hash],c);
  const accounts = (await query('SELECT account_id,username FROM user_accounts',[],c)).rows;
  const id = (name:string) => accounts.find(a=>a.username===name)!.account_id;
  for (const [building,name,gender,manager] of [['NY3','南苑3栋','male','dm0301'],['BY4','北苑4栋','female','dm0401']]) {
    await query(`INSERT INTO apartment_buildings(building_id,building_name,total_floors,building_attribute,manager_account_id,gender_restriction) VALUES($1,$2,6,$3,$4,$3) ON CONFLICT DO NOTHING`,[building,name,gender,id(manager)],c);
    for (const floor of [1,3,5]) {
      const room = `${building}-${floor}02`;
      await query(`INSERT INTO rooms VALUES($1,$2,$3,'四人间',4,'available') ON CONFLICT DO NOTHING`,[room,building,floor],c);
      for (const number of ['01','02','03','04']) await query(`INSERT INTO beds SELECT $1::varchar,$2::varchar,$3::varchar,'available' WHERE NOT EXISTS(SELECT 1 FROM beds WHERE bed_id=$1::varchar)`,[`${room}-${number}`,room,number],c);
    }
  }
  // 固定样例标识记录在设置中；重复初始化不重新制造业务流水。
  const initialized = (await query("SELECT 1 FROM system_settings WHERE setting_key='seed.initialized'",[],c)).rowCount;
  if (!initialized) {
    for (const [student,bed] of [['202602341','NY3-502-02'],['202602114','NY3-302-01'],['202602115','BY4-502-01']])
      await query(`INSERT INTO occupancy_records(student_number,bed_id,check_in_date,allocation_method,operator_account_id) VALUES($1,$2,CURRENT_DATE,'manual',$3)`,[student,bed,id('admin')],c);
    await query(`INSERT INTO accommodation_applications(student_number,preferred_building_id,expected_check_in_date) VALUES('202602116','NY3',CURRENT_DATE)`,[],c);
    for (const student of ['202602341','202602114','202602115']) await query(`INSERT INTO accommodation_bills(student_number,billing_period,accommodation_fee,utility_fee,due_date) VALUES($1,to_char(CURRENT_DATE,'YYYY-MM'),800,128.60,CURRENT_DATE+14)`,[student],c);
    for (const [status,room,student,description] of [['pending_review','NY3-502','202602341','卫生间水龙头漏水'],['pending_dispatch','NY3-302','202602114','空调无法启动'],['dispatched','NY3-502','202602341','桌灯故障'],['completed','NY3-502','202602341','门锁更换']]) {
      const repair = (await query(`INSERT INTO repair_requests(student_number,room_id,fault_type,fault_description,repair_status,contact_phone) VALUES($1,$2,'水电设施',$3,$4,'13800000000') RETURNING repair_id`,[student,room,description,status],c)).rows[0];
      if (['dispatched','completed'].includes(status)) await query(`INSERT INTO maintenance_records(repair_id,technician_account_id,dispatcher_account_id,maintenance_at,completed_at,processing_description) VALUES($1,$2,$3,$4,$5,$6)`,[repair.repair_id,id('mt008'),id('admin'),status==='completed'?new Date():null,status==='completed'?new Date():null,status==='completed'?'更换部件并测试完成':null],c);
      await query('INSERT INTO maintenance_updates(repair_id,actor_account_id,status,description) VALUES($1,$2,$3,$4)',[repair.repair_id,id('admin'),status,'课程样例初始化'],c);
    }
    await query(`INSERT INTO announcements(title,content,announcement_type,publisher_account_id) VALUES('欢迎入住校园公寓','请及时查看住宿、账单与报修进度。','公寓通知',$1)`,[id('admin')],c);
    await query(`INSERT INTO system_settings(setting_key,setting_value,description) VALUES('seed.initialized','true','样例初始化标识')`,[],c);
  }
  const grants: Record<string,Record<string,string[]>> = {
    student: { profile:['read','write'],resources:['read'],applications:['read','write'],changes:['read','write'],occupancies:['read'],bills:['read'],payments:['read','write'],repairs:['read','write'],announcements:['read'],notifications:['read','write'],statistics:['read'] },
    dorm_manager: {profile:['read','write'],resources:['read','write'],applications:['read','review'],changes:['read','review'],occupancies:['read'],bills:['read','review'],repairs:['read','review'],announcements:['read'],notifications:['read','write'],statistics:['read']},
    maintenance:{profile:['read','write'],repairs:['read'],maintenance:['read','write'],announcements:['read'],notifications:['read','write'],statistics:['read']},
    admin:{profile:['read','write'],resources:['read','write'],applications:['read','review'],changes:['read','review'],occupancies:['read'],bills:['read','write','review'],payments:['read'],repairs:['read','review','dispatch'],maintenance:['read'],announcements:['read','write'],notifications:['read','write'],statistics:['read'],accounts:['read','write'],permissions:['read','write'],settings:['read','write'],audit:['read'],backups:['read','write']},
  };
  for (const [role,resources] of Object.entries(grants)) for (const [resource,ops] of Object.entries(resources)) for (const op of ops)
    await query('INSERT INTO role_permissions VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[role,resource,op,role==='admin'?'all':role==='dorm_manager'?'authorized_buildings':role==='maintenance'?'assigned_orders':'self'],c);
  for (const [key,value,description] of [['billing',{accommodationFee:'800.00',utilityFee:'128.60',dueDays:14},'固定月费'],['allocation',{automatic:true},'自动分床'],['accommodation',{reviewRequired:true},'住宿审核流程']])
    await query('INSERT INTO system_settings(setting_key,setting_value,description) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[key,JSON.stringify(value),description],c);
  await query(`INSERT INTO backup_policies(policy_name,schedule_expression,destination_description,retention_days,configured_by)
    SELECT '每日备份','0 2 * * *','BACKUP_DIR',7,$1 WHERE NOT EXISTS(SELECT 1 FROM backup_policies WHERE policy_name='每日备份')`,[id('admin')],c);
});
console.log('课程样例初始化完成；已有记录保持不变。');
} finally { await pool.end(); }
