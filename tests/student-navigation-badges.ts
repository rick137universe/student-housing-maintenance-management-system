import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';
import {studentPages} from '../src/data/student-pages';
export async function studentNavigationBadgeRegression(browser:Browser,origin:string,password:string){
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 try{
  assert.equal((await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'stu202602341',password}})).status(),200);
  const page=await context.newPage();let active=true;
  const notice=(await (await context.request.get(origin+'/api/v1/announcements?limit=1')).json()).data[0];
  await page.goto(origin+'/workspace/student/announcements/notices?record='+notice.announcement_id);
  const detailFrame=page.frameLocator('[data-dorma-student-frame]');
  await expect(detailFrame.locator('[data-dorma-announcement-body]')).toBeVisible();
  await expect.poll(async()=>{
   const result=await (await context.request.get(origin+'/api/v1/announcements?fresh=true&limit=100')).json();
   return result.data.some((row:{announcement_id:string})=>row.announcement_id===notice.announcement_id);
  }).toBe(false);
  await page.route('**/api/v1/navigation',route=>route.fulfill({json:{data:[{feature:'payment',actions:['action-1','action-2'],active},{feature:'repair',actions:['action-3','action-3/submit'],active}]}}));
  await page.goto(origin+'/workspace/student');const frame=page.frameLocator('[data-dorma-student-frame]');
  const badge=(feature:string,action:string)=>frame.locator(`#docs-sidebar a[data-id="${studentPages.find(e=>e.feature===feature&&e.action===action)!.id}"] [data-student-new]`);
  await expect(badge('payment','overview')).toHaveCount(1);await expect(badge('payment','action-1')).toHaveCount(1);
  await expect(badge('repair','overview')).toHaveCount(1);await expect(badge('repair','action-3/submit')).toHaveCount(1);
  await expect(badge('payment','action-3')).toHaveCount(0);
  active=false;await page.evaluate(()=>window.dispatchEvent(new Event('dorma-navigation-refresh')));
  await expect(frame.locator('[data-student-new]')).toHaveCount(0);
  active=true;await page.evaluate(()=>window.dispatchEvent(new Event('dorma-business-saved')));await expect(badge('payment','overview')).toHaveCount(1);
  await page.setViewportSize({width:390,height:844});await expect(badge('payment','overview')).toHaveCount(1);
  console.log('导航 NEW：学生待缴/待评价、父目录聚合、操作后刷新与移动端通过。');
 }finally{await context.close();}
}

export async function navigationRoleRegression(browser:Browser,origin:string,password:string){
 for(const [role,username] of [['student','stu202602341'],['dormManager','dm0301'],['maintenance','mt008'],['admin','admin']]){
  const context=await browser.newContext();
  try{
   assert.equal((await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username,password}})).status(),200);
   const signals=(await (await context.request.get(origin+'/api/v1/navigation')).json()).data;
   const page=await context.newPage();await page.goto(origin+'/workspace/'+role);
   const frame=page.frameLocator('iframe[data-dorma-'+({dormManager:'manager'}[role as 'dormManager']??role)+'-frame]');
   for(const signal of signals.filter((s:{active:boolean})=>s.active))await expect(frame.locator(`#docs-sidebar a[href="/workspace/${role}/${signal.feature}"] .badge`)).toHaveCount(1);
   if(role==='student')await page.screenshot({path:'temp/navigation-student-expanded.png'});
  }finally{await context.close();}
 }
 console.log('四端真实导航标记与详情阅读确认通过。');
}
