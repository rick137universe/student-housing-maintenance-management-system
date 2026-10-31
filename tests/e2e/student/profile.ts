import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';

export async function studentProfileRegression(page:Page){
  const response=await page.request.get(new URL('/api/v1/profile',page.url()).href);
  assert.equal(response.status(),200);
  const {data}=await response.json();
  const fields=[['账号',data.username],['学号',data.student_number],['姓名',data.full_name],['性别',data.gender==='male'?'男':data.gender==='female'?'女':data.gender],['学院',data.college],['年级',data.grade],['电话',data.phone],['邮箱',data.email]];
  for(const row of data.occupancies)fields.push(['住宿记录',`${row.bed_id} · ${row.check_out_date?'已退宿':'当前入住'}`]);
  const profile=page.frameLocator('[data-dorma-student-frame]').locator('[data-dorma-profile]');
  await expect(profile.locator('h3')).toHaveText(fields.map(([title])=>title));
  await expect(profile.locator('pre > code')).toHaveText(fields.map(([,value])=>String(value??'—')));
  await expect(profile.locator('table')).toHaveCount(0);
  await expect(profile.locator('pre > button.copy-button')).toHaveCount(fields.length);
  const copied=await profile.evaluate(async root=>{
    const clipboard=navigator.clipboard,original=clipboard.writeText;
    let copied='';
    clipboard.writeText=async value=>{copied=value;};
    try{root.querySelector<HTMLButtonElement>('.copy-button')!.click();await Promise.resolve();return copied;}
    finally{clipboard.writeText=original;}
  });
  assert.equal(copied,data.username);
  console.log('个人信息回归通过：真实资料逐项展示、空值和住宿记录、母版复制按钮。');
}
