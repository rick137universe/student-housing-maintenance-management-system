import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import submissions from '../src/data/student-submissions.json';
import records from '../src/data/student-records.json';
import {expectStudentReveal} from './student-transitions';

// Only called for the dedicated student created inside the disposable integration database.
export async function submitStudentAccommodation(page:Page,action:number,note:string){
  const origin=new URL(page.url()).origin,entry=submissions[action-1],parent=entry.url.replace(/\/submit$/,'');
  const frame=page.frameLocator('[data-dorma-student-frame]'),editor=frame.locator('[data-dorma-application-editor]');
  const date=editor.locator('[data-profile-field="expectedDate"]'),notes=editor.locator('[data-profile-field="note"]'),building=editor.locator('[data-profile-field="preferredBuildingId"]');
  const requests:import('@playwright/test').Request[]=[];
  const track=(request:import('@playwright/test').Request)=>{if(request.method()==='POST'&&/\/api\/v1\/(applications|changes)$/.test(request.url()))requests.push(request);};
  page.on('request',track);
  try{
    await page.goto(origin+parent);
    await expectStudentReveal(page,()=>frame.locator(`[data-student-record-links] a[data-id="${entry.id}"]`).click(),entry.label);
    await expect(page).toHaveURL(origin+entry.url);await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',parent);
    await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',entry.id);
    await expect(frame.locator('#docs-info .next-link a')).toHaveAttribute('role','button');
    await expect(frame.locator('#docs-sidebar .docs-submit > a[data-id="'+entry.id+'"]').locator('..')).toHaveClass(/is-active/);
    await expect(editor.locator('table,dialog')).toHaveCount(0);
    await expect(editor.locator('.code-preview-title h2')).toHaveText(action===3?['期望办理日期','申请说明']:['意向楼栋','期望办理日期','申请说明']);
    await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(['住宿业务',['入住申请','调宿申请','退宿申请'][action-1]]);
    await page.reload();await expect(editor).toBeVisible();await expect.poll(()=>frame.locator('html').evaluate(el=>el.scrollTop)).toBe(0);
    await frame.locator('#docs-info .prev-link a').click();await expect(page).toHaveURL(origin+parent);
    await frame.locator('#docs-info .next-link a').click();await expect(editor).toBeVisible();
    const send=frame.getByRole('button',{name:'提交申请',exact:true});
    if(action!==3){
      await send.click();await expect(editor.getByRole('alert')).toHaveText('请先选择并确认意向楼栋。');
      await building.getByRole('button',{name:'编辑意向楼栋',exact:true}).click();
      const select=building.getByRole('combobox',{name:'意向楼栋',exact:true});
      await expect(select).toBeFocused();await expect(select).toHaveCSS('outline-style','none');
      await select.selectOption('NY3');await building.getByRole('button',{name:'取消',exact:true}).click();await expect(building.locator('code')).toHaveText('—');
      await building.getByRole('button',{name:'编辑意向楼栋',exact:true}).click();await select.selectOption('NY3');
      await expect(send).toHaveAttribute('aria-disabled','true');await send.dispatchEvent('click');assert.equal(requests.length,0);
      await building.getByRole('button',{name:'确认',exact:true}).click();await expect(building.locator('code')).toContainText('NY3');
    }
    await date.getByRole('button',{name:'编辑期望办理日期',exact:true}).click();
    await date.getByLabel('期望办理日期',{exact:true}).fill('');await date.getByRole('button',{name:'确认',exact:true}).click();
    await expect(editor.getByRole('alert')).toHaveText('请选择有效的期望办理日期。');
    await date.getByLabel('期望办理日期',{exact:true}).fill('2026-12-25');await date.getByLabel('期望办理日期',{exact:true}).press('Enter');
    await expect(date.locator('code')).toHaveText('2026-12-25');
    await notes.getByRole('button',{name:'编辑申请说明',exact:true}).click();await notes.getByLabel('申请说明',{exact:true}).fill('取消这一项');
    await notes.getByRole('button',{name:'取消',exact:true}).click();await expect(notes.locator('code')).toHaveText('—');
    await notes.getByRole('button',{name:'编辑申请说明',exact:true}).click();await notes.getByLabel('申请说明',{exact:true}).fill(note);
    await expect(notes.getByLabel('申请说明',{exact:true})).toHaveCSS('outline-style','none');
    await notes.getByRole('button',{name:'确认',exact:true}).click();await expect(notes.locator('code')).toHaveText(note);
    await expect(editor.getByRole('status')).toHaveCount(0);assert.equal(requests.length,0,'各字段确认只能暂存，不能提前提交申请');
    if(action===1){
      await page.setViewportSize({width:390,height:844});await date.getByRole('button',{name:'编辑期望办理日期',exact:true}).click();
      assert.equal(await frame.locator('html').evaluate(el=>el.scrollWidth>innerWidth),false);
      await page.screenshot({path:'docs/qa/backend/student-application-editor-mobile.png'});
      await date.getByRole('button',{name:'取消',exact:true}).click();await page.setViewportSize({width:1440,height:1000});
      await page.screenshot({path:'docs/qa/backend/student-application-editor-desktop.png'});
    }
    await send.click();await expect(page).toHaveURL(origin+records[action-1].url);
    await expect(frame.locator('[data-dorma-accommodation-list] a').first()).toContainText('待审核');
    assert.equal(requests.length,1,'整份申请只能提交一次');
    assert.deepEqual(requests[0].postDataJSON(),{...(action===3?{}:{preferredBuildingId:'NY3'}),expectedDate:'2026-12-25',note,...(action===1?{}:{type:action===2?'transfer':'checkout'})});
  }finally{page.off('request',track);}
}
