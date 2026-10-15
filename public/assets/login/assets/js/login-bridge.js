const formFrame = document.querySelector('.signup-iframe');
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== formFrame.contentWindow) return;
  if (event.data?.type === 'dorma-login-size' && Number.isFinite(event.data.height)) {
    formFrame.style.height = Math.max(220, Math.min(600, event.data.height)) + 'px';
  }
  if (event.data?.type === 'dorma-login-success') {
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
