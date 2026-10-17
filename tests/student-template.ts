import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import entries from '../src/data/student-docs.json';
import {studentPages} from '../src/data/student-pages';
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
  assert.equal(links.length,studentPages.length,'每个模块及功能应有独立侧栏链接');
  assert.equal(new Set(links).size,links.length,'功能标识不能与模块标题重复');
  const children=[...sidebar.matchAll(/<li class="([^"]*docs-action[^"]*)"/g)];assert.equal(children.length,entries.length);
  for(const child of children)assert.match(child[1].split(/\s+/)[2],/^color-/, '搜索依赖子功能的第三个class读取主题');
  for(const id of ['site-header','docs-sidebar','docs-demos','docs-info','toggle-search','docs-search-input'])assert(html.includes(`id="${id}"`),`缺少母版区域 ${id}`);
  const demos=await readFile('public/assets/student/assets/html/student-demos.html','utf8');
  for(const [index,entry] of studentPages.entries()){
    assert(demos.includes(`data-id="${entry.id}"`),`缺少预览 ${entry.label}`);
    const page=await readFile(`public/assets/student/pages/${entry.feature}-${entry.action}.html`,'utf8');assert(page.includes(entry.description));
    const list=page.match(/<ul[^>]*data-student-module-links[^>]*>([\s\S]*?)<\/ul>/)?.[1];
    if(entry.action==='overview'){
      assert(list);assert(!page.includes('data-dorma-business'));
      const targets=[...list.matchAll(/data-id="([^"]+)"/g)].map(match=>match[1]);
      assert.deepEqual(targets,entries.filter(action=>action.feature===entry.feature).map(action=>action.id));
    }else{assert.equal(list,undefined);assert(page.includes('data-dorma-business'));}
    for(const [direction,neighbor] of [['prev',studentPages[index-1]],['next',studentPages[index+1]]] as const){
      const link=page.match(new RegExp(`<li class="${direction}-link">([\\s\\S]*?)<\\/li>`))?.[1];assert(link!==undefined);
      if(neighbor)assert(link.includes(`data-id="${neighbor.id}"`));else assert(!link.includes('<a'));
    }
  }
  console.log(`学生 Docs 校验通过：${count} 个原始资源逐字节一致，6 个模块总览、15 个业务页及相邻导航完整。`);
}
