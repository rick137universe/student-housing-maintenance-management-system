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

export async function browserRegression(origin:string,password:string){
 await verifyLoginTemplate();
 await verifyHomeTemplate();
 await verifyStudentTemplate();
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors:string[]=[];let visited=0;
 await mkdir('docs/qa/backend',{recursive:true});
 try{
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
   await page.waitForURL(origin+workspacePath(role));const workspace=role==='student'?page.frameLocator('[data-dorma-student-frame]'):page;
   if(role==='student')await expect(workspace.locator('[data-student-module-links] a')).toHaveCount(6);
   else await workspace.locator('[data-dorma-live-workspace]').waitFor();
   await page.goto(origin+'/login');await page.waitForURL('**/workspace/**');
   for(const feature of roleFeatures[role])for(const action of feature.actions){
    await page.goto(`${origin}/workspace/${role}/${feature.id}/${action.id}`);
    await workspace.locator('[data-dorma-live-workspace]').waitFor();
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
    for(const theme of role==='student'?['母版']:['浅色','深色']){if(role!=='student')await workspace.getByRole('button',{name:theme,exact:true}).click();await page.screenshot({path:`docs/qa/backend/${role}-${size}-${theme}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${role} ${size} overflow`);}
   }
   if(role==='student'){
    await page.goto(`${origin}/workspace/student/personal/action-2`);const nameEditor=workspace.locator('[data-profile-field="fullName"]');await nameEditor.getByRole('button',{name:'编辑姓名',exact:true}).click();await nameEditor.getByRole('textbox',{name:'姓名',exact:true}).fill('林晓屿');await nameEditor.getByRole('button',{name:'确认',exact:true}).click();await workspace.getByText('操作已保存。',{exact:true}).waitFor();
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
   const documents:string[]=[];
   const trackDocument=(request:import('@playwright/test').Request)=>{if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents.push(request.url());};
   page.on('request',trackDocument);
   await homePage.locator('#site-menu a[data-id="docs"]').click();
   await page.waitForTimeout(300);
   await expect(page.locator('[data-dorma-home-frame]')).toBeVisible();
   await expect(page.getByText('正在进入工作台…',{exact:true})).toHaveCount(0);
   releaseEntry();
   await page.waitForURL(origin+workspacePath(role));
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
   await page.goto(`${origin}/workspace/${role}/${first.id}/action-1`);await page.getByRole('heading',{name:'需要先登录。'}).waitFor();
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
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();await page.goto(origin);await page.screenshot({path:'docs/qa/backend/home-mobile.png',fullPage:false});await context.close();
  assert.deepEqual(errors,[]);console.log(`浏览器回归通过：${visited} 个页面、四类真实登录退出、桌面/手机、浅深主题和刷新持久化。`);
 }finally{await browser.close();}
}
