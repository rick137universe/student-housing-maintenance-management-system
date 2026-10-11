"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { AnimeHome } from '@/components/home/AnimeHome';
import { animeHomeMarkup } from '@/data/anime-home-markup';
import '@/styles/anime-core.css';
import '@/styles/anime-home.css';

const Workspace = dynamic(() => import('@/views/workspace/WorkspacePage').then(module => module.WorkspacePage), { ssr: false });

// Route screens stay mounted while their content changes, keeping navigation stable.
export function AnimeHomePage() {
  const pathname = usePathname();
  const active = pathname === '/';
  const [visited, setVisited] = useState(active);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => setVisited(true));
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return <>
    {(visited || active) && <AnimeHome markup={animeHomeMarkup} active={active} />}
    {pathname.startsWith('/workspace/') && <Workspace />}
  </>;
}
