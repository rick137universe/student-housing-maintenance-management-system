import assert from 'node:assert/strict';
import {expect,type Browser,type BrowserContext} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;
export async function maintenanceOrderRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext(),student=await browser.newContext(),owner=await browser.newContext({viewport:{width:1440,height:1000}}),peer=await browser.newContext();
 const page=await owner.newPage(),errors:string[]=[],accounts=new Map<BrowserContext,Row>();page.on('pageerror',error=>errors.push(error.message));
 async function call(context:BrowserContext,path:string,body?:object){
  const response=body?await context.request.post(origin+'/api/v1/'+path,{headers:{Origin:origin,'X-CSRF-Token':String(accounts.get(context)?.csrfToken??'')},data:body}):await context.request.get(origin+'/api/v1/'+path);
  const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result.data;
 }
 async function login(context:BrowserContext,username:string){const account=await call(context,'auth/login',{username,password});accounts.set(context,account);return account;}
 const selector='[data-dorma-maintenance-frame]',frame=page.frameLocator(selector),base='/workspace/maintenance/orders/',list=frame.locator('[data-dorma-maintenance-order-list]');
 const previous=frame.locator('#docs-info .prev-link a'),next=frame.locator('#docs-info .next-link a'),warning=frame.getByRole('alert'),accept=frame.locator('#docs-info .next-link').getByRole('button',{name:'确认接单',exact:true});
 const field=(label:string)=>frame.getByRole('heading',{name:label,exact:true}).locator('+ pre code');
 try{
  await login(admin,'admin');const username='mtOrder'+Date.now();await call(admin,'accounts',{username,fullName:'工单接收回归',role:'maintenance',password});
  const worker=await login(owner,username),other=await login(peer,'mt009');await login(student,'stu202602341');
  await page.goto(origin+base+'action-1');await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');
  async function create(technicianId:string,index:string){
   const repair=await call(student,'repairs',{roomId:'NY3-502',faultType:'水电设施',description:'工单接收 '+index,phone:'13800001234'});
   const id=String(repair.repair_id);await call(admin,'repairs/'+id+'/review',{decision:'approve',note:'初审通过'});await call(admin,'repairs/'+id+'/dispatch',{technicianId});return id;
  }
  for(let i=0;i<21;i++)await create(String(worker.id),String(i));
  const accepted=await create(String(worker.id),'已接单');await call(owner,'repairs/'+accepted+'/accept',{});
  const foreign=await create(String(other.id),'其他人员');
  const rows=await call(owner,'repairs?limit=100') as Row[];assert.equal(rows.length,22);
  await page.reload();await expect(list.locator('a')).toHaveText(rows.slice(0,20).map(row=>`${row.full_name} · ${row.room_id} · ${row.fault_type} · ${row.repair_status==='dispatched'?'已派工':'已接单'}`));
  await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-order-list.png'});
  await expect(frame.locator('[data-dorma-maintenance-business-host], [data-dorma-maintenance-order] table, [data-dorma-maintenance-order] input, dialog')).toHaveCount(0);
  const shell=await frame.locator('#docs-demos').elementHandle();await expectStudentReveal(page,()=>list.locator('a').first().click(),'维修工单详情',selector);
  await expect(field('报修编号')).toHaveText(accepted);await expect(field('学号')).toHaveText('202602341');await expect(field('联系电话')).toHaveText('13800001234');await expect(field('初审意见')).toHaveText('初审通过');await expect(field('工单状态')).toHaveText('已接单');
  await expect(next).toHaveCount(0);await expect(previous).toHaveAttribute('href',base+'action-1');await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['工单接收','查看工单']);await expectStudentBreadcrumbSpacing(page,selector);
  await expect(frame.locator('[data-dorma-repair-values] .copy-button').first()).toBeVisible();await expect(frame.locator('[data-dorma-repair-history]')).toContainText('工单接收回归');
  await previous.click();await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(list.locator('a')).toHaveCount(2);await list.locator('a').first().click();await expect(previous).toHaveAttribute('href',base+'action-1?page=2');await previous.click();await expect(page).toHaveURL(origin+base+'action-1?page=2');assert(await shell!.evaluate(el=>el.isConnected),'切换详情和返回列表保留母版外壳');
  await frame.locator('#docs-sidebar a[title="确认接单"]').click();await expect(page).toHaveURL(origin+base+'action-2');await expect(list.locator('a')).toHaveCount(20);await expect(frame.locator('[data-dorma-maintenance-order]')).toContainText('第1/2页');
  await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(list.locator('a')).toHaveCount(1);
  const id=new URL((await list.locator('a').first().getAttribute('href'))!,origin).searchParams.get('record')!,detail=origin+base+'action-2?page=2&record='+id;
  await expectStudentReveal(page,()=>list.locator('a').first().click(),'维修工单详情',selector);await expect(page).toHaveURL(detail);await expect(field('报修编号')).toHaveText(id);await expect(accept).toBeVisible();await expect(previous).toHaveAttribute('href',base+'action-2?page=2');await expect(next).toHaveText('确认接单');
  // Compare positions without scrolling the long detail out of its initial top position.
  assert(await next.evaluate(el=>el.getBoundingClientRect().left>el.ownerDocument.querySelector('.prev-link a')!.getBoundingClientRect().left));
  await page.reload();await expect(field('报修编号')).toHaveText(id);await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-order-detail.png'});
  const endpoint='**/api/v1/repairs/'+id+'/accept';await page.route(endpoint,route=>route.fulfill({status:503,json:{error:{message:'接单失败，请重试。'}}}));await accept.click();await expect(warning).toHaveClass('notice warning');await expect(warning).toHaveText('接单失败，请重试。');await page.unroute(endpoint);
  let release!:()=>void,submissions=0;const gate=new Promise<void>(resolve=>{release=resolve;});await page.route(endpoint,async route=>{submissions++;await gate;await route.continue();});
  await accept.click();await expect.poll(()=>submissions).toBe(1);await expect(accept).toHaveAttribute('aria-disabled','true');await accept.evaluate(el=>(el as HTMLElement).click());release();await expect(field('工单状态')).toHaveText('已接单');await expect(accept).toHaveCount(0);await page.unroute(endpoint);assert.equal(submissions,1);
  assert.equal((await call(owner,'repairs/'+id)).repair_status,'accepted');await expect(frame.locator('[data-dorma-repair-history]')).toContainText('工单接收回归');await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);
  await page.reload();await expect(field('工单状态')).toHaveText('已接单');await expect(next).toHaveCount(0);await previous.click();await expect(page).toHaveURL(origin+base+'action-2');await expect(list.locator('a')).toHaveCount(20);await expect(frame.getByRole('link',{name:'下一页',exact:true})).toHaveCount(0);
  const stale=new URL((await list.locator('a').first().getAttribute('href'))!,origin).searchParams.get('record')!;await list.locator('a').first().click();await expect(accept).toBeVisible();await call(owner,'repairs/'+stale+'/accept',{});
  await accept.click();await expect(warning).toHaveText('工单已接单或当前不能接单，请查看最新状态。');await expect(field('工单状态')).toHaveText('已接单');await expect(accept).toHaveCount(0);
  await previous.click();await expect(list.locator('a')).toHaveCount(19);await list.locator('a').first().click();await expect(field('工单状态')).toHaveText('已派工');await expect(accept).toBeVisible();
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-order-mobile.png'});await accept.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/qa/backend/maintenance-order-footer-mobile.png'});
  await previous.click();await expect(list.locator('a')).toHaveCount(19);assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);
  for(const record of [foreign,'0','invalid','9999999999999999999']){await page.goto(origin+base+'action-2?record='+record);await expect(warning).toHaveClass('notice warning');await expect(frame.locator('[data-dorma-repair-values]')).toHaveCount(0);await expect(accept).toHaveCount(0);}
  const denied=await owner.request.post(origin+'/api/v1/repairs/'+foreign+'/accept',{headers:{Origin:origin,'X-CSRF-Token':String(worker.csrfToken)},data:{}});assert.equal(denied.status(),403);assert.equal((await call(peer,'repairs/'+foreign)).repair_status,'dispatched');
  assert.deepEqual(errors,[]);console.log('工单接收通过：两类导航与独立代码框详情、报修资料及历史、底部真实接单、失败重试/重复提交/过期状态、分页返回刷新、INFO/WARNING、权限隔离与手机布局。');
 }finally{await owner.close();await peer.close();await student.close();await admin.close();}
}
