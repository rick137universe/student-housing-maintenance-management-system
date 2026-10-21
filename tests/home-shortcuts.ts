import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';
import shortcuts from '../public/assets/home/shortcuts.json';
import {studentPages} from '../src/data/student-pages';
import {managerPages} from '../src/data/manager-pages';
import {maintenancePages} from '../src/data/maintenance-pages';
import {adminPages} from '../src/data/admin-pages';
import type {RoleId} from '../src/types/auth';

export function verifyHomeShortcuts(){
 const pages={student:studentPages,dormManager:managerPages,maintenance:maintenancePages,admin:adminPages};
 for(const role of Object.keys(shortcuts) as RoleId[]){
  assert.equal(shortcuts[role].length,12);
  assert.equal(new Set(shortcuts[role].map(entry=>entry.url)).size,12);
  for(const entry of shortcuts[role]){
   const page=pages[role].find(page=>page.url===entry.url);
   assert(page,`首页入口缺少实际页面：${entry.url}`);
   assert.equal(entry.label,page.label);
   assert.equal(entry.color,page.color,`首页入口与目标页主题色不一致：${entry.url}`);
   assert(!entry.url.includes('action-'));
  }
 }
}

export async function homeShortcutRegression(browser:Browser,origin:string,password:string){
 verifyHomeShortcuts();
 const guest=await browser.newContext();
 try{
  const page=await guest.newPage();await page.goto(origin);
  const frame=page.frameLocator('[data-dorma-home-frame]');
  await expect(frame.locator('[data-dorma-account-name]')).toHaveText('未登录');
  await frame.locator('#get-started a[data-dorma-entry]').nth(10).click();
  await expect(page).toHaveURL(origin+'/login');
 }finally{await guest.close();}
 for(const [role,username] of [['student','stu202602341'],['dormManager','dm0301'],['maintenance','mt008'],['admin','admin']] as [RoleId,string][]){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username,password}});
   assert.equal(response.status(),200);
   const {data:account}=await response.json();
   for(const index of [0,2,11]){
    await page.goto(origin);
    const frame=page.frameLocator('[data-dorma-home-frame]'),links=frame.locator('#get-started a[data-dorma-entry]');
    await expect(frame.locator('[data-dorma-account-name]')).toHaveText(account.displayName);
    await expect(links).toHaveCount(12);
    for(const [i,entry] of shortcuts[role].entries()){
     await expect(links.nth(i)).toHaveAttribute('href',entry.url);
     await expect(links.nth(i)).toHaveText(new RegExp(entry.label));
     await expect(links.nth(i)).toHaveAttribute('data-color',String(entry.color));
    }
    await links.nth(index).click();
    await expect(page).toHaveURL(origin+shortcuts[role][index].url);
    await expect(page.locator('[data-dorma-entry-cover]')).toHaveCount(0,{timeout:60000});
   }
   // Discover session expiry before offering role-specific navigation again.
   await page.goto(origin);
   assert.equal((await context.request.post(origin+'/api/v1/auth/logout',{headers:{Origin:origin,'X-CSRF-Token':account.csrfToken},data:{}})).status(),200);
   const frame=page.frameLocator('[data-dorma-home-frame]');
   await frame.locator('body').evaluate(()=>window.dispatchEvent(new Event('focus')));
   await expect(frame.locator('[data-dorma-account-name]')).toHaveText('未登录');
   await expect(frame.locator('#get-started a[data-dorma-entry]').first()).toHaveText(/学生工作台/);
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 }
 console.log('首页入口通过：48 个真实页面与模块颜色、未登录跳转、四端工作台/模块/子页面跳转及会话失效。');
}
