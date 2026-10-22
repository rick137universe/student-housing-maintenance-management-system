import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expect,type Browser} from '@playwright/test';
import {maintenancePages} from '../src/data/maintenance-pages';
import {roleFeatures} from '../src/data/role-features';

export async function verifyMaintenanceShell(){
 const index=await readFile('public/assets/maintenance/index.html','utf8'),sidebar=index.match(/<aside id="docs-sidebar"[\s\S]*?<\/aside>/)![0];
 assert.equal(new Set(maintenancePages.map(page=>page.id)).size,maintenancePages.length);
 assert.equal(maintenancePages.filter(page=>page.action!=='overview').length,roleFeatures.maintenance.flatMap(group=>group.actions).length);
 assert(!/<a\b[^>]*\bdata-color=/.test(sidebar),'未选中的目录保持母版默认颜色');
 for(const resource of ['css/core.css','css/docs.css','js/docs.js'])assert(index.includes('/assets/student/assets/'+resource));
 const demos=await readFile('public/assets/maintenance/demos.html','utf8');
 for(const entry of maintenancePages){
  const page=await readFile(`public/assets/maintenance/pages/${entry.feature}-${entry.action}.html`,'utf8');
  assert(page.includes(`data-id="${entry.id}"`));assert(demos.includes(`data-id="${entry.id}"`));
  if(entry.feature!=='overview')assert(sidebar.includes(`href="${entry.url}"`));
  assert.equal(page.includes('data-dorma-business'),entry.action!=='overview');
  if(entry.action==='overview'&&entry.feature!=='overview'){
   const preview=demos.match(new RegExp(`<article[^>]*data-id="${entry.id}"[\\s\\S]*?</article>`))![0];
   assert(preview.includes(`id="${entry.id}" class="docs-demo-content dotted-grid"`),'六个模块主页统一使用 getting-started 点阵');
   assert(preview.includes(`data-color="${entry.color}"`));
   assert(preview.includes(`<h2 class="text-ui">${entry.label}</h2>`));
  }
  if(entry.feature==='analytics'&&entry.action!=='overview'){
   const preview=demos.match(new RegExp(`<article[^>]*data-id="${entry.id}"[\\s\\S]*?</article>`))![0];
   const labels=entry.action==='action-1'?['获派工单总数','已完成工单']:entry.action==='action-2'?['总体完成率']:['平均评分','评价数量'];
   assert(preview.includes('dormaMaintenancePreviews.statistics'));
   for(const label of labels)assert(preview.includes(`<span class="label">${label}</span>`));
   assert.equal([...preview.matchAll(/class="(?:time )?value lcd"/g)].length,2*labels.length,'实时和未激活模板均保留母版数字框');
  }
  if(['personal','notifications'].includes(entry.feature)){
   const preview=demos.match(new RegExp(`<article[^>]*data-id="${entry.id}"[\\s\\S]*?</article>`))![0];
   if(entry.action!=='overview'){
    if(entry.feature==='personal')assert(preview.includes('dormaStudentPreviews.installation'));
    else assert(preview.includes('Messages<br>')&&preview.includes('消息通知')&&preview.includes('square-grid'));
   }
  }
 }
}

export async function maintenanceShellRegression(browser:Browser,origin:string,password:string){
 await verifyMaintenanceShell();
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 const frame=page.frameLocator('[data-dorma-maintenance-frame]');
 async function ready(entry:typeof maintenancePages[number]){
  await expect(page).toHaveURL(origin+entry.url);await expect(frame.locator('#toggle-search')).toBeEnabled();
  await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',entry.id);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');
  if(entry.action!=='overview'){
   await expect(frame.locator('[data-dorma-live-workspace]')).toBeVisible();await expect(frame.getByText('正在读取…',{exact:true})).toHaveCount(0);
   await expect(frame.locator('[data-dorma-live-workspace] [role="alert"]')).toHaveCount(0);
  }
 }
 try{
  const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'mt008',password}});assert.equal(response.status(),200);
  const account=(await response.json()).data;
  await page.goto(origin+'/workspace/maintenance/orders/assigned');await ready(maintenancePages[2]);
  await expect(frame.locator('[data-dorma-account-name]')).toHaveText(account.displayName);
  await expect(page.locator('html')).toHaveCSS('overflow-y','hidden');assert.equal(await page.locator('html').evaluate(el=>el.scrollHeight>innerHeight),false);
  const shell=await frame.locator('#docs-demos').elementHandle();
  for(const group of maintenancePages.filter(entry=>entry.action==='overview'&&entry.feature!=='overview')){
   await frame.locator(`#docs-sidebar a[data-id="${group.id}"]`).click();await ready(group);
   for(const entry of maintenancePages.filter(entry=>entry.feature===group.feature&&entry.action!=='overview')){
    await frame.locator(`#docs-sidebar a[data-id="${entry.id}"]`).click();await ready(entry);
    await expect(frame.locator(`#docs-sidebar a[data-id="${entry.id}"]`).locator('..')).toHaveClass(/is-active/);
   }
  }
  assert(await shell!.evaluate(el=>el.isConnected),'目录切换保留当前外壳');
  await frame.locator('#toggle-search').click();await frame.locator('#docs-search-input').fill('确认接单');await frame.locator('#docs-search-results a').first().click();
  const intake=maintenancePages.find(entry=>entry.label==='确认接单')!;await ready(intake);
  await page.goBack();await ready(maintenancePages.find(entry=>entry.label==='消息通知')!);await page.goForward();await ready(intake);await page.reload();await ready(intake);
  const row=frame.locator('[data-dorma-maintenance-order-list] a').first();
  if(await row.count()){
   const id=new URL((await row.getAttribute('href'))!,origin).searchParams.get('record')!;await row.click();await expect(frame.getByRole('heading',{name:'维修工单详情',exact:true})).toBeVisible();
   await frame.getByRole('button',{name:'确认接单',exact:true}).click();await expect(frame.locator('#docs-info .next-link a')).toHaveCount(0);
   await expect(frame.getByRole('heading',{name:'工单状态',exact:true}).locator('+ pre code')).toHaveText('已接单');await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);
   const repair=await context.request.get(origin+'/api/v1/repairs/'+id);assert.equal((await repair.json()).data.repair_status,'accepted');
  }
  await page.goto(origin+'/workspace/maintenance/personal/edit-profile');await ready(maintenancePages.find(entry=>entry.feature==='personal'&&entry.action==='action-2')!);
  const name=frame.locator('[data-profile-field="fullName"]');await name.getByRole('button',{name:'编辑姓名',exact:true}).click();await expect(name.getByRole('textbox')).toBeVisible();await name.getByRole('button',{name:'取消',exact:true}).click();await expect(name.getByRole('textbox')).toHaveCount(0);await expect(frame.getByRole('dialog')).toHaveCount(0);
  await page.goto(origin+'/workspace/maintenance/orders/assigned');await ready(maintenancePages[2]);await page.screenshot({path:'docs/qa/backend/maintenance-shell-desktop.png'});
  await page.setViewportSize({width:390,height:844});await frame.locator('#toggle-sidebar').click();await expect(frame.locator('#docs-sidebar')).toHaveClass(/is-active/);
  await frame.locator('#docs-sidebar a[title="维修处理"]').click();await ready(maintenancePages.find(entry=>entry.feature==='repair'&&entry.action==='overview')!);
  if(!(await frame.locator('#docs-sidebar').getAttribute('class'))?.includes('is-active'))await frame.locator('#toggle-sidebar').click();
  await frame.locator('#docs-sidebar a[title="更新状态"]').click();await ready(maintenancePages.find(entry=>entry.label==='更新状态')!);
  if((await frame.locator('#docs-sidebar').getAttribute('class'))?.includes('is-active'))await frame.locator('#toggle-sidebar').click();
  assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/maintenance-shell-mobile.png'});
  await frame.locator('#toggle-site-menu').click();await frame.locator('#site-menu a[data-id="docs"]').click();await ready(maintenancePages[0]);
  await expect(frame.locator('#docs-info h1')).toHaveText('维修工作台');
  await frame.locator('#toggle-site-menu').click();await frame.locator('[data-dorma-account]').click();await expect(page).toHaveURL(origin+'/');
  assert.equal((await context.request.get(origin+'/api/v1/auth/me')).status(),401);assert.deepEqual(errors,[]);
  console.log('维修外壳通过：6 组目录及 14 个业务入口、母版预览与搜索、历史/刷新、保留业务详情和编辑、真实接单及退出、手机菜单与单滚动条。');
 }finally{await context.close();}
}
