'use client';
import {useEffect} from 'react';
import type {Account,RoleId} from '@/types/auth';
import {studentPages} from '@/data/student-pages';
import {managerPages} from '@/data/manager-pages';
import {maintenancePages} from '@/data/maintenance-pages';
import {adminPages} from '@/data/admin-pages';
import {api} from '@/utils/auth-session';
type Signal={feature:string;actions:string[];active:boolean};
const pages={student:studentPages,dormManager:managerPages,maintenance:maintenancePages,admin:adminPages};
export function useNavigationAttention(account:Account|null|undefined,role:RoleId|null){
 useEffect(()=>{
  if(!account||account.role!==role)return;
  const entries:ReadonlyArray<{id:string;feature:string;action:string;parent?:string}>=pages[account.role];let doc:Document|null=null,detach=()=>{},timer:ReturnType<typeof setTimeout>,revision=0,stopped=false;
  const render=(signals:Signal[])=>{
   if(!doc)return;
   const ids=new Set<string>();
   for(const signal of signals.filter(s=>s.active)){
    for(const action of [...signal.actions,'overview']){
     let entry=entries.find(e=>e.feature===signal.feature&&e.action===action);
     while(entry){ids.add(entry.id);entry=entry.parent?entries.find(e=>e.id===entry!.parent):undefined;}
    }
   }
   for(const link of doc.querySelectorAll<HTMLAnchorElement>('#docs-sidebar a[data-id]')){
    const badge=link.querySelector('[data-student-new]');
    if(ids.has(link.dataset.id!)&&!badge){const badge=doc.createElement('span');badge.className='badge';badge.dataset.studentNew='';badge.textContent='NEW';link.append(' ',badge);}
    else if(!ids.has(link.dataset.id!)&&badge){const space=badge.previousSibling;if(space?.nodeType===3&&space.textContent===' ')space.remove();badge.remove();}
   }
  };
  const refresh=async()=>{const version=++revision;try{const result=await api<Signal[]>('navigation');if(!stopped&&version===revision)render(result.data);}catch{ /* Keep confirmed state until a successful refresh or session unmount. */ }};
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void refresh(),150);};
  const bind=()=>{
   const iframe=document.querySelector<HTMLIFrameElement>('[data-dorma-student-frame],[data-dorma-manager-frame],[data-dorma-maintenance-frame],[data-dorma-admin-frame]');
   const next=iframe?.contentDocument;if(!next||next===doc||!next.querySelector('#docs-sidebar'))return;
   detach();doc=next;
   const events=['visibilitychange','dorma-finance-saved','dorma-notifications-saved','dorma-student-content-change','dorma-manager-content-change','dorma-maintenance-content-change','dorma-admin-content-change'];
   for(const event of events)doc.addEventListener(event,schedule);
   const view=doc.defaultView;view?.addEventListener('focus',schedule);
   detach=()=>{for(const event of events)next.removeEventListener(event,schedule);view?.removeEventListener('focus',schedule);};
   void refresh();
  };
  const observer=new MutationObserver(bind);observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('load',bind,true);window.addEventListener('focus',schedule);
  window.addEventListener('dorma-business-saved',schedule);window.addEventListener('dorma-navigation-refresh',schedule);
  const poll=setInterval(()=>{bind();if(document.visibilityState==='visible')schedule();},30000);bind();
  return()=>{stopped=true;revision++;clearInterval(poll);clearTimeout(timer);detach();observer.disconnect();document.removeEventListener('load',bind,true);window.removeEventListener('focus',schedule);window.removeEventListener('dorma-business-saved',schedule);window.removeEventListener('dorma-navigation-refresh',schedule);};
 },[account,role]);
}
