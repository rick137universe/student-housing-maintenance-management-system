import assert from 'node:assert/strict';
import {expect,type Browser,type BrowserContext} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;
export async function maintenanceRecordRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext(),student=await browser.newContext(),owner=await browser.newContext({viewport:{width:1440,height:1000}}),peer=await browser.newContext();
 const page=await owner.newPage(),errors:string[]=[],accounts=new Map<BrowserContext,Row>();page.on('pageerror',error=>errors.push(error.message));
 async function call(context:BrowserContext,path:string,body?:object){
  const response=body?await context.request.post(origin+'/api/v1/'+path,{headers:{Origin:origin,'X-CSRF-Token':String(accounts.get(context)?.csrfToken??'')},data:body}):await context.request.get(origin+'/api/v1/'+path);
  const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result.data;
 }
 async function login(context:BrowserContext,username:string){const account=await call(context,'auth/login',{username,password});accounts.set(context,account);return account;}
 const selector='[data-dorma-maintenance-frame]',frame=page.frameLocator(selector),base='/workspace/maintenance/records/',list=frame.locator('[data-dorma-maintenance-record-list]');
 const previous=frame.locator('#docs-info .prev-link a'),next=frame.locator('#docs-info .next-link a'),warning=frame.getByRole('alert');
 try{
  await login(admin,'admin');const username='mtRecord'+Date.now();await call(admin,'accounts',{username,fullName:'维修记录回归',role:'maintenance',password});
  const worker=await login(owner,username),other=await login(peer,'mt009');await login(student,'stu202602341');
  await page.goto(origin+base+'write');await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');
  async function create(context:BrowserContext,technicianId:string,index:string,status='in_progress'){
   const repair=await call(student,'repairs',{roomId:'NY3-502',faultType:'水电设施',description:'维修记录 '+index,phone:'13800001234'});
   const id=String(repair.repair_id);await call(admin,'repairs/'+id+'/review',{decision:'approve'});await call(admin,'repairs/'+id+'/dispatch',{technicianId});
   await call(context,'repairs/'+id+'/accept',{});await call(context,'repairs/'+id+'/start',{});
   if(status==='waiting_parts')await call(context,'repairs/'+id+'/progress',{status,note:'等待配件'});
   if(status==='evaluated'){await call(context,'repairs/'+id+'/complete',{note:'完成并检测通过',materials:'电源板',hours:1.5});await call(student,'repairs/'+id+'/evaluate',{rating:5,note:'处理及时'});}
   const rows=await call(context,'maintenance?limit=100') as Row[];return rows.find(row=>String(row.repair_id)===id)!;
  }
  for(let i=0;i<21;i++)await create(owner,String(worker.id),String(i),i===1?'waiting_parts':'in_progress');
  const archived=await create(owner,String(worker.id),'归档','evaluated'),foreign=await create(peer,String(other.id),'其他维修人员');
  const rows=await call(owner,'maintenance?status=in_progress,waiting_parts&limit=100') as Row[],first=rows[0],id=String(first.maintenance_id),detail=origin+base+'write?record='+id;
  assert.equal(rows.length,21);assert.notEqual(String(first.repair_id),id,'处理编号与报修编号不同，必须查询正确工单');
  await page.reload();await expect(list.locator('a')).toHaveText(rows.slice(0,20).map(row=>`${row.repair_id} · ${row.room_id} · ${row.fault_description} · ${row.repair_status==='waiting_parts'?'等待配件':'处理中'}`));
  await expect(frame.locator('[data-dorma-maintenance-business-host], [data-dorma-maintenance-record] table, [data-dorma-maintenance-record] input, dialog')).toHaveCount(0);
  const shell=await frame.locator('#docs-demos').elementHandle();await expectStudentReveal(page,()=>list.locator('a').first().click(),'维修记录详情',selector);await expect(page).toHaveURL(detail);
  await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['维修记录','填写记录']);await expectStudentBreadcrumbSpacing(page,selector);
  const field=(label:string)=>frame.getByRole('heading',{name:label,exact:true}).locator('+ pre code');
  await expect(field('处理编号')).toHaveText(id);await expect(field('报修编号')).toHaveText(String(first.repair_id));await expect(field('故障描述')).toHaveText(String(first.fault_description));
  await expect(frame.locator('[data-dorma-repair-history]')).toContainText('维修记录回归');await expect(frame.locator('[data-dorma-repair-values] .copy-button').first()).toBeVisible();
  await expect(previous).toHaveAttribute('href',base+'write');await expect(next).toHaveText('填写记录');await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
  await page.screenshot({path:'docs/qa/backend/maintenance-record-detail.png'});
  await next.click();await expect(page).toHaveURL(detail+'&edit=1');await expect(frame.locator('#docs-info h1')).toHaveText('填写维修记录');await expect(previous).toHaveAttribute('href',base+'write?record='+id);
  const editor=frame.locator('[data-dorma-maintenance-record-editor]'),note=editor.locator('[data-profile-field="note"]'),save=frame.getByRole('button',{name:'保存记录',exact:true});
  await save.click();await expect(warning).toHaveClass('notice warning');await expect(warning).toHaveText('请填写并确认维修说明。');
  await note.getByRole('button',{name:'编辑维修说明',exact:true}).click();await note.getByRole('textbox').fill('取消草稿');await note.getByRole('button',{name:'取消',exact:true}).click();await expect(note.locator('code')).toHaveText('—');
  await note.getByRole('button',{name:'编辑维修说明',exact:true}).click();await expect(note.getByRole('textbox')).toHaveCSS('outline-style','none');await expect(note.locator('.copy-button')).toHaveCount(0);
  await note.getByRole('button',{name:'确认',exact:true}).click();await expect(warning).toHaveText('请填写维修说明。');
  const content='已检查线路\n等待更换零件';await note.getByRole('textbox').fill(content);await note.getByRole('textbox').press('Control+Enter');await expect(note.getByRole('textbox')).toHaveCount(0);
  const endpoint='**/api/v1/repairs/'+first.repair_id+'/record';await page.route(endpoint,route=>route.fulfill({status:503,json:{error:{message:'记录保存失败，请重试。'}}}));await save.click();await expect(warning).toHaveText('记录保存失败，请重试。');await page.unroute(endpoint);
  let release!:()=>void,submissions=0;const gate=new Promise<void>(resolve=>{release=resolve;});await page.route(endpoint,async route=>{submissions++;await gate;await route.continue();});
  await save.click();await expect.poll(()=>submissions).toBe(1);await save.evaluate(el=>(el as HTMLElement).click());release();await expect(page).toHaveURL(detail);await page.unroute(endpoint);assert.equal(submissions,1);
  await expect(field('维修说明')).toHaveText(content);assert.equal((await call(owner,'maintenance/'+id)).processing_description,content);await expect(frame.locator('[data-dorma-repair-history]')).toContainText(content);assert(await shell!.evaluate(el=>el.isConnected),'保存与返回详情应保留外壳');
  await page.reload();await expect(field('维修说明')).toHaveText(content);await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);await previous.click();await expect(list.locator('a')).toHaveCount(20);
  await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(list.locator('a')).toHaveCount(1);await list.locator('a').click();await expect(previous).toHaveAttribute('href',base+'write?page=2');await previous.click();await expect(page).toHaveURL(origin+base+'write?page=2');
  await page.goto(origin+base+'archive');await expect(list.locator('a')).toHaveCount(1);await list.locator('a').click();await expect(field('处理编号')).toHaveText(String(archived.maintenance_id));await expect(field('使用材料')).toHaveText('电源板');await expect(field('实际工时（小时）')).toHaveText('1.50');await expect(field('服务评分')).toHaveText('5');await expect(field('评价内容')).toHaveText('处理及时');await expect(next).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-record-archive-mobile.png'});
  await page.goto(detail+'&edit=1');await expect(editor).toBeVisible();assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-record-editor-mobile.png'});
  await page.goto(origin+base+'write?record='+archived.maintenance_id+'&edit=1');await expect(frame.locator('.notice.info')).toContainText('已归档');await expect(save).toHaveCount(0);
  for(const record of [String(foreign.maintenance_id),'0','invalid','9999999999999999999']){await page.goto(origin+base+'write?record='+record);await expect(warning).toHaveClass('notice warning');await expect(frame.locator('[data-dorma-repair-values]')).toHaveCount(0);}
  const denied=await owner.request.post(origin+'/api/v1/repairs/'+foreign.repair_id+'/record',{headers:{Origin:origin,'X-CSRF-Token':String(worker.csrfToken)},data:{note:'越权修改'}});assert.equal(denied.status(),403);assert.equal((await call(peer,'maintenance/'+foreign.maintenance_id)).processing_description,null);
  assert.deepEqual(errors,[]);console.log('维修记录通过：两类导航/独立详情、正确处理编号及工单历史、代码框确认取消与真实保存、失败重试/重复提交、归档材料工时评价只读、分页刷新返回、INFO/WARNING、账号隔离与手机布局。');
 }finally{await owner.close();await peer.close();await student.close();await admin.close();}
}
