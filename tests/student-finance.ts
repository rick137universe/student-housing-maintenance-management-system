import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';

// Uses only the integration suite's dedicated student and disposable database.
export async function studentFinanceRegression(page:Page,foreignBillId:string){
  const origin=new URL(page.url()).origin,base=origin+'/workspace/student/payment/';
  const frame=page.frameLocator('[data-dorma-student-frame]'),list=frame.locator('[data-dorma-finance-list]'),values=frame.locator('[data-dorma-finance-values]');
  const expectTop=async()=>{await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);};
  async function get(resource:string){const response=await page.request.get(origin+'/api/v1/'+resource);assert.equal(response.status(),200);return (await response.json()).data;}
  const bill=(await get('bills'))[0],id=String(bill.bill_id);
  const code=(label:string)=>values.getByRole('heading',{name:label,exact:true}).locator('+ pre > code');
  await page.goto(base+'action-1');
  await expect(list.locator('a')).toHaveText([`${bill.billing_period} · 12.00 · 未缴`]);
  await expectTop();
  await expect(list.locator('a')).toHaveCSS('text-decoration-line','none');
  await expect(frame.locator('[data-dorma-finance] table')).toHaveCount(0);
  await expect(frame.locator('[data-dorma-finance] input')).toHaveCount(0);
  await expect(frame.locator('#toggle-search')).toBeEnabled();
  await list.locator('a').click();await expect(page).toHaveURL(base+`action-1?record=${id}`);
  await expect(frame.locator('#docs-info h1')).toHaveText('账单详情');
  await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText('查看账单');
  await expectTop();
  await expect(code('账期')).toHaveText(bill.billing_period);await expect(code('住宿费')).toHaveText('10.00');await expect(code('水电费')).toHaveText('2.00');
  await expect(values.locator('pre > button.copy-button')).toHaveCount(13);
  await expect(frame.locator('#docs-info .prev-link a')).toHaveText('查看账单');
  await expect(frame.locator('#docs-info .next-link')).toHaveCount(0);
  await expect(frame.locator('#docs-info .prev-next-heading h6:not([aria-hidden="true"])')).toHaveText(['上一个']);
  await page.reload();await expect(code('账单编号')).toHaveText(id);
  await expectTop();
  await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(base+'action-1');await expect(list.locator('a')).toHaveCount(1);
  await expectTop();
  await expect(frame.locator('#docs-info .next-link a')).toHaveText('在线缴费');
  await page.goBack();await expect(code('账单编号')).toHaveText(id);
  await page.goForward();await expect(list.locator('a')).toHaveCount(1);
  await page.goto(base+'action-2');await expect(list.locator('a')).toHaveText([`${bill.billing_period} · 12.00 · 未缴`]);await list.locator('a').click();
  await expect(page).toHaveURL(base+'action-2?record='+id);await expect(code('待缴金额')).toHaveText('12.00');
  await expectTop();
  await expect(frame.locator('#docs-info .prev-link a')).toHaveText('在线缴费');await expect(frame.locator('#docs-info .next-link')).toHaveCount(0);
  await frame.getByRole('button',{name:'测试支付',exact:true}).click();
  const form=frame.getByRole('form',{name:'测试支付',exact:true});
  await form.getByLabel('支付金额',{exact:true}).fill('99.00');await form.getByRole('button',{name:'确认支付',exact:true}).click();
  await expect(form.getByRole('alert')).toContainText('金额超过');assert.equal((await get('payments')).length,0);
  await form.getByLabel('支付金额',{exact:true}).fill('5.00');await form.getByLabel('测试支付结果',{exact:true}).selectOption('failed');await form.getByRole('button',{name:'确认支付',exact:true}).click();
  await expect(form.getByRole('alert')).toContainText('测试支付失败');assert.equal((await get('payments')).length,0);
  await form.getByLabel('测试支付结果',{exact:true}).selectOption('cancelled');await form.getByRole('button',{name:'确认支付',exact:true}).click();
  await expect(form).toHaveCount(0);await expect(code('待缴金额')).toHaveText('12.00');assert.equal((await get('payments')).length,0);
  await frame.getByRole('button',{name:'测试支付',exact:true}).click();await form.getByLabel('支付金额',{exact:true}).fill('5.00');await form.getByRole('button',{name:'确认支付',exact:true}).click();
  await expect(code('待缴金额')).toHaveText('7.00');await expect(code('账单状态')).toHaveText('部分缴费');assert.equal((await get('payments')).length,1);
  await frame.locator('#docs-info .prev-link a').click();await expect(list.locator('a')).toHaveText([`${bill.billing_period} · 12.00 · 部分缴费`]);
  await expectTop();
  await expect(frame.locator('#docs-info .next-link a')).toHaveText('缴费记录');
  await list.locator('a').click();await frame.getByRole('button',{name:'测试支付',exact:true}).click();await expect(form.getByLabel('支付金额',{exact:true})).toHaveValue('7.00');await form.getByRole('button',{name:'确认支付',exact:true}).click();
  await expect(code('账单状态')).toHaveText('已缴清');await expect(code('待缴金额')).toHaveText('0.00');await expect(frame.getByRole('button',{name:'测试支付',exact:true})).toHaveCount(0);
  await frame.locator('#docs-info .docs-breadcrumb a').click();await expect(list.locator('a')).toHaveCount(0);await expect(frame.getByText('暂无记录。',{exact:true})).toBeVisible();
  await page.goto(base+'action-3');await expect(list.locator('a')).toHaveCount(2);
  await expectTop();
  const records=await get('payments');
  const format=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  await expect(list.locator('a')).toHaveText(records.map((row:{amount:string;paid_at:string})=>`${row.amount} · ${format.format(new Date(row.paid_at))}`));
  await list.locator('a').first().click();await expect(frame.locator('#docs-info h1')).toHaveText('缴费记录详情');await expect(code('金额')).toHaveText('7.00');await expect(code('缴费方式')).toHaveText('测试支付');
  await expectTop();
  await expect(frame.locator('#docs-info .prev-link a')).toHaveText('缴费记录');await expect(frame.locator('#docs-info .next-link')).toHaveCount(0);
  await expect(values.locator('h3')).toHaveCount(7);await expect(values.locator('table')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await page.reload();await expect(code('金额')).toHaveText('7.00');
  await expectTop();
  assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);
  await page.screenshot({path:'docs/qa/backend/student-payment-detail-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});
  await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(base+'action-3');await expect(list.locator('a')).toHaveCount(2);
  await expectTop();
  await page.goBack();await expect(code('金额')).toHaveText('7.00');
  await frame.locator('#docs-sidebar .docs-action a').filter({hasText:'查看账单'}).click();await expect(list.locator('a')).toHaveText([`${bill.billing_period} · 12.00 · 已缴清`]);
  await page.goBack();await expect(frame.locator('#docs-info h1')).toHaveText('缴费记录详情');await expect(code('金额')).toHaveText('7.00');
  for(const record of [foreignBillId,'999999999999999999','9999999999999999999','invalid']){
    await page.goto(base+'action-1?record='+record);await expect(frame.locator('[data-dorma-finance]').getByRole('alert')).toContainText('不存在或不可访问');await expect(values).toHaveCount(0);
  }
  console.log('学生缴费页面回归通过：无记录搜索、三类详情仅保留返回列表的上一个、刷新/前进后退、代码框复制、失败/取消/分批缴清、跨账号拒绝及手机布局。');
}
