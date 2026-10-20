'use client';

import {useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {ManagerPage} from '@/data/manager-pages';
import {managerRepairListPath,type ManagerRepairData} from '@/utils/manager-repair-data';
import {RepairValues,repairValue} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';
import {ManagerRepairReview} from './ManagerRepairReview';

const arrowPoints='17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75';
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><polygon fill="currentColor" points={arrowPoints}/></svg>;}

export function ManagerRepairPage({entry,data}:{entry:ManagerPage;data:ManagerRepairData}){
 const router=useRouter(),params=useSearchParams(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1,review=record!==null&&params.get('review')==='1';
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <RepairContent key={[entry.id,record,page,review].join(':')} entry={entry} data={data} record={record} page={page} review={review} navigate={navigate}/>;
}
function RepairContent({entry,data,record,page,review,navigate}:{entry:ManagerPage;data:ManagerRepairData;record:string|null;page:number;review:boolean;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),router=useRouter();
 const identifier='repair_id';
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),reviewUrl=detailUrl+'&review=1';
 const path=record===null?managerRepairListPath(entry.action,page):'repairs/'+record;
 const [result,setResult]=useState(()=>data.peek(path)),[history,setHistory]=useState(()=>record===null?[]:data.peek('repairs/'+record+'/history')?.data??[]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const pending=entry.action==='action-1'&&detail?.repair_status==='pending_review';
 const detailTitle='报修工单详情',title=review?'报修初审办理':detailTitle;
 const load=useCallback(async()=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
   const [next,updates]=await Promise.all([data.load(path),record===null?Promise.resolve(null):data.load('repairs/'+record+'/history')]);
   if(request.current.version===version){setResult(next);setHistory(updates?.data??[]);}
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[record,data,path]);
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
  heading.textContent=title;heading.href=review?reviewUrl:detailUrl;heading.title=title;description.textContent=review?'确认初审结果和审核意见，通过后上报维修，驳回时说明原因。':'查看报修资料、审核结果及处理过程。';doc.title=title+' · 宿管工作台';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,back=previous.cloneNode(true) as HTMLAnchorElement;
  const links:{element:HTMLAnchorElement;url:string}[]=[];
  for(const [label,url] of [[entry.label,listUrl],...(review?[[detailTitle,detailUrl]]:[])]){
   const arrow=doc.createElement('span'),link=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';link.textContent=label;link.title=label;link.href=url;link.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',link);links.push({element:link,url});
  }
  breadcrumb.replaceWith(crumbs);back.href=review?detailUrl:listUrl;back.title=review?detailTitle:entry.label;back.removeAttribute('data-id');back.dataset.color=String(entry.color);back.className='text-ui color-yellow';
  for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(back.title);previous.replaceWith(back);links.push({element:back,url:review?detailUrl:listUrl});
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],replacement=doc.createElement('li'),replacementHeading=nextHeading.cloneNode(false) as HTMLElement;replacement.className='next-link';
  if(!review&&pending){const action=doc.createElement('a');action.href=reviewUrl;action.title='初审工单';action.textContent=action.title;action.className='text-ui color-yellow';action.dataset.color=String(entry.color);action.innerHTML+=`<svg viewBox="0 0 24 24" class="icon"><polygon fill="currentColor" points="${arrowPoints}"/></svg>`;replacement.append(action);replacementHeading.textContent='下一个';links.push({element:action,url:reviewUrl});}
  next.replaceWith(replacement);nextHeading.replaceWith(replacementHeading);
  const handlers=links.map(({element,url})=>{const handler=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);};element.addEventListener('click',handler);return()=>element.removeEventListener('click',handler);});
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  return()=>{handlers.forEach(detach=>detach());heading.removeEventListener('click',stay);if(info.isConnected){crumbs.replaceWith(breadcrumb);back.replaceWith(previous);replacement.replaceWith(next);replacementHeading.replaceWith(nextHeading);heading.textContent=saved.title;heading.href=saved.href;heading.title=saved.tooltip;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[record,review,pending,title,detailTitle,detailUrl,reviewUrl,listUrl,entry.label,entry.color,navigate]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 const fields:ReadonlyArray<readonly[string,string]>=[['repair_id','报修编号'],['full_name','姓名'],['student_number','学号'],['building_name','楼栋'],['room_id','报修房间'],['fault_type','故障类型'],['fault_description','故障描述'],['contact_phone','联系电话'],['repair_status','工单状态'],['submitted_at','提交时间'],['reviewer_account_id','初审人员编号'],['reviewed_at','审核时间'],['review_note','审核意见']];
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-manager-repair aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-manager-repair-list>{rows.map(row=>{const id=String(row[identifier]),url=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(id);return <li key={id}><a className="text-ui color-yellow" data-color={entry.color} href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{['full_name','room_id','fault_type','repair_status'].map(key=>repairValue(key,row[key])).join(' · ')}<Arrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}{total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(entry.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(entry.url+'?page='+(page+1))}>下一页</button></div></>}
  </>:detail&&(review?(pending?<ManagerRepairReview entry={entry} row={detail} detailUrl={detailUrl} data={data} navigate={navigate}/>:<div className="docs-info-content formatted-text"><div className="notice info"><p>该工单已初审或不属于待初审模块，请返回详情查看处理结果。</p></div></div>):<><RepairValues row={detail} fields={fields}/>{Array.isArray(history)&&history.length>0&&<div data-dorma-repair-history><h2>处理过程</h2>{history.map((update,index)=><section key={String(update.update_id??index)}><h3>{repairValue('created_at',update.created_at)} · {repairValue('status',update.status)}</h3><RepairValues row={update} fields={[["actor_name","处理人员"],["description","处理说明"]]}/></section>)}</div>}</>))}
 </div>;
}
