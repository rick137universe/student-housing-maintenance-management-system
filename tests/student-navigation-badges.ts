import assert from 'node:assert/strict';
import {expect, type Browser} from '@playwright/test';
import {studentPages} from '../src/data/student-pages';

export async function studentNavigationBadgeRegression(browser:Browser, origin:string){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 let bills=1,reminders=1,messages=2,status=200;
 const entry=(feature:string,action:string)=>studentPages.find(entry=>entry.feature===feature&&entry.action===action)!;
 const link=(feature:string,action:string)=>page.locator(`#docs-sidebar a[data-id="${entry(feature,action).id}"]`);
 const badge=(feature:string,action:string)=>link(feature,action).locator('[data-student-new]');
 const refresh=async(event='dorma-notifications-saved')=>{await page.evaluate(event=>document.dispatchEvent(new Event(event)),event);};
 const check=async()=>{
  for(const [feature,action,visible] of [
   ['payment','overview',bills>0],['payment','action-1',bills>0],['payment','action-2',bills>0],
   ['announcements','overview',reminders>0],['announcements','action-2',reminders>0],
   ['notifications','overview',messages>0],['notifications','action-1',messages>0],
  ] as const)await expect(badge(feature,action)).toHaveCount(visible?1:0);
  for(const [feature,action] of [['payment','action-3'],['announcements','action-1'],['personal','overview']])await expect(badge(feature,action)).toHaveCount(0);
 };
 try{
  await page.route('**/api/v1/bills?*',route=>{
   const params=new URL(route.request().url()).searchParams;assert.equal(params.get('unpaid'),'true');assert.equal(params.get('limit'),'1');
   return route.fulfill({status,json:{data:bills?[{bill_id:'1'}]:[],meta:{total:bills}}});
  });
  await page.route('**/api/v1/notifications?*',route=>{
   const params=new URL(route.request().url()).searchParams;assert.equal(params.get('unread'),'true');assert.equal(params.get('limit'),'1');
   const total=params.get('type')==='payment-reminder'?reminders:messages;
   return route.fulfill({status,json:{data:total?[{notification_id:'1'}]:[],meta:{total}}});
  });
  await page.goto(origin+'/assets/student/index.html');await check();
  await link('payment','overview').click();
  await expect(page.locator('.docs-demo.is-active')).toHaveAttribute('data-id',entry('payment','overview').id);
  await expect(badge('payment','overview')).toHaveClass('badge');await expect(badge('payment','overview')).toBeVisible();
  bills=0;await refresh('dorma-finance-saved');await check();
  reminders=0;messages=1;await refresh();await check();
  messages=0;await refresh();await check();
  bills=1;messages=1;await refresh();await check();
  status=503;await refresh();await page.waitForTimeout(350);await check();
  status=200;bills=0;messages=0;await refresh();await check();
  bills=1;messages=1;await refresh();await check();
  status=401;bills=0;messages=0;await refresh();await check();
  await page.reload();await check();
  await page.setViewportSize({width:390,height:844});await check();
  assert.deepEqual(errors,[]);
  console.log('学生导航 NEW：账单与父目录、未读提醒与消息、缴清/已读更新、错误恢复、会话失效和去重通过。');
 }finally{await context.close();}
}
