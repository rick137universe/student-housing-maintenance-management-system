import assert from 'node:assert/strict';
import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {studentPages} from '../src/data/student-pages';
import {managerPages} from '../src/data/manager-pages';
import {maintenancePages} from '../src/data/maintenance-pages';
import {adminPages} from '../src/data/admin-pages';
import {siteTitle, workspaceTitle} from '../src/utils/page-title';

function check(title: string) {
  assert.ok(title.endsWith(' | FLight'), title);
  assert.ok(!/·|Dorma|student-housing-maintenance-management-system/.test(title), title);
  assert.equal(title.split(' | ').length, new Set(title.split(' | ')).size, title);
}
async function checkHtml(directory: string): Promise<number> {
  let count = 0;
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += await checkHtml(path);
    else if (entry.name.endsWith('.html')) {
      const html = await readFile(path, 'utf8');
      // Demo fragments also contain escaped/example HTML inside scripts.
      if (!/^\s*(?:<!doctype html[^>]*>\s*)?<html\b/i.test(html)) continue;
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
      if (title) { check(title); count++; }
    }
  }
  return count;
}
check(siteTitle);
const pages = [...studentPages, ...managerPages, ...maintenancePages, ...adminPages];
for (const page of pages) {
  const title = workspaceTitle(page.url);
  check(title);
  assert.ok(title.startsWith(page.label + ' | '), `${page.url}: ${title}`);
}
console.log(`Verified ${pages.length} workspace titles and ${await checkHtml('public/assets')} HTML titles.`);
