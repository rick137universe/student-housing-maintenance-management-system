import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';
import {maintenancePages} from '../src/data/maintenance-pages';
import {studentPasswordEditorRegression} from './student-password-editor';

// Creates a dedicated technician only in the disposable integration database.
export async function maintenancePersonalRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext(),context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 try{
  const adminLogin=await admin.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'admin',password}});assert.equal(adminLogin.status(),200);
  const administrator=(await adminLogin.json()).data,username='mtUi'+Date.now();
  const created=await admin.request.post(origin+'/api/v1/accounts',{headers:{Origin:origin,'X-CSRF-Token':administrator.csrfToken},data:{username,fullName:'维修资料回归',role:'maintenance',password,phone:'13800001234'}});assert.equal(created.status(),200);
  assert.equal((await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username,password}})).status(),200);
  const base=origin+'/workspace/maintenance/personal',frame=page.frameLocator('[data-dorma-maintenance-frame]');
  const entries=maintenancePages.filter(entry=>entry.feature==='personal'&&entry.action!=='overview');
  async function open(action:string){
   await page.goto(base+'/'+action);await expect(frame.locator('#toggle-search')).toBeEnabled();await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');
   await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText('个人中心');
   await expect(frame.locator('[data-dorma-maintenance-business-host]')).toHaveCount(0);await expect(frame.locator('dialog')).toHaveCount(0);
   await expect(page.locator('html')).toHaveCSS('overflow-y','hidden');
  }
  await open('action-1');await expect(frame.locator('[data-dorma-profile] h3')).toHaveText(['账号','姓名','角色','电话','邮箱']);
  await expect(frame.locator('[data-dorma-profile] code')).toHaveText([username,'维修资料回归','维修人员','13800001234','—']);
  await expect(frame.locator('[data-dorma-profile] .copy-button')).toHaveCount(5);await expect(frame.locator('[data-dorma-profile] table')).toHaveCount(0);
  await page.screenshot({path:'docs/qa/backend/maintenance-personal-view.png'});
  const next=frame.locator('#docs-info .next-link a');await expect(next).toHaveAttribute('href',entries[1].url);await next.click();await expect(page).toHaveURL(base+'/action-2');
  const editor=frame.locator('[data-dorma-profile-editor]'),name=editor.locator('[data-profile-field="fullName"]'),phone=editor.locator('[data-profile-field="phone"]'),email=editor.locator('[data-profile-field="email"]');
  await expect(editor.locator('.code-preview-title h2')).toHaveText(['姓名','联系电话','邮箱']);await expect(editor.locator('section[data-color="4"]')).toHaveCount(3);
  await name.getByRole('button',{name:'编辑姓名',exact:true}).click();await name.getByRole('textbox').fill('取消姓名');await name.getByRole('button',{name:'取消',exact:true}).click();await expect(name.locator('code')).toHaveText('维修资料回归');
  await name.getByRole('button',{name:'编辑姓名',exact:true}).click();await name.getByRole('textbox').fill('');await name.getByRole('button',{name:'确认',exact:true}).click();
  await expect(editor.getByRole('alert')).toHaveClass('notice warning');await expect(editor.getByRole('alert')).toHaveText('姓名不能为空。');
  await name.getByRole('textbox').fill('维修代码框');await name.getByRole('textbox').press('Enter');await expect(name.getByRole('textbox')).toHaveCount(0);await expect(frame.locator('[data-dorma-account-name]')).toHaveText('维修代码框');
  await phone.getByRole('button',{name:'编辑联系电话',exact:true}).click();await phone.getByRole('textbox').fill('13900004321');await phone.getByRole('textbox').press('Enter');await expect(phone.getByRole('textbox')).toHaveCount(0);
  await email.getByRole('button',{name:'编辑邮箱',exact:true}).click();await email.getByRole('textbox').fill('invalid-email');await email.getByRole('button',{name:'确认',exact:true}).click();await expect(editor.getByRole('alert')).toHaveClass('notice warning');
  await page.screenshot({path:'docs/qa/backend/maintenance-personal-warning.png'});
  await email.getByRole('textbox').fill('maintenance-editor@example.com');await email.getByRole('button',{name:'确认',exact:true}).click();await expect(email.getByRole('textbox')).toHaveCount(0);
  await expect(editor.getByRole('status')).toHaveCount(0);await expect(editor.getByRole('alert')).toHaveCount(0);
  await open('action-1');await expect(frame.locator('[data-dorma-profile] code')).toHaveText([username,'维修代码框','维修人员','13900004321','maintenance-editor@example.com']);
  const profile=/\/api\/v1\/profile(?:\?.*)?$/;
  await page.route(profile,async route=>route.request().method()==='GET'?route.fulfill({status:503,json:{error:{message:'资料读取失败，请重试。'}}}):route.continue());
  await page.reload();await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(frame.getByRole('alert')).toHaveText('资料读取失败，请重试。');await page.unroute(profile);
  await page.setViewportSize({width:390,height:844});await open('action-2');await expect(editor.locator('.copy-button')).toHaveCount(3);
  assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/maintenance-personal-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});await open('action-3');await expect(frame.locator('[data-dorma-password-editor] section[data-color="4"]')).toHaveCount(3);
  await studentPasswordEditorRegression(page,password,{frameSelector:'[data-dorma-maintenance-frame]',workspaceBase:'/workspace/maintenance'});
  assert.deepEqual(errors,[]);console.log('维修个人中心通过：本人代码框资料、复制、编辑确认/取消、真实保存与刷新、WARNING、原密码提前校验、真实改密撤销会话及手机布局。');
 }finally{await context.close();await admin.close();}
}
