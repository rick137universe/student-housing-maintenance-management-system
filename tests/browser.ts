import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {roleFeatures} from '../src/data/role-features';
import type {RoleId} from '../src/types/auth';

export async function browserRegression(origin:string,password:string){
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors:string[]=[];let visited=0;
 await mkdir('docs/qa/backend',{recursive:true});
 try{
  for(const [role,username] of [['student','stu202602341'],['dormManager','dm0301'],['maintenance','mt008'],['admin','admin']] as [RoleId,string][]){
   const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin);
   const accountButton=page.locator('[data-dorma-account]');
   await expect(page.locator('#site-header')).toHaveCSS('opacity','1');
   await expect(accountButton.locator('.dorma-account-label')).toHaveCSS('display','grid');
   await expect(accountButton.locator('[data-dorma-account-name]')).toHaveText('未登录');
   await accountButton.hover();await expect(accountButton.locator('[data-dorma-account-action]')).toBeVisible();
   await expect(accountButton.locator('[data-dorma-account-action]')).toHaveText('前往登录');
   await expect(accountButton.locator('[data-dorma-account-name]')).toBeHidden();
   await accountButton.focus();await page.keyboard.press('Enter');
   await page.waitForURL(origin+'/login');
   await page.locator('#login-title').waitFor();
   await expect(page.locator('[data-dorma-login] .login-header')).toHaveCSS('opacity','1');
   if(role==='student'){
    await page.getByRole('button',{name:'学生',exact:true}).click();
    await expect(page.getByLabel('账号',{exact:true})).toHaveValue(username);
    await expect(page.getByLabel('密码',{exact:true})).toHaveValue('');
    await page.getByLabel('密码',{exact:true}).fill('WrongPassword2026');
    await page.getByRole('button',{name:'显示密码',exact:true}).click();
    await expect(page.getByLabel('密码',{exact:true})).toHaveAttribute('type','text');
    await page.getByRole('button',{name:'隐藏密码',exact:true}).click();
    await page.getByRole('button',{name:'登录工作台',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.equal(new URL(page.url()).pathname,'/login');
    await page.getByRole('button',{name:'学生',exact:true}).click();
    for(const [size,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
     await page.setViewportSize({width,height});
     for(const theme of ['light','dark'] as const){
      await page.emulateMedia({colorScheme:theme});
      await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
      await page.screenshot({path:`docs/qa/backend/login-${size}-${theme}.png`,fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'login overflow');
     }
    }
    await page.setViewportSize({width:1440,height:1000});
   }
   await page.getByLabel('账号',{exact:true}).fill(username);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录工作台',exact:true}).click();
   await page.waitForURL('**/workspace/**');await page.getByRole('button',{name:'刷新',exact:true}).waitFor();
   await page.goto(origin+'/login');await page.waitForURL('**/workspace/**');
   for(const feature of roleFeatures[role])for(const action of feature.actions){
    await page.goto(`${origin}/workspace/${role}/${feature.id}/${action.id}`);
    await page.getByRole('button',{name:'刷新',exact:true}).waitFor();
    await page.getByText('正在读取…',{exact:true}).waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-dorma-live-workspace]').getByRole('alert').count(),0,`${role}/${feature.id}/${action.id}`);visited++;
   }
   const first=roleFeatures[role][0];await page.goto(`${origin}/workspace/${role}/${first.id}/action-1`);await page.getByText('正在读取…',{exact:true}).waitFor({state:'hidden'});await page.getByRole('button',{name:'刷新',exact:true}).waitFor();
   for(const [size,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
    await page.setViewportSize({width,height});
    for(const theme of ['浅色','深色']){await page.getByRole('button',{name:theme,exact:true}).click();await page.screenshot({path:`docs/qa/backend/${role}-${size}-${theme}.png`,fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${role} ${size} overflow`);}
   }
   if(role==='student'){
    await page.goto(`${origin}/workspace/student/personal/action-2`);await page.getByRole('button',{name:'修改资料',exact:true}).click();await page.getByRole('dialog').getByLabel('姓名',{exact:true}).fill('林晓屿');await page.getByRole('dialog').getByRole('button',{name:'确认提交',exact:true}).click();await page.getByText('操作已保存。',{exact:true}).waitFor();
    await page.reload();await page.getByRole('button',{name:'修改资料',exact:true}).waitFor();assert.equal(await page.locator('[data-dorma-live-workspace]').getByRole('alert').count(),0);
   }
   const me=await (await page.request.get(origin+'/api/v1/auth/me')).json();
   await page.goto(origin);await page.mouse.move(0,500);
   // The source template puts navigation inside the menu on narrow screens.
   if(page.viewportSize()!.width<900)await page.getByRole('button',{name:'展开导航',exact:true}).click();
   await expect(accountButton.locator('[data-dorma-account-name]')).toHaveText(me.data.displayName);
   await expect(accountButton.locator('[data-dorma-account-name]')).toBeVisible();
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
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();await page.goto(origin);await page.screenshot({path:'docs/qa/backend/home-mobile.png',fullPage:false});await context.close();
  assert.deepEqual(errors,[]);console.log(`浏览器回归通过：${visited} 个页面、四类真实登录退出、桌面/手机、浅深主题和刷新持久化。`);
 }finally{await browser.close();}
}
