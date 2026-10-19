import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import records from '../src/data/student-records.json';
import {studentPages} from '../src/data/student-pages';
import {expectStudentReveal} from './student-transitions';

export async function studentAccommodationNavigationRegression(page:Page){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
 for(const record of records){
  const parent=studentPages.find(entry=>entry.id===record.parent)!;
  const requests:string[]=[];
  const track=(request:import('@playwright/test').Request)=>{if(request.method()==='GET'&&/\/api\/v1\/(applications|changes)(\?|$)/.test(request.url()))requests.push(request.url());};
  page.on('request',track);
  await page.goto(origin+parent.url);
  await expect(frame.getByRole('button',{name:'提交'+parent.label,exact:true})).toBeVisible();
  await expect(frame.locator('[data-dorma-live-workspace] table')).toHaveCount(0);
  await expect(frame.getByLabel('搜索记录',{exact:true})).toHaveCount(0);
  await expect(frame.locator('[data-student-record-links] a')).toHaveText(record.label);
  await expect(frame.locator('#docs-info .next-link a')).toHaveAttribute('href',record.url);
  page.off('request',track);assert.deepEqual(requests,[],'申请主页不应查询申请记录');
  await expectStudentReveal(page,()=>frame.locator('[data-student-record-links] a').click(),record.label);
  await expect(page).toHaveURL(origin+record.url);
  const selected=frame.locator(`#docs-sidebar .docs-records > a[data-id="${record.id}"]`);
  await expect(selected.locator('..')).toHaveClass(/is-active/);
  await expect(selected.locator('..').locator('..').locator('..')).toHaveClass(/docs-action.*is-active/);
  await expect(frame.getByRole('button',{name:'提交'+parent.label,exact:true})).toHaveCount(0);
  await expect(frame.locator('[data-dorma-accommodation]')).toHaveAttribute('aria-busy','false');
  await expect(frame.locator('[data-dorma-accommodation-list]')).toBeAttached();
  await expect(frame.locator('[data-dorma-live-workspace] table')).toHaveCount(0);
  await expect(frame.getByLabel('搜索记录',{exact:true})).toHaveCount(0);
  await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',parent.url);
  await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['住宿业务',parent.label]);
  await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+parent.url);
  await frame.locator('#docs-info .next-link a').click();await expect(page).toHaveURL(origin+record.url);
  await page.goBack();await expect(frame.locator('#docs-info h1')).toHaveText(parent.label);
  await page.goForward();await expect(frame.locator('#docs-info h1')).toHaveText(record.label);
  await page.reload();await expect(frame.locator('#docs-info h1')).toHaveText(record.label);
  await expect(frame.locator('[data-dorma-accommodation-list]')).toBeAttached();
  await expect(selected.locator('..')).toHaveClass(/is-active/);
  await expect.poll(()=>frame.locator('html').evaluate(element=>element.scrollTop)).toBe(0);
  await frame.locator('#docs-info .docs-breadcrumb a').last().click();await expect(page).toHaveURL(origin+parent.url);
 }
 await frame.locator('#toggle-search').click();await frame.locator('#docs-search-input').fill('入住申请记录');
 const search=frame.locator('#docs-search-results a').filter({hasText:'入住申请记录'}).first();
 await expect(search).toHaveClass(/color-corail/);await search.click();await expect(page).toHaveURL(origin+records[0].url);
 await page.setViewportSize({width:390,height:844});await page.reload();
 await expect(frame.locator('[data-dorma-accommodation-list]')).toBeAttached();
 await frame.locator('#toggle-sidebar').click();await expect(frame.locator('#docs-sidebar')).toHaveClass(/is-active/);
 await expect(frame.locator(`#docs-sidebar .docs-records a[data-id="${records[0].id}"]`)).toBeVisible();
 assert.equal(await frame.locator('html').evaluate(element=>element.scrollWidth>innerWidth),false);
 await page.screenshot({path:'docs/qa/backend/student-accommodation-records-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.goto(origin+studentPages.find(entry=>entry.id===records[0].parent)!.url);
 await page.screenshot({path:'docs/qa/backend/student-accommodation-submit-desktop.png'});
 console.log('住宿导航回归通过：三类申请主页仅提交、三级记录目录、页内及下一页入口、搜索主题、直达刷新、前后返回与手机布局。');
}

export async function expectAccommodationRecord(page:Page,action:number,id:string,status:string){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
 const url=origin+`/workspace/student/accommodation/action-${action}/records`,resource=action===1?'applications':'changes';
 const response=await page.request.get(origin+`/api/v1/${resource}/${id}`);assert.equal(response.status(),200);
 const {data}=await response.json(),business=['入住','调宿','退宿'][action-1];
 const summary=[business,data.original_bed_id??'—',data.new_bed_id??'—',status].join(' · ');
 await page.goto(url);
 const row=frame.locator(`[data-dorma-accommodation-list] a[href$="record=${id}"]`),values=frame.locator('[data-dorma-accommodation-values]');
 const code=(label:string)=>values.getByRole('heading',{name:label,exact:true}).locator('+ pre > code');
 await expect(row).toHaveText(summary);await expect(frame.getByLabel('搜索记录',{exact:true})).toHaveCount(0);
 await expect(frame.locator('[data-dorma-accommodation] table')).toHaveCount(0);
 await expect(row).toHaveClass(/color-corail/);await row.hover();await expect(row).toHaveCSS('color','rgb(255, 125, 54)');
 const title=records[action-1].label.replace(/记录$/,'详情');
 await expectStudentReveal(page,()=>row.click(),title);await expect(page).toHaveURL(url+'?record='+id);
 await expect(code('业务类型')).toHaveText(business);await expect(code('审核状态')).toHaveText(status);
 await expect(code('原床位')).toHaveText(data.original_bed_id??'—');await expect(code('新床位')).toHaveText(data.new_bed_id??'—');
 if(action<3)assert.ok(data.new_bed_id,'办理后的入住及调宿记录应返回真实分配床位');
 await expect(code('申请编号')).toHaveText(id);
 await expect(values.locator('pre .copy-button')).toHaveCount(await values.locator('h3').count());
 await expect(frame.locator('#docs-info .prev-link a')).toHaveText(records[action-1].label);
 await expect(frame.locator('#docs-info .next-link')).toHaveCount(0);
 await expect(frame.locator('#docs-info .docs-breadcrumb a').last()).toHaveText(records[action-1].label);
 await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
 await page.reload();await expect(code('申请编号')).toHaveText(id);
 await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(url);await expect(row).toHaveText(summary);
 await expectStudentReveal(page,()=>page.goBack(),title);await expect(code('申请编号')).toHaveText(id);
 await frame.locator('#docs-info .docs-breadcrumb a').last().click();await expect(page).toHaveURL(url);await expect(row).toHaveText(summary);
 if(action===1){
  await page.setViewportSize({width:390,height:844});await row.click();await expect(code('申请编号')).toHaveText(id);
  assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);
  await page.screenshot({path:'docs/qa/backend/student-accommodation-detail-mobile.png'});await page.setViewportSize({width:1440,height:1000});
 }
 for(const record of ['invalid','9999999999999999999']){
  await page.goto(url+'?record='+record);await expect(frame.locator('[data-dorma-accommodation]').getByRole('alert')).toContainText('不存在或不可访问');await expect(values).toHaveCount(0);
 }
}
