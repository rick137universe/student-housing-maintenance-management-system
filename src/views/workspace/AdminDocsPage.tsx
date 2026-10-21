'use client';

import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {useRouter,useSearchParams} from 'next/navigation';
import {useAuth} from '@/components/auth/AuthProvider';
import {LiveWorkspace,DocsWorkspace} from '@/components/workspace/LiveWorkspace';
import {AdminReportPage} from '@/components/workspace/AdminReportPage';
import {adminReportPath,reportFilters,reportFilterError} from '@/utils/admin-report-data';
import {AdminBaseDataPage} from '@/components/workspace/AdminBaseDataPage';
import {isBaseResource,baseListPath} from '@/utils/admin-base-data';
import {AdminProcessPage,adminProcessPath} from '@/components/workspace/AdminProcessPage';
import {AdminDispatchPage,adminDispatchListPath} from '@/components/workspace/AdminDispatchPage';
import {AdminPermissionPage,adminPermissionListPath} from '@/components/workspace/AdminPermissionPage';
import {AdminBackupPage,adminBackupListPath} from '@/components/workspace/AdminBackupPage';
import {StudentRecordData} from '@/utils/student-record-data';
import {AdminBillingPage,adminBillingListPath} from '@/components/workspace/AdminBillingPage';
import {StudentFinanceData} from '@/utils/student-finance-data';
import {AdminAnnouncementPage} from '@/components/workspace/AdminAnnouncementPage';
import {StudentAnnouncementPage} from '@/components/workspace/StudentAnnouncementPage';
import {StudentAnnouncementData,announcementListPath} from '@/utils/student-announcement-data';
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
 const navigationIntent=useRef<string|null>(null);
 const reports=useMemo(()=>new StudentRecordData(account.id,account.csrfToken,{buildings:'building_id'}),[account.id,account.csrfToken]);
 const bases=useMemo(()=>new StudentRecordData(account.id,account.csrfToken,{students:'student_number',buildings:'building_id',rooms:'room_id',beds:'bed_id',accounts:'account_id'}),[account.id,account.csrfToken]);
 const navigateNative=useCallback((url:string)=>{
  const target=adminPages.find(entry=>entry.url===url.split('?')[0]);
  const link=target&&frame.current?.contentDocument?.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${target.id}"]`);
  if(target&&location.pathname!==target.url&&link){
   navigationIntent.current=url;
   // The mother document captures this href before loading, then writes it to history.
   const original=link.getAttribute('href')!;link.href=url;
   try{link.click();}finally{link.setAttribute('href',original);}
  }else router.push(url,{scroll:false});
 },[router]);
 const processes=useMemo(()=>new StudentRecordData(account.id,account.csrfToken,{settings:'setting_key'}),[account.id,account.csrfToken]);
 const dispatches=useMemo(()=>new StudentRecordData(account.id,account.csrfToken,{repairs:'repair_id'}),[account.id,account.csrfToken]);
 const permissions=useMemo(()=>new StudentRecordData(account.id,account.csrfToken,{accounts:'account_id',audit:'audit_id'}),[account.id,account.csrfToken]);
 const backups=useMemo(()=>new StudentRecordData(account.id,account.csrfToken,{'backup-policies':'policy_id',backups:'backup_run_id'}),[account.id,account.csrfToken]);
 const finances=useMemo(()=>new StudentFinanceData(account.id,account.csrfToken),[account.id,account.csrfToken]);
 const messages=useMemo(()=>new StudentAnnouncementData(account.id,account.csrfToken),[account.id,account.csrfToken]);
 useEffect(()=>{
  const iframe=frame.current!;let detach=()=>{};
  const bind=()=>{
   detach();const doc=iframe.contentDocument;if(!doc)return;
   const warm=(event:Event)=>{
    const anchor=(event.target as Element).closest?.('a[href]');if(!anchor)return;
    const url=new URL(anchor.getAttribute('href')!,doc.baseURI);if(url.origin!==location.origin)return;
    const entry=adminPages.find(entry=>entry.url===url.pathname);
    if(entry&&(entry.feature==='notifications'&&entry.action!=='overview'||entry.feature==='announcements'&&entry.kind==='records'))void messages.load(announcementListPath(entry)).catch(()=>{});
    if(entry?.feature==='reports'&&!entry.kind&&entry.action!=='overview'&&entry.action!=='action-3'&&!reportFilterError(reportFilters(url.searchParams)))void reports.load(adminReportPath(reportFilters(url.searchParams))).catch(()=>{});
    const baseType=url.searchParams.get('type');
    if(entry?.feature==='base-data'&&entry.kind==='base-records'&&isBaseResource(baseType))void bases.load(baseListPath(baseType)).catch(()=>{});
    if(entry?.feature==='process'&&entry.action!=='overview')void processes.load(adminProcessPath).catch(()=>{});
    if(entry?.feature==='dispatch'&&entry.action!=='overview')void dispatches.load(adminDispatchListPath(entry.action)).catch(()=>{});
    if(entry?.feature==='permissions'&&(entry.kind==='records'||entry.kind==='authorization-records'||entry.action==='action-3'))void permissions.load(adminPermissionListPath(entry)).catch(()=>{});
    if(entry?.feature==='backup'&&(entry.kind==='records'||entry.action==='action-3'))void backups.load(adminBackupListPath(entry)).catch(()=>{});
    if(entry?.feature==='billing'&&(entry.kind==='records'||entry.action==='action-3'))void finances.load(adminBillingListPath(entry)).catch(()=>{});
   };
   doc.addEventListener('pointerover',warm);doc.addEventListener('focusin',warm);
   detach=()=>{doc.removeEventListener('pointerover',warm);doc.removeEventListener('focusin',warm);};
  };
  iframe.addEventListener('load',bind);bind();return()=>{iframe.removeEventListener('load',bind);detach();};
 },[messages,finances,backups,permissions,dispatches,processes,bases,reports]);
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
    if(['personal','notifications','announcements','billing','backup','permissions','dispatch','process','base-data','reports'].includes(entry.feature))onReady?.();
   }
   const intent=navigationIntent.current?.split('?')[0]===entry.url?navigationIntent.current:null;
   const query=intent?intent.split('?')[1]??'':location.pathname===entry.url?new URLSearchParams(location.search).toString():'';
   if(intent)navigationIntent.current=null;
   if(location.pathname!==entry.url||queryRef.current!==query)router.replace(entry.url+(query?'?'+query:''),{scroll:false});
  };
  window.addEventListener('message',receive);frame.current?.contentWindow?.postMessage({type:'dorma-admin-connect'},location.origin);
  return()=>window.removeEventListener('message',receive);
 },[router,onReady,onLogout]);
 return <main className={s.page}>
  <iframe ref={frame} className={s.frame} data-dorma-admin-frame src={src} title="管理员工作台"/>
  {view&&createPortal(view.entry.feature==='reports'
   ?<AdminReportPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={reports} navigate={navigateNative}/>
   :view.entry.feature==='base-data'
   ?<AdminBaseDataPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={bases} navigate={navigateNative}/>
   :view.entry.feature==='process'
   ?<AdminProcessPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={processes}/>
   :view.entry.feature==='dispatch'
   ?<AdminDispatchPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={dispatches}/>
   :view.entry.feature==='permissions'
   ?<AdminPermissionPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={permissions}/>
   :view.entry.feature==='backup'
   ?<AdminBackupPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={backups}/>
   :view.entry.feature==='billing'
   ?<AdminBillingPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={finances}/>
   :view.entry.feature==='announcements'
   ?<AdminAnnouncementPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={messages}/>
   :view.entry.feature==='notifications'
   ?<StudentAnnouncementPage key={view.entry.id+':'+account.id+':'+(account.csrfToken??'')} entry={view.entry} data={messages} workspaceTitle="管理员工作台" contentChangeEvent="dorma-admin-content-change"/>
   :view.entry.feature==='personal'
   ?<DocsWorkspace key={view.entry.id+':'+account.id} account={account} featureId={view.entry.feature} actionId={view.entry.action} docsColor={view.entry.color}/>
   :<AdminBusiness key={view.entry.id+':'+account.id} account={account} entry={view.entry} onReady={onReady}/>,view.target)}
 </main>;
}
