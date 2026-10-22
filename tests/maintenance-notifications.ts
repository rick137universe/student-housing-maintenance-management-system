import assert from 'node:assert/strict';
import {expect,type Browser,type BrowserContext} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;

// All accounts, repairs and messages are created through real APIs in the disposable test database.
export async function maintenanceNotificationRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext(),student=await browser.newContext(),owner=await browser.newContext({viewport:{width:1440,height:1000}}),peer=await browser.newContext();
 const page=await owner.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const accounts=new Map<BrowserContext,Row>();
 async function call(context:BrowserContext,path:string,body?:object){
  const response=body?await context.request.post(origin+'/api/v1/'+path,{headers:{Origin:origin,'X-CSRF-Token':String(accounts.get(context)?.csrfToken??'')},data:body}):await context.request.get(origin+'/api/v1/'+path);
  const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result.data;
 }
 async function login(context:BrowserContext,username:string){const account=await call(context,'auth/login',{username,password});accounts.set(context,account);return account;}
 const selector='[data-dorma-maintenance-frame]',frame=page.frameLocator(selector),base='/workspace/maintenance/notifications/messages';
 const list=frame.locator('[data-dorma-announcement-list]'),body=frame.locator('[data-dorma-announcement-body]'),read=frame.getByRole('button',{name:'标为已读',exact:true});
 try{
  await login(admin,'admin');const suffix=Date.now(),username='mtNotice'+suffix;
  const created=await call(admin,'accounts',{username,fullName:'维修消息回归',role:'maintenance',password});
  const technician=await login(owner,username);
  await page.goto(origin+base);await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');
  await expect(frame.locator('.docs-demo.is-active .docs-demo-live .label')).toHaveText('未读消息通知');
  await expect(frame.locator('[data-dorma-maintenance-business-host]')).toHaveCount(0);
  await login(student,'stu202602341');
  async function dispatchTo(technicianId:string,index:number|string){
   const repair=await call(student,'repairs',{roomId:'NY3-502',faultType:'水电设施',description:'维修消息 '+index+'\n第一段第二行\n\n第二段 <script>window.noticeUnsafe=true</script>',phone:'13800001234'});
   await call(admin,'repairs/'+repair.repair_id+'/review',{decision:'approve'});
   await call(admin,'repairs/'+repair.repair_id+'/dispatch',{technicianId});
  }
  for(let index=0;index<21;index++)await dispatchTo(String(created.accountId),index);
  const rows=await call(owner,'notifications?limit=100') as Row[],first=rows[0],id=String(first.notification_id);assert.equal(rows.length,21);
  await page.reload();await expect(list.locator('a')).toHaveText(rows.slice(0,20).map(row=>`${row.title} · 未读`));
  await expect(frame.locator('[data-dorma-announcements] table, [data-dorma-announcements] input, [data-dorma-announcements] dialog')).toHaveCount(0);
  await expect(frame.getByText('正在读取…',{exact:true})).toHaveCount(0);await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText('个人消息');
  await expect(list.locator('a').first()).toHaveClass(/color-lime/);await expect(list.locator('a').first()).toHaveAttribute('data-color','5');
  const shell=await frame.locator('#docs-demos').elementHandle(),target=list.locator(`a[href$="record=${id}"]`);
  await expectStudentReveal(page,()=>target.click(),String(first.title),selector);await expect(page).toHaveURL(origin+base+'?record='+id);
  await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['个人消息','消息通知']);await expectStudentBreadcrumbSpacing(page,selector);
  await expect(body.locator('p')).toHaveCount(3);await expect(body.locator('br')).toHaveCount(1);await expect(body).toContainText('第二段 <script>window.noticeUnsafe=true</script>');
  await expect(body.locator('script,pre,table')).toHaveCount(0);assert.equal(await frame.locator('body').evaluate(el=>(el.ownerDocument.defaultView as Window&{noticeUnsafe?:boolean}).noticeUnsafe),undefined);
  await expect(body.locator('p').first().locator('code')).toHaveCount(2);assert(!/时间|·/.test(await body.locator('p').first().innerText()));await expect(body.locator('p').first()).toContainText('未读');await expect.poll(()=>frame.locator('html').evaluate(el=>el.ownerDocument.title)).toBe(String(first.title)+' · 维修工作台');
  const previous=frame.locator('#docs-info .prev-link a');await expect(previous).toHaveAttribute('href',base);await expect(read).toHaveClass(/color-lime/);await expect(read.locator('svg.icon')).toHaveCount(1);await expect(body.getByRole('button')).toHaveCount(0);
  const left=await previous.boundingBox(),right=await read.boundingBox();assert(left&&right&&Math.abs(left.y-right.y)<1&&right.x>left.x);
  await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);await expect(page.locator('html')).toHaveCSS('overflow-y','hidden');
  await page.screenshot({path:'docs/qa/backend/maintenance-notification-detail.png'});
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/maintenance-notification-mobile.png'});await page.setViewportSize({width:1440,height:1000});
  const failedRead=`**/api/v1/notifications/${id}/read`;
  await page.route(failedRead,route=>route.fulfill({status:503,json:{error:{message:'标记失败，请重试。'}}}));await read.click();await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(frame.getByRole('alert')).toHaveText('标记失败，请重试。');await page.unroute(failedRead);
  await read.focus();await page.keyboard.press('Space');await expect(read).toHaveCount(0);assert((await call(owner,'notifications/'+id)).read_at);
  await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);await expect(frame.getByRole('alert')).toHaveCount(0);
  await previous.click();await expect(target).toHaveText(String(first.title)+' · 已读');assert(await shell!.evaluate(el=>el.isConnected));
  await page.goBack();await expect(body).toContainText('已读');await page.reload();await expect(body).toContainText('已读');await expect(read).toHaveCount(0);await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
  await frame.locator('#docs-info .docs-breadcrumb a').last().click();await expect(target).toHaveText(String(first.title)+' · 已读');
  await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(page).toHaveURL(origin+base+'?page=2');await expect(list.locator('a')).toHaveCount(1);
  await list.locator('a').click();await expect(previous).toHaveAttribute('href',base+'?page=2');await previous.click();await expect(page).toHaveURL(origin+base+'?page=2');
  await frame.locator('#docs-sidebar a[title="个人中心"]').click();await expect(page).toHaveURL(origin+'/workspace/maintenance/personal');await expect(frame.locator('#docs-info h1')).toHaveText('个人中心');assert.equal(new URL(page.url()).search,'');
  const peerAccount=await login(peer,'mt008');await dispatchTo(String(peerAccount.id),'其他维修人员');const foreign=(await call(peer,'notifications') as Row[])[0];assert(foreign);
  for(const record of [String(foreign.notification_id),'invalid','0','9999999999999999999']){
   await page.goto(origin+base+'?record='+record);await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(body).toHaveCount(0);await expect(read).toHaveCount(0);
  }
  const denied=await owner.request.post(origin+`/api/v1/notifications/${foreign.notification_id}/read`,{headers:{Origin:origin,'X-CSRF-Token':String(technician.csrfToken)},data:{}});assert.equal(denied.status(),404);assert.equal((await call(peer,'notifications/'+foreign.notification_id)).read_at,null);
  await page.route(/\/api\/v1\/notifications\?/,route=>route.fulfill({status:503,json:{error:{message:'消息读取失败，请重试。'}}}));await page.goto(origin+base);await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(frame.getByRole('alert')).toHaveText('消息读取失败，请重试。');await page.unroute(/\/api\/v1\/notifications\?/);
  const emptyName='mtEmpty'+suffix;await call(admin,'accounts',{username:emptyName,fullName:'空消息维修',role:'maintenance',password});
  await call(owner,'auth/logout',{});await login(owner,emptyName);await page.goto(origin+base);await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');await expect(list.locator('a')).toHaveCount(0);
  assert.deepEqual(errors,[]);console.log('维修消息通过：真实报修通知、标题及已读导航、正文分段与安全文本、独立详情和已读位置、真实持久化、分页/刷新/返回、母版间距及渐显、INFO/WARNING、账号隔离与手机布局。');
 }finally{await owner.close();await student.close();await peer.close();await admin.close();}
}
