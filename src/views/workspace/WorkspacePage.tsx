'use client';


import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, LogOut, Menu, ShieldAlert, X } from 'lucide-react';
import { ActionWorkspace } from '@/components/workspace/ActionWorkspace';
import { MaintenanceWorkspace } from '@/components/workspace/MaintenanceWorkspace';
import { RepairWorkspace } from '@/components/workspace/RepairWorkspace';
import { readDemoSession, saveDemoSession } from '@/utils/demo-session';
import { featureFor, roleFeatures } from '@/data/role-features';
import { demoAccounts, type DemoAccount, type RoleId } from '@/data/accounts';
import s from './WorkspacePage.module.css';
import { ThemeSelect } from '@/components/theme/ThemeProvider';

const validRoles: RoleId[] = ['student', 'dormManager', 'maintenance', 'admin'];

export function WorkspacePage() {
  const params = useParams<{ role: string; feature: string; action?: string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<DemoAccount | null | undefined>(undefined);
  const [toast, setToast] = useState('');
  const detail = searchParams.get('detail') ?? '';
  const role = validRoles.includes(params.role as RoleId) ? params.role as RoleId : null;
  const feature = role ? featureFor(role, params.feature) : undefined;
  const actionId = pathname.split('/')[4];
  const action = feature?.actions.find(item => item.id === actionId) ?? feature?.actions[0];

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-dorma-workspace-active', '');
    return () => document.documentElement.removeAttribute('data-dorma-workspace-active');
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAccount(readDemoSession()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function closeDetail() {
    window.history.replaceState(null, '', pathname);
  }

  function logout() {
    saveDemoSession(null);
    router.push('/');
  }

  function completeDetail() {
    setToast(detail + '已完成演示操作');
    closeDetail();
    window.setTimeout(() => setToast(''), 2200);
  }

  if (account === undefined) return <main className={s.loading}>正在确认身份…</main>;

  if (!account || !role || !feature) return <main className={s.denied}>
    <ShieldAlert />
    <p>DORMA / SESSION REQUIRED</p>
    <h1>需要先登录。</h1>
    <span>请从首页选择演示身份，再进入对应功能。</span>
    <Link href="/">返回首页登录</Link>
  </main>;

  if (account.role !== role || !roleFeatures[account.role].some(item => item.id === feature.id)) return <main className={s.denied}>
    <ShieldAlert />
    <p>DORMA / ACCESS DENIED</p>
    <h1>当前身份无权访问。</h1>
    <span>{demoAccounts.find(item => item.role === account.role)?.roleName}只能进入自己的工作台。</span>
    <Link href="/">返回首页</Link>
  </main>;

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
          {role === 'maintenance' ? <MaintenanceWorkspace featureId={feature.id} actionId={action?.id ?? 'action-1'} /> : role === 'student' && feature.id === 'repair' ? <RepairWorkspace actionId={action?.id ?? 'action-1'} /> : <ActionWorkspace key={feature.id} feature={feature} actionId={action?.id ?? 'action-1'} role={account.role} />}
        </div>
      </main>
    </div>
    {detail && <div className={s.drawerBackdrop} onClick={() => {
      closeDetail();
    }}>
      <aside className={s.detailDrawer} onClick={event => event.stopPropagation()}>
        <header><div><p>BUSINESS DETAIL</p><h2>{detail}</h2></div><button onClick={() => {
          closeDetail();
        }}><X size={18} /></button></header>
        <section>
          <label>当前功能<strong>{action?.label}</strong></label>
          <label>操作身份<strong>{account.displayName} / {account.roleName}</strong></label>
          <label>业务状态<strong>前端演示数据</strong></label>
        </section>
        <div className={s.drawerData}><span>01</span><p>本页面已接入独立地址和可见详情层。后端接口完成后，这里直接替换为真实表单与业务记录。</p></div>
        <button className={s.completeButton} onClick={completeDetail}><Check size={15} />确认演示操作</button>
      </aside>
    </div>}
    {toast && <p className={s.toast}>{toast}</p>}
  </div>;
}
