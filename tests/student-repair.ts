import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import entries from '../src/data/student-repair-pages.json';
import {studentPages} from '../src/data/student-pages';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Client={call:(path:string,body?:object)=>Promise<unknown>};
type Row=Record<string,unknown>;
const base='/workspace/student/repair/';

export async function studentRepairNavigationRegression(page:Page){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
 for(const action of [1,2,3]){
  const children=entries.filter(entry=>entry.action.startsWith(`action-${action}/`)),parent=studentPages.find(entry=>entry.id===children[0].parent)!;
  await page.goto(origin+parent.url);await expect(frame.locator('[data-student-record-links] a')).toHaveText(children.map(child=>child.label));
  await expect(frame.locator('[data-dorma-live-workspace]')).toHaveCount(0);
  await expect(frame.locator('#docs-info .next-link a')).toHaveAttribute('href',children[0].url);
  for(const child of children){
   await expectStudentReveal(page,()=>frame.locator(`[data-student-record-links] a[data-id="${child.id}"]`).click(),child.label);
   await expect(frame.locator(`#docs-sidebar a[data-id="${child.id}"]`).locator('..')).toHaveClass(/is-active/);
   await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',child.id);
   await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['报修服务',parent.label]);
   await expect(frame.getByLabel('搜索记录',{exact:true})).toHaveCount(0);
   await expect(frame.locator('[data-dorma-repair] table, [data-dorma-repair] dialog')).toHaveCount(0);
   await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',parent.url);
   await page.reload();await expect(frame.locator('#docs-info h1')).toHaveText(child.label);
   await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
   await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+parent.url);
  }
 }
 await frame.locator('#toggle-search').click();await frame.locator('#docs-search-input').fill('提交报修申请');
 const result=frame.locator('#docs-search-results a').filter({hasText:'提交报修申请'}).first();await expect(result).toHaveClass(/color-yellow/);await result.click();
 await expect(page).toHaveURL(origin+entries[0].url);
}

async function field(page:Page,key:string,value:string,select=false){
 const block=page.frameLocator('[data-dorma-student-frame]').locator(`[data-dorma-repair-form] [data-profile-field="${key}"]`);
 await block.getByRole('button',{name:/^编辑/}).click();
 if(select)await block.getByRole('combobox').selectOption(value);else await block.getByRole('textbox').fill(value);
 await block.getByRole('button',{name:'确认',exact:true}).click();
}
async function get(page:Page,path:string){const response=await page.request.get(new URL('/api/v1/'+path,page.url()).href);assert.equal(response.status(),200);return (await response.json()).data;}
function rowLink(page:Page,id:string){return page.frameLocator('[data-dorma-student-frame]').locator(`[data-dorma-repair-list] a[href$="record=${id}"]`);}

export async function submitStudentRepair(page:Page,description='三栏页面水龙头报修'){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]'),form=frame.locator('[data-dorma-repair-form]');
 await page.goto(origin+base+'action-1');await frame.locator('[data-student-record-links] a').first().click();
 await expect(form.locator('.code-preview-title h2')).toHaveText(['报修房间','故障类型','故障描述','联系电话']);
 const requests:import('@playwright/test').Request[]=[];const track=(request:import('@playwright/test').Request)=>{if(request.method()==='POST'&&request.url()===origin+'/api/v1/repairs')requests.push(request);};page.on('request',track);
 try{
  const send=frame.getByRole('button',{name:'提交申请',exact:true});await send.click();await expect(form.getByRole('alert')).toContainText('报修房间');
  const stay=(await get(page,'occupancies?limit=100')).find((row:Row)=>row.check_out_date===null);assert(stay);
  await field(page,'roomId',stay.room_id,true);await field(page,'faultType','水电设施',true);
  const note=form.locator('[data-profile-field="description"]');await note.getByRole('button',{name:'编辑故障描述',exact:true}).click();
  await note.getByRole('textbox').fill('取消这次编辑');await note.getByRole('button',{name:'取消',exact:true}).click();await expect(note.locator('code')).toHaveText('—');
  await note.getByRole('button',{name:'编辑故障描述',exact:true}).click();await note.getByRole('button',{name:'确认',exact:true}).click();await expect(form.getByRole('alert')).toContainText('故障描述');
  await note.getByRole('textbox').fill(description);await expect(note.getByRole('textbox')).toHaveCSS('outline-style','none');
  await expect(send).toHaveAttribute('aria-disabled','true');await send.dispatchEvent('click');assert.equal(requests.length,0);
  await note.getByRole('button',{name:'确认',exact:true}).click();await field(page,'phone','13800138000');assert.equal(requests.length,0);
  await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);
  await page.screenshot({path:'docs/qa/backend/student-repair-submit-mobile.png'});await page.setViewportSize({width:1440,height:1000});
  await send.click();await expect(page).toHaveURL(origin+base+'action-1/records');await expect(frame.locator('[data-dorma-repair-list] a').first()).toContainText('待初审');
  assert.equal(requests.length,1);assert.deepEqual(requests[0].postDataJSON(),{roomId:stay.room_id,faultType:'水电设施',description,phone:'13800138000'});
  const report=(await get(page,'repairs'))[0];assert.equal(report.fault_description,description);
  await expectStudentReveal(page,()=>rowLink(page,report.repair_id).click(),'报修申请详情');
  await expectStudentBreadcrumbSpacing(page);
  await expect(frame.locator('[data-dorma-repair-values]').getByRole('heading',{name:'故障描述',exact:true}).locator('+ pre > code')).toHaveText(description);
  await expect(frame.locator('#docs-info .next-link')).toHaveCount(0);await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+base+'action-1/records');
  return String(report.repair_id);
 }finally{page.off('request',track);}
}

async function progress(page:Page,id:string,status:string,finished=false){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
 await page.goto(origin+base+'action-2/'+(finished?'records':'current'));await expect(rowLink(page,id)).toContainText(status);
 await expectStudentReveal(page,()=>rowLink(page,id).click(),'报修进度详情');
 await expect(frame.locator('[data-dorma-repair-history]')).toContainText(status);
 await expect(frame.locator('[data-dorma-repair-values] pre .copy-button').first()).toBeVisible();
 await page.reload();await expect(frame.locator('[data-dorma-repair-history]')).toContainText(status);await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
 await frame.locator('#docs-info .prev-link a').click();await expect(rowLink(page,id)).toBeVisible();
 await page.goto(origin+base+'action-2/'+(finished?'current':'records'));
 await expect(frame.locator('[data-dorma-repair]')).toHaveAttribute('aria-busy','false');await expect(rowLink(page,id)).toHaveCount(0);
}

export async function studentRepairWorkflowRegression(page:Page,admin:Client,manager:Client,technician:Client){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
 await studentRepairNavigationRegression(page);const id=await submitStudentRepair(page);
 await progress(page,id,'待初审');
 await page.goto(origin+base+'action-3/submit?record='+id);await expect(frame.getByRole('alert')).toContainText('尚未完工或已经评价');await expect(frame.locator('[data-dorma-repair-form]')).toHaveCount(0);
 await manager.call(`repairs/${id}/review`,{decision:'approve'});
 const tech=(await admin.call('accounts?limit=100') as Row[]).find(row=>row.username==='mt008')!;
 await admin.call(`repairs/${id}/dispatch`,{technicianId:tech.account_id});await technician.call(`repairs/${id}/accept`,{});await technician.call(`repairs/${id}/start`,{});
 await technician.call(`repairs/${id}/progress`,{status:'waiting_parts',note:'浏览器回归等待密封圈',expectedCompletionAt:'2026-12-25T10:00:00+08:00'});
 await progress(page,id,'等待配件');
 await technician.call(`repairs/${id}/complete`,{note:'浏览器回归完工',hours:1,materials:'密封圈'});await progress(page,id,'已完成',true);
 await page.goto(origin+base+'action-3');await frame.locator('[data-student-record-links] a').first().click();await expect(rowLink(page,id)).toBeVisible();
 await expectStudentReveal(page,()=>rowLink(page,id).click(),'提交服务评价');
 const form=frame.locator('[data-dorma-repair-form]'),send=frame.getByRole('button',{name:'提交评价',exact:true});
 await expect(form.locator('.code-preview-title h2')).toHaveText(['服务评分','评价内容']);
 await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',base+'action-3/submit');
 await send.click();await expect(form.getByRole('alert')).toContainText('服务评分');
 await field(page,'rating','5',true);await field(page,'note','已修好');
 await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);
 await page.screenshot({path:'docs/qa/backend/student-repair-evaluate-mobile.png'});await page.setViewportSize({width:1440,height:1000});
 await send.click();await expect(page).toHaveURL(origin+base+'action-3/records');await expect(rowLink(page,id)).toContainText('5 分');
 await rowLink(page,id).click();await expect(frame.locator('#docs-info h1')).toHaveText('服务评价详情');
 await expect(frame.getByRole('heading',{name:'评价内容',exact:true}).locator('+ pre > code')).toHaveText('已修好');
 await page.screenshot({path:'docs/qa/backend/student-repair-evaluation-desktop.png'});
 await page.reload();await expect(frame.getByRole('heading',{name:'评价内容',exact:true}).locator('+ pre > code')).toHaveText('已修好');
 await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+base+'action-3/records');
 await page.goBack();await expect(frame.locator('#docs-info h1')).toHaveText('服务评价详情');
 await page.goto(origin+base+'action-3/submit?record='+id);await expect(frame.getByRole('alert')).toContainText('不能重复提交');await expect(send).toHaveCount(0);
 const report=await get(page,'repairs/'+id);assert.equal(report.repair_status,'evaluated');assert.equal(Number(report.service_rating),5);assert.equal(report.evaluation_content,'已修好');assert.equal(report.materials,'密封圈');
 const rejected=await submitStudentRepair(page,'验证驳回记录');await manager.call(`repairs/${rejected}/review`,{decision:'reject',note:'缺少明确故障位置'});await progress(page,rejected,'已驳回',true);
 const me=await get(page,'auth/me'),foreign=(await admin.call('repairs?limit=100') as Row[]).find(row=>row.student_number!==me.studentNumber);
 const invalid=['invalid','9999999999999999999',...(foreign?[String(foreign.repair_id)]:[])];
 for(const record of invalid){await page.goto(origin+base+'action-3/submit?record='+record);await expect(frame.getByRole('alert')).toBeVisible();await expect(frame.locator('[data-dorma-repair-form]')).toHaveCount(0);await expect(frame.locator('[data-dorma-repair-values]')).toHaveCount(0);}
 console.log('报修六个子页回归通过：三级导航主题与渐显、代码块真实提交、取消及校验、当前/历史进度、审核驳回、等待配件/完工、评价一次、独立详情、刷新返回、复制、非法及跨学生访问和手机布局。');
}
