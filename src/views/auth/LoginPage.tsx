'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { workspacePath } from '@/utils/workspace-route';
import { api, saveAuthSession } from '@/utils/auth-session';
import type { Account } from '@/types/auth';
import s from './LoginPage.module.css';

// The mother project also embeds Learn as an isolated HTML document.
export function LoginPage() {
  const router = useRouter();
  const { account, refresh } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);
  useEffect(() => { void import('@/views/workspace/WorkspacePage'); }, []);

  useEffect(() => {
    if (!account) return;
    router.replace(workspacePath(account.role));
  }, [account, router]);

  useEffect(() => {
    const onSessionChange = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'dorma-workspace-entry') {
        try {
          const { data } = await api<Account>('auth/me');
          saveAuthSession(data);
          router.push(workspacePath(data.role));
        } catch { router.replace('/login'); }
        return;
      }
      if (!['dorma-login-success', 'dorma-session-changed'].includes(event.data?.type)) return;
      // Resolve the identity from the server instead of trusting message data.
      void refreshRef.current();
    };
    window.addEventListener('message', onSessionChange);
    return () => window.removeEventListener('message', onSessionChange);
  }, [router]);

  return <main className={s.page}>
    <iframe ref={frame} className={s.frame} data-dorma-login-frame src="/assets/login/index.html" title="系统登录" />
  </main>;
}
