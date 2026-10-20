import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {managerPages} from '../src/data/manager-pages';

// Reuse the student's copied mother shell; only role metadata and routes differ.
const root='public/assets/manager/';
await mkdir(root+'pages',{recursive:true});
const palette=['red','corail','orange','yellow','citrus','lime','green'];
const html=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const index=await readFile('public/assets/student/index.html','utf8');
const source=await readFile('public/assets/student/pages/personal-overview.html','utf8');
const arrow=source.match(/<li class="next-link">[\s\S]*?(<svg[\s\S]*?<\/svg>)/)![1];
const link=(entry:typeof managerPages[number])=>`<a class="text-ui color-${palette[entry.color]}" data-id="${entry.id}" data-color="${entry.color}" href="${entry.url}" title="${html(entry.label)}">${html(entry.label)}${arrow}</a>`;
const routes=Object.fromEntries(managerPages.map(entry=>[entry.url,`/assets/manager/pages/${entry.feature}-${entry.action}.html`]));
function page(entry:typeof managerPages[number]){
 const result=source.replace(/<title>[\s\S]*?<\/title>/,`<title>${html(entry.label)} · 宿管工作台</title>`)
  .replace(/(<div class="docs-info is-active" data-color=")[^"]+(" data-id=")[^"]+/,`$1${entry.color}$2${entry.id}`);
 const start=result.indexOf('<div class="docs-info-content'),end=result.indexOf('<footer id="site-footer"',start);
 const children=managerPages.filter(child=>entry.feature==='overview'?child.action==='overview'&&child.feature!=='overview':child.feature===entry.feature&&child.action!=='overview');
 const header=`<div class="docs-info-content formatted-text"${entry.action==='overview'?'':' hidden'}><h1 data-color="${entry.color}"><a href="${entry.url}">${html(entry.label)}</a></h1><p data-dorma-description="">${html(entry.description)}</p></div>`;
 const content=entry.action==='overview'?`<h6 class="links-list-heading">${entry.feature==='overview'?'功能模块':'本模块功能'}</h6><ul class="links-list links-list-boxed">${children.map(child=>'<li>'+link(child)+'</li>').join('')}</ul>`:'<div data-dorma-business=""></div>';
 return result.slice(0,start)+header+content+result.slice(end);
}
for(const entry of managerPages)await writeFile(root+`pages/${entry.feature}-${entry.action}.html`,page(entry));
const sidebar=managerPages.filter(entry=>entry.action==='overview'&&entry.feature!=='overview').map(group=>`<li class="docs-nav-item docs-group color-${palette[group.color]}" data-color="${group.color}"><a class="docs-link" data-id="${group.id}" href="${group.url}" title="${html(group.label)}">${html(group.label)}</a><ul class="docs-nav-item">${managerPages.filter(entry=>entry.feature===group.feature&&entry.action!=='overview').map(entry=>`<li class="docs-nav-item docs-action color-${palette[entry.color]}" data-color="${entry.color}"><a class="docs-link" data-id="${entry.id}" href="${entry.url}" title="${html(entry.label)}">${html(entry.label)}</a></li>`).join('')}</ul></li>`).join('');
let shell=index.replace(/<title>[^<]*<\/title>/,'<title>宿管工作台</title>')
 .replace(/<aside id="docs-sidebar"[\s\S]*?<\/aside>/,`<aside id="docs-sidebar" class="sidebar"><nav class="sidebar-nav text-ui"><ul class="docs-nav-item is-active">${sidebar}</ul></nav></aside>`)
 .replaceAll('/workspace/student','/workspace/dormManager')
 .replaceAll('搜索学生服务','搜索宿管功能')
 .replace("demos: '/assets/student/assets/html/student-demos.html'","demos: '/assets/manager/demos.html'")
 .replace('./assets/js/student-bridge.js','/assets/manager/bridge.js');
shell=shell.replace('window.paths = {','window.dormaDocumentationRoutes = '+JSON.stringify(routes)+';\n  window.paths = {');
await writeFile(root+'index.html',shell);
await writeFile(root+'entries.js','const entries = '+JSON.stringify(managerPages,null,2)+';\nexport default entries;\n');
const originals=await readFile('public/assets/student/assets/html/documentation-demos.html','utf8');
const demos=managerPages.map(entry=>{
 const article=originals.match(new RegExp(`<article[^>]*data-id="${entry.id}"[\\s\\S]*?</article>`))?.[0];
 if(!article)throw new Error('Missing mother preview '+entry.id);
 return article.replace(/data-color="[^"]+"/,`data-color="${entry.color}"`).replace(/(<h2 class="text-ui">)[\s\S]*?<\/h2>/,`$1${html(entry.label)}</h2>`);
});
await writeFile(root+'demos.html',demos.join('\n'));
console.log(`已生成宿管母版外壳、7 个模块目录和 ${managerPages.filter(entry=>entry.action!=='overview').length} 个业务页面入口。`);
