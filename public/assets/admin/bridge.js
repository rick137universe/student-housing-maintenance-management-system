import entries from './entries.js';
import { c as CopyButton } from '/assets/student/assets/js/chunks/chunk-WQVFBASJ.js';
import { m as waapi, o as utils } from '/assets/student/assets/js/chunks/chunk-WXAKRBIO.js';
const requested = new URLSearchParams(location.search).get('entry');
const initial = entries.find(entry => entry.id === requested) ?? entries[0];
const active = document.querySelector(`#docs-sidebar li > a[data-id="${initial.id}"]`);
for (let item = active?.parentElement; item && item.id !== 'docs-sidebar'; item = item.parentElement) {
  if (item.classList.contains('docs-nav-item')) item.classList.add('is-active');
}
const info = document.querySelector('#docs-info .docs-info');
info.dataset.id = initial.id; info.dataset.color = initial.color;
info.querySelector('h1 a').textContent = initial.label;
info.querySelector('h1 a').href = initial.url;
info.querySelector('h1 a').title = initial.label;
info.querySelector('h1').dataset.color = initial.color;
info.querySelector('[data-dorma-description]').textContent = initial.description;
const breadcrumb = info.querySelector('.docs-breadcrumb');
if (initial.action === 'overview') breadcrumb.remove();
else {
  const group = entries.find(entry => entry.feature === initial.feature && entry.action === 'overview');
  breadcrumb.dataset.color = group.color;
  const link = breadcrumb.querySelector('a');
  link.textContent = group.label; link.title = group.label; link.href = group.url;
  if (initial.parent) {
    const parent = entries.find(entry => entry.id === initial.parent);
    const arrow = document.createElement('span'); arrow.className = 'docs-breadcrumb-arrow'; arrow.textContent = '\uE0B1';
    const parentLink = link.cloneNode();parentLink.textContent = parent.label;parentLink.title = parent.label;parentLink.href = parent.url;
    link.after(' ', arrow, ' ', parentLink);
  }
}
const palette = ['red', 'corail', 'orange', 'yellow', 'citrus', 'lime', 'green', 'turquoise', 'cyan', 'sky'];
const moduleLinks = info.querySelector('[data-student-module-links]');
if (initial.action === 'overview') {
  info.querySelector('[data-dorma-business]')?.remove();
  const template = moduleLinks.firstElementChild;
  const targets = initial.id === 'docs'
    ? entries.filter(entry => entry.id !== 'docs' && entry.action === 'overview')
    : entries.filter(entry => entry.feature === initial.feature && entry.action !== 'overview' && !entry.parent);
  info.querySelector('h6.links-list-heading').textContent = initial.id === 'docs' ? '功能模块' : '本模块功能';
  moduleLinks.replaceChildren(...targets.map(entry => {
    const item = template.cloneNode(true), link = item.querySelector('a');
    link.href = entry.url; link.title = entry.label; link.dataset.id = entry.id; link.dataset.color = entry.color;
    link.className = 'text-ui color-' + palette[entry.color];
    for (const node of [...link.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
    link.prepend(entry.label);
    return item;
  }));
} else {
  info.querySelector('h6.links-list-heading')?.remove();
  moduleLinks.remove();
}
const position = entries.indexOf(initial);
for (const [direction, neighbor, heading] of [
  ['prev', initial.parent?entries.find(entry=>entry.id===initial.parent):entries[position - 1], info.querySelector('.prev-next-heading').children[0]],
  ['next', entries[position + 1], info.querySelector('.prev-next-heading').children[1]],
]) {
  heading.textContent = neighbor ? (direction === 'prev' ? '上一个' : '下一个') : '';
  const link = info.querySelector('.' + direction + '-link a');
  if (!neighbor) { link.remove(); continue; }
  link.href = neighbor.url; link.title = neighbor.label; link.dataset.id = neighbor.id; link.dataset.color = neighbor.color;
  link.className = 'text-ui color-' + palette[neighbor.color];
  for (const node of [...link.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
  if (direction === 'prev') link.append(neighbor.label); else link.prepend(neighbor.label);
}
if(initial.action!=='overview'){
  const content=info.querySelector('.docs-info-content.formatted-text');
  if(initial.feature!=='personal'||initial.action!=='action-1')content.after(info.querySelector('[data-dorma-business]'));content.hidden=!['personal','notifications','announcements','billing','backup','permissions'].includes(initial.feature);
}
document.title = initial.label + ' · 管理员工作台';
document.querySelector('#toggle-sidebar span').textContent = initial.label;
document.querySelector('#toggle-search').title = '搜索管理功能';
document.querySelector('#prev-demo').title = '上一项';
document.querySelector('#next-demo').title = '下一项';
const previewWords = { 'Move cursor around': '移动鼠标预览资料调整', 'JS / WAAPI': '基础数据', 'WAAPI': '流程管控', 'Play': '播放', 'Pause': '暂停' };
const translatePreviews = () => {
  const walker = document.createTreeWalker(document.querySelector('#docs-demos'), NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) continue;
    const word = node.textContent.trim();
    if (previewWords[word]) node.textContent = node.textContent.replace(word, previewWords[word]);
  }
};
new MutationObserver(translatePreviews).observe(document.querySelector('#docs-demos'), { childList: true, subtree: true });
let revealedPage = null;
let revealedKey = null;
const revealContent = (key = 'page') => {
  const container = document.querySelector('#docs-info');
  const page = container.querySelector('.docs-info');
  if (!page || (page === revealedPage && key === revealedKey)) return;
  revealedPage = page; revealedKey = key;
  // Local snippets can arrive before the original 75ms fade-out completes.
  // Replay the template's 150ms reveal from zero, using its unchanged WAAPI engine.
  utils.remove(container);
  waapi.animate(container, { opacity: [0, 1], duration: 150, ease: 'out' });
};
document.addEventListener('dorma-admin-content-change', event => revealContent(event.detail.key));
const announce = () => {
  const id = document.querySelector('#docs-info .docs-info')?.dataset.id;
  if (entries.some(entry => entry.id === id)) {
    revealContent();
    parent.postMessage({ type: 'dorma-admin-page', id }, location.origin);
  }
};
new MutationObserver(announce).observe(document.querySelector('#docs-info'), { childList: true });
// With a server-rendered iframe, its first load can finish before React hydrates.
// Reply to the parent's handshake as well as announcing the document load.
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === parent && event.data?.type === 'dorma-admin-connect') announce();
  if (event.origin === location.origin && event.source === parent && event.data?.type === 'dorma-admin-account-changed') void syncAccount();
});
// Profile data arrives after the mother's highlighter has initialized.
const profileCopies = new WeakMap();
new MutationObserver(() => {
  for (const pre of document.querySelectorAll('[data-dorma-profile] pre, [data-dorma-profile-editor] .code-editor pre, [data-dorma-application-editor] .code-editor pre, [data-dorma-finance-values] pre, [data-dorma-backup-values] pre, [data-dorma-permission-values] pre')) {
    if(pre.querySelector('textarea,input,select')){pre.querySelector('.copy-button')?.remove();profileCopies.delete(pre);continue;}
    const value=pre.querySelector('code').textContent;
    if(profileCopies.get(pre)?.data===value)continue;
    pre.querySelector('.copy-button')?.remove();
    const copy=new CopyButton(value);copy.$el.type='button';
    copy.$el.title='复制'+(pre.closest('[data-profile-field]')?.querySelector('h2').textContent??pre.previousElementSibling.textContent);
    pre.append(copy.$el);profileCopies.set(pre,copy);
  }
}).observe(document.querySelector('#docs-info'),{childList:true,subtree:true,characterData:true});
window.addEventListener('load', () => {
  // The copied core initializes this widget before the document load event.
  document.querySelector('#docs-versions')?.remove();
  announce();
});
const button = document.querySelector('[data-dorma-account]');
let account = null;
let pending = false;
async function syncAccount() {
  try {
    const response = await fetch('/api/v1/auth/me', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok && response.status !== 401) return;
    const result = await response.json(); account = response.ok ? result.data : null;
    button.querySelector('[data-dorma-account-name]').textContent = account?.displayName ?? '未登录';
    button.querySelector('[data-dorma-account-action]').textContent = account ? '退出登录' : '前往登录';
    button.setAttribute('aria-label', account ? `${account.displayName}，退出登录` : '前往登录');
  } catch { /* Preserve the last confirmed identity. */ }
}
button.addEventListener('click', async () => {
  if (pending) return;
  if (!account) { parent.postMessage({ type: 'dorma-admin-login' }, location.origin); return; }
  pending = true; button.disabled = true;
  try {
    const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': account.csrfToken }, body: '{}' });
    if (!response.ok && response.status !== 401) throw new Error('退出失败，请重试');
    parent.postMessage({ type: 'dorma-admin-logout' }, location.origin);
  } catch (reason) {
    document.querySelector('.dorma-account-error')?.remove();
    const error = document.createElement('p');error.className='dorma-account-error';error.setAttribute('role','alert');error.textContent=reason.message;document.body.append(error);
  } finally { pending = false;button.disabled = false; }
});
window.addEventListener('focus', syncAccount);
document.addEventListener('dorma-profile-saved', syncAccount);
void syncAccount();
const form = document.querySelector('#site-footer form');
form.addEventListener('submit', event => { event.preventDefault(); event.stopImmediatePropagation(); const input=form.querySelector('input[type=email]');input.setCustomValidity('请使用工作台内的个人消息。');input.reportValidity(); }, true);
form.addEventListener('input',()=>form.querySelector('input[type=email]').setCustomValidity(''));
