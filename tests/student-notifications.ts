import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;
type Client={call:(path:string,body?:object)=>Promise<unknown>};

// Fixtures and all writes belong only to the integration suite's disposable database.
export async function studentNotificationRegression(page:Page,admin:Client,peer:Client){
 const origin=new URL(page.url()).origin,base='/workspace/student/notifications/action-1',frame=page.frameLocator('[data-dorma-student-frame]');
 const list=frame.locator('[data-dorma-announcement-list]'),body=frame.locator('[data-dorma-announcement-body]');
 async function get(path:string){const response=await page.request.get(origin+'/api/v1/'+path);assert.equal(response.status(),200);return (await response.json()).data;}
 const me=await get('auth/me'),bill=await admin.call('bills',{studentNumber:me.studentNumber,period:'2027-02',accommodationFee:'3.00',utilityFee:'1.00',dueDate:'2027-12-31'}) as {billId:string};
 for(let i=0;i<21;i++)await admin.call('bills/'+bill.billId+'/remind',{});
 const all=await get('notifications?limit=100') as Row[],first=all[0],id=String(first.notification_id);assert(all.some(row=>row.title!=='缴费提醒'),'个人消息应包含其他业务消息');
 await page.goto(origin+base);
 await expect(list.locator('a')).toHaveText(all.slice(0,20).map(row=>`${row.title} · ${row.read_at?'已读':'未读'}`));
 await expect(frame.locator('[data-dorma-announcements] table, [data-dorma-announcements] input, [data-dorma-announcements] dialog')).toHaveCount(0);
 await expect(frame.getByText('正在读取…',{exact:true})).toHaveCount(0);await expect(frame.locator('#toggle-search')).toBeEnabled();
 const color=await frame.locator('body').evaluate(body=>{const sample=body.ownerDocument.createElement('span');sample.className='color-lime';sample.style.color='var(--hex-current-1)';body.append(sample);const color=getComputedStyle(sample).color;sample.remove();return color;});
 const target=list.locator(`a[href$="record=${id}"]`);await target.hover();await expect(target).toHaveCSS('color',color);
 await expectStudentReveal(page,()=>target.click(),String(first.title));await expect(page).toHaveURL(origin+base+'?record='+id);
 await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['个人消息','消息通知']);
 await expectStudentBreadcrumbSpacing(page);
 await expect(body).toContainText(String(first.content));await expect(body.locator('p').first()).toContainText('接收时间：');await expect(body).toContainText('未读');
 await expect(body.locator('pre,table')).toHaveCount(0);await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base);await expect(frame.locator('#docs-info .prev-link a')).toHaveClass(/color-lime/);
 const read=frame.locator('#docs-info .next-link').getByRole('button',{name:'标为已读',exact:true});await expect(read).toHaveClass(/color-lime/);await expect(read.locator('svg.icon')).toHaveCount(1);await expect(body.getByRole('button')).toHaveCount(0);
 const previousBounds=await frame.locator('#docs-info .prev-link a').boundingBox(),readBounds=await read.boundingBox();assert(previousBounds&&readBounds&&Math.abs(previousBounds.y-readBounds.y)<1&&readBounds.x>previousBounds.x,'已读操作应与上一页在同一行右侧');await read.hover();await expect(read).toHaveCSS('color',color);
 await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');
 await page.screenshot({path:'docs/qa/backend/student-notification-detail-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/student-notification-detail-mobile.png'});await page.setViewportSize({width:1440,height:1000});
 await read.focus();await page.keyboard.press('Space');await expect(read).toHaveCount(0);assert((await get('notifications/'+id)).read_at);
 await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);
 await frame.locator('#docs-info .prev-link a').click();await expect(target).toHaveText(String(first.title)+' · 已读');
 await page.goBack();await expect(body).toContainText('已读');await page.reload();await expect(body).toContainText('已读');await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
 await frame.locator('#docs-info .docs-breadcrumb a').last().click();await expect(target).toHaveText(String(first.title)+' · 已读');
 await page.goto(origin+'/workspace/student/announcements/action-2');await expect(list.locator(`a[href$="record=${id}"]`)).toHaveText('缴费提醒 · 已读');
 await page.goto(origin+base);await frame.getByRole('button',{name:'下一页',exact:true}).click();await expect(page).toHaveURL(origin+base+'?page=2');
 const page2=await get('notifications?page=2') as Row[];await expect(list.locator('a')).toHaveText(page2.map(row=>`${row.title} · ${row.read_at?'已读':'未读'}`));
 const general=page2.find(row=>row.title!=='缴费提醒');assert(general);await list.locator(`a[href$="record=${general.notification_id}"]`).click();await expect(body).toContainText(String(general.content));
 await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base+'?page=2');await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+base+'?page=2');await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
 const other=await peer.call('auth/me') as Row,foreignBill=await admin.call('bills',{studentNumber:other.studentNumber,period:'2027-03',accommodationFee:'1.00',utilityFee:'1.00',dueDate:'2027-12-31'}) as {billId:string};
 await admin.call('bills/'+foreignBill.billId+'/remind',{});const foreign=(await peer.call('notifications') as Row[])[0];assert(foreign);
 for(const record of [String(foreign.notification_id),'invalid','0','9999999999999999999']){await page.goto(origin+base+'?record='+record);await expect(frame.getByRole('alert')).toBeVisible();await expect(body).toHaveCount(0);await expect(frame.getByRole('button',{name:'标为已读',exact:true})).toHaveCount(0);}
 const denied=await page.request.post(origin+`/api/v1/notifications/${foreign.notification_id}/read`,{headers:{Origin:origin,'X-CSRF-Token':me.csrfToken},data:{}});assert.equal(denied.status(),404);assert.equal((await peer.call('notifications/'+foreign.notification_id) as Row).read_at,null);
 await page.goto(origin+base);await expect(list.locator('a')).toHaveCount(20);
 console.log('个人消息回归通过：标题与已读导航、全部业务消息、母版青柠主题和正文、真实已读及提醒同步、分页返回、刷新和浏览器返回、顶部与渐显、手机布局及跨学生读写拒绝。');
}
