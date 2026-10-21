const form = document.querySelector('form');
const username = document.querySelector('#username');
const password = document.querySelector('#password');
const button = document.querySelector('button');
const buttonLabel = button.querySelector('.button-label');
const error = document.querySelector('#login-error');
let pending = false;
const resize = () => parent.postMessage({ type: 'dorma-login-size', height: Math.ceil(form.getBoundingClientRect().height) }, location.origin);
new ResizeObserver(resize).observe(form);
const update = () => { button.disabled = pending || !form.checkValidity(); };
form.addEventListener('input', update);
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending || !form.reportValidity()) return;
  pending = true; error.hidden = true; update(); buttonLabel.textContent = '正在登录…';
  form.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/v1/auth/login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.value.trim(), password: password.value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || '登录失败，请重试');
    password.value = '';
    parent.postMessage({ type: 'dorma-login-success' }, location.origin);
  } catch (reason) {
    error.textContent = reason instanceof Error ? reason.message : '登录失败，请重试'; error.hidden = false;
    pending = false; buttonLabel.textContent = '登录工作台'; update(); form.removeAttribute('aria-busy'); password.focus();
  }
});
update();
