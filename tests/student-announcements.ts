import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;
type Client={call:(path:string,body?:object)=>Promise<unknown>};

// All fixtures are created only inside the integration suite's disposable database.
export async function studentAnnouncementRegression(page:Page,admin:Client){
 const origin=new URL(page.url()).origin,base='/workspace/student/announcements/',frame=page.frameLocator('[data-dorma-student-frame]');
 async function get(path:string){const response=await page.request.get(origin+'/api/v1/'+path);assert.equal(response.status(),200);return (await response.json()).data;}
 const publish=async(title:string,content:string,options:object={})=>await admin.call('announcements',{title,content,type:'公寓通知',buildingId:null,expiresAt:null,enabled:true,...options}) as {announcementId:string};
 for(let i=1;i<=21;i++)await publish('公寓通知分页 '+i,'分页正文 '+i);
 const title='公寓公共区域维护安排',paragraphs=['请同学们提前整理公共区域的个人物品。','施工时间：上午九点至下午五点。\n如需帮助，请联系值班宿管。','<img src=x onerror=alert(1)> 以普通文字显示。'];
 const notice=await publish(title,paragraphs.join('\n\n'));
 const foreign=await publish('其他楼栋通知','其他楼栋专属正文',{buildingId:'BY4'}),disabled=await publish('停用的公告','不可见正文',{enabled:false}),expired=await publish('已到期的公告','不可见正文',{expiresAt:new Date(Date.now()+1000).toISOString()});
 await page.waitForTimeout(1100); // Exercise real expiry without changing database timestamps.
 const list=frame.locator('[data-dorma-announcement-list]'),body=frame.locator('[data-dorma-announcement-body]');
 await page.goto(origin+base+'action-1');
 await expect(list.locator('a')).toHaveText((await get('announcements')).map((row:Row)=>String(row.title)));
 await expect(frame.locator('[data-dorma-announcements] table, [data-dorma-announcements] input, [data-dorma-announcements] dialog')).toHaveCount(0);
 await expect(frame.locator('[data-dorma-announcements]').getByText('正在读取…',{exact:true})).toHaveCount(0);
 const first=list.getByRole('link',{name:title,exact:true});await first.hover();await expect(first).toHaveCSS('color','rgb(249, 246, 64)');
 await expectStudentReveal(page,()=>first.click(),title);
 await expect(page).toHaveURL(origin+base+'action-1?record='+notice.announcementId);
 await expect(body.locator('p').nth(1)).toHaveText(paragraphs[0]);await expect(body.locator('p').nth(2)).toHaveText(paragraphs[1].replace('\n',''));await expect(body.locator('p').nth(3)).toHaveText(paragraphs[2]);
 await expect(body.locator('br')).toHaveCount(1);await expect(body.locator('img,script,pre,table')).toHaveCount(0);
 await expect(frame.locator('[data-dorma-description]')).toBeHidden();
 await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['公告查看','公寓通知']);
 await expectStudentBreadcrumbSpacing(page);
 await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base+'action-1');await expect(frame.locator('#docs-info .next-link')).toHaveCount(0);
 await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
 const styles=await body.locator('p').evaluateAll(elements=>elements.map(el=>{const style=getComputedStyle(el);return {font:style.fontFamily,size:style.fontSize,line:style.lineHeight,margin:style.marginBottom};}));
 for(const style of styles)assert.deepEqual({...style,margin:styles[0].margin},styles[0],'正文与发布时间应使用同一母版字体及行高');
 assert(styles.slice(0,-1).every(style=>style.margin===styles[0].margin));assert.equal(styles.at(-1)!.margin,'0px','末段沿用母版无下边距的样式');
 await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/student-announcement-detail-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);
 await page.screenshot({path:'docs/qa/backend/student-announcement-detail-mobile.png'});await page.setViewportSize({width:1440,height:1000});
 await page.reload();await expect(body).toContainText(paragraphs[0]);await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
 await frame.locator('#docs-info .prev-link a').click();await expect(list.locator('a')).toHaveCount(20);await page.goBack();await expect(body).toContainText(paragraphs[0]);await page.goForward();await expect(list.locator('a')).toHaveCount(20);
 await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(page).toHaveURL(origin+base+'action-1?page=2');
 const page2=(await get('announcements?page=2')) as Row[];await expect(list.locator('a')).toHaveText(page2.map(row=>String(row.title)));
 await list.locator('a').first().click();await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base+'action-1?page=2');
 await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+base+'action-1?page=2');
 for(const record of [foreign.announcementId,disabled.announcementId,expired.announcementId,'invalid','9999999999999999999']){
  await page.goto(origin+base+'action-1?record='+record);await expect(frame.getByRole('alert')).toBeVisible();await expect(body).toHaveCount(0);
 }
 const me=await get('auth/me'),bill=await admin.call('bills',{studentNumber:me.studentNumber,period:'2027-01',accommodationFee:'1.00',utilityFee:'2.00',dueDate:'2027-12-31'}) as {billId:string};
 await admin.call('bills/'+bill.billId+'/remind',{});
 const reminders=await get('notifications?type=payment-reminder') as Row[],reminder=reminders[0];assert(reminder);assert(reminders.every(row=>row.title==='缴费提醒'&&row.bill_id));
 const other=(await get('notifications')) .find((row:Row)=>row.title!=='缴费提醒');
 await page.goto(origin+base+'action-2');await expect(list.locator('a')).toHaveText(reminders.map(row=>`${row.title} · ${row.read_at?'已读':'未读'}`));
 const target=list.locator(`a[href$="record=${reminder.notification_id}"]`);await expect(target).toHaveText('缴费提醒 · 未读');
 await expectStudentReveal(page,()=>target.click(),'缴费提醒');await expect(body).toContainText(String(reminder.content));
 const read=frame.locator('#docs-info .next-link').getByRole('button',{name:'标为已读',exact:true});await expect(read).toHaveClass(/color-citrus/);await expect(read.locator('svg.icon')).toHaveCount(1);await expect(body.getByRole('button')).toHaveCount(0);
 const previousBounds=await frame.locator('#docs-info .prev-link a').boundingBox(),readBounds=await read.boundingBox();assert(previousBounds&&readBounds&&Math.abs(previousBounds.y-readBounds.y)<1&&readBounds.x>previousBounds.x,'缴费提醒的已读操作应位于下一页位置');await read.hover();await expect(read).toHaveCSS('color','rgb(249, 246, 64)');
 await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/student-reminder-read-navigation.png'});
 await expect(body).toContainText('未读');await read.click();await expect(body).toContainText('已读');await expect(read).toHaveCount(0);
 assert((await get('notifications/'+reminder.notification_id)).read_at);await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);
 await frame.locator('#docs-info .prev-link a').click();await expect(target).toHaveText('缴费提醒 · 已读');await page.reload();await expect(target).toHaveText('缴费提醒 · 已读');
 await target.click();await expect(page).toHaveURL(origin+base+'action-2?record='+reminder.notification_id);await expect(body).toContainText('已读');await page.reload();await expect(body).toContainText('已读');await expect(frame.locator('#docs-info .next-link')).toHaveCount(0);
 await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/student-reminder-detail-desktop.png'});
 if(other){await page.goto(origin+base+'action-2?record='+other.notification_id);await expect(frame.getByRole('alert')).toBeVisible();await expect(body).toHaveCount(0);}
 console.log('公告查看回归通过：标题导航、原生正文段落与换行、纯文本安全、分页返回、刷新前后导航、顶部及渐显、手机布局、楼栋/停用/到期范围、缴费提醒筛选和真实已读持久化。');
}
