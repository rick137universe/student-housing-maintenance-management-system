import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';
import entries from '../src/data/student-docs.json';
import {studentPages,studentChildren} from '../src/data/student-pages';

export async function studentThemeRegression(page:Page){
 const frame=page.frameLocator('[data-dorma-student-frame]');
 await expect(frame.locator('#toggle-search')).toBeEnabled();
 const palette=['red','corail','orange','yellow','citrus','lime'];
 const colors=await frame.locator('body').evaluate((body,palette)=>palette.map(theme=>{
  const sample=body.ownerDocument.createElement('span');sample.className='color-'+theme;
  sample.style.color='var(--hex-current-1)';sample.style.backgroundColor='var(--hex-current-2)';body.append(sample);
  const result={primary:getComputedStyle(sample).color,secondary:getComputedStyle(sample).backgroundColor};sample.remove();return result;
 }),palette);
 const groups=[...new Set(entries.map(entry=>entry.feature))];
 for(const [index,feature] of groups.entries()){
  const actions=entries.filter(entry=>entry.feature===feature),first=actions[0];
  assert.equal(first.color,index);
  const group=frame.locator(`#docs-sidebar .docs-group-link[data-feature="${feature}"]`);
  await group.click();
  if(actions.length>1){await frame.locator(`#docs-sidebar .docs-link[data-id="${actions.at(-1)!.id}"]`).click();}
  const link=frame.locator(`#docs-sidebar .docs-link[data-id="${first.id}"]`);
  await link.click();
  await expect(link.locator('..')).toHaveClass(/is-active/);
  await expect(link).toHaveCSS('color',colors[index].primary);
  await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',first.id);
  await expect(frame.locator('.docs-demo.is-active h2').first()).toHaveCSS('color',colors[index].primary);
 }
 await frame.locator('#toggle-search').click();
 await frame.locator('#docs-search-input').fill('个人信息');
 const results=frame.locator('#docs-search-results .docs-search-result');
 await expect(results).not.toHaveCount(0);
 for(let index=0;index<await results.count();index++){
  const result=results.nth(index),href=await result.getAttribute('href');
  const entry=studentPages.find(entry=>entry.url===new URL(href!,page.url()).pathname);assert(entry);
  await expect(result).toHaveClass(new RegExp('color-'+palette[entry.color]));
  const stripe=await result.evaluate(el=>getComputedStyle(el,'::before').backgroundColor);
  const active=(await result.getAttribute('class'))!.includes('is-active');
  assert.equal(stripe,active?colors[entry.color].primary:colors[entry.color].secondary);
 }
 // Search links resolve the same unique child ID as sidebar and preview clicks.
 await results.filter({hasText:'查看个人信息'}).first().click();
 await expect(frame.locator('#docs-sidebar .docs-link[title="查看个人信息"]').locator('..')).toHaveClass(/is-active/);
 await expect(frame.locator('#docs-info h1')).toHaveText('查看个人信息');
 console.log('主题回归通过：母版前六色、六组首个功能选中及搜索结果主题色条。');
}

export async function studentNestedThemeRegression(page:Page){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
 for(const parent of entries.filter(entry=>['accommodation','repair'].includes(entry.feature))){
  const children=studentChildren.filter(entry=>entry.parent===parent.id);
  await page.goto(origin+parent.url);
  await expect(frame.locator('[data-student-record-links] a')).toHaveCount(2);
  const colors=await frame.locator('body').evaluate((body,theme)=>{
   const sample=body.ownerDocument.createElement('span');sample.className='color-'+theme;body.append(sample);
   sample.style.color='var(--hex-current-1)';const active=getComputedStyle(sample).color;
   sample.style.color='var(--hex-fg-2)';const neutral=getComputedStyle(sample).color;
   sample.style.color='var(--hex-fg-1)';const hover=getComputedStyle(sample).color;
   sample.remove();return {active,neutral,hover};
  },parent.feature==='repair'?'yellow':'corail');
  const links=children.map(child=>frame.locator(`#docs-sidebar a[data-id="${child.id}"]`));
  await frame.locator('#docs-info h1').hover();
  for(const link of links){await expect(link.locator('..')).not.toHaveClass(/is-active/);await expect(link).toHaveCSS('color',colors.neutral);}
  for(const [index,link] of links.entries()){
   const other=links[1-index];
   await link.click();await expect(page).toHaveURL(origin+children[index].url);
   await frame.locator('#docs-info h1').hover();
   await expect(link).toHaveCSS('color',colors.active);await expect(other).toHaveCSS('color',colors.neutral);
   await other.hover();await expect(other).toHaveCSS('color',colors.hover);
   await frame.locator('#docs-info h1').hover();await expect(other).toHaveCSS('color',colors.neutral);
   await page.reload();await expect(link).toHaveCSS('color',colors.active);await expect(other).toHaveCSS('color',colors.neutral);
  }
  await page.goBack();await expect(links[0]).toHaveCSS('color',colors.active);await expect(links[1]).toHaveCSS('color',colors.neutral);
  await frame.locator('#toggle-search').click();await frame.locator('#docs-search-input').fill(children[0].label);
  const result=frame.locator('#docs-search-results a').filter({hasText:children[0].label}).first();
  await expect(result).toHaveClass(new RegExp('color-'+(parent.feature==='repair'?'yellow':'corail')));await result.click();await expect(links[0]).toHaveCSS('color',colors.active);await expect(links[1]).toHaveCSS('color',colors.neutral);
 }
 await page.setViewportSize({width:390,height:844});await page.reload();
 await frame.locator('#toggle-sidebar').click();
 const current=studentChildren.find(entry=>entry.feature==='repair'&&entry.action==='action-3/submit')!,other=studentChildren.find(entry=>entry.feature==='repair'&&entry.action==='action-3/records')!;
 await expect(frame.locator(`#docs-sidebar a[data-id="${current.id}"]`)).toHaveCSS('color','rgb(255, 204, 42)');
 await expect(frame.locator(`#docs-sidebar a[data-id="${other.id}"]`)).not.toHaveCSS('color','rgb(255, 204, 42)');
 await page.screenshot({path:'docs/qa/backend/student-sidebar-leaf-colors-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.reload();
 await page.screenshot({path:'docs/qa/backend/student-sidebar-leaf-colors-desktop.png'});
 console.log('三级导航颜色回归通过：住宿与报修六组未选中默认色、选中主题色、母版悬停色、切换与返回、刷新、搜索和手机目录。');
}
