import entries from './student-entries.js';
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
info.querySelector('h1').dataset.color = initial.color;
info.querySelector('[data-dorma-description]').textContent = initial.description;
document.title = initial.label + ' · 学生工作台';
document.querySelector('#toggle-sidebar span').textContent = initial.label;
document.querySelector('#toggle-search').title = '搜索学生服务';
document.querySelector('#prev-demo').title = '上一项';
document.querySelector('#next-demo').title = '下一项';
const previewWords = { 'Move cursor around': '移动鼠标预览资料调整', 'JS / WAAPI': '入住意向', 'WAAPI': '床位分配', 'Play': '播放', 'Pause': '暂停' };
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
const announce = () => {
  const id = document.querySelector('#docs-info .docs-info')?.dataset.id;
  if (entries.some(entry => entry.id === id)) parent.postMessage({ type: 'dorma-student-page', id }, location.origin);
};
new MutationObserver(announce).observe(document.querySelector('#docs-info'), { childList: true });
window.addEventListener('load', () => {
  // The copied core initializes this widget before the document load event.
  document.querySelector('#docs-versions')?.remove();
  announce();
});
document.addEventListener('click', event => {
  if (event.target.closest('#site-menu a[data-id="docs"]')) {
    event.preventDefault(); event.stopImmediatePropagation();
    parent.postMessage({ type: 'dorma-student-workspace' }, location.origin);
  }
}, true);
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
  if (!account) { parent.postMessage({ type: 'dorma-student-login' }, location.origin); return; }
  pending = true; button.disabled = true;
  try {
    const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': account.csrfToken }, body: '{}' });
    if (!response.ok && response.status !== 401) throw new Error('退出失败，请重试');
    parent.postMessage({ type: 'dorma-student-logout' }, location.origin);
  } catch (reason) {
    document.querySelector('.dorma-account-error')?.remove();
    const error = document.createElement('p');error.className='dorma-account-error';error.setAttribute('role','alert');error.textContent=reason.message;document.body.append(error);
  } finally { pending = false;button.disabled = false; }
});
window.addEventListener('focus', syncAccount);
void syncAccount();
const form = document.querySelector('#site-footer form');
form.addEventListener('submit', event => { event.preventDefault(); event.stopImmediatePropagation(); const input=form.querySelector('input[type=email]');input.setCustomValidity('请使用工作台内的个人消息。');input.reportValidity(); }, true);
form.addEventListener('input',()=>form.querySelector('input[type=email]').setCustomValidity(''));
