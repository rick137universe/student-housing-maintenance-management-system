import assert from 'node:assert/strict';
import {expect,type Browser,type BrowserContext} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;
// Real applications, allocations, transfers and checkouts run only in the disposable test database.
export async function managerAccommodationRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext(),owner=await browser.newContext({viewport:{width:1440,height:1000}}),student=await browser.newContext(),other=await browser.newContext();
 const accounts=new Map<BrowserContext,Row>(),page=await owner.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 async function call(context:BrowserContext,path:string,body?:object,method=body?'POST':'GET',expected=200){
  const response=await context.request.fetch(origin+'/api/v1/'+path,{method,headers:{Origin:origin,'X-CSRF-Token':String(accounts.get(context)?.csrfToken??'')},...(body?{data:body}:{})});const result=await response.json();assert.equal(response.status(),expected,JSON.stringify(result));return result.data;
 }
 async function login(context:BrowserContext,username:string){const account=await call(context,'auth/login',{username,password});accounts.set(context,account);return account;}
 const selector='[data-dorma-manager-frame]',frame=page.frameLocator(selector),base='/workspace/dormManager/accommodation/';
 const list=frame.locator('[data-dorma-accommodation-list]'),values=frame.locator('[data-dorma-accommodation-values]'),editor=frame.locator('[data-dorma-review-editor]');
 const code=(label:string)=>values.getByRole('heading',{name:label,exact:true}).locator('+ pre > code');
 const send=frame.getByRole('button',{name:'提交审核',exact:true});
 async function choose(key:string,value:string){const field=editor.locator(`[data-profile-field="${key}"]`);await field.getByRole('button',{name:/^编辑/}).click();await field.getByRole('combobox').selectOption(value);await field.getByRole('button',{name:'确认',exact:true}).click();await expect(field.getByRole('combobox')).toHaveCount(0);}
 async function note(value:string){const field=editor.locator('[data-profile-field="note"]');await field.getByRole('button',{name:'编辑审核意见',exact:true}).click();await field.getByRole('textbox').fill(value);await field.getByRole('textbox').press('Control+Enter');await expect(field.getByRole('textbox')).toHaveCount(0);}
 async function open(action:number,id:string,review=false){await page.goto(origin+base+`action-${action}?record=${id}`+(review?'&review=1':''));await expect(frame.locator('#toggle-search')).toBeEnabled();await expect(frame.locator('[data-dorma-manager-accommodation]')).toHaveAttribute('aria-busy','false');await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');}
 async function review(action:number,id:string){await open(action,id);await expect(code('审核状态')).toHaveText('待审核');await frame.locator('#docs-info .next-link a').click();await expect(editor).toBeVisible();await expect(send).toBeVisible();await expectStudentBreadcrumbSpacing(page,selector);}
 try{
  await login(admin,'admin');const suffix=Date.now(),username='dmStay'+suffix,number='MS'+suffix;
  const created=await call(admin,'accounts',{username,fullName:'住宿事务回归宿管',role:'dormManager',password});await login(owner,username);
  await call(admin,'students',{student_number:number,full_name:'住宿事务回归学生',gender:'male',college:'计算机学院',grade:'2026',password});await login(student,'stu'+number);
  for(const room of [{room_id:'NY3-901',room_status:'available'},{room_id:'NY3-902',room_status:'maintenance'}])await call(admin,'rooms',{...room,building_id:'NY3',floor_number:1,room_type:'双人间',bed_capacity:2});
  for(const bed of [{bed_id:'NY3-901-01',room_id:'NY3-901',bed_number:'01',bed_status:'available'},{bed_id:'NY3-901-02',room_id:'NY3-901',bed_number:'02',bed_status:'available'},{bed_id:'NY3-902-01',room_id:'NY3-902',bed_number:'01',bed_status:'available'}])await call(admin,'beds',bed);
  for(const action of [2,3]){await page.goto(origin+base+'action-'+action);await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');}
  await call(admin,'authorizations',{accountId:created.accountId,buildingId:'NY3'});
  let application=await call(student,'applications',{preferredBuildingId:'NY3',expectedDate:'2027-01-10',note:'入住说明\n第二行 <b>纯文本</b>'});
  await call(student,`applications/${application.application_id}/beds`,undefined,'GET',403);
  const candidates=await call(owner,`applications/${application.application_id}/beds`) as Row[];
  assert(candidates.some(bed=>bed.bed_id==='NY3-901-01'));assert(candidates.every(bed=>String(bed.bed_id).startsWith('NY3-')&&bed.room_id!=='NY3-902'));
  assert.equal((await call(owner,`applications/${application.application_id}/beds?limit=1&page=2`) as Row[]).length,1);
  await page.goto(origin+base+'action-1');const target=list.locator(`a[href$="record=${application.application_id}"]`);
  await expect(target).toHaveText(`住宿事务回归学生 · ${number} · 入住 · — · — · 待审核`);await expect(target).toHaveClass(/color-corail/);
  await expect(frame.locator('[data-dorma-manager-accommodation] table, [data-dorma-manager-accommodation] input, dialog, [data-dorma-manager-business-host]')).toHaveCount(0);
  await expectStudentReveal(page,()=>target.click(),'入住申请详情',selector);await expectStudentBreadcrumbSpacing(page,selector);await expect(code('申请说明')).toHaveText('入住说明\n第二行 <b>纯文本</b>');await expect(values.locator('b')).toHaveCount(0);
  await expect(values.locator('.copy-button')).toHaveCount(await values.locator('h3').count());await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base+'action-1');await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
  await page.screenshot({path:'docs/qa/backend/manager-accommodation-detail.png'});
  await expectStudentReveal(page,()=>frame.locator('#docs-info .next-link a').click(),'入住审核与分配',selector);await expect(send).toBeVisible();await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base+'action-1?record='+application.application_id);
  await send.click();await expect(editor.getByRole('alert')).toHaveText('请先选择并确认审核结果。');await expect(editor.getByRole('alert')).toHaveClass('notice warning');
  const decision=editor.locator('[data-profile-field="decision"]');await decision.getByRole('button',{name:'编辑审核结果',exact:true}).click();await decision.getByRole('combobox').selectOption('reject');await decision.getByRole('button',{name:'取消',exact:true}).click();await expect(decision.locator('code')).toHaveText('—');
  await choose('decision','reject');await send.click();await expect(editor.getByRole('alert')).toHaveText('驳回申请时，请填写并确认审核意见。');await expect(editor.locator('[data-profile-field="bedId"]')).toHaveCount(0);
  await note('申请资料不全，请补充。');await send.focus();await page.keyboard.press('Space');await expect(code('审核状态')).toHaveText('已驳回');await expect(code('审核意见')).toHaveText('申请资料不全，请补充。');await expect(frame.locator('#docs-info .next-link a')).toHaveCount(0);
  assert.equal((await call(student,'profile')).occupancies.length,0);await call(owner,`applications/${application.application_id}/beds`,undefined,'GET',409);
  await open(1,String(application.application_id),true);await expect(frame.locator('.notice.info')).toHaveText('该申请已审核，请返回详情查看办理结果。');await expect(send).toHaveCount(0);
  application=await call(student,'applications',{preferredBuildingId:'NY3',note:'重新提交入住申请'});await review(1,String(application.application_id));await choose('decision','approve');
  await expect(editor.locator('[data-profile-field="bedId"] .code-edit-button')).toBeEnabled();await choose('bedId','NY3-901-01');await note('通过并指定床位');
  await page.screenshot({path:'docs/qa/backend/manager-accommodation-review.png'});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/qa/backend/manager-accommodation-review-mobile.png'});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await expect(page.locator('html')).toHaveCSS('overflow-y','hidden');await page.setViewportSize({width:1440,height:1000});
  await send.click();await expect(code('审核状态')).toHaveText('已完成');await expect(code('新床位')).toHaveText('NY3-901-01');assert.equal((await call(student,'profile')).occupancies.find((row:Row)=>!row.check_out_date).bed_id,'NY3-901-01');
  await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);await page.reload();await expect(code('新床位')).toHaveText('NY3-901-01');
  let change=await call(student,'changes',{type:'transfer',preferredBuildingId:'NY3',note:'申请调宿'});await review(2,String(change.change_id));await choose('decision','reject');await note('调宿理由不充分');await send.click();await expect(code('审核状态')).toHaveText('已驳回');
  change=await call(student,'changes',{type:'transfer',preferredBuildingId:'NY3'});await review(2,String(change.change_id));await choose('decision','approve');await choose('bedId','NY3-901-02');
  await call(admin,'beds/NY3-901-02',{bed_status:'maintenance'},'PATCH');await send.click();await expect(editor.getByRole('alert')).toHaveClass('notice warning');assert.equal((await call(student,'profile')).occupancies.find((row:Row)=>!row.check_out_date).bed_id,'NY3-901-01');
  await call(admin,'beds/NY3-901-02',{bed_status:'available'},'PATCH');await page.reload();await expect(send).toBeVisible();await choose('decision','approve');await choose('bedId','NY3-901-02');await send.click();await expect(code('审核状态')).toHaveText('已完成');await expect(code('原床位')).toHaveText('NY3-901-01');await expect(code('新床位')).toHaveText('NY3-901-02');
  const stays=(await call(student,'profile')).occupancies as Row[];assert(stays.find(row=>row.bed_id==='NY3-901-01')!.check_out_date);assert(stays.some(row=>row.bed_id==='NY3-901-02'&&!row.check_out_date));
  await open(3,String(change.change_id));await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(values).toHaveCount(0);
  change=await call(student,'changes',{type:'checkout',note:'退宿测试'});await review(3,String(change.change_id));await choose('decision','reject');await note('退宿资料不全');await send.click();await expect(code('审核状态')).toHaveText('已驳回');
  change=await call(student,'changes',{type:'checkout'});await review(3,String(change.change_id));await choose('decision','approve');await expect(editor.locator('[data-profile-field="bedId"]')).toHaveCount(0);await send.click();await expect(code('审核状态')).toHaveText('已完成');await expect(code('新床位')).toHaveText('—');assert(!(await call(student,'profile')).occupancies.some((row:Row)=>!row.check_out_date));assert.equal((await call(admin,'beds/NY3-901-02')).bed_status,'available');
  const otherNumber='MF'+suffix;await call(admin,'students',{student_number:otherNumber,full_name:'候选床位范围回归',gender:'female',college:'计算机学院',grade:'2026',password});await login(other,'stu'+otherNumber);
  const mismatch=await call(other,'applications',{preferredBuildingId:'NY3'});assert.deepEqual(await call(owner,`applications/${mismatch.application_id}/beds`),[]);await call(owner,`applications/${mismatch.application_id}/review`,{decision:'reject',note:'楼栋性别不符'});
  const foreign=await call(other,'applications',{preferredBuildingId:'BY4'});await call(owner,`applications/${foreign.application_id}/beds`,undefined,'GET',404);await open(1,String(foreign.application_id));await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(values).toHaveCount(0);await call(owner,`applications/${foreign.application_id}/review`,{decision:'approve'},'POST',403);
  const automatic=await call(student,'applications',{preferredBuildingId:'NY3'});await review(1,String(automatic.application_id));await choose('decision','approve');await send.click();await expect(code('审核状态')).toHaveText('已完成');assert.equal((await call(student,'profile')).occupancies.find((row:Row)=>!row.check_out_date).allocation_method,'automatic');
  const release=await call(student,'changes',{type:'checkout'});await call(owner,`changes/${release.change_id}/review`,{decision:'approve'});
  for(let index=0;index<20;index++){const item=await call(student,'applications',{preferredBuildingId:'NY3'});await call(owner,`applications/${item.application_id}/review`,{decision:'reject',note:'分页测试'});}
  await page.goto(origin+base+'action-1');await expect(list.locator('a')).toHaveCount(20);await frame.getByRole('button',{name:'下一页',exact:true}).click();await expect(page).toHaveURL(origin+base+'action-1?page=2');await expect(list.locator('a').first()).toBeVisible();await list.locator('a').first().click();await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base+'action-1?page=2');await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+base+'action-1?page=2');await page.goBack();await expect(values).toBeVisible();await page.goForward();await expect(list).toBeVisible();
  await page.route(/\/api\/v1\/changes\?/,route=>route.fulfill({status:503,json:{error:{message:'申请记录读取失败，请重试。'}}}));await page.goto(origin+base+'action-2');await expect(frame.getByRole('alert')).toHaveClass('notice warning');await page.unroute(/\/api\/v1\/changes\?/);
  for(const id of ['invalid','0','9999999999999999999']){await open(1,id);await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(send).toHaveCount(0);}
  assert.deepEqual(errors,[]);console.log('宿管住宿事务通过：三类导航/详情/可编辑审核、真实通过/驳回、手动及自动分床、调宿退宿事务、候选性别/房态/授权/分页、占用冲突、INFO/WARNING、复制/渐显/间距、刷新返回及手机布局。');
 }finally{await owner.close();await student.close();await other.close();await admin.close();}
}
