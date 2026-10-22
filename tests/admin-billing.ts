import {formatDate} from '../src/utils/display-format';
import {formatCurrency} from '../src/utils/display-format';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {expect,type Browser,type BrowserContext} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;

// Runs against the integration harness's disposable database and real billing APIs.
export async function adminBillingRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext({viewport:{width:1440,height:1000}}),student=await browser.newContext(),page=await admin.newPage(),errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 const sessions=new Map<BrowserContext,string>();
 async function call(context:BrowserContext,path:string,body?:object,method='POST'){
  const response=body?await context.request.fetch(origin+'/api/v1/'+path,{method,headers:{Origin:origin,'X-CSRF-Token':sessions.get(context)??''},data:body}):await context.request.get(origin+'/api/v1/'+path);
  const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result.data;
 }
 async function login(context:BrowserContext,username:string){sessions.set(context,(await call(context,'auth/login',{username,password})).csrfToken);}
 const selector='[data-dorma-admin-frame]',frame=page.frameLocator(selector),base='/workspace/admin/billing/',generate=base+'generate',maintain=base+'manage',payments=base+'payments';
 const navigation=frame.locator('[data-dorma-admin-billing-navigation]'),list=frame.locator('[data-dorma-admin-billing-list]'),values=frame.locator('[data-dorma-finance-values]'),editor=frame.locator('[data-dorma-admin-billing-editor]'),previous=frame.locator('#docs-info .prev-link a'),next=frame.locator('#docs-info .next-link a');
 async function field(key:string,value:string,select=false){const section=editor.locator(`[data-profile-field="${key}"]`);await section.locator('.code-edit-button').click();const input=section.locator('input,select');await expect(input).toHaveCSS('outline-style','none');if(select)await input.selectOption(value);else await input.fill(value);await section.getByRole('button',{name:'确认',exact:true}).click();await expect(input).toHaveCount(0);}
 async function pay(id:string,amount='1.00'){return call(student,'bills/'+id+'/pay',{amount,result:'succeeded',idempotencyKey:randomUUID()});}
 try{
  await login(admin,'admin');await login(student,'stu202602341');
  await page.goto(origin+'/workspace/admin/personal/profile');await expect(frame.locator('[data-dorma-profile]')).toBeVisible();await frame.locator('#docs-sidebar a[title="账单管理"]').click();await frame.locator('#docs-sidebar a[href="'+generate+'"]').click();
  await expect(navigation.locator('a')).toHaveText(['生成月账单','账单记录']);await expect(navigation.locator('a').first()).toHaveCSS('text-decoration-line','none');await expect(next).toHaveAttribute('href',generate+'/submit');await expect(list).toHaveCount(0);
  await expectStudentReveal(page,()=>next.click(),'生成月账单',selector);await expect(page).toHaveURL(origin+generate+'/submit');await expect(previous).toHaveAttribute('href',generate);await expect(editor.locator('.code-preview-title h2')).toHaveText(['账期']);
  const periodField=editor.locator('[data-profile-field="period"]');await periodField.locator('.code-edit-button').click();await expect(periodField.getByLabel('账期',{exact:true})).toHaveAttribute('type','month');await periodField.getByLabel('账期',{exact:true}).fill('');await periodField.getByRole('button',{name:'确认',exact:true}).click();await expect(editor.getByRole('alert')).toHaveClass('notice warning');await periodField.getByRole('button',{name:'取消',exact:true}).click();
  await field('period','2051-02');await page.route('**/api/v1/bills/generate',route=>route.fulfill({status:503,json:{error:{message:'生成失败，请重试。'}}}));await next.click();await expect(editor.getByRole('alert')).toHaveText('生成失败，请重试。');await page.unroute('**/api/v1/bills/generate');
  await next.click();await expect(page).toHaveURL(origin+generate+'/records');const generated=await call(admin,'bills?period=2051-02&limit=100') as Row[];assert(generated.length>=3);await expect(list).toContainText(formatDate('2051-02'));
  await next.click();await expect(editor).toBeVisible();await field('period','2051-02');await next.click();await expect(list).toBeVisible();assert.equal((await call(admin,'bills?period=2051-02&limit=100')).length,generated.length);
  await list.locator('a').first().click();await expect(values.locator('h3')).toHaveCount(13);await expect(values.locator('.copy-button')).toHaveCount(13);await expect(frame.getByRole('link',{name:'维护账单',exact:true})).toHaveCount(0);await expect(previous).toHaveAttribute('href',generate+'/records');await expectStudentBreadcrumbSpacing(page,selector);
  await page.goto(origin+maintain);await expect(navigation.locator('a')).toHaveText(['新增账单','账单记录']);await next.click();await expect(page).toHaveURL(origin+maintain+'/submit');await expect(editor.locator('.code-preview-title h2')).toHaveText(['学生','账期','住宿费','水电费','缴费截止日期']);
  await expect(next).toHaveAttribute('aria-disabled','false');await next.click();await expect(editor.getByRole('alert')).toHaveText('请填写并确认学生。');await field('studentNumber','202602341',true);await field('period','2052-01');
  const accommodation=editor.locator('[data-profile-field="accommodationFee"]');await accommodation.locator('.code-edit-button').click();await accommodation.getByRole('textbox').fill('-1');await accommodation.getByRole('button',{name:'确认',exact:true}).click();await expect(editor.getByRole('alert')).toHaveClass('notice warning');await accommodation.getByRole('button',{name:'取消',exact:true}).click();
  await field('accommodationFee','12.30');await field('utilityFee','2.40');await field('dueDate','2052-01-28');
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/admin-billing-create-mobile.png'});await page.setViewportSize({width:1440,height:1000});
  await next.click();await expect(page).toHaveURL(origin+maintain+'/records');let rows=await call(admin,'bills?limit=100') as Row[];const created=rows.find(row=>row.billing_period==='2052-01'&&row.student_number==='202602341')!;assert(created);assert.equal(created.total_amount,'14.70');const id=String(created.bill_id),detail=origin+maintain+'/records?record='+id;
  const link=list.locator('a[href$="record='+id+'"]');await expectStudentReveal(page,()=>link.click(),'账单详情',selector);await expect(page).toHaveURL(detail);await expect(next).toHaveText('维护账单');await expect(values).toContainText(formatCurrency('14.70'));await page.screenshot({path:'docs/qa/backend/admin-billing-detail.png'});
  await next.click();await expect(editor).toBeVisible();await expect(previous).toHaveText('账单详情');await field('accommodationFee','16.20');await field('utilityFee','3.40');await next.click();await expect(page).toHaveURL(detail);assert.equal((await call(admin,'bills/'+id)).total_amount,'19.60');
  await next.click();await field('accommodationFee','18.20');await pay(id);await next.click();await expect(editor.getByRole('alert')).toHaveText('账单已发生缴费，不能修改费用，请返回详情后重新编辑。');assert.equal((await call(admin,'bills/'+id)).accommodation_fee,'16.20');
  await previous.click();await expect(page).toHaveURL(detail);await expect(editor).toHaveCount(0);await expect(next).toHaveText('维护账单');await next.click();await expect(editor.locator('.code-preview-title h2')).toHaveText(['缴费截止日期']);await field('dueDate','2052-02-28');await next.click();await expect(page).toHaveURL(detail);await expect(editor).toHaveCount(0);await expect(values).toBeVisible();assert.equal((await call(admin,'bills/'+id)).due_date,'2052-02-28');
  for(let index=0;index<21;index++){const bill=await call(admin,'bills',{studentNumber:'202602341',period:String(2060+index)+'-01',accommodationFee:'2.00',utilityFee:'0.00',dueDate:'2089-12-31'});await pay(String(bill.billId));}
  await page.goto(origin+maintain+'/records');rows=await call(admin,'bills?limit=100') as Row[];await expect(list.locator('a')).toHaveCount(20);await expect(frame.locator('[data-dorma-admin-billing] input,[data-dorma-admin-billing] table,dialog')).toHaveCount(0);await expect(list.locator('a').first()).toHaveCSS('text-decoration-line','none');
  await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(page).toHaveURL(origin+maintain+'/records?page=2');await list.locator('a').first().click();await expect(previous).toHaveAttribute('href',maintain+'/records?page=2');await previous.click();await expect(page).toHaveURL(origin+maintain+'/records?page=2');
  await page.goto(origin+payments);const flows=await call(admin,'payments?limit=100') as Row[];assert(flows.length>=22);await expect(list.locator('a')).toHaveCount(20);await list.locator('a').first().click();await expect(values.locator('h3')).toHaveText(['缴费编号','账单编号','学号','姓名','金额','缴费时间','缴费方式']);await expect(values.locator('.copy-button')).toHaveCount(7);await expect(previous).toHaveAttribute('href',payments);await expect(next).toHaveCount(0);await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/admin-payment-detail-mobile.png'});await page.setViewportSize({width:1440,height:1000});await page.reload();await expect(values.locator('h3')).toHaveCount(7);await previous.click();await expect(page).toHaveURL(origin+payments);await expect(list).toBeVisible();await page.goBack();await expect(values.locator('h3')).toHaveCount(7);
  for(const record of ['invalid','0','9999999999999999999']){await page.goto(origin+payments+'?record='+record);await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(values).toHaveCount(0);}
  await page.route(/\/api\/v1\/payments\?/,route=>route.fulfill({json:{data:[],meta:{page:1,limit:20,total:0}}}));await page.goto(origin+payments);await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');await page.unroute(/\/api\/v1\/payments\?/);
  await page.route(/\/api\/v1\/bills\?/,route=>route.fulfill({status:503,json:{error:{message:'账单读取失败，请重试。'}}}));await page.goto(origin+maintain+'/records');await expect(frame.getByRole('alert')).toHaveText('账单读取失败，请重试。');await page.unroute(/\/api\/v1\/bills\?/);
  assert.deepEqual(errors,[]);console.log('管理员账单通过：生成/维护三级目录、月账单生成及重复提交、真实新增与费用维护、缴费后费用保护及截止日期维护、流水详情、分页/返回/刷新、复制、INFO/WARNING与手机布局。');
 }finally{await admin.close();await student.close();}
}
