import {workspaceActionPaths} from '../src/data/workspace-paths';
import assert from 'node:assert/strict';
import type { Browser, BrowserContext } from '@playwright/test';
import { expect } from '@playwright/test';
import entries from '../src/data/student-docs.json';
import {studentThemeRegression,studentNestedThemeRegression} from './student-themes';
import {studentNavigationRegression} from './student-navigation';
import {studentProfileRegression} from './student-profile';
import {studentProfileEditorRegression} from './student-profile-editor';
import {studentPasswordEditorRegression} from './student-password-editor';
import {studentFinanceRegression} from './student-finance';
import {studentTransitionRegression} from './student-transitions';
import {studentAccommodationNavigationRegression,expectAccommodationRecord} from './student-accommodation';
import {submitStudentAccommodation} from './student-accommodation-submit';
import {studentRepairWorkflowRegression} from './student-repair';
import {studentAnnouncementRegression} from './student-announcements';
import {studentNotificationRegression} from './student-notifications';
import {studentBreadcrumbRegression} from './student-breadcrumbs';

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
    const errors: string[] = []; page.on('pageerror', error => errors.push(page.url()+': '+(error.stack??error.message)));
    const frame = page.frameLocator('[data-dorma-student-frame]');
    async function go(feature: string, action: number) {
      await page.goto(`${origin}/workspace/student/${feature}/${workspaceActionPaths.student[feature][action-1]}`);
      await frame.locator('[data-dorma-live-workspace]').waitFor();
      await frame.getByText('正在读取…', { exact: true }).waitFor({ state: 'hidden' });
    }
    await go('personal', 1);
    await studentProfileRegression(page);
    await go('personal',2);
    await studentProfileEditorRegression(page);
    await go('personal',1);
    await studentThemeRegression(page);
    await studentNestedThemeRegression(page);
    await studentNavigationRegression(page);
    await studentBreadcrumbRegression(page);
    await studentTransitionRegression(page);
    await studentAccommodationNavigationRegression(page);
    await expect(frame.locator('#toggle-search')).toBeEnabled();
    // Exercise the actual native menu and demo switching, not just direct URLs.
    for (const entry of entries) {
      const group = frame.locator('#docs-sidebar .docs-group > a').filter({ hasText: entry.group });
      if (!(await group.locator('..').getAttribute('class'))!.includes('is-active')) { await group.click(); await page.waitForTimeout(400); }
      await frame.locator(`#docs-sidebar ul ul a[data-id="${entry.id}"]`).click();
      await expect(frame.locator('#docs-info h1')).toHaveText(entry.label);
      await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id', entry.id);
      if(['accommodation','repair'].includes(entry.feature))await expect(frame.locator('[data-student-record-links] a')).toHaveCount(2);
      else await expect(frame.locator('[data-dorma-business]')).not.toBeEmpty();
      const breadcrumb=frame.locator('#docs-info .docs-breadcrumb a');
      await expect(breadcrumb).toHaveText(entry.group);
      await expect(frame.locator('#docs-info .docs-breadcrumb')).toHaveAttribute('data-color',String(entry.color));
      await breadcrumb.click();
      await expect(frame.locator('#docs-info h1')).toHaveText(entry.group);
      await expect(frame.locator('[data-student-module-links] a')).toHaveCount(entries.filter(action=>action.feature===entry.feature).length);
    }
    await frame.locator('#toggle-search').click(); await frame.locator('#docs-search-input').fill('入住申请'); await frame.locator('#docs-search-results a').first().click();
    await expect(frame.locator('#docs-info h1')).toHaveText('入住申请');
    await submitStudentAccommodation(page,1,'三栏页面入住回归');
    const application = (await student.call('applications'))[0]; assert.equal(application.application_note, '三栏页面入住回归');
    await manager.call(`applications/${application.application_id}/review`, { decision: 'approve' });
    await expectAccommodationRecord(page,1,application.application_id,'已完成');
    await studentRepairWorkflowRegression(page,admin,manager,technician);
    await admin.call('bills', { studentNumber, period: '2026-10', accommodationFee: '10.00', utilityFee: '2.00', dueDate: '2026-12-31' });
    const foreignBill=(await admin.call('bills?limit=100')).find((bill:{student_number:string})=>bill.student_number!==studentNumber);
    await studentFinanceRegression(page,foreignBill.bill_id);
    await studentAnnouncementRegression(page,admin);
    await submitStudentAccommodation(page,2,'三栏页面调宿回归');
    const transfer = (await student.call('changes?type=transfer'))[0]; await manager.call(`changes/${transfer.change_id}/review`, { decision: 'approve' });
    await expectAccommodationRecord(page,2,transfer.change_id,'已完成');
    await submitStudentAccommodation(page,3,'三栏页面退宿回归');
    const checkout = (await student.call('changes?type=checkout'))[0]; await manager.call(`changes/${checkout.change_id}/review`, { decision: 'approve' });
    await expectAccommodationRecord(page,3,checkout.change_id,'已完成');
    await go('personal',3);await studentPasswordEditorRegression(page,password);
    await go('notifications',1);await studentNotificationRegression(page,admin,await session('stu202602114'));
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
