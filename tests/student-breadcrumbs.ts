import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expect,type Page} from '@playwright/test';
import {studentPages} from '../src/data/student-pages';

let reference:string|undefined;
export async function expectStudentBreadcrumbSpacing(page:Page,frameSelector='[data-dorma-student-frame]'){
 const frame=page.frameLocator(frameSelector);
 await expect(frame.locator('#toggle-search')).toBeEnabled();
 if(!reference){
  const source=await readFile('D:/Development/Anime.js/public/sites/animejs-com-23cc7dc7/documentation--animation--animatable-properties--css-properties-d413c831/index.html','utf8');
  reference=source.match(/<div class="docs-breadcrumb text-ui"[\s\S]*?<\/div>/)![0];
 }
 const breadcrumb=frame.locator('#docs-info .docs-breadcrumb');
 const measured=await breadcrumb.evaluate((element,html)=>{
  const doc=element.ownerDocument,copy=doc.createElement('div');copy.innerHTML=html;
  const native=copy.firstElementChild as HTMLElement;
  native.style.position='absolute';native.style.visibility='hidden';native.style.whiteSpace='nowrap';
  element.parentElement!.append(native);
  try{
   const links=element.querySelectorAll('p:first-child > a'),sampleLinks=native.querySelectorAll('p:first-child > a');
   sampleLinks[0].textContent=links[0].textContent;sampleLinks[1].textContent=links[1]?.textContent??'目录';
   const sample=native.querySelector('.docs-breadcrumb-arrow')!,rect=sample.getBoundingClientRect();
   const expected=[rect.left-sample.previousElementSibling!.getBoundingClientRect().right,sample.nextElementSibling!.getBoundingClientRect().left-rect.right];
   const actual=[...element.querySelectorAll('p:first-child > .docs-breadcrumb-arrow')].map(arrow=>{
    const bounds=arrow.getBoundingClientRect();
    return {gaps:[bounds.left-arrow.previousElementSibling!.getBoundingClientRect().right,arrow.nextElementSibling!.getBoundingClientRect().left-bounds.right],spaces:[arrow.previousSibling,arrow.nextSibling].map(node=>node?.nodeType===3&&/^\s+$/.test(node.textContent??''))};
   });
   return {expected,actual};
  }finally{native.remove();}
 },reference);
 for(const item of measured.actual){
  assert.deepEqual(item.spaces,[true,true],'分隔符前后都应保留母版的空白文本');
  item.gaps.forEach((gap,index)=>assert(Math.abs(gap-measured.expected[index])<0.1,`目录分隔符间距 ${gap} 应与母版 ${measured.expected[index]} 一致`));
 }
}

export async function studentBreadcrumbRegression(page:Page){
 const origin=new URL(page.url()).origin,frame=page.frameLocator('[data-dorma-student-frame]');
 for(const entry of studentPages.filter(entry=>entry.action!=='overview')){
  await page.goto(origin+entry.url);await expect(frame.locator('#docs-info h1')).toHaveText(entry.label);
  await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',entry.id);
  await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveCount(entry.parent?2:1);
  await expectStudentBreadcrumbSpacing(page);
 }
 console.log('目录间距回归通过：所有学生功能及三级子页直达时，分隔符两侧空白和实际间距与只读母版一致。');
}
