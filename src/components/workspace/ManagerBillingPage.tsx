'use client';

import {DocsPagination} from './DocsPagination';

import {StudentWarning} from './StudentWarning';
import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {ManagerPage} from '@/data/manager-pages';
import type {StudentRow} from '@/utils/student-record-data';
import {managerBillingListPath,type ManagerBillingData} from '@/utils/manager-billing-data';
import {valueLabels} from '@/data/workspace-actions';
import {api} from '@/utils/auth-session';
import {StudentEmptyState} from './StudentEmptyState';

const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function date(value:unknown){const parsed=new Date(String(value??''));return Number.isNaN(parsed.getTime())?'—':dateTime.format(parsed);}
const arrowPoints='17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75';
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><g fill="none" fillRule="evenodd"><polygon fill="currentColor" fillRule="nonzero" points={arrowPoints}/></g></svg>;}

export function ManagerBillingPage({entry,data}:{entry:ManagerPage;data:ManagerBillingData}){
 const params=useSearchParams(),router=useRouter(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <BillingContent key={[entry.id,record,page].join(':')} entry={entry} data={data} record={record} page={page} navigate={navigate}/>;
}
function BillingContent({entry,data,record,page,navigate}:{entry:ManagerPage;data:ManagerBillingData;record:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),saving=useRef(false),router=useRouter();
 const submitAction=useRef<()=>Promise<void>>(async()=>{}),submitLink=useRef<HTMLAnchorElement|null>(null);
 const reminder=entry.action==='action-3',checking=entry.action==='action-1',theme='citrus',resource=reminder?'reminders':'bills',identifier=reminder?'notification_id':'bill_id';
 const path=record===null?managerBillingListPath(entry.action,page):resource+'/'+record;
 const [result,setResult]=useState(()=>data.peek(path)),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const canAct=record!==null&&!reminder&&Boolean(detail&&(checking||Number(detail.outstanding_amount)>0)),actionLabel=checking?'确认核对':'发送催缴';
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(record??'');
 const title=reminder?'催缴记录详情':'账单详情';
 const load=useCallback(async(force=false)=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
   const next=await data.load(path,force);
   if(request.current.version===version)setResult(next);
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请刷新后重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[data,path,record]);
 useEffect(()=>{
  const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);
  return()=>{state.version++;window.removeEventListener('focus',refresh);};
 },[load]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
  const content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(record===null)content.after(business);else content.append(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});
  doc.dispatchEvent(new CustomEvent('dorma-manager-content-change',{detail:{key:record===null&&page===1?'page':JSON.stringify([record,page])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,page]);
 useLayoutEffect(()=>{
  if(record===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector<HTMLElement>('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={text:heading.textContent,href:heading.getAttribute('href')!,tooltip:heading.title,hidden:description.hidden,description:description.textContent,documentTitle:doc.title};
  heading.textContent=title;heading.href=detailUrl;heading.title=title;description.hidden=false;description.textContent=reminder?'查看本次催缴内容、发送时间及已读状态。':'查看账单费用、缴费状态及核对信息。';doc.querySelector('title')!.textContent=title+' · 宿管工作台';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,arrow=doc.createElement('span'),back=doc.createElement('a');
  arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';back.href=listUrl;back.title=entry.label;back.textContent=entry.label;back.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',back);breadcrumb.replaceWith(crumbs);
  const previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,replacement=previous.cloneNode(true) as HTMLAnchorElement;
  replacement.href=listUrl;replacement.title=entry.label;replacement.removeAttribute('data-id');replacement.dataset.color=String(entry.color);replacement.className='text-ui color-'+theme;
  for(const node of [...replacement.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();replacement.append(entry.label);previous.replaceWith(replacement);
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],empty=doc.createElement('li'),emptyHeading=nextHeading.cloneNode(false) as HTMLElement;
  let action:HTMLAnchorElement|undefined;
  const mark=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void submitAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void submitAction.current();}};
  if(canAct){
   empty.className='next-link';emptyHeading.textContent='下一个';action=doc.createElement('a');action.className='text-ui color-'+theme;action.dataset.color=String(entry.color);action.href=detailUrl;action.title=actionLabel;action.textContent=actionLabel;action.setAttribute('role','button');
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=doc.createElementNS('http://www.w3.org/2000/svg','polygon');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');polygon.setAttribute('fill','currentColor');polygon.setAttribute('points',arrowPoints);svg.append(polygon);action.append(svg);empty.append(action);
   action.addEventListener('click',mark);action.addEventListener('keydown',keyboard);submitLink.current=action;
  }
  next.replaceWith(empty);nextHeading.replaceWith(emptyHeading);
  const returnToList=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(listUrl);};
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};
  back.addEventListener('click',returnToList);replacement.addEventListener('click',returnToList);heading.addEventListener('click',stay);
  return()=>{
   back.removeEventListener('click',returnToList);replacement.removeEventListener('click',returnToList);heading.removeEventListener('click',stay);
   action?.removeEventListener('click',mark);action?.removeEventListener('keydown',keyboard);if(submitLink.current===action)submitLink.current=null;
   if(info.isConnected){crumbs.replaceWith(breadcrumb);replacement.replaceWith(previous);empty.replaceWith(next);emptyHeading.replaceWith(nextHeading);heading.textContent=saved.text;heading.href=saved.href;heading.title=saved.tooltip;description.hidden=saved.hidden;description.textContent=saved.description;doc.querySelector('title')!.textContent=saved.documentTitle;}
  };
 },[record,title,detailUrl,entry.color,entry.label,listUrl,navigate,theme,canAct,actionLabel,reminder]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 async function submit(){
  if(saving.current||!detail||!canAct)return;
  saving.current=true;setPending(true);setError('');
  try{
   // Refresh the balance before sending from an unpaid detail.
   if(!checking){const latest=await data.load(path,true);if(!Array.isArray(latest.data)&&Number(latest.data.outstanding_amount)<=0){if(root.current)setResult(latest);return;}}
   await api('bills/'+detail.bill_id+'/'+(checking?'check':'remind'),{method:'POST',body:'{}'});
   data.invalidate();if(root.current){if(checking)await load(true);else navigate(listUrl);}
  }catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'操作失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 useLayoutEffect(()=>{submitLink.current?.setAttribute('aria-disabled',String(pending));submitLink.current?.setAttribute('aria-busy',String(pending));},[pending,canAct]);
 const billFields=[['bill_id','账单编号'],['billing_period','账期'],['student_number','学号'],['full_name','姓名'],['accommodation_fee','住宿费'],['utility_fee','水电费'],['total_amount','总金额'],['paid_amount','已缴金额'],['outstanding_amount','待缴金额'],['bill_status','账单状态'],['due_date','缴费截止日期'],['generated_at','生成时间'],['check_status','核对状态'],['checked_by','核对人员编号'],['checked_at','核对时间']];
 const reminderFields=[['notification_id','提醒编号'],['bill_id','账单编号'],['billing_period','账期'],['student_number','学号'],['full_name','姓名'],['title','提醒标题'],['content','催缴内容'],['created_at','催缴时间'],['read_status','已读状态'],['read_at','已读时间']];
 const display=(key:string,row:StudentRow)=>{if(key==='check_status')return row.checked_at?'已核对':'未核对';if(key==='read_status')return row.read_at?'已读':'未读';const value=row[key];if(value===null||value===undefined||value==='')return '—';if(key.endsWith('_at'))return date(value);return ['bill_status'].includes(key)?valueLabels[String(value)]??String(value):String(value);};
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-manager-billing aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-billing-list>{rows.map(row=>{
    const id=String(row[identifier]),url=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(id);
    return <li key={id}><a className={'text-ui color-'+theme} data-color={entry.color} href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{(reminder?['full_name','title','created_at','read_status']:checking?['full_name','billing_period','total_amount','check_status']:['full_name','billing_period','outstanding_amount','bill_status']).map(key=>display(key,row)).join(' · ')}<Arrow/></a></li>;
   })}</ul>
   {!rows.length&&<StudentEmptyState/>}
   <DocsPagination page={page} total={total} pageUrl={next=>entry.url+(next>1?'?page='+next:'')} navigate={navigate}/>
  </>:detail&&<div data-dorma-billing-values>{(reminder?reminderFields:billFields).map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(key,detail)}</code></pre></Fragment>)}</div>)}

 </div>;
}
