'use client';


import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { redirect, useParams, usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Menu, ShieldAlert, X } from 'lucide-react';
import { LiveWorkspace } from '@/components/workspace/LiveWorkspace';
import { useAuth } from '@/components/auth/AuthProvider';
import { api, saveAuthSession } from '@/utils/auth-session';
import { featureFor, roleFeatures } from '@/data/role-features';
import { demoAccounts, type RoleId } from '@/data/accounts';
import s from './WorkspacePage.module.css';
import { ThemeSelect } from '@/components/theme/ThemeProvider';
import { StudentDocsPage } from './StudentDocsPage';
import {studentPages} from '@/data/student-pages';
import {ManagerDocsPage} from './ManagerDocsPage';
import {MaintenanceDocsPage} from './MaintenanceDocsPage';

const validRoles: RoleId[] = ['student', 'dormManager', 'maintenance', 'admin'];

export function WorkspacePage({onReady}:{onReady?:()=>void}) {
  const params = useParams<{ role: string; feature?: string; action?: string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { account, refresh } = useAuth();
  const leavingRef=useRef(false),[leaving,setLeaving]=useState(false);
  const docsLogout=useCallback(()=>{leavingRef.current=true;setLeaving(true);void refresh().then(()=>router.push('/'));},[refresh,router]);
  const [error, setError] = useState('');
  const role = validRoles.includes(params.role as RoleId) ? params.role as RoleId : null;
  const feature = role && params.feature ? featureFor(role, params.feature) : undefined;
  const actionId = pathname.split('/')[4];
  const action = feature?.actions.find(item => item.id === actionId) ?? feature?.actions[0];

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-dorma-workspace-active', '');
    return () => document.documentElement.removeAttribute('data-dorma-workspace-active');
  }, []);
  useLayoutEffect(()=>{
    if(account!==undefined&&!(account?.role===role&&(role==='student'||role==='dormManager'||role==='maintenance')&&(!params.feature||feature)))onReady?.();
  },[account,role,params.feature,feature,onReady]);

  async function logout() {
    if(leavingRef.current)return;leavingRef.current=true;setLeaving(true);
    try { await api('auth/logout', {method:'POST',body:'{}'}); saveAuthSession(null); router.push('/'); }
    catch(error) { leavingRef.current=false;setLeaving(false);setError(error instanceof Error ? error.message : '退出失败'); }
  }

  if (account === undefined) return null;
  if (!account) {
    // Explicit logout already owns its destination; do not race it with an auth redirect.
    if(leaving)return null;
    redirect('/login');
  }

  if (account?.role === 'student' && role === 'student' && !params.feature) {
    return <StudentDocsPage account={account} featureId="overview" actionId="overview" onReady={onReady} onLogout={docsLogout}/>;
  }
  if(account?.role==='dormManager'&&role==='dormManager'&&!params.feature){
    return <ManagerDocsPage account={account} featureId="overview" actionId="overview" onReady={onReady} onLogout={docsLogout}/>;
  }
  if(account.role==='maintenance'&&role==='maintenance'&&!params.feature){
    return <MaintenanceDocsPage account={account} featureId="overview" actionId="overview" onReady={onReady} onLogout={docsLogout}/>;
  }

  if (!role || !feature || account.role !== role || !roleFeatures[account.role].some(item => item.id === feature.id)) return <main className={s.denied}>
    <ShieldAlert />
    <p>DORMA / ACCESS DENIED</p>
    <h1>当前身份无权访问。</h1>
    <span>{demoAccounts.find(item => item.role === account.role)?.roleName}只能进入自己的工作台。</span>
    <Link href="/">返回首页</Link>
  </main>;

  if (role === 'student') {
    const nestedAction=pathname.split('/').slice(4).join('/');
    const studentAction=studentPages.find(entry=>entry.feature===feature.id&&entry.action===nestedAction)?.action;
    return <StudentDocsPage account={account} featureId={feature.id} actionId={actionId ? studentAction??action?.id??'action-1':'overview'} onReady={onReady} onLogout={docsLogout}/>;
  }
  if(role==='dormManager')return <ManagerDocsPage account={account} featureId={feature.id} actionId={actionId?action?.id??'action-1':'overview'} onReady={onReady} onLogout={docsLogout}/>;
  if(role==='maintenance')return <MaintenanceDocsPage account={account} featureId={feature.id} actionId={actionId?action?.id??'action-1':'overview'} onReady={onReady} onLogout={docsLogout}/>;

  return <div className={s.page}>
    <header className={s.topbar}>
      <Link href="/" className={s.brand}>dorma<span>.</span></Link>
      <div className={s.topbarIdentity}><span>{account.roleName}</span><strong>{account.displayName}</strong></div>
      <div className={s.topbarTools}><Link className={s.homeLink} href="/"><ArrowLeft size={14} />返回首页</Link><ThemeSelect /><button onClick={logout}><LogOut size={14} />退出登录</button></div>
    </header>
    <div className={s.mobileNavigation}>
      <button type="button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="role-navigation"><Menu size={17} />功能菜单</button>
      <span>{feature.title} / {action?.label}</span>
    </div>
    <div className={s.layout}>
      {menuOpen && <button className={s.menuBackdrop} aria-label="关闭功能菜单" onClick={() => setMenuOpen(false)} />}
      <aside className={s.sidebar} id="role-navigation" data-open={menuOpen}>
        <div className={s.sidebarHeading}><span>我的工作台</span><button type="button" aria-label="关闭功能菜单" onClick={() => setMenuOpen(false)}><X size={18} /></button></div>
        <nav aria-label={account.roleName + '功能导航'}>
          {roleFeatures[account.role].map(group => <section key={group.id} className={s.navGroup} data-active={group.id === feature.id}>
            <Link className={s.groupLink} href={'/workspace/' + role + '/' + group.id + '/' + group.actions[0].id} onClick={() => setMenuOpen(false)}>{group.title}</Link>
            <ul>{group.actions.map(item => {
              const selected = group.id === feature.id && item.id === action?.id;
              return <li key={item.id}><Link href={'/workspace/' + role + '/' + group.id + '/' + item.id} aria-current={selected ? 'page' : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link></li>;
            })}</ul>
          </section>)}
        </nav>
      </aside>
      <main className={s.content}>
        <div className={s.actionTitle}><p>{account.roleName} / {feature.title}</p><h1>{action?.label}</h1><span>{feature.description}</span></div>
        <div className={s.workspaceContent}>
          {error && <p role="alert">{error}</p>}
          <LiveWorkspace key={pathname} account={account} featureId={feature.id} actionId={action?.id ?? 'action-1'} />
        </div>
      </main>
    </div>
  </div>;
}
