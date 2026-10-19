'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { DocsWorkspace } from '@/components/workspace/LiveWorkspace';
import { StudentFinancePage } from '@/components/workspace/StudentFinancePage';
import { StudentFinanceData,financeListPath } from '@/utils/student-finance-data';
import { studentPages as entries } from '@/data/student-pages';
import type { Account } from '@/types/auth';
import s from './StudentDocsPage.module.css';

export function StudentDocsPage({ account, featureId, actionId,onReady }: { account: Account; featureId: string; actionId: string;onReady?:()=>void }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryRef = useRef(params.toString());
  useLayoutEffect(() => { queryRef.current = params.toString(); }, [params]);
  const { refresh } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const finance = useMemo(() => new StudentFinanceData(account.id,account.csrfToken), [account.id, account.csrfToken]);
  useEffect(() => {
    void finance.prefetchLists();
    const iframe=frame.current!;
    let detach=()=>{};
    const bind=()=>{
      detach();
      const doc=iframe.contentDocument;if(!doc)return;
      const warm=(event:Event)=>{
        const anchor=(event.target as Element).closest?.('a[href]');if(!anchor)return;
        const url=new URL(anchor.getAttribute('href')!,doc.baseURI);
        if(url.origin!==location.origin)return;
        const entry=entries.find(entry=>entry.feature==='payment'&&entry.action!=='overview'&&entry.url===url.pathname);
        if(entry)void finance.load(financeListPath(entry.action)).catch(()=>{});
      };
      doc.addEventListener('pointerover',warm);doc.addEventListener('focusin',warm);
      detach=()=>{doc.removeEventListener('pointerover',warm);doc.removeEventListener('focusin',warm);};
    };
    iframe.addEventListener('load',bind);bind();
    return()=>{iframe.removeEventListener('load',bind);detach();};
  }, [finance]);
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
      onReady?.();
      if (entry.action === 'overview') setView(null);
      else if (target) setView(current => current?.target === target && current.entry.id === entry.id ? current : { target, entry });
      else return;
      // The copied runtime writes history itself, carrying Next's internal state.
      // Explicitly synchronize its URL so search params cannot outlive a native menu change.
      const query = location.pathname === entry.url ? new URLSearchParams(location.search).toString() : '';
      if (location.pathname !== entry.url || queryRef.current !== query) router.replace(entry.url + (query ? '?' + query : ''), { scroll: false });
    };
    window.addEventListener('message', receive);
    frame.current?.contentWindow?.postMessage({type:'dorma-student-connect'},location.origin);
    return () => window.removeEventListener('message', receive);
  }, [router, account.role,onReady]);
  return <main className={s.page}>
    <iframe ref={frame} className={s.frame} data-dorma-student-frame src={src} title="学生工作台" />
    {view && createPortal(view.entry.feature==='payment'
      ? <StudentFinancePage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} data={finance} actionId={view.entry.action}/>
      : <DocsWorkspace key={view.entry.id} account={account} featureId={view.entry.feature} actionId={view.entry.action} />, view.target)}
  </main>;
}
