'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { roleFeatures } from '@/data/role-features';
import s from './LoginPage.module.css';

// The mother project also embeds Learn as an isolated HTML document.
export function LoginPage() {
  const router = useRouter();
  const { account, refresh } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    if (!account) return;
    const first = roleFeatures[account.role][0];
    router.replace('/workspace/' + account.role + '/' + first.id + '/' + first.actions[0].id);
  }, [account, router]);

  useEffect(() => {
    const onLogin = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'dorma-login-success') return;
      // Resolve the identity from the server instead of trusting message data.
      void refreshRef.current();
    };
    window.addEventListener('message', onLogin);
    return () => window.removeEventListener('message', onLogin);
  }, []);

  return <main className={s.page}>
    <iframe ref={frame} className={s.frame} data-dorma-login-frame src="/assets/login/index.html" title="系统登录" />
  </main>;
}
