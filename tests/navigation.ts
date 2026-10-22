import assert from 'node:assert/strict';
import type {Pool} from 'pg';
export async function navigationRegression(origin:string,password:string,db:Pool){
 const session=async(username:string)=>{
  const login=await fetch(origin+'/api/v1/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(login.status,200);
  const account=(await login.json()).data,cookie=login.headers.get('set-cookie')!.split(';')[0];
  return async(path:string,body?:unknown,status=200)=>{const response=await fetch(origin+'/api/v1/'+path,{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json','X-CSRF-Token':account.csrfToken},body:body?JSON.stringify(body):undefined});assert.equal(response.status,status,path);return response.json();};
 };
 const student=await session('stu202602341'),other=await session('stu202602114');
 for(const username of ['admin','dm0301','mt008']){const call=await session(username);assert(Array.isArray((await call('navigation')).data));}
 const active=async(feature:string,action:string)=>(await student('navigation')).data.some((s:{feature:string;actions:string[];active:boolean})=>s.feature===feature&&s.actions.includes(action)&&s.active);
 const publisher=(await db.query("SELECT account_id FROM housing.user_accounts WHERE username='admin'")).rows[0].account_id;
 const announcement=(await db.query("INSERT INTO housing.announcements(title,content,announcement_type,publisher_account_id) VALUES('导航阅读测试','正文','公寓通知',$1) RETURNING announcement_id",[publisher])).rows[0].announcement_id;
 try{
  assert(await active('announcements','action-1'));
  const row=(await student('announcements/'+announcement)).data;
  const payload={resource:'announcements',id:announcement,version:row.navigation_version};
  await student('navigation/read',payload);
  assert(!(await student('announcements?fresh=true&limit=100')).data.some((r:{announcement_id:string})=>r.announcement_id===announcement));
  assert((await other('announcements?fresh=true&limit=100')).data.some((r:{announcement_id:string})=>r.announcement_id===announcement));
  await db.query("UPDATE housing.announcements SET content='更新正文' WHERE announcement_id=$1",[announcement]);
  await student('navigation/read',payload);
  assert((await student('announcements?fresh=true&limit=100')).data.some((r:{announcement_id:string})=>r.announcement_id===announcement),'旧版本确认不得消除新的更新');
  const repair=(await student('repairs?limit=1')).data[0];
  const own=(await db.query("SELECT account_id FROM housing.user_accounts WHERE username='stu202602341'")).rows[0].account_id;
  const send=()=>db.query("INSERT INTO housing.notifications(recipient_account_id,title,content,repair_id) VALUES($1,'报修进度更新','测试',$2) RETURNING notification_id",[own,repair.repair_id]);
  const first=(await send()).rows[0].notification_id;
  const detail=(await student('repairs/'+repair.repair_id)).data;
  const later=(await send()).rows[0].notification_id;
  await other('navigation/read',{resource:'repairs',id:repair.repair_id,version:detail.navigation_version},404);
  await student('navigation/read',{resource:'repairs',id:repair.repair_id,version:detail.navigation_version});
  const read=(await db.query('SELECT notification_id,read_at FROM housing.notifications WHERE notification_id=ANY($1::bigint[])',[[first,later]])).rows;
  assert(read.find(r=>r.notification_id===first).read_at);assert.equal(read.find(r=>r.notification_id===later).read_at,null);
  await db.query('DELETE FROM housing.notifications WHERE notification_id=ANY($1::bigint[])',[[first,later]]);
 }finally{await db.query('DELETE FROM housing.announcements WHERE announcement_id=$1',[announcement]);await db.query("DELETE FROM housing.navigation_reads WHERE resource='announcements' AND record_id=$1",[announcement]);}
 console.log('四端导航接口、个人阅读隔离、编辑后重新提示、旧详情版本保护及越权拒绝通过。');
}
