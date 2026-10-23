import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';

export async function adminRepairProcessRegression(browser:Browser,origin:string,password:string){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 const login=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'admin',password}});assert.equal(login.status(),200);
 const token=(await login.json()).data.csrfToken,base='/workspace/admin/process/repair',frame=page.frameLocator('[data-dorma-admin-frame]');
 const values=frame.locator('[data-dorma-process-values]'),editor=frame.locator('[data-dorma-admin-process-editor]'),next=frame.locator('#docs-info .next-link a');
 const settings=async()=>{const response=await context.request.get(origin+'/api/v1/settings?key=repair');assert.equal(response.status(),200);return (await response.json()).data[0].setting_value as {autoReview:boolean};};
 const original=await settings();
 async function choose(value:string){const field=editor.locator('[data-profile-field="autoReview"]');await field.locator('.code-edit-button').click();await field.locator('select').selectOption(value);await expect(next).toHaveAttribute('aria-disabled','true');await field.getByRole('button',{name:'确认',exact:true}).click();}
 try{
  await page.goto(origin+'/workspace/admin/process');await frame.locator('#docs-info a[title="报修流程"]').click();await expect(page).toHaveURL(origin+base);
  await expect(values).toContainText('自动通过报修初审');await expect(values).toContainText('关闭（由宿管人工初审）');
  await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id','admin-process-repair');await expect(frame.locator('.docs-demo.is-active .dotted-grid')).toHaveCount(1);
  await next.click();await expect(page).toHaveURL(origin+base+'/edit');await expect(editor).toContainText('现有工单保持原状态');await choose('true');
  await page.route('**/api/v1/settings/repair',route=>route.fulfill({status:503,json:{error:{message:'规则保存失败，请重试。'}}}));await next.click();await expect(editor.getByRole('alert')).toHaveText('规则保存失败，请重试。');assert.equal((await settings()).autoReview,false);await page.unroute('**/api/v1/settings/repair');
  await next.click();await expect(page).toHaveURL(origin+base);await expect(values).toContainText('开启（系统自动通过初审，直接进入待派工）');assert.equal((await settings()).autoReview,true);
  await page.reload();await expect(values).toContainText('开启（系统自动通过初审，直接进入待派工）');
  await page.setViewportSize({width:390,height:844});await next.click();await expect(editor).toBeVisible();assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'temp/admin-repair-process-mobile.png'});
  await choose('false');await next.click();await expect(values).toContainText('关闭（由宿管人工初审）');assert.equal((await settings()).autoReview,false);
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'temp/admin-repair-process-desktop.png'});assert.deepEqual(errors,[]);
  console.log('报修流程浏览器验证通过：入口、专属预览、启用/关闭、保存失败、刷新持久化和手机布局。');
 }finally{await context.request.patch(origin+'/api/v1/settings/repair',{headers:{Origin:origin,'X-CSRF-Token':token},data:original});await context.close();}
}
