'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/components/auth/AuthProvider';
import {LiveWorkspace} from '@/components/workspace/LiveWorkspace';
import {featureFor} from '@/data/role-features';
import {managerPages,type ManagerPage} from '@/data/manager-pages';
import type {Account} from '@/types/auth';
import legacy from './WorkspacePage.module.css';
import s from './ManagerDocsPage.module.css';

// Isolate the existing business styles from the unchanged mother template shell.
function ManagerBusiness({account,entry,onReady}:{account:Account;entry:ManagerPage;onReady?:()=>void}){
 const host=useRef<HTMLDivElement>(null);
 const [target,setTarget]=useState<HTMLDivElement|null>(null);
 useLayoutEffect(()=>{
  const node=host.current!,shadow=node.shadowRoot??node.attachShadow({mode:'open'});
  const styles=[...document.querySelectorAll('link[rel="stylesheet"],style')].map(style=>style.cloneNode(true) as HTMLElement);
  const computed=getComputedStyle(document.documentElement);
  for(const name of computed)if(name.startsWith('--'))node.style.setProperty(name,computed.getPropertyValue(name));
  node.style.fontFamily=getComputedStyle(document.body).fontFamily;node.style.color=computed.getPropertyValue('--ink');
  node.style.display='block';node.style.backgroundColor=computed.getPropertyValue('--page-bg');node.style.colorScheme=computed.colorScheme;
  const content=node.ownerDocument.createElement('div');content.dataset.dormaManagerBusiness='';
  shadow.replaceChildren(...styles,content);
  let current=true;
  const ready=Promise.all(styles.filter(style=>style.tagName==='LINK').map(style=>new Promise<void>(resolve=>{
   if((style as HTMLLinkElement).sheet){resolve();return;}
   style.addEventListener('load',()=>resolve(),{once:true});style.addEventListener('error',()=>resolve(),{once:true});
  })));
  void ready.then(()=>{if(current)setTarget(content);});
  return()=>{current=false;shadow.replaceChildren();};
 },[]);
 useEffect(()=>{if(target)onReady?.();},[target,onReady]);
 const feature=featureFor('dormManager',entry.feature)!;
 return <div ref={host} data-dorma-manager-business-host>{target&&createPortal(<>
  <div className={legacy.actionTitle}><p>{account.roleName} / {feature.title}</p><h1>{entry.label}</h1><span>{feature.description}</span></div>
  <div className={legacy.workspaceContent}><LiveWorkspace account={account} featureId={entry.feature} actionId={entry.action}/></div>
 </>,target)}</div>;
}

export function ManagerDocsPage({account,featureId,actionId,onReady}:{account:Account;featureId:string;actionId:string;onReady?:()=>void}){
 const router=useRouter(),{refresh}=useAuth();
 const frame=useRef<HTMLIFrameElement>(null),refreshRef=useRef(refresh);
 useEffect(()=>{refreshRef.current=refresh;},[refresh]);
 const [src]=useState(()=>'/assets/manager/index.html?entry='+encodeURIComponent((managerPages.find(page=>page.feature===featureId&&page.action===actionId)??managerPages[0]).id));
 const [view,setView]=useState<{target:Element;entry:ManagerPage}|null>(null);
 useEffect(()=>{frame.current?.contentWindow?.postMessage({type:'dorma-manager-account-changed'},location.origin);},[account.displayName]);
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
   if(event.data?.type==='dorma-manager-logout'){void refreshRef.current().then(()=>router.push('/'));return;}
   if(event.data?.type==='dorma-manager-login'){router.push('/login');return;}
   if(event.data?.type!=='dorma-manager-page')return;
   const entry=managerPages.find(page=>page.id===event.data.id);if(!entry)return;
   if(entry.action==='overview'){setView(null);onReady?.();}
   else{
    const target=frame.current?.contentDocument?.querySelector('[data-dorma-business]');if(!target)return;
    setView(current=>current?.target===target&&current.entry.id===entry.id?current:{target,entry});
   }
   if(location.pathname!==entry.url||location.search)router.replace(entry.url,{scroll:false});
  };
  window.addEventListener('message',receive);frame.current?.contentWindow?.postMessage({type:'dorma-manager-connect'},location.origin);
  return()=>window.removeEventListener('message',receive);
 },[router,onReady]);
 return <main className={s.page}>
  <iframe ref={frame} className={s.frame} data-dorma-manager-frame src={src} title="宿管工作台"/>
  {view&&createPortal(<ManagerBusiness key={view.entry.id+':'+account.id} account={account} entry={view.entry} onReady={onReady}/>,view.target)}
 </main>;
}
