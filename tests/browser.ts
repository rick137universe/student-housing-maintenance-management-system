import {chromium} from '@playwright/test';
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
   await page.goto(origin);await page.locator('[data-dorma-entry]').first().click();
   const dialog=page.getByRole('dialog');await dialog.getByLabel('账号',{exact:true}).fill(username);await dialog.getByLabel('密码',{exact:true}).fill(password);await dialog.getByRole('button',{name:'登录工作台',exact:true}).click();
   await page.waitForURL('**/workspace/**');await page.getByRole('button',{name:'刷新',exact:true}).waitFor();
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
   await page.getByRole('button',{name:'退出登录',exact:true}).click();await page.waitForURL(origin+'/');
   await page.goto(`${origin}/workspace/${role}/${first.id}/action-1`);await page.getByRole('heading',{name:'需要先登录。'}).waitFor();
   await context.close();
  }
  // 首页在真实会话退出后的公共页面仍保持可访问。
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();await page.goto(origin);await page.screenshot({path:'docs/qa/backend/home-mobile.png',fullPage:false});await context.close();
  assert.deepEqual(errors,[]);console.log(`浏览器回归通过：${visited} 个页面、四类真实登录退出、桌面/手机、浅深主题和刷新持久化。`);
 }finally{await browser.close();}
}
