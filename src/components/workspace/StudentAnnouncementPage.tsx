'use client';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {StudentPage} from '@/data/student-pages';
import type {StudentRow} from '@/utils/student-record-data';
import {announcementListPath,type StudentAnnouncementData} from '@/utils/student-announcement-data';
import {api} from '@/utils/auth-session';
import {StudentEmptyState} from './StudentEmptyState';

const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function date(value:unknown){const parsed=new Date(String(value??''));return Number.isNaN(parsed.getTime())?'—':dateTime.format(parsed);}
function isReminder(row:StudentRow){return row.title==='缴费提醒'&&row.bill_id!==null&&row.bill_id!==undefined;}
const arrowPoints='17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75';
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><g fill="none" fillRule="evenodd"><polygon fill="currentColor" fillRule="nonzero" points={arrowPoints}/></g></svg>;}

export function StudentAnnouncementPage({entry,data}:{entry:StudentPage;data:StudentAnnouncementData}){
 const params=useSearchParams(),router=useRouter(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <NoticeContent key={[entry.id,record,page].join(':')} entry={entry} data={data} record={record} page={page} navigate={navigate}/>;
}
function NoticeContent({entry,data,record,page,navigate}:{entry:StudentPage;data:StudentAnnouncementData;record:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),saving=useRef(false),router=useRouter();
 const readAction=useRef<()=>Promise<void>>(async()=>{}),readLink=useRef<HTMLAnchorElement|null>(null);
 const reminder=entry.feature==='announcements'&&entry.action==='action-2',notification=entry.feature==='notifications'||reminder,theme=entry.feature==='notifications'?'lime':'citrus';
 const resource=notification?'notifications':'announcements',identifier=notification?'notification_id':'announcement_id';
 const path=record===null?announcementListPath(entry,page):resource+'/'+record+(reminder?'?type=payment-reminder':'');
 const [result,setResult]=useState(()=>{
  const cached=data.peek(path)??(record!==null?data.peek(resource+'/'+record):undefined);
  return cached&&!Array.isArray(cached.data)&&reminder&&!isReminder(cached.data)?undefined:cached;
 }),[loading,setLoading]=useState(true),[pending,setPending]=useState(false),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const unread=record!==null&&notification&&Boolean(detail&&!detail.read_at);
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(record??'');
 const title=detail?String(detail.title):entry.label+'详情';
 const load=useCallback(async(force=false)=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
   const next=await data.load(path,force);
   if(!Array.isArray(next.data)&&reminder&&!isReminder(next.data))throw new Error('记录不存在或不可访问。');
   if(request.current.version===version)setResult(next);
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请刷新后重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[data,path,record,reminder]);
 useEffect(()=>{
  const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);
  return()=>{state.version++;window.removeEventListener('focus',refresh);};
 },[load]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
  const content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(record===null)content.after(business);else content.append(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});
  doc.dispatchEvent(new CustomEvent('dorma-student-content-change',{detail:{key:record===null&&page===1?'page':JSON.stringify([record,page])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,page]);
 useLayoutEffect(()=>{
  if(record===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector<HTMLElement>('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={text:heading.textContent,href:heading.getAttribute('href')!,tooltip:heading.title,hidden:description.hidden,documentTitle:doc.title};
  heading.textContent=title;heading.href=detailUrl;heading.title=title;description.hidden=true;doc.querySelector('title')!.textContent=title+' · 学生工作台';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,arrow=doc.createElement('span'),back=doc.createElement('a');
  arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';back.href=listUrl;back.title=entry.label;back.textContent=entry.label;back.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',back);breadcrumb.replaceWith(crumbs);
  const previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,replacement=previous.cloneNode(true) as HTMLAnchorElement;
  replacement.href=listUrl;replacement.title=entry.label;replacement.removeAttribute('data-id');replacement.dataset.color=String(entry.color);replacement.className='text-ui color-'+theme;
  for(const node of [...replacement.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();replacement.append(entry.label);previous.replaceWith(replacement);
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],empty=doc.createElement('li'),emptyHeading=nextHeading.cloneNode(false) as HTMLElement;
  let action:HTMLAnchorElement|undefined;
  const mark=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void readAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void readAction.current();}};
  if(unread){
   empty.className='next-link';emptyHeading.textContent='下一个';action=doc.createElement('a');action.className='text-ui color-'+theme;action.dataset.color=String(entry.color);action.href=detailUrl;action.title='标为已读';action.textContent='标为已读';action.setAttribute('role','button');
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=doc.createElementNS('http://www.w3.org/2000/svg','polygon');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');polygon.setAttribute('fill','currentColor');polygon.setAttribute('points',arrowPoints);svg.append(polygon);action.append(svg);empty.append(action);
   action.addEventListener('click',mark);action.addEventListener('keydown',keyboard);readLink.current=action;
  }
  next.replaceWith(empty);nextHeading.replaceWith(emptyHeading);
  const returnToList=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(listUrl);};
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};
  back.addEventListener('click',returnToList);replacement.addEventListener('click',returnToList);heading.addEventListener('click',stay);
  return()=>{
   back.removeEventListener('click',returnToList);replacement.removeEventListener('click',returnToList);heading.removeEventListener('click',stay);
   action?.removeEventListener('click',mark);action?.removeEventListener('keydown',keyboard);if(readLink.current===action)readLink.current=null;
   if(info.isConnected){crumbs.replaceWith(breadcrumb);replacement.replaceWith(previous);empty.replaceWith(next);emptyHeading.replaceWith(nextHeading);heading.textContent=saved.text;heading.href=saved.href;heading.title=saved.tooltip;description.hidden=saved.hidden;doc.querySelector('title')!.textContent=saved.documentTitle;}
  };
 },[record,title,detailUrl,entry.color,entry.label,listUrl,navigate,theme,unread]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 async function markRead(){
  if(saving.current||!detail||detail.read_at||!notification)return;
  saving.current=true;setPending(true);setError('');
  try{await api(`notifications/${detail.notification_id}/read`,{method:'POST',body:'{}'});data.invalidate();await load(true);}
  catch(reason){setError(reason instanceof Error?reason.message:'操作失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{readAction.current=markRead;});
 useLayoutEffect(()=>{readLink.current?.setAttribute('aria-disabled',String(pending));readLink.current?.setAttribute('aria-busy',String(pending));},[pending,unread,title]);
 const paragraphs=detail?String(detail.content??'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(paragraph=>paragraph.trim()):[];
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-announcements aria-busy={loading}>
  {error&&<p role="alert">{error}</p>}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-announcement-list>{rows.map(row=>{
    const id=String(row[identifier]),url=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(id);
    return <li key={id}><a className={'text-ui color-'+theme} data-color={entry.color} href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{String(row.title)}{notification?' · '+(row.read_at?'已读':'未读'):''}<Arrow/></a></li>;
   })}</ul>
   {!rows.length&&<StudentEmptyState/>}
   {total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(entry.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(entry.url+'?page='+(page+1))}>下一页</button></div></>}
  </>:detail&&<div data-dorma-announcement-body>
   <p>{notification?(reminder?'提醒时间：':'接收时间：'):'发布时间：'}{date(detail[notification?'created_at':'published_at'])}{notification?' · '+(detail.read_at?'已读':'未读'):''}</p>
   {paragraphs.map((paragraph,index)=><p key={index}>{paragraph.split('\n').map((line,lineIndex)=><Fragment key={lineIndex}>{lineIndex>0&&<br/>}{line}</Fragment>)}</p>)}
  </div>)}
 </div>;
}
