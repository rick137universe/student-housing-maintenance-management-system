'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { roleFeatures } from '@/data/role-features';
import { api, saveAuthSession } from '@/utils/auth-session';
import type { Account } from '@/types/auth';
import s from './AnimeHome.module.css';

export function AnimeHome() {
  const router = useRouter();
  const frame = useRef<HTMLIFrameElement>(null);
  const { refresh } = useAuth();
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  useEffect(() => {
    const receive = async (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'dorma-session-changed') { await refreshRef.current(); return; }
      if (event.data?.type !== 'dorma-home-entry') return;
      if (event.data.destination === 'login') { router.push('/login'); return; }
      if (event.data.destination !== 'workspace') return;
      try {
        const result = await api<Account>('auth/me');
        saveAuthSession(result.data);
        const first = roleFeatures[result.data.role][0];
        router.push('/workspace/' + result.data.role + '/' + first.id + '/' + first.actions[0].id);
      } catch { router.push('/login'); }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [router]);
  return <main className={s.page}>
    <iframe ref={frame} className={s.frame} data-dorma-home-frame src="/assets/home/index.html" title="学生公寓住宿与报修管理系统主页" />
  </main>;
}
