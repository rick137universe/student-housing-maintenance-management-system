'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { roleFeatures } from '@/data/role-features';
import { api, saveAuthSession } from '@/utils/auth-session';
import type { Account } from '@/types/auth';

export default function Page() {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    void api<Account>('auth/me').then(({ data }) => {
      if (!active) return;
      saveAuthSession(data);
      const first = roleFeatures[data.role][0];
      router.replace(`/workspace/${data.role}/${first.id}/${first.actions[0].id}`);
    }).catch(() => { if (active) router.replace('/login'); });
    return () => { active = false; };
  }, [router]);
  return <p role="status">正在进入工作台…</p>;
}
