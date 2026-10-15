'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { demoAccounts } from '@/data/accounts';
import { roleFeatures } from '@/data/role-features';
import { api, saveAuthSession } from '@/utils/auth-session';
import type { Account } from '@/types/auth';
import './learn-base.css';
import './login.css';

// Learn's centered heading, signup block and entrance sequence are adapted to authentication.
export function LoginPage() {
  const router = useRouter();
  const { account } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const passwordInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!account) return;
    const first = roleFeatures[account.role][0];
    router.replace(`/workspace/${account.role}/${first.id}/${first.actions[0].id}`);
  }, [account, router]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError('');
    try {
      const result = await api<Account>('auth/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) });
      setPassword(''); saveAuthSession(result.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : '登录失败，请重试');
      setPending(false); passwordInput.current?.focus();
    }
  }

  return <div data-dorma-login>
    <header className="login-header">
      <Link href="/" className="login-brand" aria-label="Dorma 首页">dorma<span>.</span></Link>
      <Link href="/" className="login-back"><ArrowLeft size={16} />返回首页</Link>
    </header>
    <main id="learn" className="is-ready" aria-labelledby="login-title">
      <section id="learn-animejs">
        <div className="section formatted-text"><div className="section-content">
          <div id="learn-header" className="section-centered">
            <div className="learn-header-text">
              <p className="login-eyebrow">DORMA / SIGN IN</p>
              <h1 id="login-title" className="login-title"><span>登录你的</span><br /><span>公寓</span><span className="login-title-word">工作台<span className="login-dot">.</span></span></h1>
              <p className="text-l">住宿、缴费与报修，让校园生活更有序。</p>
              <p>使用你的系统账号，继续处理公寓事务。</p>
            </div>
            <section className="learn-email-signup" aria-label="账号登录">
              <h2><span>欢迎回来</span>，从这里开始。</h2>
              <form onSubmit={login} aria-busy={pending}>
                <fieldset disabled={pending || account === undefined || Boolean(account)}>
                  <label htmlFor="login-username">账号</label>
                  <input id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={64} value={username} onChange={event => setUsername(event.target.value)} placeholder="请输入系统用户名" />
                  <label htmlFor="login-password">密码</label>
                  <div className="login-password-field">
                    <input id="login-password" name="password" ref={passwordInput} type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} placeholder="请输入密码" aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} />
                    <button type="button" className="login-password-toggle" onClick={() => setVisible(value => !value)} aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
                  <button className="login-submit" type="submit">{pending || account ? '正在进入…' : account === undefined ? '正在确认登录状态…' : '登录工作台'}<ArrowRight size={18} aria-hidden="true" /></button>
                </fieldset>
              </form>
              <div className="login-samples">
                <p>课程样例账号<span>选择身份填入用户名</span></p>
                <div>{demoAccounts.map(item => <button key={item.role} type="button" disabled={pending || Boolean(account)} aria-pressed={username === item.username} onClick={() => { setUsername(item.username); setPassword(''); setError(''); passwordInput.current?.focus(); }}>{item.roleName}</button>)}</div>
                <small>密码为初始化时设置的账号密码。</small>
              </div>
            </section>
            <p className="login-footnote">学生 · 宿管人员 · 维修人员 · 管理员</p>
          </div>
        </div></div>
      </section>
    </main>
    <footer className="login-footer"><span>DORMA</span><span>学生公寓住宿与报修管理系统</span></footer>
  </div>;
}
