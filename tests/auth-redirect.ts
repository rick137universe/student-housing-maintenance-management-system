import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';
import {roleFeatures} from '../src/data/role-features';
import {workspacePath} from '../src/utils/workspace-route';
import type {RoleId} from '../src/types/auth';

export async function authRedirectRegression(browser:Browser,origin:string,password:string){
 for(const [role,username] of [['student','stu202602341'],['dormManager','dm0301'],['maintenance','mt008'],['admin','admin']] as [RoleId,string][]){
  const context=await browser.newContext(),page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const first=roleFeatures[role][0],entry=`/workspace/${role}/${first.id}/action-1`,loginFrame=page.locator('[data-dorma-login-frame]');
  const ready=()=>role==='student'?page.frameLocator('[data-dorma-student-frame]').locator('[data-student-module-links]'):role==='dormManager'?page.frameLocator('[data-dorma-manager-frame]').locator('[data-dorma-live-workspace]'):page.locator('[data-dorma-live-workspace]');
  async function login(){const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username,password}});assert.equal(response.status(),200);return (await response.json()).data;}
  try{
   // Both module roots and direct feature/detail addresses must skip the old interstitial.
   for(const path of ['/workspace/'+role,entry+'?record=1']){
    await page.goto(origin+path);await expect(page).toHaveURL(origin+'/login');await expect(loginFrame).toBeVisible();await expect(page.getByText('需要先登录。',{exact:true})).toHaveCount(0);
   }
   await context.addCookies([{name:'dorma_session',value:'invalid-session',url:origin}]);await page.goto(origin+entry);await expect(page).toHaveURL(origin+'/login');await expect(loginFrame).toBeVisible();
   await context.clearCookies();await page.goto(origin);await page.goto(origin+entry);await expect(page).toHaveURL(origin+'/login');await page.goBack();await expect(page).toHaveURL(origin+'/');
   const account=await login();await page.goto(origin+workspacePath(role));await expect(ready()).toBeVisible();
   // Revoke a real session outside this page, then let the normal auth refresh discover it.
   const logout=await context.request.post(origin+'/api/v1/auth/logout',{headers:{Origin:origin,'X-CSRF-Token':account.csrfToken},data:{}});assert.equal(logout.status(),200);
   await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page).toHaveURL(origin+'/login');await expect(loginFrame).toBeVisible();await expect(page.getByText('需要先登录。',{exact:true})).toHaveCount(0);
   await login();await page.goto(origin+workspacePath(role));await expect(ready()).toBeVisible();
   const deniedRole=role==='student'?'dormManager':'student';await page.goto(origin+'/workspace/'+deniedRole+'/'+roleFeatures[deniedRole][0].id+'/action-1');await expect(page.getByRole('heading',{name:'当前身份无权访问。'})).toBeVisible();await expect(loginFrame).toHaveCount(0);
   await page.goto(origin+workspacePath(role));await expect(ready()).toBeVisible();
   if(role==='student'||role==='dormManager')await page.frameLocator(role==='student'?'[data-dorma-student-frame]':'[data-dorma-manager-frame]').locator('[data-dorma-account]').click();
   else await page.getByRole('button',{name:'退出登录',exact:true}).click();
   await expect(page).toHaveURL(origin+'/');
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 }
 console.log('登录跳转通过：四类角色未登录/无效会话直达、模块及详情入口、返回历史、真实会话失效、重新登录、已登录角色权限及主动退出。');
}
