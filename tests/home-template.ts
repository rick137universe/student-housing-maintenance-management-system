import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function verifyHomeTemplate() {
  const manifest = JSON.parse(await readFile('docs/home-template-source.json', 'utf8')) as {
    sha256: Record<string, string>; fragments: Record<string, string>;
    sections: { id: string; className: string; style: string | null }[];
  };
  let count = 0;
  for (const [name, checksum] of Object.entries(manifest.sha256)) {
    if (name === 'index.html') continue;
    const data = await readFile('public/assets/home/' + name);
    assert.equal(createHash('sha256').update(data).digest('hex'), checksum, `主页母版资源被改写：${name}`);
    count++;
  }
  const html = await readFile('public/assets/home/index.html', 'utf8');
  for (const tag of ['header', 'footer']) {
    let fragment = html.match(new RegExp('<' + tag + ' id="site-' + tag + '"[\\s\\S]*?<\\/' + tag + '>'))?.[0];
    assert(fragment, `缺少主页 ${tag}`);
    if (tag === 'header') fragment = fragment.replace(' aria-label="返回项目首页"', '')
      .replace(/(<h1 class="heading-logo header-logo">\s*<a[^>]*>)[\s\S]*?(<\/a>)/, '$1$2')
      .replace(/<sponsor-button>[\s\S]*?<\/sponsor-button>/, '<sponsor-button></sponsor-button>');
    const normalized = fragment.replace(/\s+/g, ' ').trim();
    assert.equal(createHash('sha256').update(normalized).digest('hex'), manifest.fragments[tag], `主页 ${tag} 超出允许替换范围`);
  }
  const sections = [...html.matchAll(/<section\b([^>]*)>/g)].map(match => {
    const attribute = (name: string) => match[1].match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))?.[1];
    return { id: attribute('id') ?? '', className: attribute('class') ?? '', style: attribute('style') ?? null };
  });
  assert.deepEqual(sections, manifest.sections, '主页场景顺序、原有 class 或内联尺寸发生变化');
  console.log(`主页母版校验通过：${count} 个原始资源逐字节一致，导航、页脚和场景布局保留。`);
}
