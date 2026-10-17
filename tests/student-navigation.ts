import {expect,type Page} from '@playwright/test';
import {studentPages} from '../src/data/student-pages';
import actions from '../src/data/student-docs.json';

export async function studentNavigationRegression(page:Page){
  const origin=new URL(page.url()).origin;
  const frame=page.frameLocator('[data-dorma-student-frame]');
  for(const group of studentPages.filter(entry=>entry.action==='overview')){
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
    await expect(frame.locator('[data-dorma-live-workspace]')).toBeVisible();
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
    await expect(frame.locator('[data-dorma-live-workspace]')).toBeVisible();
  }
  // Native previous/next follows the same group/action order across group boundaries.
  const last=actions.at(-1)!;
  await expect(page).toHaveURL(origin+last.url);
  await expect(frame.locator('#docs-info .next-link a')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(origin+'/workspace/student/notifications');
  await expect(frame.locator('[data-student-module-links] a')).toHaveCount(1);
  console.log('模块导航回归通过：6 组独立入口、子页前后导航、模块直达刷新及浏览器返回。');
}

