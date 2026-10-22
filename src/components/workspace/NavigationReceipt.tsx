'use client';
import {useEffect,useRef} from 'react';
import {api} from '@/utils/auth-session';
import type {StudentRow} from '@/utils/student-record-data';
export function NavigationReceipt({row}:{row:StudentRow}){
 const ref=useRef<HTMLSpanElement>(null);
 const resource=String(row.navigation_resource??''),id=String(row.navigation_id??''),version=String(row.navigation_version??'');
 useEffect(()=>{
  if(!resource||!id||!version)return;
  let stopped=false;
  const read=()=>{if(stopped||ref.current?.ownerDocument.visibilityState!=='visible')return;void api('navigation/read',{method:'POST',body:JSON.stringify({resource,id,version})}).then(()=>window.dispatchEvent(new Event('dorma-navigation-refresh'))).catch(()=>{});};
  // A detail has rendered; merely prefetching a record never marks it read.
  const timer=setTimeout(read,400);
  const doc=ref.current?.ownerDocument;doc?.addEventListener('visibilitychange',read);
  return()=>{stopped=true;clearTimeout(timer);doc?.removeEventListener('visibilitychange',read);};
 },[resource,id,version]);
 return <span ref={ref} hidden/>;
}
