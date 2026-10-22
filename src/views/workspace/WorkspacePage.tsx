'use client';


import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { redirect, useParams, usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { featureFor, roleFeatures } from '@/data/role-features';
import { demoAccounts, type RoleId } from '@/data/accounts';
import s from './WorkspacePage.module.css';
import { StudentDocsPage } from './StudentDocsPage';
import {studentPages} from '@/data/student-pages';
import {ManagerDocsPage} from './ManagerDocsPage';
import {MaintenanceDocsPage} from './MaintenanceDocsPage';
import {adminPages} from '@/data/admin-pages';
import {AdminDocsPage} from './AdminDocsPage';
import {workspaceActionId} from '@/data/workspace-paths';
import {useNavigationAttention} from '@/components/workspace/useNavigationAttention';

const validRoles: RoleId[] = ['student', 'dormManager', 'maintenance', 'admin'];

export function WorkspacePage({onReady}:{onReady?:()=>void}) {
  const params = useParams<{ role: string; feature?: string; action?: string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const { account, refresh } = useAuth();
  const leavingRef=useRef(false),[leaving,setLeaving]=useState(false);
  const docsLogout=useCallback(()=>{leavingRef.current=true;setLeaving(true);void refresh().then(()=>router.push('/'));},[refresh,router]);
  const role = validRoles.includes(params.role as RoleId) ? params.role as RoleId : null;
  useNavigationAttention(account,role);
  const feature = role && params.feature ? featureFor(role, params.feature) : undefined;
  const nestedAction=role&&feature?workspaceActionId(role,feature.id,pathname.split('/').slice(4).join('/')):'';
  const actionId = nestedAction.split('/')[0];
  const action = feature?.actions.find(item => item.id === actionId) ?? feature?.actions[0];

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-dorma-workspace-active', '');
    return () => document.documentElement.removeAttribute('data-dorma-workspace-active');
  }, []);
  useLayoutEffect(()=>{
    if(account!==undefined&&!(account?.role===role&&(role==='student'||role==='dormManager'||role==='maintenance'||role==='admin')&&(!params.feature||feature)))onReady?.();
  },[account,role,params.feature,feature,onReady]);

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

  if(account.role==='admin'&&role==='admin'&&!params.feature){
    return <AdminDocsPage account={account} featureId="overview" actionId="overview" onReady={onReady} onLogout={docsLogout}/>;
  }

  if (!role || !feature || account.role !== role || !roleFeatures[account.role].some(item => item.id === feature.id)) return <main className={s.denied}>
    <ShieldAlert />
    <p>DORMA / ACCESS DENIED</p>
    <h1>当前身份无权访问。</h1>
    <span>{demoAccounts.find(item => item.role === account.role)?.roleName}只能进入自己的工作台。</span>
    <Link href="/">返回首页</Link>
  </main>;

  if (role === 'student') {
    const studentAction=studentPages.find(entry=>entry.feature===feature.id&&entry.action===nestedAction)?.action;
    return <StudentDocsPage account={account} featureId={feature.id} actionId={actionId ? studentAction??action?.id??'action-1':'overview'} onReady={onReady} onLogout={docsLogout}/>;
  }
  if(role==='dormManager')return <ManagerDocsPage account={account} featureId={feature.id} actionId={actionId?action?.id??'action-1':'overview'} onReady={onReady} onLogout={docsLogout}/>;
  if(role==='maintenance')return <MaintenanceDocsPage account={account} featureId={feature.id} actionId={actionId?action?.id??'action-1':'overview'} onReady={onReady} onLogout={docsLogout}/>;

  const adminAction=adminPages.find(entry=>entry.feature===feature.id&&entry.action===nestedAction)?.action;
  return <AdminDocsPage account={account} featureId={feature.id} actionId={actionId?adminAction??action?.id??'action-1':'overview'} onReady={onReady} onLogout={docsLogout}/>;
}
