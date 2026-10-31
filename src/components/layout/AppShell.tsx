'use client';

import dynamic from 'next/dynamic';
import {useCallback,useState} from 'react';
import { usePathname } from 'next/navigation';
import { AnimeHome } from '@/features/home/components/AnimeHome';
import { LoginPage } from '@/features/auth/components/LoginPage';

const Workspace = dynamic(() => import('@/features/workspace/components/WorkspacePage').then(module => module.WorkspacePage));

export function AppShell() {
  const pathname = usePathname();
  const publicPage=pathname==='/'?'home':pathname==='/login'?'login':null;
  const workspace=pathname.startsWith('/workspace/');
  const [previousPath,setPreviousPath]=useState(pathname);
  const [cover,setCover]=useState<'home'|'login'|null>(publicPage);
  if(previousPath!==pathname){
    setPreviousPath(pathname);
    if(publicPage)setCover(publicPage);
    else if(previousPath.startsWith('/workspace/'))setCover(null);
  }
  const ready=useCallback(()=>{
    if(location.pathname.startsWith('/workspace/'))setCover(null);
  },[]);
  return <>
    {workspace&&<Workspace onReady={ready}/>}
    {(publicPage||workspace&&cover)&&<div data-dorma-entry-cover={workspace?'':undefined} style={workspace?{position:'relative',zIndex:100}:undefined}>
      {(publicPage??cover)==='home'?<AnimeHome/>:<LoginPage/>}
    </div>}
  </>;
}
