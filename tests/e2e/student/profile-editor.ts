import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';

// Run only with the disposable integration database; this checks real saves.
export async function studentProfileEditorRegression(page:Page){
  const frame=page.frameLocator('[data-dorma-student-frame]');
  const editor=frame.locator('[data-dorma-profile-editor]');
  const before=(await (await page.request.get(new URL('/api/v1/profile',page.url()).href)).json()).data;
  const name=editor.locator('[data-profile-field="fullName"]'),phone=editor.locator('[data-profile-field="phone"]'),email=editor.locator('[data-profile-field="email"]');
  await expect(editor.locator('.code-preview-title h2')).toHaveText(['姓名','联系电话','邮箱']);
  await expect(name.locator('code')).toHaveText(before.full_name);
  await expect(editor.locator('table,dialog,form')).toHaveCount(0);
  await expect(editor.getByRole('button',{name:'确认',exact:true}).first()).toBeDisabled();
  const popups:string[]=[];const track=(popup:Page)=>popups.push(popup.url());page.on('popup',track);
  try{
    await name.getByRole('button',{name:'编辑姓名',exact:true}).click();
    const input=name.getByRole('textbox',{name:'姓名',exact:true});
    await expect(input).toBeFocused();await expect(input).toHaveCSS('outline-style','none');await input.fill('尚未确认的姓名');
    await expect(phone.getByRole('button',{name:'编辑联系电话',exact:true})).toBeDisabled();
    await name.getByRole('button',{name:'取消',exact:true}).click();
    await expect(name.locator('code')).toHaveText(before.full_name);
    assert.equal((await (await page.request.get(new URL('/api/v1/profile',page.url()).href)).json()).data.full_name,before.full_name);
    await name.getByRole('button',{name:'编辑姓名',exact:true}).click();await input.fill('');
    await name.getByRole('button',{name:'确认',exact:true}).click();await expect(editor.getByRole('alert')).toHaveText('姓名不能为空。');
    await input.fill('代码块回归学生');await name.getByRole('button',{name:'确认',exact:true}).click();
    await expect(name.getByRole('textbox')).toHaveCount(0);
    await expect(editor.getByRole('status')).toHaveCount(0);
    await expect(frame.locator('[data-dorma-account-name]')).toHaveText('代码块回归学生');
    let saved=(await (await page.request.get(new URL('/api/v1/profile',page.url()).href)).json()).data;
    assert.equal(saved.full_name,'代码块回归学生');assert.equal(saved.phone,before.phone);assert.equal(saved.email,before.email);
    await phone.getByRole('button',{name:'编辑联系电话',exact:true}).click();
    await phone.getByRole('textbox',{name:'联系电话',exact:true}).fill('13800138001');await phone.getByRole('textbox').press('Enter');
    await expect(phone.getByRole('textbox')).toHaveCount(0);await expect(phone.locator('code')).toHaveText('13800138001');
    await phone.getByRole('button',{name:'编辑联系电话',exact:true}).click();await phone.getByRole('textbox').fill('取消这个号码');await phone.getByRole('textbox').press('Escape');
    await expect(phone.locator('code')).toHaveText('13800138001');
    await email.getByRole('button',{name:'编辑邮箱',exact:true}).click();await email.getByRole('textbox').fill('invalid-email');
    await email.getByRole('button',{name:'确认',exact:true}).click();await expect(editor.getByRole('alert')).toBeVisible();
    await expect(email.getByRole('textbox')).toHaveText('invalid-email');
    await email.getByRole('textbox').fill('student-editor@example.com');await email.getByRole('button',{name:'确认',exact:true}).click();
    await expect(email.getByRole('textbox')).toHaveCount(0);await expect(email.locator('code')).toHaveText('student-editor@example.com');
    await page.reload();await expect(name.locator('code')).toHaveText('代码块回归学生');await expect(phone.locator('code')).toHaveText('13800138001');await expect(email.locator('code')).toHaveText('student-editor@example.com');
    saved=(await (await page.request.get(new URL('/api/v1/profile',page.url()).href)).json()).data;
    assert.equal(saved.full_name,'代码块回归学生');assert.equal(saved.phone,'13800138001');assert.equal(saved.email,'student-editor@example.com');
    await email.getByRole('button',{name:'编辑邮箱',exact:true}).click();await email.getByRole('textbox').fill('');await email.getByRole('button',{name:'确认',exact:true}).click();
    await expect(email.locator('code')).toHaveText('—');
    assert.equal((await (await page.request.get(new URL('/api/v1/profile',page.url()).href)).json()).data.email,null);
    assert.deepEqual(popups,[],'编辑应在本页进行，不应打开 CodePen');
    console.log('资料编辑回归通过：三字段真实保存、独立提交、取消、空姓名/错误邮箱、清空邮箱、键盘操作及刷新持久化。');
  }finally{page.off('popup',track);}
}
