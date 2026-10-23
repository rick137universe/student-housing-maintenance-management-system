import {canonicalWorkspaceUrl} from '../src/data/workspace-paths';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {adminPages} from '../src/data/admin-pages';
import {studentPages} from '../src/data/student-pages';
import adminPreviews from '../src/data/admin-previews.json';
import adminRandomPreviews from '../src/data/admin-random-previews.json';

// Keep the copied mother styles, navigation and animated previews unchanged.
const root='public/assets/admin/';
await mkdir(root+'pages',{recursive:true});
const palette=['red','corail','orange','yellow','citrus','lime','green','turquoise','cyan','sky'];
const html=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const index=await readFile('public/assets/student/index.html','utf8');
const source=await readFile('public/assets/student/pages/personal-overview.html','utf8');
const personalTemplates=Object.fromEntries(await Promise.all(['action-1','action-2','action-3'].map(async action=>[action,await readFile(`public/assets/student/pages/personal-${action}.html`,'utf8')])));
const notificationTemplate=await readFile('public/assets/student/pages/notifications-action-1.html','utf8');
const arrow=source.match(/<li class="next-link">[\s\S]*?(<svg[\s\S]*?<\/svg>)/)![1];
const prevArrow=source.match(/<li class="prev-link">[\s\S]*?(<svg[\s\S]*?<\/svg>)/)![1];
const link=(entry:typeof adminPages[number])=>`<a class="text-ui color-${palette[entry.color]}" data-id="${entry.id}" data-color="${entry.color}" href="${entry.url}" title="${html(entry.label)}">${html(entry.label)}${arrow}</a>`;
const pageFile=(entry:typeof adminPages[number])=>`pages/${entry.feature}-${entry.action.replaceAll('/','-')}.html`;
const routes=Object.fromEntries(adminPages.map(entry=>[entry.url,`/assets/admin/${pageFile(entry)}`]));
for(const [position,entry] of adminPages.entries()){
 if(['personal','notifications','announcements','billing','backup','permissions','dispatch','process','base-data','reports'].includes(entry.feature)&&entry.action!=='overview'){
  const announcements=['announcements','billing','backup','permissions','dispatch','process','base-data','reports'].includes(entry.feature),notifications=entry.feature==='notifications'||announcements,sourceFeature=notifications?'notifications':'personal',sourceAction=notifications?'action-1':entry.action;
  let result=(notifications?notificationTemplate:personalTemplates[entry.action]).replaceAll(canonicalWorkspaceUrl('/workspace/student/'+sourceFeature+'/'+sourceAction),entry.url)
   .replaceAll('/workspace/student/'+sourceFeature,'/workspace/admin/'+sourceFeature).replaceAll('学生工作台','管理员工作台')
   .replaceAll(`data-color="${notifications?5:0}"`,`data-color="${entry.color}"`)
   .replace(/(<div class="docs-info is-active" data-color="[^"]+" data-id=")[^"]+/,`$1${entry.id}`)
   .replace(/(<p data-dorma-description="">)[\s\S]*?<\/p>/,`$1${html(entry.description)}</p>`)
   .replaceAll('title="个人信息"','title="个人中心"').replaceAll('>个人信息</a>','>个人中心</a>');
  if(announcements)result=result.replaceAll('消息通知',entry.label).replaceAll('个人消息',entry.group).replaceAll('/workspace/admin/notifications','/workspace/admin/'+entry.feature);
  if(entry.parent){const parent=adminPages.find(page=>page.id===entry.parent)!;result=result.replace(new RegExp('(<a title="'+html(entry.group)+'"[^>]*>'+html(entry.group)+'<\\/a>)'),`$1 <span class="docs-breadcrumb-arrow">&#xE0B1;</span> <a title="${html(parent.label)}" href="${parent.url}">${html(parent.label)}</a>`);}
  for(const [direction,neighbor] of [['prev',entry.parent?adminPages.find(page=>page.id===entry.parent):adminPages[position-1]],['next',adminPages[position+1]]] as const){
   const anchor=neighbor?`<a class="text-ui color-${palette[neighbor.color]}" data-color="${neighbor.color}" data-id="${neighbor.id}" href="${neighbor.url}" title="${html(neighbor.label)}">${direction==='prev'?prevArrow+html(neighbor.label):html(neighbor.label)+arrow}</a>`:'';
   result=result.replace(new RegExp(`<li class="${direction}-link">[\\s\\S]*?</li>`),`<li class="${direction}-link">${anchor}</li>`);
  }
  if(announcements)result=result.replace(/<div class="prev-next-heading text-ui">[\s\S]*?<\/div>/,`<div class="prev-next-heading text-ui"><h6 class="links-list-heading">${entry.parent||adminPages[position-1]?'上一个':''}</h6><h6 class="links-list-heading">${adminPages[position+1]?'下一个':''}</h6></div>`);
  await writeFile(root+pageFile(entry),result);continue;
 }
 const result=source.replace(/<title>[\s\S]*?<\/title>/,`<title>${entry.label==='管理员工作台'?'':html(entry.label)+' | '}管理员工作台 | FLight</title>`)
  .replace(/(<div class="docs-info is-active" data-color=")[^"]+(" data-id=")[^"]+/,`$1${entry.color}$2${entry.id}`);
 const start=result.indexOf('<div class="docs-info-content'),end=result.indexOf('<footer id="site-footer"',start);
 const children=adminPages.filter(child=>entry.feature==='overview'?child.action==='overview'&&child.feature!=='overview':child.feature===entry.feature&&child.action!=='overview'&&!child.parent);
 const header=`<div class="docs-info-content formatted-text"${entry.action==='overview'?'':' hidden'}><h1 data-color="${entry.color}"><a href="${entry.url}">${html(entry.label)}</a></h1><p data-dorma-description="">${html(entry.description)}</p></div>`;
 const content=entry.action==='overview'?`<h6 class="links-list-heading">${entry.feature==='overview'?'功能模块':'本模块功能'}</h6><ul class="links-list links-list-boxed">${children.map(child=>'<li>'+link(child)+'</li>').join('')}</ul>`:'<div data-dorma-business=""></div>';
 const previous=adminPages[position-1],next=adminPages[position+1];
 const navigation=`<div class="prev-next-heading text-ui"><h6 class="links-list-heading">${previous?'上一个':''}</h6><h6 class="links-list-heading">${next?'下一个':''}</h6></div><ul class="links-list links-list-boxed prev-next-links"><li class="prev-link">${previous?link(previous).replace(arrow,'').replace('>'+html(previous.label), '>'+prevArrow+html(previous.label)):''}</li><li class="next-link">${next?link(next):''}</li></ul>`;
 await writeFile(root+`pages/${entry.feature}-${entry.action}.html`,result.slice(0,start)+header+content+navigation+result.slice(end));
}
const sidebarItem=(entry:typeof adminPages[number]):string=>{
 const children=adminPages.filter(page=>page.parent===entry.id);
 return `<li class="docs-nav-item docs-action color-${palette[entry.color]}" data-color="${entry.color}"><a class="docs-link" data-id="${entry.id}" href="${entry.url}" title="${html(entry.label)}">${html(entry.label)}</a>${children.length?'<ul class="docs-nav-item">'+children.map(sidebarItem).join('')+'</ul>':''}</li>`;
};
const sidebar=adminPages.filter(entry=>entry.action==='overview'&&entry.feature!=='overview').map(group=>`<li class="docs-nav-item docs-group color-${palette[group.color]}" data-color="${group.color}"><a class="docs-link" data-id="${group.id}" href="${group.url}" title="${html(group.label)}">${html(group.label)}</a><ul class="docs-nav-item">${adminPages.filter(entry=>entry.feature===group.feature&&entry.action!=='overview'&&!entry.parent).map(sidebarItem).join('')}</ul></li>`).join('');
let shell=index.replace(/<title>[^<]*<\/title>/,'<title>管理员工作台 | FLight</title>')
 .replace(/<aside id="docs-sidebar"[\s\S]*?<\/aside>/,`<aside id="docs-sidebar" class="sidebar"><nav class="sidebar-nav text-ui"><ul class="docs-nav-item is-active">${sidebar}</ul></nav></aside>`)
 .replaceAll('/workspace/student','/workspace/admin')
 .replaceAll('搜索学生服务','搜索管理功能')
 .replace("demos: '/assets/student/assets/html/student-demos.html'","demos: '/assets/admin/demos.html'")
 .replace('./assets/js/student-bridge.js','/assets/admin/bridge.js');
const statisticsNavigation=(await readFile('public/assets/statistics/index.html','utf8')).match(/<li><a[^>]*data-dorma-statistics-link=""[^>]*>[\s\S]*?<\/a><\/li>/)![0].replace(' is-active','');
shell=shell.replace(/<li><a class="main-nav-link[^"]*"[^>]*title="工作台"[^>]*>[\s\S]*?<\/a><\/li>/,item=>item+statisticsNavigation);
shell=shell.replace('window.paths = {','window.dormaDocumentationRoutes = '+JSON.stringify(routes)+';\n  window.paths = {');
await writeFile(root+'index.html',shell);
await writeFile(root+'entries.js','const entries = '+JSON.stringify(adminPages,null,2)+';\nexport default entries;\n');
const originals=await readFile('public/assets/student/assets/html/documentation-demos.html','utf8');
const studentDemos=await readFile('public/assets/student/assets/html/student-demos.html','utf8');
const demos=adminPages.map(entry=>{
 const shared=['personal','notifications'].includes(entry.feature)&&entry.action!=='overview'?studentPages.find(page=>page.feature===entry.feature&&page.action===entry.action):undefined;
 const sourceId=shared?.id??adminPreviews.find(preview=>preview.url===entry.url)?.source??adminRandomPreviews.find(preview=>preview.url===entry.url)?.source??(entry.action==='overview'&&entry.feature!=='overview'?'getting-started':entry.id);
 const article=(shared?studentDemos:originals).match(new RegExp(`<article[^>]*data-id="${sourceId}"[\\s\\S]*?</article>`))?.[0];
 if(!article)throw new Error('Missing mother preview '+sourceId);
 return article.replaceAll(sourceId,entry.id).replace(/data-color="[^"]+"/,`data-color="${entry.color}"`).replace(/(<h2 class="text-ui">)[\s\S]*?<\/h2>/,`$1${html(entry.label)}</h2>`);
});
await writeFile(root+'demos.html',demos.join('\n').replace(/[ \t]+$/gm,''));
console.log(`已生成管理员母版外壳、10 个模块目录和 ${adminPages.filter(entry=>entry.action!=='overview').length} 个业务页面入口。`);
