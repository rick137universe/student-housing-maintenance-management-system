import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Compare the shipped assets against hashes taken during the read-only copy.
export async function verifyLoginTemplate() {
  const manifest = JSON.parse(await readFile('docs/login-template-source.json', 'utf8')) as { sha256: Record<string, string>; fragments: Record<string, string> };
  let checked = 0;
  for (const [file, checksum] of Object.entries(manifest.sha256)) {
    if (file === 'index.html' || file === 'assets/html/waitlist.html') continue;
    const content = await readFile('public/assets/login/' + file);
    assert.equal(createHash('sha256').update(content).digest('hex'), checksum, `母版资源被改写：${file}`);
    checked++;
  }
  const html = await readFile('public/assets/login/index.html', 'utf8');
  for (const tag of ['header', 'footer']) {
    const fragment = html.match(new RegExp('<' + tag + ' id="site-' + tag + '"[\\s\\S]*?<\\/' + tag + '>'))?.[0];
    assert(fragment, `缺少母版 ${tag}`);
    let normalized = fragment.replace('data-id="docs" href="/workspace"', 'data-id="docs" href="/documentation"')
      .replace('href="https://animejs.com/learn" target="_top" title="Learn"', 'href="/learn" target="_top" title="Learn"')
      .replace(/href="https:\/\/animejs.com\/(documentation|easing-editor)([^" ]*)"/g, 'href="/$1$2"')
      .replaceAll('href="/login"', 'href="/learn"');
    if (tag === 'header') normalized = normalized.replace(/<sponsor-button>[\s\S]*?<\/sponsor-button>/, '')
      .replace(' aria-label="返回项目首页"', '')
      .replace('<img src="./assets/images/flight_shmms_white.svg" alt="学生公寓住宿与报修管理系统" width="1081" height="208" />', '<img src="./assets/images/anime-js-logo-v4.svg" alt="anime.js logo v4" width="580" height="118" />')
      .replace('<span>学生公寓住宿与报修管理系统</span>', '<span>Anime.js | JavaScript Animation Engine</span>');

    // Keep the original header checks and validate the intentionally customized footer separately.
    if (tag === 'footer') normalized = fragment;
    normalized = normalized.replace(/\s+/g, ' ').trim();
    assert.equal(createHash('sha256').update(normalized).digest('hex'), manifest.fragments[tag === 'header' ? 'headerWithoutAccountButton' : 'projectFooter'], `母版 ${tag} 结构或文案被改写`);
  }
  console.log(`Learn 母版资源校验通过：${checked} 个 CSS、字体、脚本和素材文件保持原样。`);
}
