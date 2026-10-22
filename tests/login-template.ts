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
    // Project navigation and footer are customized; original asset hashes stay protected.
    const normalized = fragment.replace(/\s+/g, ' ').trim();
    assert.equal(createHash('sha256').update(normalized).digest('hex'), manifest.fragments[tag === 'header' ? 'projectHeader' : 'projectFooter'], `母版 ${tag} 结构或文案被改写`);
  }
  console.log(`Learn 母版资源校验通过：${checked} 个 CSS、字体、脚本和素材文件保持原样。`);
}
