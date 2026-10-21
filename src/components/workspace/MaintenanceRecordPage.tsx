'use client';

import {useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type ReactNode} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {MaintenancePage} from '@/data/maintenance-pages';
import {maintenanceRecordListPath,maintenanceProcessingListPath,maintenanceRatingListPath,type MaintenanceRecordData} from '@/utils/maintenance-record-data';
import type {StudentRow} from '@/utils/student-record-data';
import {RepairValues,repairValue} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';
import {MaintenanceProcessingEditor} from './MaintenanceProcessingEditor';
import {MaintenanceRecordEditor} from './MaintenanceRecordEditor';

const arrowPoints='17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75';
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><polygon fill="currentColor" points={arrowPoints}/></svg>;}

export function MaintenanceRecordPage({entry,data,summary}:{entry:MaintenancePage;data:MaintenanceRecordData;summary?:ReactNode}){
 const router=useRouter(),params=useSearchParams(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1,editing=entry.feature!=='analytics'&&record!==null&&params.get('edit')==='1';
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <RecordContent key={[entry.id,record,page,editing].join(':')} entry={entry} data={data} record={record} page={page} editing={editing} navigate={navigate} summary={summary}/>;
}
function RecordContent({entry,data,record,page,editing,navigate,summary}:{entry:MaintenancePage;data:MaintenanceRecordData;record:string|null;page:number;editing:boolean;navigate:(url:string)=>void;summary?:ReactNode}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),router=useRouter();
 const identifier='maintenance_id';
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),editUrl=detailUrl+'&edit=1';
 const path=record===null?(entry.feature==='analytics'?maintenanceRatingListPath(page):(entry.feature==='repair'?maintenanceProcessingListPath:maintenanceRecordListPath)(entry.action,page)):'maintenance/'+record;
 const [result,setResult]=useState(()=>{
  const cached=data.peek(path);if(record===null||!cached||Array.isArray(cached.data))return cached;
  if(entry.feature==='analytics'&&cached.data.repair_status!=='evaluated')return undefined;
  const repair=data.peek('repairs/'+cached.data.repair_id);
  return repair&&!Array.isArray(repair.data)?{...cached,data:{...repair.data,...cached.data}}:undefined;
 }),[history,setHistory]=useState<StudentRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const ratings=entry.feature==='analytics',processing=entry.feature==='repair',start=processing&&entry.action==='action-1';
 const pending=processing?(start?detail?.repair_status==='accepted':['in_progress','waiting_parts'].includes(String(detail?.repair_status))):entry.action==='action-1'&&['in_progress','waiting_parts'].includes(String(detail?.repair_status));
 const actionLabel=start?'开始维修':entry.action==='action-2'?'更新状态':'确认完工';
 const detailTitle=ratings?'服务评价详情':processing?'维修工单详情':'维修记录详情',title=editing?(processing?actionLabel:'填写维修记录'):detailTitle;
 const load=useCallback(async()=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
   const next=await data.load(path,record!==null&&entry.feature==='repair');
   if(record===null&&next.meta){const lastPage=Math.max(1,Math.ceil(next.meta.total/20));if(page>lastPage){if(request.current.version===version)navigate(entry.url+(lastPage>1?'?page='+lastPage:''));return;}}
   if(record===null){if(request.current.version===version){setResult(next);setHistory([]);}}
   else{
    if(Array.isArray(next.data))throw new Error('记录不存在或不可访问。');
    if(entry.feature==='analytics'&&(next.data.repair_status!=='evaluated'||next.data.service_rating===null))throw new Error('该工单尚未评价或不可访问。');
    const repairId=String(next.data.repair_id),[repair,updates]=await Promise.all([data.load('repairs/'+repairId),data.load('repairs/'+repairId+'/history')]);
    if(Array.isArray(repair.data))throw new Error('记录不存在或不可访问。');
    if(request.current.version===version){setResult({...next,data:{...repair.data,...next.data}});setHistory(Array.isArray(updates.data)?updates.data:[]);}
   }
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[record,data,path,page,navigate,entry.url,entry.feature]);
 useEffect(()=>{const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);return()=>{state.version++;window.removeEventListener('focus',refresh);};},[load]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(record!==null&&!editing)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-maintenance-content-change',{detail:{key:record===null&&page===1?'page':JSON.stringify([record,page,editing])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,page,editing]);
 useLayoutEffect(()=>{
  if(record===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={title:heading.textContent,href:heading.href,tooltip:heading.title,description:description.textContent,documentTitle:doc.title};
  heading.textContent=title;heading.href=editing?editUrl:detailUrl;heading.title=title;description.textContent=editing?(processing?'填写并确认本次维修处理信息，完成后提交。':'填写并确认维修说明，完成后保存本次处理记录。'):'查看本次维修的派工、处理、完工及评价信息。';doc.title=title+' · 维修工作台';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,back=previous.cloneNode(true) as HTMLAnchorElement;
  const links:{element:HTMLAnchorElement;url:string}[]=[];
  for(const [label,url] of [[entry.label,listUrl],...(editing?[[detailTitle,detailUrl]]:[])]){
   const arrow=doc.createElement('span'),link=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';link.textContent=label;link.title=label;link.href=url;link.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',link);links.push({element:link,url});
  }
  breadcrumb.replaceWith(crumbs);back.href=editing?detailUrl:listUrl;back.title=editing?detailTitle:entry.label;back.removeAttribute('data-id');back.dataset.color=String(entry.color);back.className='text-ui color-'+(ratings?'yellow':processing?'corail':'orange');
  for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(back.title);previous.replaceWith(back);links.push({element:back,url:editing?detailUrl:listUrl});
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],replacement=doc.createElement('li'),replacementHeading=nextHeading.cloneNode(false) as HTMLElement;replacement.className='next-link';
  if(!editing&&pending&&!start){const action=doc.createElement('a');action.href=editUrl;action.title=processing?actionLabel:'填写记录';action.textContent=action.title;action.className='text-ui color-'+(processing?'corail':'orange');action.dataset.color=String(entry.color);action.innerHTML+=`<svg viewBox="0 0 24 24" class="icon"><polygon fill="currentColor" points="${arrowPoints}"/></svg>`;replacement.append(action);replacementHeading.textContent='下一个';links.push({element:action,url:editUrl});}
  next.replaceWith(replacement);nextHeading.replaceWith(replacementHeading);
  const handlers=links.map(({element,url})=>{const handler=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);};element.addEventListener('click',handler);return()=>element.removeEventListener('click',handler);});
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  return()=>{handlers.forEach(detach=>detach());heading.removeEventListener('click',stay);if(info.isConnected){crumbs.replaceWith(breadcrumb);back.replaceWith(previous);replacement.replaceWith(next);replacementHeading.replaceWith(nextHeading);heading.textContent=saved.title;heading.href=saved.href;heading.title=saved.tooltip;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[record,editing,pending,title,detailTitle,detailUrl,editUrl,listUrl,entry.label,entry.color,navigate,processing,start,actionLabel,ratings]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 function warm(row:StudentRow,url:string){router.prefetch(url);void Promise.all([data.load('repairs/'+row.repair_id),data.load('repairs/'+row.repair_id+'/history')]).catch(()=>{});}
 const fields:ReadonlyArray<readonly[string,string]>=[['maintenance_id','处理编号'],['repair_id','报修编号'],['full_name','报修人'],['student_number','学号'],['room_id','报修房间'],['fault_type','故障类型'],['fault_description','故障描述'],['contact_phone','联系电话'],['repair_status','工单状态'],['dispatched_at','派工时间'],['accepted_at','接单时间'],['maintenance_at','维修开始时间'],['processing_description','维修说明'],['expected_completion_at','预计完成时间'],['completed_at','完工时间'],['materials','使用材料'],['hours','实际工时（小时）'],['service_rating','服务评分'],['evaluation_content','评价内容'],['evaluated_at','评价时间']];
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-maintenance-record data-dorma-maintenance-processing={processing?'':undefined} aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {record===null&&summary}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-maintenance-record-list>{rows.map(row=>{const id=String(row[identifier]),url=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(id);return <li key={id}><a className={"text-ui color-"+(processing?"corail":"orange")} data-color={entry.color} href={url} target="_top" onPointerEnter={()=>warm(row,url)} onFocus={()=>warm(row,url)} onClick={event=>link(url,event)}>{(ratings?['repair_id','room_id','service_rating','evaluated_at']:['repair_id','room_id','fault_description','repair_status']).map(key=>repairValue(key,row[key])+(key==='service_rating'?' 分':'')).join(' · ')}<Arrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}{total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(entry.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(entry.url+'?page='+(page+1))}>下一页</button></div></>}
  </>:detail&&(editing?(pending?(processing?<MaintenanceProcessingEditor entry={entry} row={detail} detailUrl={detailUrl} data={data} navigate={navigate}/>:<MaintenanceRecordEditor entry={entry} row={detail} detailUrl={detailUrl} data={data} navigate={navigate}/>):<div className="docs-info-content formatted-text"><div className="notice info"><p>{processing?'当前状态不能执行此操作，请返回详情查看处理结果。':'该记录已归档或当前不能填写，请返回详情查看处理结果。'}</p></div></div>):<><RepairValues row={detail} fields={fields}/>{start&&pending&&<MaintenanceProcessingEditor entry={entry} row={detail} detailUrl={detailUrl} data={data} navigate={navigate} onSaved={load}/>}{Array.isArray(history)&&history.length>0&&<div data-dorma-repair-history><h2>处理过程</h2>{history.map((update,index)=><section key={String(update.update_id??index)}><h3>{repairValue('created_at',update.created_at)} · {repairValue('status',update.status)}</h3><RepairValues row={update} fields={[["actor_name","处理人员"],["description","处理说明"]]}/></section>)}</div>}</>))}
 </div>;
}
