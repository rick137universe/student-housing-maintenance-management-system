'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter,useSearchParams} from 'next/navigation';
import {useAuth} from '@/components/auth/AuthProvider';
import {LiveWorkspace} from '@/components/workspace/LiveWorkspace';
import {featureFor} from '@/data/role-features';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import type {Account} from '@/types/auth';
import legacy from './WorkspacePage.module.css';
import s from './AdminDocsPage.module.css';

// Keep the existing admin forms and tables isolated from the mother document's CSS.
function AdminBusiness({account,entry,onReady}:{account:Account;entry:AdminPage;onReady?:()=>void}){
 const host=useRef<HTMLDivElement>(null),[target,setTarget]=useState<HTMLDivElement|null>(null);
 useLayoutEffect(()=>{
  const node=host.current!,shadow=node.shadowRoot??node.attachShadow({mode:'open'});
  const styles=[...document.querySelectorAll('link[rel="stylesheet"],style')].map(style=>style.cloneNode(true) as HTMLElement);
  const computed=getComputedStyle(document.documentElement);
  for(const name of computed)if(name.startsWith('--'))node.style.setProperty(name,computed.getPropertyValue(name));
  node.style.fontFamily=getComputedStyle(document.body).fontFamily;node.style.color=computed.getPropertyValue('--ink');node.style.display='block';node.style.backgroundColor=computed.getPropertyValue('--page-bg');node.style.colorScheme=computed.colorScheme;
  const content=node.ownerDocument.createElement('div');content.dataset.dormaAdminBusiness='';shadow.replaceChildren(...styles,content);
  let current=true;
  void Promise.all(styles.filter(style=>style.tagName==='LINK').map(style=>new Promise<void>(resolve=>{
   if((style as HTMLLinkElement).sheet){resolve();return;}
   style.addEventListener('load',()=>resolve(),{once:true});style.addEventListener('error',()=>resolve(),{once:true});
  }))).then(()=>{if(current)setTarget(content);});
  return()=>{current=false;shadow.replaceChildren();};
 },[]);
 useLayoutEffect(()=>{if(target)host.current!.ownerDocument.scrollingElement?.scrollTo({top:0,behavior:'instant'});},[target]);
 useEffect(()=>{if(target)onReady?.();},[target,onReady]);
 const feature=featureFor('admin',entry.feature)!;
 return <div ref={host} data-dorma-admin-business-host>{target&&createPortal(<>
  <div className={legacy.actionTitle}><p>{account.roleName} / {feature.title}</p><h1>{entry.label}</h1><span>{feature.description}</span></div>
  <div className={legacy.workspaceContent}><LiveWorkspace account={account} featureId={entry.feature} actionId={entry.action}/></div>
 </>,target)}</div>;
}

export function AdminDocsPage({account,featureId,actionId,onReady,onLogout}:{account:Account;featureId:string;actionId:string;onReady?:()=>void;onLogout?:()=>void}){
 const router=useRouter(),{refresh}=useAuth(),frame=useRef<HTMLIFrameElement>(null),refreshRef=useRef(refresh);
 const params=useSearchParams(),queryRef=useRef(params.toString());
 useLayoutEffect(()=>{queryRef.current=params.toString();},[params]);
 useEffect(()=>{refreshRef.current=refresh;},[refresh]);
 const [src]=useState(()=>'/assets/admin/index.html?entry='+encodeURIComponent((adminPages.find(page=>page.feature===featureId&&page.action===actionId)??adminPages[0]).id));
 const [view,setView]=useState<{target:Element;entry:AdminPage}|null>(null);
 useEffect(()=>{frame.current?.contentWindow?.postMessage({type:'dorma-admin-account-changed'},location.origin);},[account.displayName]);
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
   if(event.data?.type==='dorma-admin-logout'){if(onLogout)onLogout();else void refreshRef.current().then(()=>router.push('/'));return;}
   if(event.data?.type==='dorma-admin-login'){router.push('/login');return;}
   if(event.data?.type!=='dorma-admin-page')return;
   const entry=adminPages.find(page=>page.id===event.data.id);if(!entry)return;
   if(entry.action==='overview'){setView(null);onReady?.();}
   else{
    const target=frame.current?.contentDocument?.querySelector('[data-dorma-business]');if(!target)return;
    setView(current=>current?.target===target&&current.entry.id===entry.id?current:{target,entry});
   }
   const query=location.pathname===entry.url?new URLSearchParams(location.search).toString():'';
   if(location.pathname!==entry.url||queryRef.current!==query)router.replace(entry.url+(query?'?'+query:''),{scroll:false});
  };
  window.addEventListener('message',receive);frame.current?.contentWindow?.postMessage({type:'dorma-admin-connect'},location.origin);
  return()=>window.removeEventListener('message',receive);
 },[router,onReady,onLogout]);
 return <main className={s.page}>
  <iframe ref={frame} className={s.frame} data-dorma-admin-frame src={src} title="管理员工作台"/>
  {view&&createPortal(<AdminBusiness key={view.entry.id+':'+account.id} account={account} entry={view.entry} onReady={onReady}/>,view.target)}
 </main>;
}
