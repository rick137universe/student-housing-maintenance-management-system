import {expect,type Page} from '@playwright/test';
import {studentPages,studentOverview} from '../src/data/student-pages';
import actions from '../src/data/student-docs.json';

export async function studentNavigationRegression(page:Page){
  const origin=new URL(page.url()).origin;
  const frame=page.frameLocator('[data-dorma-student-frame]');
  const groups=studentPages.filter(entry=>entry.action==='overview'&&entry.id!==studentOverview.id);
  await frame.locator('#site-menu a[data-id="docs"]').click();
  await expect(page).toHaveURL(origin+studentOverview.url);
  await expect(frame.locator('[data-student-module-links] a')).toHaveText(groups.map(group=>group.label));
  await expect(frame.locator('.docs-demo.is-active')).toHaveAttribute('data-id',studentOverview.id);
  await page.reload();
  await expect(frame.locator('[data-student-module-links] a')).toHaveCount(6);
  await frame.locator('[data-student-module-links] a').first().click();
  await expect(frame.locator('#docs-info .prev-link a')).toHaveAttribute('href',studentOverview.url);
  await frame.locator('#docs-info .prev-link a').click();
  await expect(page).toHaveURL(origin+studentOverview.url);
  await expect(frame.locator('#docs-info .prev-link a')).toHaveCount(0);
  for(const group of groups){
    // The total navigation uses each module's original themed link.
    await frame.locator('#site-menu a[data-id="docs"]').click();
    await expect(frame.locator('[data-student-module-links] a')).toHaveCount(6);
    await frame.locator(`[data-student-module-links] a[data-id="${group.id}"]`).click();
    await frame.locator(`#docs-sidebar .docs-group-link[data-id="${group.id}"]`).click();
    await expect(page).toHaveURL(origin+group.url);
    await expect(frame.locator('#docs-info h1')).toHaveText(group.label);
    const children=actions.filter(entry=>entry.feature===group.feature);
    const list=frame.locator('[data-student-module-links]');
    await expect(list.locator('a')).toHaveText(children.map(entry=>entry.label));
    await expect(frame.locator('[data-dorma-live-workspace]')).toHaveCount(0);
    await list.locator('a').first().click();
    await expect(page).toHaveURL(origin+children[0].url);
    await expect(frame.locator('[data-student-module-links]')).toHaveCount(0);
    await expect(frame.locator(group.feature==='accommodation'?'[data-student-record-links]':'[data-dorma-live-workspace]')).toBeVisible();
    await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(group.label);
    await frame.locator('#docs-info .docs-breadcrumb a').click();
    await expect(page).toHaveURL(origin+group.url);
    await expect(frame.locator('#docs-info .docs-breadcrumb')).toHaveCount(0);
    await frame.locator('[data-student-module-links] a').first().click();
    const previous=frame.locator('#docs-info .prev-link a');
    await expect(previous).toHaveAttribute('href',group.url);
    await previous.click();
    await expect(page).toHaveURL(origin+group.url);
    await expect(list.locator('a')).toHaveCount(children.length);
    await page.reload();
    await expect(list.locator('a')).toHaveText(children.map(entry=>entry.label));
    await expect(frame.locator('[data-dorma-business]')).toHaveCount(0);
    await frame.locator('#docs-info .next-link a').click();
    await expect(page).toHaveURL(origin+children[0].url);
    await expect(frame.locator(group.feature==='accommodation'?'[data-student-record-links]':'[data-dorma-live-workspace]')).toBeVisible();
    await page.reload();
    await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveText(group.label);
    await expect(frame.locator('#docs-info .docs-breadcrumb a')).toHaveAttribute('href',group.url);
  }
  // Native previous/next follows the same group/action order across group boundaries.
  const last=actions.at(-1)!;
  await expect(page).toHaveURL(origin+last.url);
  await expect(frame.locator('#docs-info .next-link a')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(origin+'/workspace/student/notifications');
  await expect(frame.locator('[data-student-module-links] a')).toHaveCount(1);
  console.log('模块导航回归通过：总导航六个入口、首模块返回、顶部 Docs 返回、子页前后导航、直达刷新及浏览器返回。');
}

