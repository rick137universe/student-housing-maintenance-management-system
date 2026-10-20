import assert from 'node:assert/strict';
import {expect,type Page} from '@playwright/test';

// Called only for the dedicated browser-test account in the disposable database.
export async function studentPasswordEditorRegression(page:Page,password:string,{frameSelector='[data-dorma-student-frame]',workspaceBase='/workspace/student'}:{frameSelector?:string;workspaceBase?:string}={}){
  const origin=new URL(page.url()).origin;
  const me=(await (await page.request.get(origin+'/api/v1/auth/me')).json()).data;
  const other=await page.context().browser()!.newContext();
  const login=await other.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:me.username,password}});assert.equal(login.status(),200);
  const frame=page.frameLocator(frameSelector),editor=frame.locator('[data-dorma-password-editor]');
  const current=editor.locator('[data-password-field="currentPassword"]'),next=editor.locator('[data-password-field="newPassword"]'),repeat=editor.locator('[data-password-field="confirmation"]');
  const replacement='ChangedUiOnly2026_'+Date.now();let submissions=0,verifications=0;
  const track=(request:import('@playwright/test').Request)=>{if(request.method()==='POST'){if(request.url()===origin+'/api/v1/profile/password')submissions++;if(request.url()===origin+'/api/v1/profile/password/verify')verifications++;}};
  page.on('request',track);
  try{
    await expect(editor.locator('.code-preview-title h2')).toHaveText(['原密码','新密码','确认新密码']);
    await expect(editor.locator('pre code')).toHaveText(['—','—','—']);
    await expect(editor.locator('table,dialog,.copy-button')).toHaveCount(0);
    await expect(next.getByRole('button',{name:'编辑新密码',exact:true})).toBeDisabled();
    await current.getByRole('button',{name:'编辑原密码',exact:true}).click();
    await expect(current.getByLabel('原密码',{exact:true})).toHaveAttribute('type','password');
    await expect(current.getByLabel('原密码',{exact:true})).toHaveCSS('outline-style','none');
    await current.getByLabel('原密码',{exact:true}).fill(password);await current.getByRole('button',{name:'取消',exact:true}).click();
    await expect(current.locator('code')).toHaveText('—');assert.equal(submissions,0);assert.equal(verifications,0);
    await current.getByRole('button',{name:'编辑原密码',exact:true}).click();await current.getByLabel('原密码',{exact:true}).fill('WrongOnly2026');await current.getByRole('button',{name:'确认',exact:true}).click();
    await expect(editor.locator('#password-error-currentPassword')).toHaveText('当前密码不正确');assert.equal(verifications,1);assert.equal(submissions,0);
    await expect(editor.locator('.code-preview [role="alert"]')).toHaveCount(0);
    assert.equal(await editor.locator('#password-error-currentPassword').evaluate(el=>el.parentElement?.previousElementSibling?.getAttribute('data-password-field')),'currentPassword');
    await expect(current.getByLabel('原密码',{exact:true})).toHaveAttribute('aria-describedby','password-error-currentPassword');
    await expect(next.locator('code')).toHaveText('—');await expect(repeat.locator('code')).toHaveText('—');
    await current.getByLabel('原密码',{exact:true}).fill(password);await next.locator('.code-preview-title h2').click();
    await expect(current.locator('code')).toHaveText('••••••••');assert.equal(verifications,2);assert.equal(submissions,0);
    await expect(editor.getByRole('alert')).toHaveCount(0);assert.equal((await other.request.get(origin+'/api/v1/auth/me')).status(),200);
    await next.getByRole('button',{name:'编辑新密码',exact:true}).click();await next.getByLabel('新密码',{exact:true}).fill('short');await next.getByRole('button',{name:'确认',exact:true}).click();
    await expect(editor.locator('#password-error-newPassword')).toHaveText('新密码至少需要8个字符。');assert.equal(submissions,0);
    assert.equal(await editor.locator('#password-error-newPassword').evaluate(el=>el.parentElement?.previousElementSibling?.getAttribute('data-password-field')),'newPassword');
    await next.getByLabel('新密码',{exact:true}).fill(replacement);await next.getByLabel('新密码',{exact:true}).press('Enter');await expect(next.locator('code')).toHaveText('••••••••');
    await repeat.getByRole('button',{name:'编辑确认新密码',exact:true}).click();await repeat.getByLabel('确认新密码',{exact:true}).fill('MismatchedOnly2026');await repeat.getByRole('button',{name:'确认',exact:true}).click();
    await expect(editor.locator('#password-error-confirmation')).toHaveText('两次输入的新密码不一致。');assert.equal(submissions,0);
    assert.equal((await editor.textContent())!.includes(password),false);assert.equal((await editor.textContent())!.includes(replacement),false);
    await repeat.getByLabel('确认新密码',{exact:true}).fill(replacement);await repeat.getByRole('button',{name:'确认',exact:true}).click();
    await expect(page).toHaveURL(origin+'/login');await expect(page.locator('[data-dorma-login-frame]')).toBeVisible();assert.equal(submissions,1);assert.equal(verifications,2);
    assert.equal((await page.request.get(origin+'/api/v1/auth/me')).status(),401);
    assert.equal((await other.request.get(origin+'/api/v1/auth/me')).status(),401);
    const oldLogin=await page.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:me.username,password}});assert.equal(oldLogin.status(),401);
    const newLogin=await page.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username:me.username,password:replacement}});assert.equal(newLogin.status(),200);
    await page.goto(origin+workspaceBase+'/personal/action-3');await expect(editor.locator('pre code')).toHaveText(['—','—','—']);
    await expect(editor.getByRole('status')).toHaveCount(0);
    console.log('密码编辑回归通过：遮罩、取消、原密码提前校验/失焦校验、最小长度/重复校验、真实改密、全部会话撤销及新密码重新登录。');
  }finally{page.off('request',track);await other.close();}
}
