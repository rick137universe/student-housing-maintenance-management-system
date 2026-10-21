import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {studentPages} from '../src/data/student-pages';
import {managerPages} from '../src/data/manager-pages';
import {maintenancePages} from '../src/data/maintenance-pages';
import {adminPages} from '../src/data/admin-pages';

const pagesByRole={student:studentPages,dormManager:managerPages,maintenance:maintenancePages,admin:adminPages};
// Keep the native twelve-cell grid: module overviews first, then common actions.
const shortcuts=Object.fromEntries(Object.entries(pagesByRole).map(([role,pages])=>{
  const overviews=pages.filter(page=>page.action==='overview');
  const commonActions=overviews.flatMap(module=>pages.filter(page=>page.feature===module.feature&&page.action==='action-1'));
  const entries=[...overviews,...commonActions].slice(0,12).map(({label,url,color})=>({label,url,color}));
  assert.equal(entries.length,12,role);
  assert.equal(new Set(entries.map(entry=>entry.url)).size,12,role);
  return [role,entries];
}));
await writeFile('public/assets/home/shortcuts.json',JSON.stringify(shortcuts,null,2)+'\n');

const path='public/assets/home/index.html';
const html=await readFile(path,'utf8');
let index=0;
const updated=html.replace(/(<section id="get-started"[\s\S]*?<ul\b[^>]*>)([\s\S]*?)(<\/ul>)/,(section,start:string,list:string,end:string)=>{
  const links=list.replace(/<a\b[^>]*data-dorma-entry="[^"]*"[^>]*>(<span class="label-dot"><\/span>)[\s\S]*?(<svg\b)/g,(_link,dot:string,svg:string)=>{
    const entry=shortcuts.student[index++];
    return `<a data-color="${entry.color}" href="${entry.url}" target="_top" data-dorma-entry="${entry.url}">${dot}${entry.label} ${svg}`;
  });
  return start+links+end;
});
assert.equal(index,12);
await writeFile(path,updated);
console.log('已同步四端主页入口、语义地址和母版模块颜色。');
