'use client';

import dynamic from 'next/dynamic';
import {useCallback,useState} from 'react';
import { usePathname } from 'next/navigation';
import { AnimeHome } from '@/components/home/AnimeHome';
import { LoginPage } from '@/views/auth/LoginPage';

const Workspace = dynamic(() => import('@/views/workspace/WorkspacePage').then(module => module.WorkspacePage));

export function AnimeHomePage() {
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
