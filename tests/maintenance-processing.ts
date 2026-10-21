import assert from 'node:assert/strict';
import {expect,type Browser,type BrowserContext} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;
export async function maintenanceProcessingRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext(),student=await browser.newContext(),owner=await browser.newContext({viewport:{width:1440,height:1000}}),peer=await browser.newContext();
 const page=await owner.newPage(),errors:string[]=[],accounts=new Map<BrowserContext,Row>();page.on('pageerror',error=>errors.push(error.message));
 async function call(context:BrowserContext,path:string,body?:object){
  const response=body?await context.request.post(origin+'/api/v1/'+path,{headers:{Origin:origin,'X-CSRF-Token':String(accounts.get(context)?.csrfToken??'')},data:body}):await context.request.get(origin+'/api/v1/'+path);
  const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result.data;
 }
 async function login(context:BrowserContext,username:string){const account=await call(context,'auth/login',{username,password});accounts.set(context,account);return account;}
 const selector='[data-dorma-maintenance-frame]',frame=page.frameLocator(selector),base='/workspace/maintenance/repair/',list=frame.locator('[data-dorma-maintenance-record-list]');
 const previous=frame.locator('#docs-info .prev-link a'),next=frame.locator('#docs-info .next-link a'),warning=frame.getByRole('alert'),editor=frame.locator('[data-dorma-maintenance-processing-editor]');
 const field=(label:string)=>frame.getByRole('heading',{name:label,exact:true}).locator('+ pre code');
 async function edit(key:string,label:string,value:string,select=false){const box=editor.locator(`[data-profile-field="${key}"]`);await box.getByRole('button',{name:'编辑'+label,exact:true}).click();if(select)await box.getByRole('combobox').selectOption(value);else await box.locator('textarea,input').fill(value);await box.getByRole('button',{name:'确认',exact:true}).click();}
 try{
  await login(admin,'admin');const username='mtProcessing'+Date.now();await call(admin,'accounts',{username,fullName:'维修处理回归',role:'maintenance',password});
  const worker=await login(owner,username),other=await login(peer,'mt009');await login(student,'stu202602341');
  for(const action of ['action-1','action-2','action-3']){await page.goto(origin+base+action);await expect(frame.locator('[data-dorma-empty-state] .notice.info')).toHaveText('暂无记录。');}
  async function create(context:BrowserContext,technicianId:string,index:string){
   const repair=await call(student,'repairs',{roomId:'NY3-502',faultType:'水电设施',description:'维修处理 '+index,phone:'13800001234'}),id=String(repair.repair_id);
   await call(admin,'repairs/'+id+'/review',{decision:'approve'});await call(admin,'repairs/'+id+'/dispatch',{technicianId});await call(context,'repairs/'+id+'/accept',{});
   const rows=await call(context,'maintenance?limit=100') as Row[];return rows.find(row=>String(row.repair_id)===id)!;
  }
  for(let i=0;i<21;i++)await create(owner,String(worker.id),String(i));
  const foreign=await create(peer,String(other.id),'其他维修人员');
  await page.goto(origin+base+'action-1');await expect(list.locator('a')).toHaveCount(20);await expect(frame.locator('[data-dorma-maintenance-processing] table, [data-dorma-maintenance-business-host], dialog')).toHaveCount(0);
  const shell=await frame.locator('#docs-demos').elementHandle();await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(list.locator('a')).toHaveCount(1);
  const id=new URL((await list.locator('a').getAttribute('href'))!,origin).searchParams.get('record')!,detail=origin+base+'action-1?page=2&record='+id;
  await expectStudentReveal(page,()=>list.locator('a').click(),'维修工单详情',selector);await expect(page).toHaveURL(detail);await expect(field('处理编号')).toHaveText(id);const repairId=await field('报修编号').innerText();assert.notEqual(id,repairId);
  await expectStudentBreadcrumbSpacing(page,selector);await expect(previous).toHaveAttribute('href',base+'action-1?page=2');await expect(next).toHaveText('开始维修');
  const startEndpoint='**/api/v1/repairs/'+repairId+'/start';await page.route(startEndpoint,route=>route.fulfill({status:503,json:{error:{message:'开始维修失败，请重试。'}}}));await next.click();await expect(warning).toHaveText('开始维修失败，请重试。');await page.unroute(startEndpoint);
  await next.click();await expect(field('工单状态')).toHaveText('处理中');await expect(next).toHaveCount(0);assert.equal((await call(owner,'repairs/'+repairId)).repair_status,'in_progress');
  await previous.click();await expect(page).toHaveURL(origin+base+'action-1');await expect(list.locator('a')).toHaveCount(20);
  await frame.locator('#docs-sidebar a[title="更新状态"]').click();await expect(list.locator('a')).toHaveCount(1);await list.locator('a').click();await expect(field('处理编号')).toHaveText(id);await next.click();await expect(page).toHaveURL(origin+base+'action-2?record='+id+'&edit=1');await expect(frame.locator('#docs-info h1')).toHaveText('更新状态');await expect(previous).toHaveAttribute('href',base+'action-2?record='+id);
  await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);await expect(next).toHaveText('保存进展');await next.click();await expect(warning).toHaveClass('notice warning');await expect(warning).toHaveText('请填写并确认维修说明。');
  const note=editor.locator('[data-profile-field="note"]');await note.getByRole('button',{name:'编辑维修说明',exact:true}).click();await expect(note.getByRole('textbox')).toHaveCSS('outline-style','none');await expect(note.locator('.copy-button')).toHaveCount(0);await next.evaluate(el=>(el as HTMLElement).click());await expect(page).toHaveURL(/edit=1$/);
  await note.getByRole('textbox').fill('取消草稿');await note.getByRole('textbox').press('Escape');await expect(note.locator('code')).toHaveText('—');
  await edit('status','维修状态','waiting_parts',true);await edit('expectedCompletionAt','预计完成时间','2030-10-21T15:30');await edit('note','维修说明','已排查线路\n等待新配件');
  const progressEndpoint='**/api/v1/repairs/'+repairId+'/progress';await page.route(progressEndpoint,route=>route.fulfill({status:503,json:{error:{message:'进展保存失败，请重试。'}}}));await next.click();await expect(warning).toHaveText('进展保存失败，请重试。');await page.unroute(progressEndpoint);
  let release!:()=>void,submissions=0;const gate=new Promise<void>(resolve=>{release=resolve;});await page.route(progressEndpoint,async route=>{submissions++;await gate;await route.continue();});await next.click();await expect.poll(()=>submissions).toBe(1);await expect(next).toHaveAttribute('aria-disabled','true');await next.evaluate(el=>(el as HTMLElement).click());release();await expect(page).toHaveURL(origin+base+'action-2?record='+id);await page.unroute(progressEndpoint);assert.equal(submissions,1);
  await expect(field('工单状态')).toHaveText('等待配件');await expect(field('维修说明')).toHaveText('已排查线路\n等待新配件');await expect(field('预计完成时间')).not.toHaveText('—');await expect(frame.locator('[data-dorma-repair-history]')).toContainText('已排查线路');assert(await shell!.evaluate(el=>el.isConnected));
  const stored=await call(owner,'maintenance/'+id);assert.equal(stored.repair_status,'waiting_parts');assert(stored.expected_completion_at);
  await page.reload();await expect(field('维修说明')).toHaveText('已排查线路\n等待新配件');await expect(frame.getByText('操作已保存。',{exact:true})).toHaveCount(0);
  await frame.locator('#docs-sidebar a[title="完成工单"]').click();await expect(list.locator('a')).toHaveCount(1);await list.locator('a').click();await next.click();await expect(frame.locator('#docs-info h1')).toHaveText('确认完工');await expect(next).toHaveText('确认完工');await next.click();await expect(warning).toHaveText('请填写并确认实际工时（小时）。');
  const hours=editor.locator('[data-profile-field="hours"]');await hours.getByRole('button',{name:'编辑实际工时（小时）',exact:true}).click();await hours.locator('input').fill('0');await hours.getByRole('button',{name:'确认',exact:true}).click();await expect(warning).toHaveText('实际工时必须大于0且不超过999999小时。');assert.equal(await warning.evaluate(el=>Boolean(el.closest('.code-preview'))),false);
  await hours.locator('input').fill('1.5');await hours.getByRole('button',{name:'确认',exact:true}).click();await edit('note','维修结果','已更换零件并测试通过');await edit('materials','使用材料','电源板、连接线');
  await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-processing-complete.png'});await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/maintenance-processing-mobile.png'});await next.scrollIntoViewIfNeeded();await page.screenshot({path:'docs/qa/backend/maintenance-processing-footer-mobile.png'});
  await next.click();await expect(page).toHaveURL(origin+base+'action-3?record='+id);await expect(field('工单状态')).toHaveText('已完成');await expect(field('使用材料')).toHaveText('电源板、连接线');await expect(field('实际工时（小时）')).toHaveText('1.50');await expect(next).toHaveCount(0);assert.equal((await call(owner,'maintenance/'+id)).processing_description,'已更换零件并测试通过');
  await previous.click();await expect(frame.locator('.notice.info')).toHaveText('暂无记录。');await page.goto(origin+base+'action-3?record='+id+'&edit=1');await expect(frame.locator('.notice.info')).toContainText('当前状态不能执行此操作');await expect(editor).toHaveCount(0);
  // Fresh state validation must reject changes made after opening the editor.
  const own=(await call(owner,'maintenance?status=accepted&limit=100') as Row[])[0];await call(owner,'repairs/'+own.repair_id+'/start',{});await page.goto(origin+base+'action-2?record='+own.maintenance_id+'&edit=1');await expect(editor).toBeVisible();await edit('note','维修说明','尚未保存的草稿');await call(owner,'repairs/'+own.repair_id+'/complete',{note:'其他窗口已完工',hours:1});await next.click();await expect(warning).toHaveText('工单状态已变化，当前不能执行此操作，请返回详情查看。');assert.equal((await call(owner,'maintenance/'+own.maintenance_id)).processing_description,'其他窗口已完工');
  for(const record of [String(foreign.maintenance_id),'0','invalid','9999999999999999999']){await page.goto(origin+base+'action-2?record='+record+'&edit=1');await expect(warning).toHaveClass('notice warning');await expect(editor).toHaveCount(0);}
  const denied=await owner.request.post(origin+'/api/v1/repairs/'+foreign.repair_id+'/start',{headers:{Origin:origin,'X-CSRF-Token':String(worker.csrfToken)},data:{}});assert.equal(denied.status(),403);assert.equal((await call(peer,'maintenance/'+foreign.maintenance_id)).repair_status,'accepted');
  assert.deepEqual(errors,[]);console.log('维修处理通过：三类导航及详情、真实开始/进展/完工、代码框确认取消与候选项、时间材料工时保存、WARNING/INFO、失败重试/重复提交/过期状态、分页刷新返回、权限与手机布局。');
 }finally{await owner.close();await peer.close();await student.close();await admin.close();}
}
