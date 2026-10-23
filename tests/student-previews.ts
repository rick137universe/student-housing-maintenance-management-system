import {formatCurrency} from '../src/utils/display-format';
import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';
import configs from '../src/data/student-previews.json';
import {studentPages} from '../src/data/student-pages';

export async function studentPreviewRegression(browser:Browser,origin:string,password:string){
 const context=await browser.newContext({viewport:{width:1536,height:1000}});
 try{
  const login=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'stu202602341',password}});
  assert.equal(login.status(),200);
  const profile=(await (await context.request.get(origin+'/api/v1/profile')).json()).data;
  const summary=(await (await context.request.get(origin+'/api/v1/statistics/student-finance')).json()).data;
  assert.deepEqual((await (await context.request.get(origin+'/api/v1/statistics/student-finance?studentNumber=202602114')).json()).data,summary);
  for(const username of ['admin','dm0301','mt008']){
   const other=await browser.newContext();
   try{
    assert.equal((await other.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username,password}})).status(),200);
    assert.equal((await other.request.get(origin+'/api/v1/statistics/student-finance')).status(),403);
   }finally{await other.close();}
  }
  const page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+configs[0].url);
  const frame=page.frameLocator('[data-dorma-student-frame]');
  await frame.locator('#docs-sidebar a[data-feature="payment"]').click();
  await expect(page).toHaveURL(origin+'/workspace/student/payment');
  for(const config of configs.filter(config=>['latest','unpaid','paid'].includes(config.kind??''))){
   const entry=studentPages.find(page=>page.url===config.url)!;
   const article=frame.locator(`#docs-demos article[data-id="${entry.id}"]`);
   await article.scrollIntoViewIfNeeded();
   await expect.poll(()=>article.locator('.docs-demo-template .value').allTextContents()).toEqual(config.kind==='unpaid'?['0']:['0','0']);
   await expect(article).not.toHaveClass(/is-active/);
  }
  for(const config of configs){
   const entry=studentPages.find(page=>page.url===config.url)!;
   await frame.locator(`#docs-sidebar a[data-id="${entry.id}"]`).evaluate((a:HTMLAnchorElement)=>a.click());
   await expect(page).toHaveURL(origin+entry.url);
   const article=frame.locator(`#docs-demos article[data-id="${entry.id}"]`);
   await expect(article).toHaveClass(/is-active/);
   await expect(article.locator('h2')).toHaveText(entry.label);
   await expect(article).toHaveAttribute('data-color',String(entry.color));
   const live=article.locator('.docs-demo-live');
   if(config.kind==='splittext'&&config.lines){
    await expect(live.locator('.square-grid')).toHaveCount(1);
    await expect.poll(async()=>(await live.locator('p [data-char]').allTextContents()).join('')).toBe(config.lines.join('').replace(/\s/g,''));
    await expect.poll(()=>live.locator('p [data-char]').evaluateAll(chars=>[...new Set(chars.map(el=>(el as HTMLElement).dataset.line))])).toEqual(['0','1']);
   }else if(['username','phone','password'].includes(config.kind??'')){
    const expected=config.kind==='password'?'password':String(profile[config.kind!]||(config.kind==='phone'?'未填写':'—'));
    await expect.poll(async()=> (await live.locator('code [data-char]').allTextContents()).join('')).toBe(expected);
    await expect(live.locator('code [data-char]').last()).toHaveCSS('opacity','1');
    if(config.kind==='phone'){
     await page.route('**/api/v1/profile',route=>route.fulfill({json:{data:{...profile,phone:'13912345678'}}}));
     await frame.locator('body').evaluate(el=>el.ownerDocument.dispatchEvent(new Event('dorma-profile-saved')));
     await expect.poll(async()=>(await live.locator('code [data-char]').allTextContents()).join('')).toBe('13912345678');
     await page.unroute('**/api/v1/profile');
    }
   }else if(config.kind==='unread'){
    const unread=await (await context.request.get(origin+'/api/v1/notifications?unread=true&limit=1')).json();
    await expect(live.locator('.value')).toHaveText(String(unread.meta.total));
   }else if(config.kind){
    const expected=config.kind==='unpaid'?[String(summary.unpaidCount)]:config.kind==='latest'?[formatCurrency(summary.latestUtility),formatCurrency(summary.latestAccommodation)]:[formatCurrency(summary.paidUtility),formatCurrency(summary.paidAccommodation)];
    await expect.poll(()=>live.locator('.value').allTextContents(),{timeout:10000}).toEqual(expected);
    await page.waitForTimeout(250);
    assert.deepEqual(await live.locator('.value').allTextContents(),expected,'金额达到目标后必须停止');
    if(config.kind==='latest'){
     await article.locator('.demo-reload-button').click();
     await expect.poll(()=>live.locator('.value').allTextContents(),{timeout:10000}).toEqual(expected);
    }
   }else if(config.source==='getting-started')await expect(article.locator('.dotted-grid')).toHaveCount(1);
   else{
    const shapes=live.locator('.square, .circle');
    await expect(shapes.first()).toBeAttached();await article.locator('.demo-reload-button').click();
    const snapshot=()=>shapes.evaluateAll(elements=>elements.map(el=>{const style=getComputedStyle(el);return [style.transform,style.translate,style.rotate,style.scale,style.opacity,style.boxShadow].join(';');}).join('|'));
    const before=await snapshot();await expect.poll(snapshot,{timeout:5000}).not.toBe(before);
   }
  }
  // Failed summary loads must not masquerade as a zero balance.
  await page.route('**/api/v1/statistics/student-finance',route=>route.fulfill({status:503,json:{error:{message:'test failure'}}}));
  const bills=studentPages.find(p=>p.url==='/workspace/student/payment/bills')!;
  await frame.locator(`#docs-sidebar a[data-id="${bills.id}"]`).evaluate((a:HTMLAnchorElement)=>a.click());
  const values=frame.locator(`article[data-id="${bills.id}"] .docs-demo-live .value`);
  await expect(values.first()).toHaveAttribute('title',/暂时无法加载/);
  assert.deepEqual(await values.allTextContents(),['—','—']);
  await page.unroute('**/api/v1/statistics/student-finance');
  await frame.locator(`article[data-id="${bills.id}"] .demo-reload-button`).click();
  await expect.poll(()=>values.allTextContents(),{timeout:10000}).toEqual([formatCurrency(summary.latestUtility),formatCurrency(summary.latestAccommodation)]);
  await page.route('**/api/v1/statistics/student-finance',route=>route.fulfill({json:{data:{...summary,latestUtility:'12.34',latestAccommodation:'56.78'}}}));
  await frame.locator('body').evaluate(el=>el.ownerDocument.dispatchEvent(new Event('dorma-finance-saved')));
  await expect.poll(()=>values.allTextContents()).toEqual(['￥12.34','￥56.78']);
  await page.unroute('**/api/v1/statistics/student-finance');
  await context.clearCookies();
  assert.equal((await context.request.get(origin+'/api/v1/statistics/student-finance')).status(),401);
  assert.equal((await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'stu202602114',password}})).status(),200);
  await page.goto(origin+configs[0].url);
  await expect.poll(async()=>(await frame.locator('article.is-active .docs-demo-live code [data-char]').allTextContents()).join('')).toBe('stu202602114');
  assert.deepEqual(errors,[]);
  console.log(`学生专属预览通过：${configs.length}个页面、双语文字动画、当前账号/手机号、真实缴费金额、数字停止、重播及错误恢复。`);
 }finally{await context.close();}
}

