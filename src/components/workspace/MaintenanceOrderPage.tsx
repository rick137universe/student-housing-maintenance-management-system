'use client';

import {DocsPagination} from './DocsPagination';

import {useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {api} from '@/utils/auth-session';
import type {MaintenancePage} from '@/data/maintenance-pages';
import type {StudentRow} from '@/utils/student-record-data';
import {maintenanceOrderListPath,type MaintenanceRecordData} from '@/utils/maintenance-record-data';
import {RepairHistory,RepairValues,repairValue,RepairArrow} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

export function MaintenanceOrderPage({entry,data}:{entry:MaintenancePage;data:MaintenanceRecordData}){
 const router=useRouter(),params=useSearchParams(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <OrderContent key={[entry.id,record,page].join(':')} entry={entry} data={data} record={record} page={page} navigate={navigate}/>;
}
function OrderContent({entry,data,record,page,navigate}:{entry:MaintenancePage;data:MaintenanceRecordData;record:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),router=useRouter(),saving=useRef(false),acceptAction=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const path=record===null?maintenanceOrderListPath(entry.action,page):'repairs/'+record;
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??'');
 const [result,setResult]=useState(()=>data.peek(path)),[history,setHistory]=useState<StudentRow[]>([]),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length,canAccept=entry.action==='action-2'&&detail?.repair_status==='dispatched';
 const load=useCallback(async(force=false)=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('工单不存在或不可访问。');
   const [next,updates]=await Promise.all([data.load(path,force),record===null?Promise.resolve(null):data.load('repairs/'+record+'/history',force)]);
   if(record===null&&next.meta){const lastPage=Math.max(1,Math.ceil(next.meta.total/20));if(page>lastPage){if(request.current.version===version)navigate(entry.url+(lastPage>1?'?page='+lastPage:''));return;}}
   if(record!==null&&Array.isArray(next.data))throw new Error('工单不存在或不可访问。');
   if(request.current.version===version){setResult(next);setHistory(Array.isArray(updates?.data)?updates.data:[]);}
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[data,path,record,page,navigate,entry.url]);
 useEffect(()=>{const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);return()=>{state.version++;window.removeEventListener('focus',refresh);};},[load]);
 async function accept(){
  if(saving.current||!detail||!canAccept)return;
  saving.current=true;setPending(true);setError('');
  try{
   const current=await data.load('repairs/'+record,true);
   if(Array.isArray(current.data)||current.data.repair_status!=='dispatched'){data.invalidate();await load(true);throw new Error('工单已接单或当前不能接单，请查看最新状态。');}
   await api(`repairs/${record}/accept`,{method:'POST',body:'{}'});data.invalidate();await load(true);
  }catch(reason){setError(reason instanceof Error?reason.message:'接单失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{acceptAction.current=accept;});
 useLayoutEffect(()=>{footer.current?.setAttribute('aria-disabled',String(pending));footer.current?.setAttribute('aria-busy',String(pending));},[pending,canAccept]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(record!==null)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-maintenance-content-change',{detail:{key:record===null&&page===1?'page':JSON.stringify([record,page])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,page]);
 useLayoutEffect(()=>{
  if(record===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={title:heading.textContent,href:heading.href,tooltip:heading.title,description:description.textContent,documentTitle:doc.title};
  heading.textContent='维修工单详情';heading.href=detailUrl;heading.title='维修工单详情';description.textContent='查看报修资料、初审结果及工单处理过程。';doc.title='维修工单详情 · 维修工作台';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,arrow=doc.createElement('span'),crumb=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';crumb.textContent=entry.label;crumb.title=entry.label;crumb.href=listUrl;crumb.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',crumb);breadcrumb.replaceWith(crumbs);
  const previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,back=previous.cloneNode(true) as HTMLAnchorElement;back.href=listUrl;back.title=entry.label;back.removeAttribute('data-id');back.dataset.color=String(entry.color);back.className='text-ui color-red';
  for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(entry.label);previous.replaceWith(back);
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],replacement=doc.createElement('li'),replacementHeading=nextHeading.cloneNode(false) as HTMLElement;replacement.className='next-link';
  let action:HTMLAnchorElement|undefined;
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void acceptAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void acceptAction.current();}};
  if(canAccept){action=doc.createElement('a');action.href=detailUrl;action.title='确认接单';action.textContent='确认接单';action.className='text-ui color-red';action.dataset.color=String(entry.color);action.setAttribute('role','button');action.setAttribute('aria-disabled',String(saving.current));action.setAttribute('aria-busy',String(saving.current));action.innerHTML+=`<svg viewBox="0 0 24 24" class="icon"><polygon fill="currentColor" points="17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75"/></svg>`;action.addEventListener('click',send);action.addEventListener('keydown',keyboard);replacement.append(action);replacementHeading.textContent='下一个';footer.current=action;}
  next.replaceWith(replacement);nextHeading.replaceWith(replacementHeading);
  const returnToList=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(listUrl);};
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};crumb.addEventListener('click',returnToList);back.addEventListener('click',returnToList);heading.addEventListener('click',stay);
  return()=>{action?.removeEventListener('click',send);action?.removeEventListener('keydown',keyboard);if(footer.current===action)footer.current=null;crumb.removeEventListener('click',returnToList);back.removeEventListener('click',returnToList);heading.removeEventListener('click',stay);if(info.isConnected){crumbs.replaceWith(breadcrumb);back.replaceWith(previous);replacement.replaceWith(next);replacementHeading.replaceWith(nextHeading);heading.textContent=saved.title;heading.href=saved.href;heading.title=saved.tooltip;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[record,canAccept,detailUrl,listUrl,entry.label,entry.color,navigate]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 function warm(row:StudentRow,url:string){router.prefetch(url);void data.load('repairs/'+row.repair_id+'/history').catch(()=>{});}
 const fields:ReadonlyArray<readonly[string,string]>=[['repair_id','报修编号'],['full_name','报修人'],['student_number','学号'],['building_name','楼栋'],['room_id','报修房间'],['fault_type','故障类型'],['fault_description','故障描述'],['contact_phone','联系电话'],['repair_status','工单状态'],['submitted_at','提交时间'],['reviewed_at','初审时间'],['review_note','初审意见']];
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-maintenance-order aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-maintenance-order-list>{rows.map(row=>{const url=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(String(row.repair_id));return <li key={String(row.repair_id)}><a className="text-ui color-red" data-color={entry.color} href={url} target="_top" onPointerEnter={()=>warm(row,url)} onFocus={()=>warm(row,url)} onClick={event=>link(url,event)}>{['full_name','room_id','fault_type','repair_status'].map(key=>repairValue(key,row[key])).join(' · ')}<RepairArrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}<DocsPagination page={page} total={total} pageUrl={next=>entry.url+(next>1?'?page='+next:'')} navigate={navigate}/>
  </>:detail&&<><RepairValues row={detail} fields={fields}/>{history.length>0&&<RepairHistory history={history}/>}</>)}
 </div>;
}
