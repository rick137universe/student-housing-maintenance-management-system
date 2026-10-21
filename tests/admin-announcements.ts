import assert from 'node:assert/strict';
import {expect,type Browser} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;

// The integration harness supplies a disposable database; fixtures use the real publication API.
export async function adminAnnouncementRegression(browser:Browser,origin:string,password:string){
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),student=await browser.newContext(),page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 const selector='[data-dorma-admin-frame]',frame=page.frameLocator(selector),parent='/workspace/admin/announcements/action-1',base=parent+'/records',publishUrl=parent+'/submit';
 let csrf='';
 async function call(path:string,body?:object,method='POST'){
  const response=body?await context.request.fetch(origin+'/api/v1/'+path,{method,headers:{Origin:origin,'X-CSRF-Token':csrf},data:body}):await context.request.get(origin+'/api/v1/'+path);
  const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result.data;
 }
 const list=frame.locator('[data-dorma-admin-announcement-list]'),body=frame.locator('[data-dorma-admin-announcement-body]'),editor=frame.locator('[data-dorma-admin-announcement-editor]');
 const previous=frame.locator('#docs-info .prev-link a'),next=frame.locator('#docs-info .next-link a');
 async function navigationStyle(){
  await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await frame.locator('html').evaluate(el=>el.ownerDocument.fonts.ready);
  return frame.locator('[data-dorma-admin-announcement-navigation]').evaluate(list=>({
   list:((style)=>({paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,marginTop:style.marginTop,marginBottom:style.marginBottom}))(getComputedStyle(list)),
   buttons:[...list.querySelectorAll('a')].map(button=>{const style=getComputedStyle(button);return {display:style.display,fontSize:style.fontSize,fontFamily:style.fontFamily,lineHeight:style.lineHeight,padding:style.padding,textDecoration:style.textDecorationLine,height:Math.round(button.getBoundingClientRect().height*100)/100};}),
  }));
 }

 async function field(key:string,value:string,select=false){
  const section=editor.locator(`[data-profile-field="${key}"]`);await section.locator('.code-edit-button').click();
  const input=section.locator('input,textarea,select');await expect(input).toHaveCSS('outline-style','none');
  if(select)await input.selectOption(value);else await input.fill(value);
  await section.getByRole('button',{name:'确认',exact:true}).click();await expect(input).toHaveCount(0);
 }
 try{
  const response=await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'admin',password}});assert.equal(response.status(),200);csrf=(await response.json()).data.csrfToken;
  const suffix=Date.now(),content='第一段第一行\n第一段第二行\n\n第二段 <script>window.announcementUnsafe=true</script>';
  for(let index=0;index<21;index++)await call('announcements',{title:'管理公告 '+suffix+' '+index,content,type:'公寓通知',buildingId:null,expiresAt:null,enabled:true});
  const rows=await call('announcements?limit=100') as Row[],first=rows[0],id=String(first.announcement_id),detail=origin+base+'?record='+id;
  await page.goto(origin+'/workspace/admin/personal/action-1');await expect(frame.locator('[data-dorma-profile]')).toBeVisible();
  await frame.locator('#docs-sidebar a[title="公告管理"]').click();await frame.locator('#docs-sidebar a[href="'+parent+'"]').click();await expect(page).toHaveURL(origin+parent);
  const navigation=frame.locator('[data-dorma-admin-announcement-navigation]');await expect(navigation.locator('a')).toHaveText(['发布公告','公告记录']);await expect(list).toHaveCount(0);await expect(editor).toHaveCount(0);await expect(next).toHaveAttribute('href',publishUrl);
  const third=frame.locator('#docs-sidebar a[href="'+parent+'"]').locator('..').locator(':scope > ul > li');await expect(third.locator('a')).toHaveText(['发布公告','公告记录']);await expect(third.filter({has:frame.locator('.is-active')})).toHaveCount(0);
  const switchedStyle=await navigationStyle();await page.screenshot({path:'docs/qa/backend/admin-announcement-navigation-switch.png'});
  await page.reload();await expect(navigation.locator('a')).toHaveText(['发布公告','公告记录']);const refreshedStyle=await navigationStyle();assert.deepEqual(switchedStyle,refreshedStyle,'切换和刷新后的导航字号、下划线、内边距及按钮高度应一致');
  for(const button of refreshedStyle.buttons){assert.equal(button.textDecoration,'none');assert.equal(button.display,'flex');}
  await page.screenshot({path:'docs/qa/backend/admin-announcement-navigation.png'});
  await expectStudentReveal(page,()=>next.click(),'发布公告',selector);await expect(page).toHaveURL(origin+publishUrl);await expect(previous).toHaveAttribute('href',parent);await expect(next).toHaveText('发布公告');await expect(editor).toBeVisible();
  await previous.click();await expect(page).toHaveURL(origin+parent);await expect(navigation).toBeVisible();assert.deepEqual(await navigationStyle(),refreshedStyle);await navigation.getByRole('link',{name:'公告记录',exact:true}).click();await expect(page).toHaveURL(origin+base);await expect(previous).toHaveAttribute('href',parent);
  await expect(list.locator('a')).toHaveText(rows.slice(0,20).map(row=>String(row.title)));
  await expect(frame.locator('[data-dorma-admin-business-host],dialog,[data-dorma-admin-announcements] table,[data-dorma-admin-announcements] input')).toHaveCount(0);
  await expect(frame.getByText('正在读取…',{exact:true})).toHaveCount(0);await expect(list.locator('a').first()).toHaveClass(/color-turquoise/);
  await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['公告管理','公告发布']);await expect(frame.locator('#docs-info .docs-breadcrumb a').last()).toHaveAttribute('href',parent);
  await page.screenshot({path:'docs/qa/backend/admin-announcement-list.png'});
  const shell=await frame.locator('#docs-demos').elementHandle();
  await expectStudentReveal(page,()=>list.locator('a').first().click(),String(first.title),selector);await expect(page).toHaveURL(detail);
  await expect(body.locator('p')).toHaveCount(4);await expect(body.locator('br')).toHaveCount(1);await expect(body).toContainText('<script>window.announcementUnsafe=true</script>');
  await expect(body.locator('script,table,pre')).toHaveCount(0);assert.equal(await frame.locator('body').evaluate(el=>(el.ownerDocument.defaultView as Window&{announcementUnsafe?:boolean}).announcementUnsafe),undefined);
  await expect(body.locator('p').first().locator('code')).toHaveCount(3);await expect(frame.locator('[data-dorma-description]')).toBeHidden();
  await expect(previous).toHaveAttribute('href',base);await expect(next).toHaveText('编辑公告');await expectStudentBreadcrumbSpacing(page,selector);
  await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);await page.screenshot({path:'docs/qa/backend/admin-announcement-detail.png'});
  await expectStudentReveal(page,()=>next.click(),'编辑公告',selector);await expect(page).toHaveURL(detail+'&mode=edit');
  await expect(editor.locator('.code-preview-title h2')).toHaveText(['公告标题','公告正文','公告类型','发布范围','到期时间','启用状态']);
  await expect(editor.locator('section[data-color="7"]')).toHaveCount(6);await expect(editor.locator('.copy-button')).toHaveCount(6);
  await expect(previous).toHaveAttribute('href',base+'?record='+id);await expect(next).toHaveText('保存修改');
  const titleField=editor.locator('[data-profile-field="title"]');await titleField.locator('.code-edit-button').click();await titleField.getByRole('textbox').fill('应被取消');await titleField.getByRole('button',{name:'取消',exact:true}).click();await expect(titleField.locator('code')).toHaveText(String(first.title));
  const updated='已修改的公告 '+suffix;await field('title',updated);await field('content',content+'\n\n新增第三段');await field('type','服务信息');await field('buildingId','BY4',true);
  const expiry=new Date(Date.now()+86400000*30);await field('expiresAt',expiry.toISOString().slice(0,16));await field('enabled','false',true);
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/admin-announcement-editor-mobile.png'});await page.setViewportSize({width:1440,height:1000});
  const failedSave='**/api/v1/announcements/'+id;await page.route(failedSave,route=>route.request().method()==='PATCH'?route.fulfill({status:503,json:{error:{message:'保存失败，请重试。'}}}):route.continue());
  await next.click();await expect(editor.getByRole('alert')).toHaveClass('notice warning');await expect(editor.getByRole('alert')).toHaveText('保存失败，请重试。');await page.unroute(failedSave);
  await next.focus();await page.keyboard.press('Space');await expect(page).toHaveURL(detail);await expect(body).toContainText('已停用');await expect(frame.locator('#docs-info h1')).toHaveText(updated);
  const saved=await call('announcements/'+id);assert.equal(saved.title,updated);assert.equal(saved.building_id,'BY4');assert.equal(saved.enabled,false);assert.equal(saved.announcement_type,'服务信息');assert(saved.expires_at);assert(String(saved.content).endsWith('新增第三段'));
  assert(await shell!.evaluate(el=>el.isConnected));await page.reload();await expect(body).toContainText('新增第三段');await previous.click();await expect(list.locator('a').first()).toHaveText(updated);
  await expectStudentReveal(page,()=>next.click(),'发布公告',selector);await expect(page).toHaveURL(origin+publishUrl);await expect(next).toHaveText('发布公告');
  await expect(next).toHaveAttribute('aria-disabled','false');await next.click();await expect(editor.getByRole('alert')).toHaveClass('notice warning');await expect(editor.getByRole('alert')).toHaveText('请填写并确认公告标题。');
  await field('title','新发布的公告 '+suffix);await next.click();await expect(editor.getByRole('alert')).toHaveText('请填写并确认公告正文。');
  await field('content','发布正文第一段\n\n发布正文第二段');await next.click();await expect(page).toHaveURL(origin+base);await expect(list.locator('a').first()).toHaveText('新发布的公告 '+suffix);await list.locator('a').first().click();await expect(body).toContainText('发布正文第二段');await expect(page).toHaveURL(/record=\d+$/);
  const createdId=new URL(page.url()).searchParams.get('record')!,created=await call('announcements/'+createdId);assert.equal(created.enabled,true);assert.equal(created.building_id,null);assert.equal(created.expires_at,null);
  await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);await previous.click();await expect(list.locator('a').first()).toHaveText('新发布的公告 '+suffix);await previous.click();await expect(page).toHaveURL(origin+parent);await expect(navigation).toBeVisible();await navigation.getByRole('link',{name:'公告记录',exact:true}).click();await expect(list.locator('a')).toHaveCount(20);
  await frame.getByRole('button',{name:'下一页',exact:true}).click();await expect(page).toHaveURL(origin+base+'?page=2');await list.locator('a').first().click();await expect(previous).toHaveAttribute('href',base+'?page=2');await previous.click();await expect(page).toHaveURL(origin+base+'?page=2');
  for(const record of ['invalid','0','9999999999999999999']){await page.goto(origin+base+'?record='+record);await expect(frame.getByRole('alert')).toHaveClass('notice warning');await expect(body).toHaveCount(0);await expect(frame.getByRole('link',{name:'编辑公告',exact:true})).toHaveCount(0);}
  await page.route(/\/api\/v1\/announcements\?/,route=>route.fulfill({status:503,json:{error:{message:'公告读取失败，请重试。'}}}));await page.goto(origin+base);await expect(frame.getByRole('alert')).toHaveText('公告读取失败，请重试。');await page.unroute(/\/api\/v1\/announcements\?/);
  await page.route(/\/api\/v1\/announcements\?/,route=>route.fulfill({json:{data:[],meta:{page:1,limit:20,total:0}}}));await page.reload();await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');await page.unroute(/\/api\/v1\/announcements\?/);
  await page.route(/\/api\/v1\/buildings\?/,route=>route.fulfill({status:503,json:{error:{message:'楼栋读取失败，请重试。'}}}));await page.goto(origin+publishUrl);await expect(editor.getByRole('alert')).toHaveText('楼栋读取失败，请重试。');await expect(next).toHaveAttribute('aria-disabled','true');await page.unroute(/\/api\/v1\/buildings\?/);
  const studentLogin=await student.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:'stu202602341',password}});assert.equal(studentLogin.status(),200);const studentAccount=(await studentLogin.json()).data;
  assert.equal((await student.request.get(origin+'/api/v1/announcements/'+id)).status(),404);assert.equal((await student.request.get(origin+'/api/v1/announcements/'+createdId)).status(),200);
  assert.equal((await student.request.post(origin+'/api/v1/announcements',{headers:{Origin:origin,'X-CSRF-Token':studentAccount.csrfToken},data:{title:'越权公告',content:'不应发布',type:'公寓通知',buildingId:null,expiresAt:null,enabled:true}})).status(),403);
  assert.deepEqual(errors,[]);console.log('管理员公告通过：标题导航、正文分段、发布/编辑代码框、候选项/到期/停用、真实保存及学生可见性、底部操作、分页/返回/刷新、INFO/WARNING、母版渐显及手机布局。');
 }finally{await context.close();await student.close();}
}
