import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expect,type Browser} from '@playwright/test';
import {managerPages} from '../src/data/manager-pages';
import {roleFeatures} from '../src/data/role-features';
import managerPreviews from '../src/data/manager-previews.json';
import studentPreviews from '../src/data/student-previews.json';

export async function verifyManagerShell(){
 const index=await readFile('public/assets/manager/index.html','utf8');
 const sidebar=index.match(/<aside id="docs-sidebar"[\s\S]*?<\/aside>/)![0];
 assert.equal(new Set(managerPages.map(page=>page.id)).size,managerPages.length);
 assert.equal(managerPages.filter(page=>page.action!=='overview').length,roleFeatures.dormManager.flatMap(group=>group.actions).length);
 assert(!/<a\b[^>]*\bdata-color=/.test(sidebar),'未选中目录不得强制着色');
 for(const resource of ['css/core.css','css/docs.css','js/docs.js'])assert(index.includes('/assets/student/assets/'+resource),'直接复用未修改母版资源');
 const demos=await readFile('public/assets/manager/demos.html','utf8');
 const randomPages=managerPages.filter(entry=>entry.action!=='overview'&&!['personal','notifications'].includes(entry.feature));
 assert.deepEqual(managerPreviews.map(preview=>preview.url),randomPages.map(entry=>entry.url));
 const allowed=new Set(studentPreviews.filter(preview=>!preview.kind&&preview.source!=='getting-started'&&preview.source!=='text-splittext').map(preview=>preview.source));
 for(const preview of managerPreviews)assert(allowed.has(preview.source),'随机预览必须来自已选的学生端图形动画');
 for(const entry of managerPages){
  const page=await readFile(`public/assets/manager/pages/${entry.feature}-${entry.action}.html`,'utf8');
  assert(page.includes(`data-id="${entry.id}"`));assert(demos.includes(`data-id="${entry.id}"`));
  if(entry.feature!=='overview')assert(sidebar.includes(`href="${entry.url}"`));
  assert.equal(page.includes('data-dorma-business'),entry.action!=='overview');
  if(entry.action==='overview'&&entry.feature!=='overview'){
   const preview=demos.match(new RegExp(`<article[^>]*data-id="${entry.id}"[\\s\\S]*?</article>`))![0];
   assert(preview.includes(`id="${entry.id}" class="docs-demo-content dotted-grid"`),'模块首页使用 Getting started 点阵预览');
  }
  if(entry.action!=='overview'&&['personal','notifications'].includes(entry.feature)){
   const preview=demos.match(new RegExp(`<article[^>]*data-id="${entry.id}"[\\s\\S]*?</article>`))![0];
   if(entry.feature==='personal')assert(preview.includes('dormaStudentPreviews.installation'),'个人页面共用账号资料打字预览');
   else assert(preview.includes('未读消息通知')&&preview.includes('createTimer')&&preview.includes("'unread'"),'消息通知使用未读数量 duration 预览');
  }
 }
 console.log('宿管外壳结构通过：7 组目录、19 个原业务入口、母版样式/运行时复用及独立路径。');
}

// Uses only the disposable integration database.
export async function managerShellRegression(browser:Browser,origin:string,password:string){
 await verifyManagerShell();
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'dm0301',password}});assert.equal(response.status(),200);
  const account=(await response.json()).data;
  await page.goto(origin+'/workspace/dormManager/base-data/students');
  const frame=page.frameLocator('[data-dorma-manager-frame]');
  async function ready(entry:typeof managerPages[number]){
   await expect(page).toHaveURL(origin+entry.url);await expect(frame.locator('#toggle-search')).toBeEnabled();
   await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',entry.id);
   await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');
   if(entry.action==='overview'&&entry.feature!=='overview'){
    await expect(frame.locator('.docs-demo.is-active .dotted-grid')).toBeVisible();
    await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-color',String(entry.color));
   }
   if(entry.action!=='overview'){
    await expect(frame.locator('[data-dorma-live-workspace]')).toBeVisible();
    await expect(frame.getByText('正在读取…',{exact:true})).toHaveCount(0);
    await expect(frame.locator('[data-dorma-live-workspace] [role="alert"]')).toHaveCount(0);
   }
  }
  await ready(managerPages[2]);
  const shell=await frame.locator('#docs-demos').elementHandle();
  for(const group of managerPages.filter(entry=>entry.action==='overview'&&entry.feature!=='overview')){
   await frame.locator(`#docs-sidebar a[data-id="${group.id}"]`).click();await ready(group);
   for(const entry of managerPages.filter(entry=>entry.feature===group.feature&&entry.action!=='overview')){
    await frame.locator(`#docs-sidebar a[data-id="${entry.id}"]`).click();await ready(entry);
    await expect(frame.locator(`#docs-sidebar a[data-id="${entry.id}"]`).locator('..')).toHaveClass(/is-active/);
   }
  }
  assert(await shell!.evaluate(el=>el.isConnected),'切换目录不得重新加载外壳');
  await frame.locator('#toggle-search').click();await frame.locator('#docs-search-input').fill('调宿审核');
  await frame.locator('#docs-search-results a').first().click();await ready(managerPages.find(entry=>entry.label==='调宿审核')!);
  await page.goBack();await ready(managerPages.find(entry=>entry.label==='消息通知')!);
  await page.goForward();await ready(managerPages.find(entry=>entry.label==='调宿审核')!);
  await page.reload();await ready(managerPages.find(entry=>entry.label==='调宿审核')!);
  await page.goto(origin+'/workspace/dormManager/personal/edit-profile');await ready(managerPages.find(entry=>entry.feature==='personal'&&entry.action==='action-2')!);
  const original=(await (await context.request.get(origin+'/api/v1/profile')).json()).data;

  const phone=frame.locator('[data-profile-field="phone"]');
  await phone.getByRole('button',{name:'编辑联系电话',exact:true}).click();await phone.getByRole('textbox').fill('13900001234');await phone.getByRole('button',{name:'取消',exact:true}).click();await expect(phone.getByRole('textbox')).toHaveCount(0);
  assert.equal((await (await context.request.get(origin+'/api/v1/profile')).json()).data.phone,original.phone);
  await phone.getByRole('button',{name:'编辑联系电话',exact:true}).click();await phone.getByRole('textbox').fill('13900001234');await phone.getByRole('button',{name:'确认',exact:true}).click();await expect(phone.getByRole('textbox')).toHaveCount(0);
  assert.equal((await (await context.request.get(origin+'/api/v1/profile')).json()).data.phone,'13900001234');
  assert.equal((await context.request.patch(origin+'/api/v1/profile',{headers:{Origin:origin,'X-CSRF-Token':account.csrfToken},data:{fullName:original.full_name,phone:original.phone,email:original.email}})).status(),200);
  await page.goto(origin+'/workspace/dormManager/base-data/students');await ready(managerPages[2]);await page.screenshot({path:'docs/qa/backend/manager-shell-desktop.png'});
  await page.setViewportSize({width:390,height:844});await frame.locator('#toggle-sidebar').click();await expect(frame.locator('#docs-sidebar')).toHaveClass(/is-active/);
  await frame.locator('#docs-sidebar a[title="房间信息"]').click();await ready(managerPages.find(entry=>entry.label==='房间信息')!);
  assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/manager-shell-mobile.png'});
  await frame.locator('#toggle-site-menu').click();await frame.locator('#site-menu a[data-id="docs"]').click();await ready(managerPages[0]);
  await frame.locator('#toggle-site-menu').click();await frame.locator('[data-dorma-account]').click();await expect(page).toHaveURL(origin+'/');
  assert.equal((await context.request.get(origin+'/api/v1/auth/me')).status(),401);assert.deepEqual(errors,[]);
  console.log('宿管外壳回归通过：全部目录/预览、搜索、返回/前进、刷新、手机菜单、资料编辑取消与保存、真实退出。');
 }finally{await context.close();}
}
