import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {expect,type Browser,type Page} from '@playwright/test';
import type {Pool} from 'pg';

// Measure against the actual inline-code link in the supplied mother installation page.
async function expectNativePagination(page:Page,selector:string,reference:string){
 const frame=page.frameLocator(selector),pagination=frame.locator('[data-dorma-pagination]');
 await expect(pagination).toBeVisible();await expect(pagination.locator('p > code')).toHaveText(/^第\d+\/\d+页$/);
 await expect(pagination.getByRole('button')).toHaveCount(0);await expect(pagination.locator('p > *')).toHaveText(['上一页','下一页',/^第\d+\/\d+页$/]);
 const result=await pagination.evaluate((element,html)=>{
  const doc=element.ownerDocument,win=doc.defaultView!,sample=doc.createElement('div');sample.className='formatted-text';sample.style.position='absolute';sample.style.visibility='hidden';sample.innerHTML=html;element.parentElement!.append(sample);
  const properties=['color','text-decoration-line','text-decoration-thickness','text-underline-offset','text-decoration-color','font-family','font-size','padding-top','padding-right','padding-bottom','padding-left','border-radius','background-color'];
  try{const link=element.querySelector('p > a')!,referenceLink=sample.querySelector('a')!,list=element.previousElementSibling!,info=element.closest('.docs-info')!,heading=info.querySelector('.prev-next-heading')!;const styles=[link,referenceLink,link.querySelector('code')!,referenceLink.querySelector('code')!].map(element=>{const style=win.getComputedStyle(element);return Object.fromEntries(properties.map(key=>[key,style.getPropertyValue(key)]));});return {link:styles[0],referenceLink:styles[1],code:styles[2],referenceCode:styles[3],listGap:element.getBoundingClientRect().top-list.getBoundingClientRect().bottom,nativeGap:parseFloat(win.getComputedStyle(list).marginBottom),bottomGap:heading.getBoundingClientRect().top-element.getBoundingClientRect().bottom,sectionGap:parseFloat(win.getComputedStyle(info.querySelector('.docs-info-content')!).marginBottom),alignment:element.getBoundingClientRect().left-list.getBoundingClientRect().left};}finally{sample.remove();}
 },reference);
 assert.deepEqual(result.link,result.referenceLink,'分页链接的字体、下划线和颜色应与母版正文一致');assert.deepEqual(result.code,result.referenceCode,'行内代码背景、内边距与圆角应与母版一致');assert(Math.abs(result.listGap-result.nativeGap)<1,'列表与分页之间沿用母版列表间距');assert(Math.abs(result.bottomGap-result.sectionGap)<1,'分页与底部导航之间沿用母版段落间距');assert(Math.abs(result.alignment)<1,'分页与列表左边界对齐');
}

export async function docsPaginationRegression(browser:Browser,origin:string,password:string,database:Pool){
 const source=await readFile('D:/Development/Anime.js/public/sites/animejs-com-23cc7dc7/documentation--getting-started--installation-d54d2aec/index.html','utf8'),reference=source.match(/<p>Anime\.js can be installed via[\s\S]*?<\/p>/)![0],suffix=randomBytes(4).toString('hex');
 const ids=Object.fromEntries((await database.query("SELECT username,account_id FROM housing.user_accounts WHERE username=ANY($1)",[['admin','stu202602341','dm0301','mt008']])).rows.map(row=>[row.username,row.account_id]));
 await database.query("INSERT INTO housing.notifications(recipient_account_id,title,content) SELECT $1,'分页样式回归 '||i::text,'正文分页验证' FROM generate_series(1,21) i",[ids.stu202602341]);
 await database.query("INSERT INTO housing.rooms(room_id,building_id,floor_number,room_type,bed_capacity,room_status) SELECT 'P'||$1::text||'-'||i::text,'NY3',1,'分页测试房间',1,'available' FROM generate_series(1,21) i",[suffix]);
 await database.query("INSERT INTO housing.accommodation_bills(student_number,billing_period,accommodation_fee,utility_fee,due_date) SELECT '202602341',to_char(date '2198-01-01'+i*interval '1 month','YYYY-MM'),1,0,CURRENT_DATE+14 FROM generate_series(1,21) i ON CONFLICT DO NOTHING");
 for(let i=0;i<21;i++){const repair=(await database.query("INSERT INTO housing.repair_requests(student_number,room_id,fault_type,fault_description,repair_status) VALUES('202602341','NY3-502','水电设施',$1,'dispatched') RETURNING repair_id",['分页验证 '+suffix+' '+i])).rows[0];await database.query('INSERT INTO housing.maintenance_records(repair_id,technician_account_id,dispatcher_account_id) VALUES($1,$2,$3)',[repair.repair_id,ids.mt008,ids.admin]);}
 const cases=[
  {username:'admin',role:'admin',url:'/workspace/admin/permissions/roles/records',api:'permissions',list:'[data-dorma-admin-permission-list]',values:'[data-dorma-permission-values]'},
  {username:'stu202602341',role:'student',url:'/workspace/student/notifications/messages',api:'notifications',list:'[data-dorma-announcement-list]',values:'[data-dorma-announcement-content]'},
  {username:'dm0301',role:'manager',url:'/workspace/dormManager/base-data/rooms',api:'rooms',list:'[data-dorma-base-list]',values:'[data-dorma-base-values]'},
  {username:'mt008',role:'maintenance',url:'/workspace/maintenance/orders/assigned',api:'repairs',list:'[data-dorma-maintenance-order-list]',values:'[data-dorma-repair-values]'},
  {username:'admin',role:'admin',url:'/workspace/admin/base-data/manage/records?type=rooms',api:'rooms',list:'[data-dorma-base-list]',values:'[data-dorma-base-values]'},
  {username:'stu202602341',role:'student',url:'/workspace/student/payment/bills',api:'bills',list:'[data-dorma-finance-list]',values:'[data-dorma-finance-values]'},
 ];
 for(const item of cases){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try{
   const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:item.username,password}});assert.equal(response.status(),200);const total=(await (await context.request.get(origin+'/api/v1/'+item.api+'?limit=20')).json()).meta.total,pages=Math.ceil(total/20);assert(pages>=2);
   const selector=`[data-dorma-${item.role}-frame]`,frame=page.frameLocator(selector),pagination=frame.locator('[data-dorma-pagination]'),list=frame.locator(item.list),previous=pagination.getByRole('link',{name:'上一页',exact:true}),next=pagination.getByRole('link',{name:'下一页',exact:true});
   await page.goto(origin+item.url);await expect(list.locator('a')).toHaveCount(20);await expect(pagination.locator('[aria-current="page"]')).toHaveText('第1/'+pages+'页');await expect(previous).toHaveAttribute('aria-disabled','true');await previous.click({force:true});await expect(page).toHaveURL(origin+item.url);await expectNativePagination(page,selector,reference);
   const shell=await frame.locator('#docs-demos').elementHandle();await next.focus();await page.keyboard.press('Enter');const second=item.url+(item.url.includes('?')?'&':'?')+'page=2';await expect(page).toHaveURL(origin+second);await expect(pagination.locator('[aria-current="page"]')).toHaveText('第2/'+pages+'页');await expect(previous).not.toHaveAttribute('aria-disabled','true');
   await list.locator('a').first().click();await expect(pagination).toHaveCount(0);await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',second);await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+second);await expect(pagination).toBeVisible();assert(await shell!.evaluate(el=>el.isConnected),'翻页和详情返回保留母版外壳');
   await page.reload();await expect(pagination.locator('[aria-current="page"]')).toHaveText('第2/'+pages+'页');await expectNativePagination(page,selector,reference);await previous.click();await expect(pagination.locator('[aria-current="page"]')).toHaveText('第1/'+pages+'页');await page.goBack();await expect(pagination.locator('[aria-current="page"]')).toHaveText('第2/'+pages+'页');await page.goForward();await expect(pagination.locator('[aria-current="page"]')).toHaveText('第1/'+pages+'页');
   for(let index=1;index<pages;index++){await next.click();await expect(pagination.locator('[aria-current="page"]')).toHaveText('第'+(index+1)+'/'+pages+'页');}await expect(next).toHaveAttribute('aria-disabled','true');await expect(list.locator('a')).toHaveCount(total-(pages-1)*20);const last=page.url();await next.click({force:true});await expect(page).toHaveURL(last);
   await pagination.scrollIntoViewIfNeeded();await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/pagination-'+item.role+'-'+item.api+'.png'});await page.setViewportSize({width:390,height:844});await expectNativePagination(page,selector,reference);assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await pagination.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/qa/backend/pagination-'+item.role+'-'+item.api+'-mobile.png'});assert.deepEqual(errors,[]);
  }finally{await context.close();}
 }
 console.log('正文分页通过：四端真实多页数据、权限/消息/房间/工单/账单列表、键盘翻页、首末页禁用、准确页数、详情返回/刷新/历史、筛选类型保留、母版原文链接代码样式及上下间距、桌面/手机。');
}
