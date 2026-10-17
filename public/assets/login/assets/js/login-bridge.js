const formFrame = document.querySelector('.signup-iframe');
const accountButton = document.querySelector('[data-dorma-account]');
document.addEventListener('click', event => {
  if (parent === window || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  if (!event.target.closest('#site-menu a[data-id="docs"]')) return;
  event.preventDefault(); event.stopImmediatePropagation();
  parent.postMessage({ type: 'dorma-workspace-entry' }, location.origin);
}, true);
let account = null;
let pending = false;
let revision = 0;

function updateAccountButton() {
  accountButton.querySelector('[data-dorma-account-name]').textContent = account?.displayName ?? '未登录';
  accountButton.querySelector('[data-dorma-account-action]').textContent = account ? '退出登录' : '前往登录';
  accountButton.setAttribute('aria-label', account ? `${account.displayName}，退出登录` : '前往登录');
}

async function syncAccount() {
  const current = ++revision;
  try {
    const response = await fetch('/api/v1/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok && response.status !== 401) return;
    const result = await response.json();
    if (current !== revision) return;
    account = response.ok ? result.data : null;
    updateAccountButton();
  } catch { /* Keep the last confirmed state when a background refresh fails. */ }
}

accountButton.addEventListener('click', async () => {
  if (pending) return;
  document.querySelector('.dorma-account-error')?.remove();
  if (!account) {
    // Already on the login page: move to the existing form without reloading it.
    if (document.querySelector('#site-menu').classList.contains('is-active')) document.querySelector('#toggle-site-menu').click();
    formFrame.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
    formFrame.contentDocument?.querySelector('#username')?.focus({ preventScroll: true });
    return;
  }
  pending = true; accountButton.disabled = true; accountButton.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': account.csrfToken }, body: '{}' });
    const result = await response.json();
    if (!response.ok && response.status !== 401) throw new Error(result.error?.message || '退出失败，请重试');
    revision++; account = null; updateAccountButton();
    if (parent !== window) parent.postMessage({ type: 'dorma-session-changed' }, location.origin);
  } catch (reason) {
    const error = document.createElement('p');
    error.className = 'dorma-account-error'; error.setAttribute('role', 'alert');
    error.textContent = reason instanceof Error ? reason.message : '退出失败，请重试'; document.body.append(error);
  } finally {
    pending = false; accountButton.disabled = false; accountButton.removeAttribute('aria-busy');
  }
});

window.addEventListener('focus', syncAccount);
void syncAccount();
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== formFrame.contentWindow) return;
  if (event.data?.type === 'dorma-login-size' && Number.isFinite(event.data.height)) {
    formFrame.style.height = Math.max(220, Math.min(600, event.data.height)) + 'px';
  }
  if (event.data?.type === 'dorma-login-success') {
    void syncAccount();
    if (parent === window) location.replace('/login');
    else parent.postMessage({ type: 'dorma-login-success' }, location.origin);
  }
});
// Retain the complete source footer without sending subscription requests.
const footerForm = document.querySelector('#site-footer form');
footerForm.addEventListener('submit', event => {
  event.preventDefault(); event.stopImmediatePropagation();
  const input = footerForm.querySelector('input[type=email]');
  input.setCustomValidity('请使用页面上方的账号登录表单。'); input.reportValidity();
}, true);
footerForm.addEventListener('input', () => footerForm.querySelector('input[type=email]').setCustomValidity(''));
