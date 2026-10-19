import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {studentPages,studentChildren,type StudentPage} from '../src/data/student-pages';

// Synchronize project HTML offline. Mother files are read-only, and its CSS/runtime stay unchanged.
const root='public/assets/student/';
const mother='D:/Development/Anime.js/public/sites/animejs-com-23cc7dc7/';
const palette=['red','corail','orange','yellow','citrus','lime'];
const html=(value:string)=>value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
function elementEnd(source:string,start:number,tag:string){
 const tags=new RegExp(`</?${tag}\\b[^>]*>`,'g');tags.lastIndex=start;let depth=0;
 for(let match;(match=tags.exec(source));){depth+=match[0].startsWith('</')?-1:1;if(depth===0)return tags.lastIndex;}
 throw new Error('Unclosed template element: '+tag);
}
const pages=new Map<string,string>();
for(const entry of studentPages.filter(entry=>!entry.parent))pages.set(entry.id,await readFile(root+`pages/${entry.feature}-${entry.action}.html`,'utf8'));
const overview=pages.get('timer')!;
const arrows=Object.fromEntries(['prev','next'].map(direction=>[direction,overview.match(new RegExp(`<li class="${direction}-link">[\\s\\S]*?(<svg[\\s\\S]*?</svg>)`))![1]]));
function link(entry:StudentPage,direction='next',sidebar=false){
 const text=html(entry.label),arrow=sidebar?'':arrows[direction];
 return `<a class="${sidebar?'docs-link':'text-ui color-'+palette[entry.color]}"${sidebar?'':` data-color="${entry.color}"`} data-id="${entry.id}" title="${text}" href="${entry.url}">${direction==='prev'?arrow+text:text+arrow}</a>`;
}
const nativeSidebar=await readFile(mother+'documentation-ec29569f/index.html','utf8');
const nestedStart=nativeSidebar.indexOf('<ul',nativeSidebar.indexOf('data-id="animation-animatable-properties"'));
const nestedOpening=nativeSidebar.slice(nestedStart,nativeSidebar.indexOf('>',nestedStart)+1);
let index=await readFile(root+'index.html','utf8');
for(const parentId of new Set(studentChildren.map(entry=>entry.parent!))){
 const children=studentChildren.filter(entry=>entry.parent===parentId);
 const entry=children[0];
 const anchor=index.indexOf(`data-id="${entry.parent}"`,index.indexOf('<aside id="docs-sidebar"'));
 const start=index.lastIndexOf('<li',anchor),end=elementEnd(index,start,'li');
 const parent=index.slice(start,index.indexOf('</a>',anchor)+4);
 const child=children.map(entry=>`<li class="docs-nav-item ${entry.kind==='submit'?'docs-submit':'docs-records'} color-corail" data-color="1">${link(entry,'next',true)}</li>`).join('');
 index=index.slice(0,start)+parent+nestedOpening+child+'</ul></li>'+index.slice(end);
}
await writeFile(root+'index.html',index);
const originalBreadcrumb=(await readFile(mother+'documentation--animation--animatable-properties--css-properties-d413c831/index.html','utf8')).match(/<div class="docs-breadcrumb text-ui"[\s\S]*?<\/div>/)![0].replace(/<a class="docs-breadcrumb-version"[\s\S]*?<\/a>/,'');
for(const [position,entry] of studentPages.entries()){
 let page=pages.get(entry.id)??pages.get(entry.parent!)!;
 page=page.replace(/<title>[\s\S]*?<\/title>/,`<title>${html(entry.label)} · 学生工作台</title>`)
  .replace(/(<div class="docs-info is-active" data-color=")[^"]+(" data-id=")[^"]+/,`$1${entry.color}$2${entry.id}`)
  .replace(/<h1[^>]*>[\s\S]*?<\/h1>/,`<h1 data-color="${entry.color}"><a title="${html(entry.label)}" href="${entry.url}">${html(entry.label)}</a></h1>`)
  .replace(/(<p data-dorma-description="">)[\s\S]*?<\/p>/,`$1${html(entry.description)}</p>`)
  .replace(/<h6 class="links-list-heading">(?:申请记录|本页功能)<\/h6>\s*<ul[^>]*data-student-record-links[^>]*>[\s\S]*?<\/ul>/,'');
 if(entry.parent){
  const parent=studentPages.find(candidate=>candidate.id===entry.parent)!,group=studentPages.find(candidate=>candidate.feature===entry.feature&&candidate.action==='overview')!;
  let linkIndex=0;
  const crumbs=originalBreadcrumb.replace('data-color="2"',`data-color="${entry.color}"`).replace(/<a[^>]*>[\s\S]*?<\/a>/g,()=>{
   const target=[group,parent][linkIndex++];return `<a title="${html(target.label)}" href="${target.url}">${html(target.label)}</a>`;
  });
  page=page.replace(/<div class="docs-breadcrumb text-ui"[\s\S]*?<\/div>/,crumbs);
 }
 const children=studentChildren.filter(child=>child.parent===entry.id);
 if(children.length){
  page=page.replace(/<div data-dorma-business=""><\/div>/,'');
  const related=`<h6 class="links-list-heading">本页功能</h6>\n<ul class="links-list links-list-boxed" data-student-record-links="">${children.map(child=>'<li>'+link(child)+'</li>').join('')}</ul>\n`;
  page=page.replace(/(?=\s*<div class="prev-next-heading)/,related);
 }else if(entry.parent&&!page.includes('data-dorma-business')){
  page=page.replace(/(<p data-dorma-description="">[\s\S]*?<\/p>)/,'$1<div data-dorma-business=""></div>');
 }
 for(const [direction,neighbor] of [['prev',entry.parent?studentPages.find(page=>page.id===entry.parent):studentPages[position-1]],['next',studentPages[position+1]]] as const){
  page=page.replace(new RegExp(`<li class="${direction}-link">[\\s\\S]*?</li>`),`<li class="${direction}-link">${neighbor?link(neighbor,direction):''}</li>`);
 }
 const file=root+`pages/${entry.feature}-${entry.action}.html`;await mkdir(dirname(file),{recursive:true});await writeFile(file,page);
}
let demos=await readFile(root+'assets/html/student-demos.html','utf8');
const originals=await readFile(root+'assets/html/documentation-demos.html','utf8');
for(const entry of [...studentChildren].reverse()){
 const expression=new RegExp(`<article[^>]*data-id="${entry.id}"[\\s\\S]*?</article>`);
 demos=demos.replace(expression,'');
 const preview=originals.match(expression)![0].replace(/data-color="[^"]+"/,`data-color="${entry.color}"`).replace(/(<h2 class="text-ui">)[\s\S]*?<\/h2>/,`$1${html(entry.label)}</h2>`);
 const parent=new RegExp(`(<article[^>]*data-id="${entry.parent}"[\\s\\S]*?</article>)`);
 demos=demos.replace(parent,match=>match+'\n'+preview);
}
await writeFile(root+'assets/html/student-demos.html',demos);
await writeFile(root+'assets/js/student-entries.js','const entries = '+JSON.stringify(studentPages,null,2)+';\nexport default entries;\n');
const routes=Object.fromEntries(studentPages.map(entry=>[entry.url,`/assets/student/pages/${entry.feature}-${entry.action}.html`]));
await writeFile(root+'assets/js/documentation-archive-map.js','// Application routes supplied to the unchanged Docs runtime.\nconst routes = '+JSON.stringify(routes,null,2)+';\nexport const documentationArchivePath = url => routes[new URL(url, location.href).pathname] ?? url;\n');
console.log('已同步三级住宿目录、申请记录页面、页内入口与相邻导航。');
