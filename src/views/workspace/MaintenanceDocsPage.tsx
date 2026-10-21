'use client';

import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter,useSearchParams} from 'next/navigation';
import {useAuth} from '@/components/auth/AuthProvider';
import {DocsWorkspace} from '@/components/workspace/LiveWorkspace';
import {StudentAnnouncementPage} from '@/components/workspace/StudentAnnouncementPage';
import {StudentAnnouncementData,announcementListPath} from '@/utils/student-announcement-data';
import {MaintenanceOrderPage} from '@/components/workspace/MaintenanceOrderPage';
import {MaintenanceRecordPage} from '@/components/workspace/MaintenanceRecordPage';
import {MaintenanceRecordData,maintenanceRecordListPath,maintenanceOrderListPath,maintenanceProcessingListPath,maintenanceRatingListPath} from '@/utils/maintenance-record-data';
import {MaintenanceAnalyticsPage} from '@/components/workspace/MaintenanceAnalyticsPage';
import {maintenancePages,type MaintenancePage} from '@/data/maintenance-pages';
import type {Account} from '@/types/auth';
import s from './MaintenanceDocsPage.module.css';

export function MaintenanceDocsPage({account,featureId,actionId,onReady,onLogout}:{account:Account;featureId:string;actionId:string;onReady?:()=>void;onLogout?:()=>void}){
 const router=useRouter(),{refresh}=useAuth(),refreshRef=useRef(refresh),frame=useRef<HTMLIFrameElement>(null);
 const params=useSearchParams(),queryRef=useRef(params.toString());
 useLayoutEffect(()=>{queryRef.current=params.toString();},[params]);
 const messages=useMemo(()=>new StudentAnnouncementData(account.id,account.csrfToken),[account.id,account.csrfToken]);
 const records=useMemo(()=>new MaintenanceRecordData(account.id,account.csrfToken),[account.id,account.csrfToken]);
 useEffect(()=>{
  const iframe=frame.current!;let detach=()=>{};
  const bind=()=>{
   detach();const doc=iframe.contentDocument;if(!doc)return;
   const warm=(event:Event)=>{
    const anchor=(event.target as Element).closest?.('a[href]');if(!anchor)return;
    const url=new URL(anchor.getAttribute('href')!,doc.baseURI);if(url.origin!==location.origin)return;
    const entry=maintenancePages.find(entry=>entry.url===url.pathname);
    if(entry?.feature==='notifications'&&entry.action!=='overview')void messages.load(announcementListPath(entry)).catch(()=>{});
    if(entry?.feature==='orders'&&entry.action!=='overview')void records.load(maintenanceOrderListPath(entry.action)).catch(()=>{});
    if(entry?.feature==='repair'&&entry.action!=='overview')void records.load(maintenanceProcessingListPath(entry.action)).catch(()=>{});
    if(entry?.feature==='analytics'&&entry.action!=='overview'){void records.load('statistics').catch(()=>{});if(entry.action==='action-3')void records.load(maintenanceRatingListPath()).catch(()=>{});}
    if(entry?.feature==='records'&&entry.action!=='overview')void records.load(maintenanceRecordListPath(entry.action)).catch(()=>{});
   };
   doc.addEventListener('pointerover',warm);doc.addEventListener('focusin',warm);
   detach=()=>{doc.removeEventListener('pointerover',warm);doc.removeEventListener('focusin',warm);};
  };
  iframe.addEventListener('load',bind);bind();return()=>{iframe.removeEventListener('load',bind);detach();};
 },[messages,records]);
 const [src]=useState(()=>'/assets/maintenance/index.html?entry='+encodeURIComponent((maintenancePages.find(page=>page.feature===featureId&&page.action===actionId)??maintenancePages[0]).id));
 const [view,setView]=useState<{target:Element;entry:MaintenancePage}|null>(null);
 useEffect(()=>{refreshRef.current=refresh;},[refresh]);
 useEffect(()=>{frame.current?.contentWindow?.postMessage({type:'dorma-maintenance-account-changed'},location.origin);},[account.displayName]);
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==location.origin||event.source!==frame.current?.contentWindow)return;
   if(event.data?.type==='dorma-maintenance-logout'){if(onLogout)onLogout();else void refreshRef.current().then(()=>router.push('/'));return;}
   if(event.data?.type==='dorma-maintenance-login'){router.push('/login');return;}
   if(event.data?.type!=='dorma-maintenance-page')return;
   const entry=maintenancePages.find(page=>page.id===event.data.id);if(!entry)return;
   if(entry.action==='overview'){setView(null);onReady?.();}
   else{
    const target=frame.current?.contentDocument?.querySelector('[data-dorma-business]');if(!target)return;
    setView(current=>current?.target===target&&current.entry.id===entry.id?current:{target,entry});
    onReady?.();
   }
   const query=location.pathname===entry.url?new URLSearchParams(location.search).toString():'';
   if(location.pathname!==entry.url||queryRef.current!==query)router.replace(entry.url+(query?'?'+query:''),{scroll:false});
  };
  window.addEventListener('message',receive);frame.current?.contentWindow?.postMessage({type:'dorma-maintenance-connect'},location.origin);
  return()=>window.removeEventListener('message',receive);
 },[router,onReady,onLogout]);
 return <main className={s.page}>
  <iframe ref={frame} className={s.frame} data-dorma-maintenance-frame src={src} title="维修工作台"/>
  {view&&createPortal(view.entry.feature==='orders'
   ?<MaintenanceOrderPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={records}/>
   :['records','repair'].includes(view.entry.feature)
   ?<MaintenanceRecordPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={records}/>
   :view.entry.feature==='notifications'
   ?<StudentAnnouncementPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={messages} workspaceTitle="维修工作台" contentChangeEvent="dorma-maintenance-content-change"/>
   :view.entry.feature==='personal'
   ?<DocsWorkspace key={view.entry.id+':'+account.id} account={account} featureId={view.entry.feature} actionId={view.entry.action} docsColor={view.entry.color}/>
   :<MaintenanceAnalyticsPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={records}/>,view.target)}
 </main>;
}
