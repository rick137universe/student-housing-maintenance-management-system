'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { AnimeHome } from '@/components/home/AnimeHome';

const Workspace = dynamic(() => import('@/views/workspace/WorkspacePage').then(module => module.WorkspacePage), { ssr: false });

export function AnimeHomePage() {
  const pathname = usePathname();
  return <>
    {pathname === '/' && <AnimeHome />}
    {pathname.startsWith('/workspace/') && <Workspace />}
  </>;
}
