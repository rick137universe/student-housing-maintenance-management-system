import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import type {Browser} from '@playwright/test';
import {studentPages} from '../src/data/student-pages';
import {managerPages} from '../src/data/manager-pages';
import {maintenancePages} from '../src/data/maintenance-pages';
import {adminPages} from '../src/data/admin-pages';
import {roleFeatures} from '../src/data/role-features';
import {canonicalWorkspaceUrl,workspaceActionId,workspaceActionPaths} from '../src/data/workspace-paths';

const workspaces=[['student','student',studentPages],['dormManager','manager',managerPages],['maintenance','maintenance',maintenancePages],['admin','admin',adminPages]] as const;

export async function verifyWorkspacePaths(){
 let checked=0;
 for(const [role,asset,pages] of workspaces){
  assert.equal(new Set(pages.map(page=>page.url)).size,pages.length,`${role}: duplicate URL`);
  for(const feature of roleFeatures[role])assert.equal(workspaceActionPaths[role][feature.id]?.length,feature.actions.length,`${role}/${feature.id}: incomplete route names`);
  const index=await readFile(`public/assets/${asset}/index.html`,'utf8');
  assert(!/\/workspace\/[^/]+\/[^/]+\/action-\d+/.test(index),`${role}: legacy sidebar URL`);
  for(const page of pages){
   assert(!/\/action-\d+(?:\/|$)/.test(page.url),page.url);
   if(page.action!=='overview'){
    const legacy=`/workspace/${role}/${page.feature}/${page.action}`;
    assert.equal(canonicalWorkspaceUrl(legacy),page.url);
    assert.equal(workspaceActionId(role,page.feature,page.url.split('/').slice(4).join('/')),page.action);
    assert.equal(canonicalWorkspaceUrl(legacy+'?record=12&page=2#details'),page.url+'?record=12&page=2#details');
   }
   const file=asset==='student'?`${page.feature}-${page.action}`:`${page.feature}-${page.action.replaceAll('/','-')}`;
   const html=await readFile(`public/assets/${asset}/pages/${file}.html`,'utf8');
   assert(html.includes(`href="${page.url}"`),`${page.url}: missing canonical page heading`);
   assert(!/href="\/workspace\/[^/]+\/[^/]+\/action-\d+/.test(html),`${page.url}: legacy page link`);
   checked++;
  }
 }
 console.log(`工作台地址校验通过：${checked} 个页面地址唯一、语义明确，导航和页面片段一致。`);
}

export async function workspaceRedirectRegression(browser:Browser,origin:string){
 const context=await browser.newContext();let checked=0;
 try{
  for(const [role,,pages] of workspaces)for(const page of pages.filter(page=>page.action!=='overview')){
   const query='?page=2&record=12&type=rooms&filter=a%20b&filter=c';
   const response=await context.request.get(`${origin}/workspace/${role}/${page.feature}/${page.action}${query}`,{maxRedirects:0});
   assert.equal(response.status(),308,`${role}/${page.feature}/${page.action}`);
   const target=new URL(response.headers().location,origin);
   assert.equal(target.pathname,page.url);
   assert.deepEqual([...target.searchParams],[...new URL(origin+query).searchParams]);
   checked++;
  }
  console.log(`旧地址兼容通过：${checked} 个子页面永久跳转到业务命名地址，详情、分页及重复筛选参数保持不变。`);
 }finally{await context.close();}
}
