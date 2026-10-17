'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { DocsWorkspace } from '@/components/workspace/LiveWorkspace';
import { studentPages as entries } from '@/data/student-pages';
import type { Account } from '@/types/auth';
import s from './StudentDocsPage.module.css';

export function StudentDocsPage({ account, featureId, actionId }: { account: Account; featureId: string; actionId: string }) {
  const router = useRouter();
  const { refresh } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  const [src] = useState(() => '/assets/student/index.html?entry=' + encodeURIComponent((entries.find(e => e.feature === featureId && e.action === actionId) ?? entries[0]).id));
  const [view, setView] = useState<{ target: Element; entry: typeof entries[number] } | null>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'dorma-student-logout') { void refreshRef.current().then(() => router.push('/')); return; }
      if (event.data?.type === 'dorma-student-login') { router.push('/login'); return; }
      if (event.data?.type !== 'dorma-student-page') return;
      const entry = entries.find(e => e.id === event.data.id);
      const target = frame.current?.contentDocument?.querySelector('[data-dorma-business]');
      if (!entry) return;
      if (entry.action === 'overview') setView(null);
      else if (target) setView(current => current?.target === target && current.entry.id === entry.id ? current : { target, entry });
      else return;
      if (location.pathname !== entry.url) router.replace(entry.url);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [router, account.role]);
  return <main className={s.page}>
    <iframe ref={frame} className={s.frame} data-dorma-student-frame src={src} title="学生工作台" />
    {view && createPortal(<DocsWorkspace key={view.entry.id} account={account} featureId={view.entry.feature} actionId={view.entry.action} />, view.target)}
  </main>;
}
