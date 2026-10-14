'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Building2, ChevronRight, HardHat, KeyRound, ShieldCheck, UsersRound, X, type LucideIcon } from 'lucide-react';
import { demoAccounts, type DemoAccount } from '@/data/accounts';
import { api, saveAuthSession } from '@/utils/auth-session';
import s from './LoginDialog.module.css';

interface Props {
  open: boolean;
  appearance?: 'default' | 'anime';
  onClose: () => void;
  onSessionChange: (account: DemoAccount) => void;
}

const roleIcons: Record<DemoAccount['role'], LucideIcon> = {
  student: UsersRound,
  dormManager: Building2,
  maintenance: HardHat,
  admin: ShieldCheck,
};

export function LoginDialog({ open, onClose, onSessionChange, appearance = 'default' }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  function fillDemo(account: DemoAccount) {
    setUsername(account.username);
    setPassword('');
    setError('');
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await api<DemoAccount>('auth/login', {method:'POST',body:JSON.stringify({username:username.trim(),password})});
      saveAuthSession(result.data);
      onSessionChange(result.data);
      setError('');
      setPassword('');
      dialog.current?.close();
    } catch (error) { setError(error instanceof Error ? error.message : '登录失败'); }
    finally { setPending(false); }
  }

  return <dialog
    ref={dialog}
    className={s.portal}
    data-appearance={appearance}
    aria-labelledby="portal-title"
    onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
  >
    <div className={s.loginShell}>
      <section className={s.loginBrand}>
        <button className={s.closeLight} onClick={() => dialog.current?.close()} aria-label="关闭登录"><X /></button>
        <h2 id="portal-title">进入你的<br />公寓工作台。</h2>
        <p>使用系统账号登录。数据与操作由服务端根据你的身份和授权范围校验。</p>
      </section>
      <section className={s.loginPanel}>
        <button className={s.closeDark} onClick={() => dialog.current?.close()} aria-label="关闭登录"><X /></button>
        <div className={s.loginHeading}><span><KeyRound size={18} /></span><div><small>身份认证</small><h3>登录 Dorma</h3></div></div>
        <form onSubmit={login} className={s.loginForm}>
          <label>账号<input autoFocus autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="学号 / 工号 / 管理员账号" /></label>
          <label>密码<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="请输入密码" /></label>
          {error && <p className={s.loginError} role="alert">{error}</p>}
          <button className={s.loginButton} type="submit" disabled={pending}>{pending?'正在登录…':'登录工作台'} <ArrowRight size={17} /></button>
        </form>
        <div className={s.demoAccounts}>
            <div className={s.demoHeader}><span>课程样例账号</span><small>点击身份填入用户名</small></div>
          <div className={s.demoGrid}>
            {demoAccounts.map(item => {
              const Icon = roleIcons[item.role];
              return <button key={item.role} onClick={() => fillDemo(item)} data-selected={username === item.username}>
                <Icon size={17} /><span><strong>{item.roleName}</strong><small>{item.username}</small></span><ChevronRight size={13} />
              </button>;
            })}
          </div>
          <p>请输入初始化时设置的账号密码。</p>
        </div>
      </section>
    </div>
  </dialog>;
}
