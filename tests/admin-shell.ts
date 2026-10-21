import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expect,type Browser} from '@playwright/test';
import {adminPages} from '../src/data/admin-pages';
import {roleFeatures} from '../src/data/role-features';
import {expectStudentReveal} from './student-transitions';

export async function verifyAdminShell(){
 const index=await readFile('public/assets/admin/index.html','utf8'),sidebar=index.match(/<aside id="docs-sidebar"[\s\S]*?<\/aside>/)![0];
 assert.equal(new Set(adminPages.map(entry=>entry.id)).size,adminPages.length);assert.equal(adminPages.filter(entry=>entry.action==='overview'&&entry.feature!=='overview').length,10);
 assert.equal(adminPages.filter(entry=>entry.action!=='overview'&&!entry.parent).length,roleFeatures.admin.flatMap(group=>group.actions).length);
 assert(!/<a\b[^>]*\bdata-color=/.test(sidebar),'未选中的导航保持母版默认颜色');
 for(const resource of ['css/core.css','css/docs.css','js/docs.js'])assert(index.includes('/assets/student/assets/'+resource));
 const demos=await readFile('public/assets/admin/demos.html','utf8');
 for(const entry of adminPages){const page=await readFile(`public/assets/admin/pages/${entry.feature}-${entry.action.replaceAll('/','-')}.html`,'utf8');assert(page.includes(`data-id="${entry.id}"`));assert(demos.includes(`data-id="${entry.id}"`));if(entry.feature!=='overview')assert(sidebar.includes(`href="${entry.url}"`));assert.equal(page.includes('data-dorma-business'),entry.action!=='overview');}
}

export async function adminShellRegression(browser:Browser,origin:string,password:string){
 await verifyAdminShell();
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const selector='[data-dorma-admin-frame]',frame=page.frameLocator(selector),entry=(feature:string,action='overview')=>adminPages.find(entry=>entry.feature===feature&&entry.action===action)!;
 async function ready(item:typeof adminPages[number]){
  await expect(page).toHaveURL(origin+item.url);await expect(frame.locator('#toggle-search')).toBeEnabled();await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',item.id);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');
  if(item.action==='overview')await expect(frame.locator('#docs-info h1')).toHaveText(item.label);
  else{await expect(frame.locator('[data-dorma-live-workspace]')).toBeVisible();await expect(frame.locator('[data-dorma-live-workspace]').getByText('正在读取…',{exact:true})).toHaveCount(0);await expect(frame.locator('[data-dorma-live-workspace] [role="alert"]')).toHaveCount(0);await expect(frame.getByRole('heading',{name:item.label,level:1,exact:true})).toBeVisible();await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);}
 }
 try{
  const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'admin',password}});assert.equal(response.status(),200);const account=(await response.json()).data;
  await page.goto(origin+'/workspace/admin');await ready(adminPages[0]);await expect(frame.locator('[data-student-module-links] a')).toHaveCount(10);await expect(frame.locator('[data-dorma-account-name]')).toHaveText(account.displayName);
  const initial=await context.request.get(origin+'/workspace/admin'),html=await initial.text();assert(html.includes('data-dorma-admin-frame'));assert(!html.includes('正在确认身份'));assert.match(initial.headers()['cache-control'],/no-store|no-cache/);
  await expect(page.locator('html')).toHaveCSS('overflow-y','hidden');assert.equal(await page.locator('html').evaluate(el=>el.scrollHeight>innerHeight),false);
  const shell=await frame.locator('#docs-demos').elementHandle();
  await expectStudentReveal(page,()=>frame.locator('[data-student-module-links] a').first().click(),'基础数据',selector);await ready(entry('base-data'));
  for(const group of adminPages.filter(entry=>entry.action==='overview'&&entry.feature!=='overview')){
   await frame.locator(`#docs-sidebar a[data-id="${group.id}"]`).click();await ready(group);
   for(const item of adminPages.filter(entry=>entry.feature===group.feature&&entry.action!=='overview')){await frame.locator(`#docs-sidebar a[data-id="${item.id}"]`).click();await ready(item);await expect(frame.locator(`#docs-sidebar a[data-id="${item.id}"]`).locator('..')).toHaveClass(/is-active/);}
  }
  assert(await shell!.evaluate(el=>el.isConnected),'目录切换应保留当前母版外壳');
  await frame.locator('#toggle-search').click();await frame.locator('#docs-search-input').fill('权限审计');await frame.locator('#docs-search-results a').first().click();await ready(entry('permissions','action-3'));
  await page.goBack();await ready(entry('notifications','action-1'));await page.goForward();await ready(entry('permissions','action-3'));await page.reload();await ready(entry('permissions','action-3'));
  await page.goto(origin+'/workspace/admin/base-data/action-1');await ready(entry('base-data','action-1'));const row=frame.locator('[data-dorma-live-workspace] tbody tr').first();await row.getByRole('button',{name:'详情',exact:true}).click();await expect(frame.getByRole('heading',{name:'记录详情',exact:true})).toBeVisible();await frame.getByRole('button',{name:'关闭详情',exact:true}).click();await page.screenshot({path:'docs/qa/backend/admin-shell-business-desktop.png'});
  await page.goto(origin+'/workspace/admin/process/action-1');await ready(entry('process','action-1'));await frame.getByRole('button',{name:'修改规则',exact:true}).click();await expect(frame.getByRole('dialog')).toBeVisible();await frame.getByRole('button',{name:'取消',exact:true}).click();await expect(frame.getByRole('dialog')).toHaveCount(0);
  await page.goto(origin+'/workspace/admin/personal/action-2');await ready(entry('personal','action-2'));const original=(await (await context.request.get(origin+'/api/v1/profile')).json()).data;
  const fullName=String(original.full_name)+'界面回归',name=frame.locator('[data-profile-field="fullName"]');await name.getByRole('button',{name:'编辑姓名',exact:true}).click();await name.getByRole('textbox').fill(fullName);await name.getByRole('button',{name:'确认',exact:true}).click();await expect(name.getByRole('textbox')).toHaveCount(0);await expect(frame.locator('[data-dorma-account-name]')).toHaveText(fullName);assert.equal((await (await context.request.get(origin+'/api/v1/profile')).json()).data.full_name,fullName);
  const restore=await context.request.patch(origin+'/api/v1/profile',{headers:{Origin:origin,'X-CSRF-Token':account.csrfToken},data:{fullName:original.full_name,phone:original.phone,email:original.email}});assert.equal(restore.status(),200);
  await page.goto(origin+'/workspace/admin/base-data/action-3');await ready(entry('base-data','action-3'));const downloading=page.waitForEvent('download');await frame.getByRole('button',{name:'导出真实数据 CSV',exact:true}).click();const download=await downloading;assert.match(download.suggestedFilename(),/\.csv$/);assert((await readFile((await download.path())!,'utf8')).includes('202602341'));
  await page.goto(origin+'/workspace/admin/base-data');await ready(entry('base-data'));await page.screenshot({path:'docs/qa/backend/admin-shell-desktop.png'});
  await page.setViewportSize({width:390,height:844});await frame.locator('#toggle-sidebar').click();await expect(frame.locator('#docs-sidebar')).toHaveClass(/is-active/);await frame.locator('#docs-sidebar a[title="权限管理"]').click();await ready(entry('permissions'));
  if(!(await frame.locator('#docs-sidebar').getAttribute('class'))?.includes('is-active'))await frame.locator('#toggle-sidebar').click();await frame.locator('#docs-sidebar a[title="用户账号"]').click();await ready(entry('permissions','action-1'));if((await frame.locator('#docs-sidebar').getAttribute('class'))?.includes('is-active'))await frame.locator('#toggle-sidebar').click();
  await expect.poll(()=>frame.locator('#docs-sidebar').evaluate(el=>el.getBoundingClientRect().right)).toBeLessThanOrEqual(0.5);
  assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);assert.equal(await page.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/admin-shell-mobile.png'});
  await frame.locator('#toggle-site-menu').click();await frame.locator('#site-menu a[data-id="docs"]').click();await ready(adminPages[0]);await frame.locator('#toggle-site-menu').click();await frame.locator('[data-dorma-account]').click();await expect(page).toHaveURL(origin+'/');assert.equal((await context.request.get(origin+'/api/v1/auth/me')).status(),401);
  assert.deepEqual(errors,[]);console.log('管理员外壳通过：10 组目录/26 个主入口及公告/账单三级目录、顶部菜单搜索/双栏预览/渐显、根首页/历史/刷新、原有详情/规则弹窗/真实资料保存/CSV导出、手机菜单、单滚动条和退出。');
 }finally{await context.close();}
}
