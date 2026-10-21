// Application actions only. The copied animation runtime stays unchanged.
const button = document.querySelector('[data-dorma-account]');
let account = null;
let pending = false;
let revision = 0;
const names = { waapi: '信息汇集', timeline: '处理进展', stagger: '维修跟进', svg: '问题记录', spring: '生活服务', animation: '住宿服务', timer: '服务提醒', easings: '服务反馈', draggable: '服务反馈', scroll: '公寓通知', scope: '个人工作台' };

function updateLabels() {
  button.querySelector('[data-dorma-account-name]').textContent = account?.displayName ?? '未登录';
  button.querySelector('[data-dorma-account-action]').textContent = account ? '退出登录' : '前往登录';
  button.setAttribute('aria-label', account ? `${account.displayName}，退出登录` : '前往登录');
}
async function syncAccount() {
  const current = ++revision;
  try {
    const response = await fetch('/api/v1/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok && response.status !== 401) return;
    const result = await response.json();
    if (current !== revision) return;
    account = response.ok ? result.data : null; updateLabels();
  } catch { /* Preserve the last confirmed state if the network is unavailable. */ }
}
function enter(destination) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- The standalone HTML document has no Next.js router.
  if (parent === window) location.assign('/login');
  else parent.postMessage({ type: 'dorma-home-entry', destination }, location.origin);
}
button.addEventListener('click', async () => {
  if (pending) return;
  document.querySelector('.dorma-account-error')?.remove();
  if (!account) { enter('login'); return; }
  pending = true; button.disabled = true; button.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': account.csrfToken }, body: '{}' });
    const result = await response.json();
    if (!response.ok && response.status !== 401) throw new Error(result.error?.message || '退出失败，请重试');
    revision++; account = null; updateLabels();
    if (parent !== window) parent.postMessage({ type: 'dorma-session-changed' }, location.origin);
  } catch (reason) {
    const error = document.createElement('p'); error.className = 'dorma-account-error'; error.setAttribute('role', 'alert');
    error.textContent = reason instanceof Error ? reason.message : '退出失败，请重试'; document.body.append(error);
  } finally { pending = false; button.disabled = false; button.removeAttribute('aria-busy'); }
});
const activateEntry = event => {
  const target = event.target instanceof Element ? event.target.closest('[data-dorma-entry], #site-menu a[data-id="docs"]') : null;
  if (!target) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.type === 'click' && event.button !== 0)) return;
  if (event.type === 'keydown' && (target.tagName !== 'PRE' || !['Enter', ' '].includes(event.key))) return;
  event.preventDefault(); event.stopImmediatePropagation(); enter(account || target.matches('#site-menu a[data-id="docs"]') ? 'workspace' : 'login');
};
document.addEventListener('click', activateEntry, true);
document.addEventListener('keydown', activateEntry, true);
window.addEventListener('focus', syncAccount);
void syncAccount();

// Translate generated module labels without changing the source animation code,
// its transforms, dimensions, breakpoints or timeline.
const translate = element => {
  for (const label of element.querySelectorAll('.module-label-text, .toolbox-labels li')) {
    const value = names[label.textContent.trim().toLowerCase()];
    if (value) label.textContent = value;
  }
};
new MutationObserver(() => translate(document)).observe(document.body, { childList: true, subtree: true });
translate(document);
