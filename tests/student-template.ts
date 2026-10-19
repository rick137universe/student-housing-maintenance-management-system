import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import entries from '../src/data/student-docs.json';
import {studentPages,studentOverview,studentChildren} from '../src/data/student-pages';
import modules from '../src/data/student-modules.json';
import { roleFeatures } from '../src/data/role-features';

export async function verifyStudentTemplate() {
  const manifest=JSON.parse(await readFile('docs/student-template-source.json','utf8')) as {sha256:Record<string,string>};
  let count=0;
  for(const [file,checksum] of Object.entries(manifest.sha256)){
    if(file==='js/documentation-archive-map.js')continue;
    const actual=await readFile('public/assets/student/assets/'+file);
    assert.equal(createHash('sha256').update(actual).digest('hex'),checksum,`学生母版资源被改写：${file}`);count++;
  }
  assert.deepEqual(entries.map(e=>`${e.feature}/${e.action}`),roleFeatures.student.flatMap(f=>f.actions.map(a=>`${f.id}/${a.id}`)));
  const html=await readFile('public/assets/student/index.html','utf8');
  const sidebar=html.match(/<aside id="docs-sidebar"[\s\S]*?<\/aside>/)?.[0];assert(sidebar);
  const links=[...sidebar.matchAll(/<a class="docs-link[^"]*"[^>]*data-id="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(links.length,studentPages.length-1,'每个模块及功能应有独立侧栏链接');
  assert(html.includes(`href="${studentOverview.url}"`) && html.includes('data-id="docs"'),'总导航使用母版顶部 Docs 入口');
  assert.equal(new Set(links).size,links.length,'功能标识不能与模块标题重复');
  const children=[...sidebar.matchAll(/<li class="([^"]*docs-action[^"]*)"/g)];assert.equal(children.length,entries.length);
  for(const child of children)assert.match(child[1].split(/\s+/)[2],/^color-/, '搜索依赖子功能的第三个class读取主题');
  for(const child of studentChildren){
    assert(sidebar.includes(`class="docs-nav-item ${child.kind==='submit'?'docs-submit':'docs-records'} color-corail"`));
    assert.match(sidebar,new RegExp(`data-id="${child.parent}">[^<]+</a><ul class="docs-nav-item">[\\s\\S]*?data-id="${child.id}"`),'提交和记录必须位于对应申请的第三级目录');
    const parent=await readFile(`public/assets/student/pages/accommodation-${child.action.split('/')[0]}.html`,'utf8');
    assert(parent.includes('data-student-record-links'));assert(parent.includes(`href="${child.url}"`));
  }
  for(const id of ['site-header','docs-sidebar','docs-demos','docs-info','toggle-search','docs-search-input'])assert(html.includes(`id="${id}"`),`缺少母版区域 ${id}`);
  const demos=await readFile('public/assets/student/assets/html/student-demos.html','utf8');
  for(const [index,entry] of studentPages.entries()){
    assert(demos.includes(`data-id="${entry.id}"`),`缺少预览 ${entry.label}`);
    const page=await readFile(`public/assets/student/pages/${entry.feature}-${entry.action}.html`,'utf8');assert(page.includes(entry.description));
    const list=page.match(/<ul[^>]*data-student-module-links[^>]*>([\s\S]*?)<\/ul>/)?.[1];
    if(entry.action==='overview'){
      assert(list);assert(!page.includes('data-dorma-business'));
      const targets=[...list.matchAll(/data-id="([^"]+)"/g)].map(match=>match[1]);
      assert.deepEqual(targets,entry.id===studentOverview.id ? modules.map(group=>group.id) : entries.filter(action=>action.feature===entry.feature).map(action=>action.id));
      assert(!page.includes('class="docs-breadcrumb'));
    }else{
      assert.equal(list,undefined);assert.equal(page.includes('data-dorma-business'),!(entry.feature==='accommodation'&&!entry.parent));
      const group=modules.find(group=>group.feature===entry.feature)!;
      const breadcrumb=page.match(/<div class="docs-breadcrumb text-ui"[\s\S]*?<\/div>/)?.[0];assert(breadcrumb);
      assert(breadcrumb.includes(`data-color="${group.color}"`));
      assert(breadcrumb.includes(`title="${group.label}" href="${group.url}">${group.label}</a>`));
      assert(!breadcrumb.includes('docs-breadcrumb-version'));
    }
    for(const [direction,neighbor] of [['prev',entry.parent?studentPages.find(page=>page.id===entry.parent):studentPages[index-1]],['next',studentPages[index+1]]] as const){
      const link=page.match(new RegExp(`<li class="${direction}-link">([\\s\\S]*?)<\\/li>`))?.[1];assert(link!==undefined);
      if(neighbor)assert(link.includes(`data-id="${neighbor.id}"`));else assert(!link.includes('<a'));
    }
  }
  console.log(`学生 Docs 校验通过：${count} 个原始资源逐字节一致，总导航、6 个模块总览、15 个业务页、${studentChildren.length} 个三级子页面及相邻导航完整。`);
}
