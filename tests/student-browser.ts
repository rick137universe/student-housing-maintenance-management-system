import assert from 'node:assert/strict';
import type { Browser, BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';
import entries from '../src/data/student-docs.json';

// Called only by the integration suite, against its disposable PostgreSQL database.
export async function studentDocsRegression(browser: Browser, origin: string, password: string) {
  const contexts: BrowserContext[] = [];
  async function session(username: string) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); contexts.push(context);
    const response = await context.request.post(origin + '/api/v1/auth/login', { headers: { Origin: origin }, data: { username, password } });
    assert.equal(response.status(), 200); const { data } = await response.json();
    return { context, async call(path: string, body?: object) {
      const response = body ? await context.request.post(origin + '/api/v1/' + path, { headers: { Origin: origin, 'X-CSRF-Token': data.csrfToken }, data: body }) : await context.request.get(origin + '/api/v1/' + path);
      const result = await response.json(); assert.equal(response.status(), 200, JSON.stringify(result)); return result.data;
    } };
  }
  try {
    const admin = await session('admin'), manager = await session('dm0301'), technician = await session('mt008');
    const studentNumber = 'UI' + Date.now().toString().slice(-9);
    await admin.call('students', { student_number: studentNumber, full_name: '浏览器回归学生', gender: 'male', college: '计算机学院', grade: '2026', password });
    const student = await session('stu' + studentNumber), page = await student.context.newPage();
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const frame = page.frameLocator('[data-dorma-student-frame]');
    async function go(feature: string, action: number) {
      await page.goto(`${origin}/workspace/student/${feature}/action-${action}`);
      await frame.locator('[data-dorma-live-workspace]').waitFor();
      await frame.getByText('正在读取…', { exact: true }).waitFor({ state: 'hidden' });
    }
    async function submit() { await frame.getByRole('button', { name: '确认提交', exact: true }).click(); await frame.getByText('操作已保存。', { exact: true }).waitFor(); }
    await go('personal', 1);
    await expect(frame.locator('#toggle-search')).toBeEnabled();
    // Exercise the actual native menu and demo switching, not just direct URLs.
    for (const entry of entries) {
      const group = frame.locator('#docs-sidebar .docs-group > a').filter({ hasText: entry.group });
      if (!(await group.locator('..').getAttribute('class'))!.includes('is-active')) { await group.click(); await page.waitForTimeout(400); }
      await frame.locator(`#docs-sidebar ul ul a[data-id="${entry.id}"]`).click();
      await expect(frame.locator('#docs-info h1')).toHaveText(entry.label);
      await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id', entry.id);
      await expect(frame.locator('[data-dorma-business]')).not.toBeEmpty();
    }
    await frame.locator('#toggle-search').click(); await frame.locator('#docs-search-input').fill('入住申请'); await frame.locator('#docs-search-results a').first().click();
    await expect(frame.locator('#docs-info h1')).toHaveText('入住申请');
    await frame.getByRole('button', { name: '提交入住申请', exact: true }).click();
    await frame.getByLabel('意向楼栋', { exact: true }).selectOption('NY3'); await frame.getByLabel('申请说明', { exact: true }).fill('三栏页面入住回归'); await submit();
    const application = (await student.call('applications'))[0]; assert.equal(application.application_note, '三栏页面入住回归');
    await manager.call(`applications/${application.application_id}/review`, { decision: 'approve' });
    await go('repair', 1); await frame.getByRole('button', { name: '提交报修', exact: true }).click();
    await frame.getByLabel('故障描述', { exact: true }).fill('三栏页面水龙头报修'); await frame.getByLabel('联系电话', { exact: true }).fill('13800138000'); await submit();
    const repair = (await student.call('repairs'))[0]; assert.equal(repair.fault_description, '三栏页面水龙头报修');
    await manager.call(`repairs/${repair.repair_id}/review`, { decision: 'approve' });
    const tech = (await admin.call('accounts?limit=100')).find((row: { username: string }) => row.username === 'mt008');
    await admin.call(`repairs/${repair.repair_id}/dispatch`, { technicianId: tech.account_id });
    await technician.call(`repairs/${repair.repair_id}/accept`, {}); await technician.call(`repairs/${repair.repair_id}/start`, {}); await technician.call(`repairs/${repair.repair_id}/complete`, { note: '浏览器回归完工', hours: 1, materials: '密封圈' });
    await go('repair', 2); await frame.getByRole('button', { name: '查看进度', exact: true }).click(); await expect(frame.getByRole('heading', { name: '报修处理进度' })).toBeVisible(); await frame.getByRole('button', { name: '关闭进度' }).click();
    await go('repair', 3); await frame.getByRole('button', { name: '评价', exact: true }).click(); await frame.getByLabel('服务评分', { exact: true }).selectOption('5'); await frame.getByLabel('评价内容', { exact: true }).fill('已修好'); await submit();
    await admin.call('bills', { studentNumber, period: '2026-10', accommodationFee: '10.00', utilityFee: '2.00', dueDate: '2026-12-31' });
    await go('payment', 2); await frame.getByRole('button', { name: '测试支付', exact: true }).click(); await frame.getByLabel('支付金额', { exact: true }).fill('5.00'); await submit();
    assert.equal((await student.call('bills'))[0].outstanding_amount, '7.00');
    await go('payment', 3); await expect(frame.locator('tbody')).toContainText('5.00');
    await go('accommodation', 2); await frame.getByRole('button', { name: '提交调宿申请', exact: true }).click(); await frame.getByLabel('意向楼栋', { exact: true }).selectOption('NY3'); await submit();
    const transfer = (await student.call('changes?type=transfer'))[0]; await manager.call(`changes/${transfer.change_id}/review`, { decision: 'approve' });
    await go('accommodation', 3); await frame.getByRole('button', { name: '提交退宿申请', exact: true }).click(); await submit();
    const checkout = (await student.call('changes?type=checkout'))[0]; await manager.call(`changes/${checkout.change_id}/review`, { decision: 'approve' });
    await go('notifications', 1); await frame.getByRole('button', { name: '标为已读', exact: true }).first().click(); await frame.getByText('操作已保存。', { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 }); await frame.locator('#toggle-sidebar').click();
    await expect(frame.locator('#docs-sidebar')).toHaveClass(/is-active/);
    assert.equal(await frame.locator('html').evaluate(el => el.scrollWidth > innerWidth), false);
    await page.screenshot({ path: 'docs/qa/backend/student-native-mobile-menu.png' });
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.reload(); await frame.locator('[data-dorma-live-workspace]').waitFor();
    await frame.locator('[data-dorma-account]').click(); await expect(page).toHaveURL(origin + '/'); assert.equal((await student.context.request.get(origin + '/api/v1/auth/me')).status(), 401);
    assert.deepEqual(errors, []);
    console.log('学生 Docs 业务回归通过：15 入口切换、搜索、入住/调宿/退宿、部分支付、报修/进度/评价、消息已读及退出。');
  } finally { await Promise.all(contexts.map(context => context.close())); }
}
