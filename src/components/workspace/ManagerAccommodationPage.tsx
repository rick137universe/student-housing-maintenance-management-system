'use client';

import {DocsPagination} from './DocsPagination';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {ManagerPage} from '@/data/manager-pages';
import {valueLabels} from '@/data/workspace-actions';
import {accommodationListPath,type StudentAccommodationData} from '@/utils/student-accommodation-data';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';
import {ManagerAccommodationReview} from './ManagerAccommodationReview';

const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function display(key:string,value:unknown):string{
 if(value===null||value===undefined||value==='')return '—';
 if(['applied_at','processing_due_at','reviewed_at','completed_at'].includes(key)){const date=new Date(String(value));return Number.isNaN(date.getTime())?String(value):dateTime.format(date);}
 return value==='checkin'?'入住':valueLabels[String(value)]??String(value);
}
const arrowPoints='17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75';
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><polygon fill="currentColor" points={arrowPoints}/></svg>;}

export function ManagerAccommodationPage({entry,data}:{entry:ManagerPage;data:StudentAccommodationData}){
 const router=useRouter(),params=useSearchParams(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1,review=record!==null&&params.get('review')==='1';
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <AccommodationContent key={[entry.id,record,page,review].join(':')} entry={entry} data={data} record={record} page={page} review={review} navigate={navigate}/>;
}
function AccommodationContent({entry,data,record,page,review,navigate}:{entry:ManagerPage;data:StudentAccommodationData;record:string|null;page:number;review:boolean;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),router=useRouter();
 const checkin=entry.action==='action-1',checkout=entry.action==='action-3',resource=checkin?'applications':'changes',identifier=checkin?'application_id':'change_id';
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),reviewUrl=detailUrl+'&review=1';
 const path=record===null?accommodationListPath(entry.action,page):resource+'/'+record;
 const [result,setResult]=useState(()=>{
  const cached=data.peek(path);return cached&&!Array.isArray(cached.data)&&!checkin&&cached.data.business_type!==(checkout?'checkout':'transfer')?undefined:cached;
 }),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const pending=detail?.review_status==='pending';
 const detailTitle=checkin?'入住申请详情':checkout?'退宿申请详情':'调宿申请详情',title=review?(checkin?'入住审核与分配':checkout?'退宿登记办理':'调宿审核办理'):detailTitle;
 const load=useCallback(async()=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
   const next=await data.load(path);
   if(!Array.isArray(next.data)&&!checkin&&next.data.business_type!==(checkout?'checkout':'transfer'))throw new Error('记录不存在或不可访问。');
   if(request.current.version===version)setResult(next);
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[record,data,path,checkin,checkout]);
 useEffect(()=>{const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);return()=>{state.version++;window.removeEventListener('focus',refresh);};},[load]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(record!==null&&!review)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-manager-content-change',{detail:{key:record===null&&page===1?'page':JSON.stringify([record,page,review])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,page,review]);
 useLayoutEffect(()=>{
  if(record===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={title:heading.textContent,href:heading.href,tooltip:heading.title,description:description.textContent,documentTitle:doc.title};
  heading.textContent=title;heading.href=review?reviewUrl:detailUrl;heading.title=title;description.textContent=review?'确认审核结果、床位安排和审核意见，提交后完成办理。':'查看申请资料、床位安排及审核办理结果。';doc.title=title+' | 宿管工作台 | FLight';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,back=previous.cloneNode(true) as HTMLAnchorElement;
  const links:{element:HTMLAnchorElement;url:string}[]=[];
  for(const [label,url] of [[entry.label,listUrl],...(review?[[detailTitle,detailUrl]]:[])]){
   const arrow=doc.createElement('span'),link=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';link.textContent=label;link.title=label;link.href=url;link.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',link);links.push({element:link,url});
  }
  breadcrumb.replaceWith(crumbs);back.href=review?detailUrl:listUrl;back.title=review?detailTitle:entry.label;back.removeAttribute('data-id');back.dataset.color=String(entry.color);back.className='text-ui color-corail';
  for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(back.title);previous.replaceWith(back);links.push({element:back,url:review?detailUrl:listUrl});
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],replacement=doc.createElement('li'),replacementHeading=nextHeading.cloneNode(false) as HTMLElement;replacement.className='next-link';
  if(!review&&pending){const action=doc.createElement('a');action.href=reviewUrl;action.title=checkin?'审核与分配':'审核办理';action.textContent=action.title;action.className='text-ui color-corail';action.dataset.color=String(entry.color);action.innerHTML+=`<svg viewBox="0 0 24 24" class="icon"><polygon fill="currentColor" points="${arrowPoints}"/></svg>`;replacement.append(action);replacementHeading.textContent='下一个';links.push({element:action,url:reviewUrl});}
  next.replaceWith(replacement);nextHeading.replaceWith(replacementHeading);
  const handlers=links.map(({element,url})=>{const handler=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);};element.addEventListener('click',handler);return()=>element.removeEventListener('click',handler);});
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  return()=>{handlers.forEach(detach=>detach());heading.removeEventListener('click',stay);if(info.isConnected){crumbs.replaceWith(breadcrumb);back.replaceWith(previous);replacement.replaceWith(next);replacementHeading.replaceWith(nextHeading);heading.textContent=saved.title;heading.href=saved.href;heading.title=saved.tooltip;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[record,review,pending,title,detailTitle,detailUrl,reviewUrl,listUrl,entry.label,entry.color,navigate,checkin]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 const fields:ReadonlyArray<readonly[string,string]>=[[identifier,'申请编号'],['business_type','业务类型'],['student_number','学号'],['full_name','姓名'],...(checkin?[['gender','性别'] as const]:[]),['original_bed_id','原床位'],['new_bed_id','新床位'],['preferred_building_id','意向楼栋'],[checkin?'expected_check_in_date':'expected_date','期望办理日期'],['application_note','申请说明'],['review_status','审核状态'],['applied_at','申请时间'],['processing_due_at','办理期限'],['reviewer_account_id','审核人员编号'],['reviewed_at','审核时间'],['review_note','审核意见'],...(!checkin?[['completed_at','完成时间'] as const]:[])];
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-manager-accommodation aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-accommodation-list>{rows.map(row=>{const id=String(row[identifier]),url=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(id);return <li key={id}><a className="text-ui color-corail" data-color={entry.color} href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{['full_name','student_number','business_type','original_bed_id','new_bed_id','review_status'].map(key=>display(key,row[key])).join(' · ')}<Arrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}<DocsPagination page={page} total={total} pageUrl={next=>entry.url+(next>1?'?page='+next:'')} navigate={navigate}/>
  </>:detail&&(review?(pending?<ManagerAccommodationReview entry={entry} row={detail} resource={resource} detailUrl={detailUrl} data={data} navigate={navigate}/>:<div className="docs-info-content formatted-text"><div className="notice info"><p>该申请已审核，请返回详情查看办理结果。</p></div></div>):<div data-dorma-accommodation-values>{fields.map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(key,detail[key])}</code></pre></Fragment>)}</div>))}
 </div>;
}
