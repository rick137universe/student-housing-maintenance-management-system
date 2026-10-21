import assert from 'node:assert/strict';
import {expect,type Browser,type BrowserContext} from '@playwright/test';
import {expectStudentReveal} from './student-transitions';
import {expectStudentBreadcrumbSpacing} from './student-breadcrumbs';

type Row=Record<string,unknown>;
export async function maintenanceAnalyticsRegression(browser:Browser,origin:string,password:string){
 const admin=await browser.newContext(),student=await browser.newContext(),owner=await browser.newContext({viewport:{width:1440,height:1000}}),peer=await browser.newContext();
 const page=await owner.newPage(),errors:string[]=[],accounts=new Map<BrowserContext,Row>();page.on('pageerror',error=>errors.push(error.message));
 async function call(context:BrowserContext,path:string,body?:object){
  const response=body?await context.request.post(origin+'/api/v1/'+path,{headers:{Origin:origin,'X-CSRF-Token':String(accounts.get(context)?.csrfToken??'')},data:body}):await context.request.get(origin+'/api/v1/'+path);
  const result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));return result.data;
 }
 async function login(context:BrowserContext,username:string){const account=await call(context,'auth/login',{username,password});accounts.set(context,account);return account;}
 const selector='[data-dorma-maintenance-frame]',frame=page.frameLocator(selector),base='/workspace/maintenance/analytics/',months=frame.locator('[data-dorma-statistics-months] a'),ratings=frame.locator('[data-dorma-maintenance-record-list] a');
 const previous=frame.locator('#docs-info .prev-link a'),next=frame.locator('#docs-info .next-link a'),warning=frame.getByRole('alert'),field=(label:string)=>frame.getByRole('heading',{name:label,exact:true}).locator('+ pre code');
 try{
  await login(admin,'admin');const username='mtAnalytics'+Date.now();await call(admin,'accounts',{username,fullName:'个人统计回归',role:'maintenance',password});
  const worker=await login(owner,username),other=await login(peer,'mt009');await login(student,'stu202602341');
  for(const action of ['action-1','action-2','action-3']){
   await page.goto(origin+base+action);await expect(frame.locator('.notice.info')).toHaveText('暂无记录。');
   await expect(frame.locator('[data-dorma-maintenance-business-host], [data-dorma-live-workspace] table, [data-dorma-live-workspace] input, [data-dorma-live-workspace] select')).toHaveCount(0);
   if(action==='action-1')await expect(field('获派工单总数')).toHaveText('0');if(action==='action-2')await expect(field('总体完成率')).toHaveText('0.00%');if(action==='action-3')await expect(field('平均评分')).toHaveText('—');
  }
  async function create(context:BrowserContext,technicianId:string,status:string,index:string,rating=5){
   const repair=await call(student,'repairs',{roomId:'NY3-502',faultType:'水电设施',description:'统计验证 '+index,phone:'13800001234'}),id=String(repair.repair_id);
   await call(admin,'repairs/'+id+'/review',{decision:'approve'});await call(admin,'repairs/'+id+'/dispatch',{technicianId});
   if(status!=='dispatched')await call(context,'repairs/'+id+'/accept',{});
   if(!['dispatched','accepted'].includes(status))await call(context,'repairs/'+id+'/start',{});
   if(status==='waiting_parts')await call(context,'repairs/'+id+'/progress',{status,note:'等待配件'});
   if(['completed','evaluated'].includes(status))await call(context,'repairs/'+id+'/complete',{note:'测试通过',materials:'密封圈',hours:1.5});
   if(status==='evaluated')await call(student,'repairs/'+id+'/evaluate',{rating,note:'服务评价 '+index});
   const rows=await call(context,'maintenance?limit=100') as Row[];return rows.find(row=>String(row.repair_id)===id)!;
  }
  const own:Row[]=[];for(const status of ['dispatched','accepted','in_progress','waiting_parts','completed'])own.push(await create(owner,String(worker.id),status,status));
  for(let i=0;i<21;i++)own.push(await create(owner,String(worker.id),'evaluated',String(i),i===0?1:5));
  const foreign=await create(peer,String(other.id),'evaluated','其他人员',1),stats=await call(owner,'statistics'),workload=stats.workload as Row[],repairs=stats.repairs as Row;
  assert.equal(Number(repairs.total_repairs),26);assert.equal(Number(repairs.completed_repairs),22);assert.equal(Number(repairs.rating_count),21);assert.equal(Number(repairs.average_rating),4.81);
  await page.goto(origin+base+'action-1');await expect(field('获派工单总数')).toHaveText('26');await expect(field('已完成工单')).toHaveText('22');await expect(months).toHaveCount(workload.length);await expect(frame.locator('#docs-info')).not.toContainText('待缴金额');
  const shell=await frame.locator('#docs-demos').elementHandle(),month=String(workload.at(-1)!.month),monthly=workload.at(-1)!;
  await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-analytics-workload.png'});
  await expectStudentReveal(page,()=>months.first().click(),'每月工作量详情',selector);await expect(page).toHaveURL(origin+base+'action-1?month='+month);await expect(field('派工月份')).toHaveText(month);await expect(field('派工数量')).toHaveText(String(monthly.assigned));await expect(field('完成数量')).toHaveText(String(monthly.completed));await expect(next).toHaveCount(0);await expect(previous).toHaveAttribute('href',base+'action-1');await expectStudentBreadcrumbSpacing(page,selector);
  await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);await expect(frame.locator('[data-dorma-repair-values] .copy-button').first()).toBeVisible();await previous.click();await expect(months).toHaveCount(workload.length);
  await frame.locator('#docs-sidebar a[title="完成率"]').click();await expect(field('未完成工单')).toHaveText('4');await expect(field('总体完成率')).toHaveText('84.62%');await expect(months.first()).toContainText('84.62%');
  await expectStudentReveal(page,()=>months.first().click(),'每月完成率详情',selector);await expect(field('完成率')).toHaveText('84.62%');await expect(field('未完成数量')).toHaveText('4');await expect(next).toHaveCount(0);assert(await shell!.evaluate(el=>el.isConnected));await page.reload();await expect(field('完成率')).toHaveText('84.62%');
  await frame.locator('#docs-sidebar a[title="服务评价"]').click();await expect(field('平均评分')).toHaveText('4.81 分');await expect(field('评价数量')).toHaveText('21');await expect(ratings).toHaveCount(20);await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-analytics-ratings-list.png'});await expect(ratings.first()).toContainText('5 分');await expect(frame.locator('[data-dorma-maintenance-record]')).toContainText('第1/2页');
  await frame.getByRole('link',{name:'下一页',exact:true}).click();await expect(ratings).toHaveCount(1);await ratings.click();await expect(frame.locator('#docs-info h1')).toHaveText('服务评价详情');await expect(field('服务评分')).toHaveText('1');await expect(field('评价内容')).toHaveText('服务评价 0');await expect(field('使用材料')).toHaveText('密封圈');await expect(next).toHaveCount(0);await expect(previous).toHaveAttribute('href',base+'action-3?page=2');
  await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-analytics-rating.png'});await page.setViewportSize({width:390,height:844});assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);await page.screenshot({path:'docs/qa/backend/maintenance-analytics-rating-mobile.png'});await previous.click();await expect(ratings).toHaveCount(1);
  await page.goto(origin+base+'action-2?month='+month);await expect(field('完成率')).toHaveText('84.62%');await expect(frame.locator('#docs-info')).toHaveCSS('opacity','1');await page.screenshot({path:'docs/qa/backend/maintenance-analytics-month-mobile.png'});
  for(const invalid of ['invalid','2026-13','1900-01']){await page.goto(origin+base+'action-1?month='+invalid);await expect(warning).toHaveClass('notice warning');await expect(frame.locator('[data-dorma-repair-values]')).toHaveCount(0);}
  for(const record of [String(foreign.maintenance_id),String(own[0].maintenance_id),'0','invalid','9999999999999999999']){await page.goto(origin+base+'action-3?record='+record+'&edit=1');await expect(warning).toHaveClass('notice warning');await expect(frame.locator('[data-dorma-repair-values]')).toHaveCount(0);await expect(next).toHaveCount(0);}
  await page.route('**/api/v1/statistics',route=>route.fulfill({status:503,json:{error:{message:'统计暂不可用，请重试。'}}}));await page.goto(origin+base+'action-1');await expect(warning).toHaveText('统计暂不可用，请重试。');await page.unroute('**/api/v1/statistics');await frame.getByRole('button',{name:'重试',exact:true}).click();await expect(field('获派工单总数')).toHaveText('26');
  // Finishing a repair in the same shell must invalidate the cached summary.
  await page.setViewportSize({width:1440,height:1000});await frame.locator('#docs-sidebar a[title="维修处理"]').click();await frame.locator('#docs-sidebar a[title="完成工单"]').click();await frame.locator('[data-dorma-maintenance-record-list] a').first().click();await expect(field('工单状态')).toBeVisible();await expect(next).toHaveText('确认完工');await next.click();await expect(frame.locator('[data-dorma-maintenance-processing-editor]')).toBeVisible();
  const editor=frame.locator('[data-dorma-maintenance-processing-editor]');for(const [key,label,value] of [['note','维修结果','统计缓存更新'],['hours','实际工时（小时）','2']]){const box=editor.locator(`[data-profile-field="${key}"]`);await box.getByRole('button',{name:'编辑'+label,exact:true}).click();await box.locator('textarea,input').fill(value);await box.getByRole('button',{name:'确认',exact:true}).click();}await next.click();await expect(field('工单状态')).toHaveText('已完成');
  await frame.locator('#docs-sidebar a[title="个人统计"]').click();await frame.locator('#docs-sidebar a[title="完成率"]').click();await expect(field('已完成工单')).toHaveText('23');await expect(field('总体完成率')).toHaveText('88.46%');
  await login(owner,'mt009');await page.reload();const peerStats=await call(owner,'statistics');await expect(field('获派工单总数')).toHaveText(String(peerStats.repairs.total_repairs));await expect(field('总体完成率')).toHaveText(String(peerStats.repairs.completion_rate)+'%');
  await expect(frame.getByText('正在读取…',{exact:true})).toHaveCount(0);assert.deepEqual(errors,[]);console.log('个人统计通过：零数据、真实工作量/完成率/评分、每月导航与只读详情、评价分页返回、INFO/WARNING与重试、完工后缓存刷新、未评价/非法/越权隔离、渐显与手机布局。');
 }finally{await owner.close();await peer.close();await student.close();await admin.close();}
}
