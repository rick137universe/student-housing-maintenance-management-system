import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {roleFeatures} from '../src/data/role-features';
import type {RoleId} from '../src/types/auth';
import {verifyLoginTemplate} from './login-template';
import {verifyHomeTemplate} from './home-template';
import {verifyStudentTemplate} from './student-template';
import {studentDocsRegression} from './student-browser';
import {workspacePath} from '../src/utils/workspace-route';
import {delayedWorkspaceHydration} from './workspace-entry';
import {managerShellRegression,verifyManagerShell} from './manager-shell';
import {managerPersonalRegression} from './manager-personal';
import {managerNotificationRegression} from './manager-notifications';
import {managerAccommodationRegression} from './manager-accommodation';
import {managerBedsRegression} from './manager-beds';
import {managerRepairRegression} from './manager-repairs';
import {managerBaseDataRegression} from './manager-base-data';
import {managerBillingRegression} from './manager-billing';
import {authRedirectRegression} from './auth-redirect';
import {maintenanceShellRegression,verifyMaintenanceShell} from './maintenance-shell';
import {maintenancePersonalRegression} from './maintenance-personal';
import {maintenanceNotificationRegression} from './maintenance-notifications';
import {adminShellRegression,verifyAdminShell} from './admin-shell';
import {adminPersonalRegression} from './admin-personal';
import {maintenanceAnalyticsRegression} from './maintenance-analytics';
import {maintenanceProcessingRegression} from './maintenance-processing';
import {maintenanceOrderRegression} from './maintenance-orders';
import {maintenanceRecordRegression} from './maintenance-records';

export async function browserRegression(origin:string,password:string){
 await verifyLoginTemplate();
 await verifyHomeTemplate();
 await verifyStudentTemplate();
 await verifyManagerShell();
 await verifyMaintenanceShell();
 await verifyAdminShell();
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors:string[]=[];let visited=0;
 await mkdir('docs/qa/backend',{recursive:true});
 try{
  await authRedirectRegression(browser,origin,password);
  for(const [role,username] of [['student','stu202602341'],['dormManager','dm0301'],['maintenance','mt008'],['admin','admin']] as [RoleId,string][]){
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin);
   const homePage=page.frameLocator('[data-dorma-home-frame]');
   const accountButton=homePage.locator('[data-dorma-account]');
   await expect(homePage.locator('.page')).toHaveClass(/is-ready/,{timeout:60000});
   await expect(homePage.locator('#site-header')).toHaveCSS('opacity','1',{timeout:15000});
   await expect(accountButton.locator('.dorma-account-label')).toHaveCSS('display','grid');
   await expect(accountButton.locator('[data-dorma-account-name]')).toHaveText('未登录');
   await accountButton.hover();await expect(accountButton.locator('[data-dorma-account-action]')).toBeVisible();
   await expect(accountButton.locator('[data-dorma-account-action]')).toHaveText('前往登录');
   await expect(accountButton.locator('[data-dorma-account-name]')).toBeHidden();
   await accountButton.focus();await page.keyboard.press('Enter');
   await page.waitForURL(origin+'/login');
   const loginPage=page.frameLocator('[data-dorma-login-frame]');
   const loginForm=loginPage.frameLocator('iframe[title="账号登录"]');
   await expect(loginPage.locator('#learn')).toHaveClass(/is-ready/);
   await expect(loginPage.locator('#site-header')).toBeVisible();
   const loginAccountButton=loginPage.locator('[data-dorma-account]');
   await expect(loginAccountButton.locator('[data-dorma-account-name]')).toHaveText('未登录');
   await loginAccountButton.hover();
   await expect(loginAccountButton.locator('[data-dorma-account-action]')).toHaveText('前往登录');
   await expect(loginAccountButton.locator('[data-dorma-account-action]')).toHaveCSS('opacity','1');
   await loginAccountButton.click();
   await expect(loginPage.locator('#site-menu')).not.toHaveClass(/is-active/);
   await expect(loginForm.locator('#username')).toBeFocused();
   assert.equal(await loginPage.locator('#site-menu .main-nav-link').count(),6);
   await expect(loginPage.locator('#site-footer .footer-logo')).toHaveCount(1);
   if(role==='student'){
    await loginForm.getByLabel(/账号/).fill(username);
    await loginForm.getByLabel(/密码/).fill('WrongPassword2026');
    await loginForm.getByRole('button',{name:'登录工作台',exact:true}).click();
    await loginForm.getByRole('alert').waitFor();
    assert.equal(new URL(page.url()).pathname,'/login');
    await loginForm.getByLabel(/密码/).fill('');
    for(const [size,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
     await page.setViewportSize({width,height});
     await loginPage.locator('#site-header').scrollIntoViewIfNeeded();
     await page.screenshot({path:`docs/qa/backend/login-${size}-top.png`});
     await loginPage.locator('#site-footer').scrollIntoViewIfNeeded();
     await page.screenshot({path:`docs/qa/backend/login-${size}-footer.png`});
     assert.equal(await loginPage.locator('html').evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'login overflow');
    }
    await page.setViewportSize({width:1440,height:1000});
   }
   await loginForm.getByLabel(/账号/).fill(username);await loginForm.getByLabel(/密码/).fill(password);await loginForm.getByRole('button',{name:'登录工作台',exact:true}).click();
   await page.waitForURL(origin+workspacePath(role));const workspace=role==='student'?page.frameLocator('[data-dorma-student-frame]'):role==='dormManager'?page.frameLocator('[data-dorma-manager-frame]'):role==='maintenance'?page.frameLocator('[data-dorma-maintenance-frame]'):page.frameLocator('[data-dorma-admin-frame]');
   if(role==='student')await expect(workspace.locator('[data-student-module-links] a')).toHaveCount(6);
   else if(role==='dormManager'){await expect(page).toHaveURL(origin+'/workspace/dormManager');await expect(workspace.getByRole('heading',{name:'宿管工作台',level:1,exact:true})).toBeVisible();}
   else if(role==='maintenance'){await expect(page).toHaveURL(origin+'/workspace/maintenance');await expect(workspace.getByRole('heading',{name:'维修工作台',level:1,exact:true})).toBeVisible();}
   else await expect(workspace.getByRole('heading',{name:'管理员工作台',level:1,exact:true})).toBeVisible();
   const initialResponse=await page.request.get(origin+workspacePath(role)),initialHtml=await initialResponse.text();
   assert.equal(initialResponse.status(),200);
   assert(!initialHtml.includes('正在确认身份'),'首屏不应包含客户端身份加载提示');
   assert.match(initialResponse.headers()['cache-control'],/no-store|no-cache/,'身份首屏必须禁止缓存复用或强制重新校验（开发服务使用no-cache）');
   assert(!/public|s-maxage/.test(initialResponse.headers()['cache-control']),'身份首屏不能使用公共缓存');
   assert(initialHtml.includes(role==='student'?'data-dorma-student-frame':role==='dormManager'?'data-dorma-manager-frame':role==='maintenance'?'data-dorma-maintenance-frame':'data-dorma-admin-frame'),'服务端应直接输出对应身份的工作台首屏');
   if(role==='student')await delayedWorkspaceHydration(page,origin);
   await page.goto(origin+'/login');await page.waitForURL('**/workspace/**');
   for(const feature of roleFeatures[role])for(const action of feature.actions){
    await page.goto(`${origin}/workspace/${role}/${feature.id}/${action.id}`);
    await workspace.locator(role==='student'&&['accommodation','repair'].includes(feature.id)?'[data-student-record-links]':'[data-dorma-live-workspace]').waitFor();
    await workspace.getByText('正在读取…',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await workspace.locator('[data-dorma-live-workspace]').getByRole('alert').count(),0,`${role}/${feature.id}/${action.id}`);visited++;
   }
   const first=roleFeatures[role][0];await page.goto(`${origin}/workspace/${role}/${first.id}/action-1`);await workspace.getByText('正在读取…',{exact:true}).waitFor({state:'hidden'});await workspace.locator('[data-dorma-live-workspace]').waitFor();
   for(const [size,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
    await page.setViewportSize({width,height});
    if(role==='student'){
     const nativePage=page.frameLocator('[data-dorma-student-frame]');
     await expect(nativePage.locator('#docs-info')).toHaveCSS('opacity','1');
     await expect(nativePage.locator('#toggle-search')).toBeEnabled();
    }
    for(const theme of ['母版']){await page.screenshot({path:`docs/qa/backend/${role}-${size}-${theme}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${role} ${size} overflow`);}
   }
   if(role==='student'){
    await page.goto(`${origin}/workspace/student/personal/action-2`);const nameEditor=workspace.locator('[data-profile-field="fullName"]');await nameEditor.getByRole('button',{name:'编辑姓名',exact:true}).click();await nameEditor.getByRole('textbox',{name:'姓名',exact:true}).fill('林晓屿');await nameEditor.getByRole('button',{name:'确认',exact:true}).click();await expect(nameEditor.getByRole('textbox')).toHaveCount(0);await expect(nameEditor.locator('code')).toHaveText('林晓屿');await expect(workspace.locator('[data-dorma-profile-editor]').getByRole('status')).toHaveCount(0);
    await page.reload();await expect(nameEditor.locator('code')).toHaveText('林晓屿');assert.equal(await workspace.locator('[data-dorma-live-workspace]').getByRole('alert').count(),0);
   }
   const me=await (await page.request.get(origin+'/api/v1/auth/me')).json();
   await page.goto(origin);await page.mouse.move(0,500);
   await expect(homePage.locator('.page')).toHaveClass(/is-ready/,{timeout:60000});
   await expect(homePage.locator('#site-header')).toHaveCSS('opacity','1',{timeout:15000});
   // The source template puts navigation inside the menu on narrow screens.
   if(page.viewportSize()!.width<900)await homePage.locator('#toggle-site-menu').click();
   await expect(accountButton.locator('[data-dorma-account-name]')).toHaveText(me.data.displayName);
   await expect(accountButton.locator('[data-dorma-account-name]')).toBeVisible();
   // Slow identity checks must leave the current page visible, without a
   // document reload or a rendered /workspace intermediary.
   let releaseEntry!:()=>void;
   const entryGate=new Promise<void>(resolve=>{releaseEntry=resolve;});
   await page.route('**/api/v1/auth/me',async route=>{await entryGate;await route.continue();});
   let releaseWorkspace!:()=>void;
   const workspaceGate=new Promise<void>(resolve=>{releaseWorkspace=resolve;});
   const workspaceDocument='**/assets/student/index.html?entry=docs';
   if(role==='student')await page.route(workspaceDocument,async route=>{await workspaceGate;await route.continue();});
   const documents:string[]=[];
   const trackDocument=(request:import('@playwright/test').Request)=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents.push(request.url());};
   page.on('request',trackDocument);
   await homePage.locator('#site-menu a[data-id="docs"]').click();
   await page.waitForTimeout(300);
   await expect(page.locator('[data-dorma-home-frame]')).toBeVisible();
   await expect(page.getByText('正在进入工作台…',{exact:true})).toHaveCount(0);
   await expect(page.getByText('正在确认身份…',{exact:true})).toHaveCount(0);
   releaseEntry();
   await page.waitForURL(origin+workspacePath(role));
   if(role==='student'){
    await expect(page.locator('[data-dorma-entry-cover] [data-dorma-home-frame]')).toBeVisible();
    await expect(page.getByText('正在确认身份…',{exact:true})).toHaveCount(0);
    releaseWorkspace();
    await expect(page.frameLocator('[data-dorma-student-frame]').locator('[data-student-module-links] a')).toHaveCount(6);
    await expect(page.locator('[data-dorma-entry-cover]')).toHaveCount(0);
    await page.unroute(workspaceDocument);
   }
   await page.unroute('**/api/v1/auth/me');page.off('request',trackDocument);
   assert.deepEqual(documents,[],`${role} Docs should use client navigation`);
   await page.goto(origin);
   await expect(homePage.locator('#site-header')).toHaveCSS('opacity','1',{timeout:15000});
   if(page.viewportSize()!.width<900)await homePage.locator('#toggle-site-menu').click();
   await accountButton.hover();await expect(accountButton.locator('[data-dorma-account-action]')).toHaveText('退出登录');
   await expect(accountButton.locator('[data-dorma-account-action]')).toBeVisible();
   await page.screenshot({path:`docs/qa/backend/${role}-home-account.png`,fullPage:false});
   await accountButton.click();await page.mouse.move(0,500);
   await expect(accountButton.locator('[data-dorma-account-name]')).toHaveText('未登录');
   assert.equal((await page.request.get(origin+'/api/v1/auth/me')).status(),401);
   await page.goto(`${origin}/workspace/${role}/${first.id}/action-1`);await expect(page).toHaveURL(origin+'/login');await expect(page.locator('[data-dorma-login-frame]')).toBeVisible();
   await context.close();
  }
  // 首页在真实会话退出后的公共页面仍保持可访问。
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'admin',password}});
   assert.equal(response.status(),200);const loggedIn=await response.json();
   // Inspect the copied document directly; /login itself redirects active sessions.
   const page=await context.newPage();await page.goto(origin+'/assets/login/index.html');
   const account=page.locator('[data-dorma-account]');
   await expect(account.locator('[data-dorma-account-name]')).toHaveText(loggedIn.data.displayName);
   if(width<900)await page.locator('#toggle-site-menu').click();
   await account.hover();await expect(account.locator('[data-dorma-account-action]')).toHaveText('退出登录');
   await expect(account.locator('[data-dorma-account-action]')).toHaveCSS('opacity','1');
   await account.click();await expect(account.locator('[data-dorma-account-name]')).toHaveText('未登录');
   assert.equal((await context.request.get(origin+'/api/v1/auth/me')).status(),401);
   await page.reload();await expect(account.locator('[data-dorma-account-name]')).toHaveText('未登录');
   await context.close();
  }
  await studentDocsRegression(browser,origin,password);
  await managerShellRegression(browser,origin,password);
  await managerPersonalRegression(browser,origin,password);
  await managerNotificationRegression(browser,origin,password);
  await managerAccommodationRegression(browser,origin,password);
  await managerBedsRegression(browser,origin,password);
  await managerRepairRegression(browser,origin,password);
  await managerBaseDataRegression(browser,origin,password);
  await managerBillingRegression(browser,origin,password);
  await adminShellRegression(browser,origin,password);
  await adminPersonalRegression(browser,origin,password);
  await maintenanceShellRegression(browser,origin,password);
  await maintenancePersonalRegression(browser,origin,password);
  await maintenanceNotificationRegression(browser,origin,password);
  await maintenanceRecordRegression(browser,origin,password);
  await maintenanceOrderRegression(browser,origin,password);
  await maintenanceProcessingRegression(browser,origin,password);
  await maintenanceAnalyticsRegression(browser,origin,password);
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();await page.goto(origin);await page.screenshot({path:'docs/qa/backend/home-mobile.png',fullPage:false});await context.close();
  assert.deepEqual(errors,[]);console.log(`浏览器回归通过：${visited} 个页面、四类真实登录退出、桌面/手机、浅深主题和刷新持久化。`);
 }finally{await browser.close();}
}
