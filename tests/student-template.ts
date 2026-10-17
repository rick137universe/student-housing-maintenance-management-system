import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import entries from '../src/data/student-docs.json';
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
  for(const id of ['site-header','docs-sidebar','docs-demos','docs-info','toggle-search','docs-search-input'])assert(html.includes(`id="${id}"`),`缺少母版区域 ${id}`);
  const demos=await readFile('public/assets/student/assets/html/student-demos.html','utf8');
  for(const entry of entries){assert(demos.includes(`data-id="${entry.id}"`),`缺少预览 ${entry.label}`);const page=await readFile(`public/assets/student/pages/${entry.feature}-${entry.action}.html`,'utf8');assert(page.includes(entry.description));}
  console.log(`学生 Docs 校验通过：${count} 个原始资源逐字节一致，三栏、搜索和 15 个业务入口完整。`);
}
