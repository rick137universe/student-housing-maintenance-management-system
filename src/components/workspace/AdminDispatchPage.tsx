'use client';

import {useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type RefObject} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {AdminPage} from '@/data/admin-pages';
import type {StudentRecordData,StudentRow} from '@/utils/student-record-data';
import {api} from '@/utils/auth-session';
import {RepairArrow,RepairValues,repairValue,RepairEditorFields,type RepairField} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

export function adminDispatchListPath(action:string,page=1){return 'repairs?'+new URLSearchParams({...(action==='action-3'?{}:{status:'pending_dispatch'}),page:String(page),limit:'20'});}
const repairFields=[['repair_id','报修编号'],['full_name','报修人'],['student_number','学号'],['building_name','楼栋'],['room_id','报修房间'],['fault_type','故障类型'],['fault_description','故障描述'],['contact_phone','联系电话'],['repair_status','工单状态'],['submitted_at','提交时间'],['reviewed_at','初审时间'],['review_note','初审意见']] as const;
const maintenanceFields=[['maintenance_id','维修记录编号'],['technician_name','维修人员'],['technician_account_id','维修人员编号'],['dispatcher_account_id','派工人员编号'],['dispatched_at','派工时间'],['accepted_at','接单时间'],['maintenance_at','开始维修时间'],['expected_completion_at','预计完成时间'],['completed_at','完成时间'],['processing_description','处理说明'],['materials','使用材料'],['hours','实际工时'],['service_rating','服务评分'],['evaluation_content','评价内容'],['evaluated_at','评价时间']] as const;

export function AdminDispatchPage({entry,data}:{entry:AdminPage;data:StudentRecordData}){
 const router=useRouter(),params=useSearchParams(),record=params.get('record'),requestedPage=Number(params.get('page')??1),dispatching=record!==null&&params.get('mode')==='dispatch'&&entry.action!=='action-3';
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <DispatchContent key={[entry.id,record,page,dispatching].join(':')} entry={entry} data={data} record={record} page={page} dispatching={dispatching} navigate={navigate}/>;
}
function DispatchContent({entry,data,record,page,dispatching,navigate}:{entry:AdminPage;data:StudentRecordData;record:string|null;page:number;dispatching:boolean;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),submitAction=useRef<()=>Promise<void>>(async()=>{}),submitLink=useRef<HTMLAnchorElement|null>(null);
 const path=record===null?adminDispatchListPath(entry.action,page):'repairs/'+record,listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),dispatchUrl=detailUrl+'&mode=dispatch';
 const [result,setResult]=useState(()=>data.peek(path)),[history,setHistory]=useState<StudentRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[disabled,setDisabled]=useState(true);
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length,canDispatch=entry.action!=='action-3'&&detail?.repair_status==='pending_dispatch';
 const title=dispatching?(entry.action==='action-2'?'智能派工确认':'工单派工办理'):'报修工单详情';
 const load=useCallback(async(force=false)=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('工单不存在或不可访问。');
   const [next,updates]=await Promise.all([data.load(path,force),record===null?Promise.resolve(null):data.load('repairs/'+record+'/history',force)]);
   if(record===null&&next.meta){const lastPage=Math.max(1,Math.ceil(next.meta.total/20));if(page>lastPage){if(request.current.version===version)navigate(entry.url+(lastPage>1?'?page='+lastPage:''));return;}}
   if(record!==null&&Array.isArray(next.data))throw new Error('工单不存在或不可访问。');
   if(request.current.version===version){setResult(next);setHistory(Array.isArray(updates?.data)?updates.data:[]);}
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'工单读取失败，请重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[data,path,record,page,navigate,entry.url]);
 useEffect(()=>{const state=request.current;void load();const refresh=()=>{if(!dispatching&&root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);const timer=entry.action==='action-3'?setInterval(()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load(true);},10000):undefined;return()=>{state.version++;clearInterval(timer);window.removeEventListener('focus',refresh);};},[load,dispatching,entry.action]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(record!==null&&!dispatching)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:record===null&&page===1?'page':JSON.stringify([record,page,dispatching])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,page,dispatching]);
 useLayoutEffect(()=>{
  if(record===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={title:heading.textContent,href:heading.href,tooltip:heading.title,description:description.textContent,documentTitle:doc.title};
  heading.textContent=title;heading.href=dispatching?dispatchUrl:detailUrl;heading.title=title;description.textContent=dispatching?'确认维修人员及派工说明，完成后提交。':'查看报修资料、派工信息及完整处理过程。';doc.title=title+' · 管理员工作台';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,back=previous.cloneNode(true) as HTMLAnchorElement,links:{element:HTMLAnchorElement;url:string}[]=[];
  for(const [label,url] of [[entry.label,listUrl],...(dispatching?[['报修工单详情',detailUrl]]:[])]){const arrow=doc.createElement('span'),link=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';link.textContent=label;link.title=label;link.href=url;crumbs.querySelector('p')!.append(' ',arrow,' ',link);links.push({element:link,url});}
  breadcrumb.replaceWith(crumbs);back.href=dispatching?detailUrl:listUrl;back.title=dispatching?'报修工单详情':entry.label;back.removeAttribute('data-id');back.className='text-ui color-orange';back.dataset.color=String(entry.color);for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(back.title);previous.replaceWith(back);links.push({element:back,url:back.getAttribute('href')!});
  const oldNext=info.querySelector('.next-link')!,next=doc.createElement('li'),nextHeading=info.querySelector('.prev-next-heading')!.children[1],savedNext=nextHeading.textContent;next.className='next-link';
  let action:HTMLAnchorElement|undefined;
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void submitAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(action?.getAttribute('aria-disabled')!=='true')void submitAction.current();}};
  if(canDispatch){action=doc.createElement('a');action.className='text-ui color-orange';action.dataset.color=String(entry.color);action.href=dispatchUrl;action.title=dispatching?'提交派工':entry.action==='action-2'?'智能派工':'派工办理';action.textContent=action.title;action.innerHTML+='<svg viewBox="0 0 24 24" class="icon"><polygon fill="currentColor" points="17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75"/></svg>';if(dispatching){action.setAttribute('role','button');action.addEventListener('click',send);action.addEventListener('keydown',keyboard);submitLink.current=action;}else links.push({element:action,url:dispatchUrl});next.append(action);}
  nextHeading.textContent=next.children.length?'下一个':'';oldNext.replaceWith(next);
  const handlers=links.map(({element,url})=>{const handler=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);};element.addEventListener('click',handler);return()=>element.removeEventListener('click',handler);});
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  return()=>{handlers.forEach(detach=>detach());action?.removeEventListener('click',send);action?.removeEventListener('keydown',keyboard);if(submitLink.current===action)submitLink.current=null;heading.removeEventListener('click',stay);if(info.isConnected){crumbs.replaceWith(breadcrumb);back.replaceWith(previous);next.replaceWith(oldNext);nextHeading.textContent=savedNext;heading.textContent=saved.title;heading.href=saved.href;heading.title=saved.tooltip;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[record,dispatching,title,canDispatch,detailUrl,dispatchUrl,listUrl,entry.label,entry.color,entry.action,navigate]);
 useLayoutEffect(()=>{submitLink.current?.setAttribute('aria-disabled',String(disabled));submitLink.current?.setAttribute('aria-busy',String(disabled));},[disabled,canDispatch,dispatching]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-admin-dispatch aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-admin-dispatch-list>{rows.map(row=>{const url=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(String(row.repair_id));return <li key={String(row.repair_id)}><a className="text-ui color-orange" data-color={entry.color} href={url} target="_top" onPointerEnter={()=>{void data.load('repairs/'+row.repair_id+'/history').catch(()=>{});}} onClick={event=>link(url,event)}>{['full_name','room_id','fault_type','repair_status'].map(key=>repairValue(key,row[key])).join(' · ')}<RepairArrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}{total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(entry.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(entry.url+'?page='+(page+1))}>下一页</button></div></>}
  </>:detail&&(dispatching?(canDispatch?<DispatchEditor row={detail} entry={entry} data={data} submitAction={submitAction} onDisabled={setDisabled} onSaved={()=>navigate(detailUrl)}/>:<div className="docs-info-content formatted-text"><div className="notice info"><p>该工单已派工或尚未通过初审，请返回详情查看最新状态。</p></div></div>):<>
   <RepairValues row={detail} fields={repairFields}/>{Boolean(detail.maintenance_id)&&<><h2>派工与维修</h2><RepairValues row={detail} fields={maintenanceFields}/></>}
   {history.length>0&&<div data-dorma-repair-history><h2>处理过程</h2>{history.map(update=><section key={String(update.update_id)}><h3>{repairValue('created_at',update.created_at)} · {repairValue('status',update.status)}</h3><RepairValues row={update} fields={[["actor_name","处理人员"],["description","处理说明"]]}/></section>)}</div>}
  </>))}
 </div>;
}

function DispatchEditor({row,entry,data,submitAction,onDisabled,onSaved}:{row:StudentRow;entry:AdminPage;data:StudentRecordData;submitAction:RefObject<()=>Promise<void>>;onDisabled:(disabled:boolean)=>void;onSaved:()=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),automatic=entry.action==='action-2';
 const [values,setValues]=useState({technicianId:'auto',note:''}),[active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[workers,setWorkers]=useState<StudentRow[]>([]);
 useEffect(()=>{let current=true;async function all(resource:string){const rows:StudentRow[]=[];let page=1;while(true){const query=new URLSearchParams({page:String(page),limit:'100',...(resource==='maintenance'?{status:'dispatched,accepted,in_progress,waiting_parts'}:{})});const result=await data.load(resource+'?'+query,true);if(!Array.isArray(result.data))throw new Error('维修人员资料读取失败，请重试。');rows.push(...result.data);if(rows.length>=(result.meta?.total??rows.length))return rows;page++;}}
  void Promise.all([all('accounts'),all('maintenance')]).then(([accounts,records])=>{const workers=accounts.filter(row=>row.role==='maintenance'&&row.account_status==='active').map((worker):StudentRow&{open:number}=>({...worker,open:records.filter(record=>record.technician_account_id===worker.account_id&&!record.completed_at).length})).sort((a,b)=>a.open-b.open||(BigInt(String(a.account_id))<BigInt(String(b.account_id))?-1:1));if(current){setWorkers(workers);setReady(true);}}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'候选人员读取失败，请重试。');});return()=>{current=false;};
 },[data]);
 const fields:RepairField[]=[...(!automatic?[{key:'technicianId',label:'维修人员',type:'select' as const,required:true,options:[['auto','按工作量自动选择'] as const,...workers.map(worker=>[String(worker.account_id),String(worker.full_name)+' · 待完工 '+worker.open+' 单'] as const)]}]:[]),{key:'note',label:'派工说明',type:'textarea',maxLength:4000}];
 async function submit(){
  if(saving.current||active||!ready)return;
  if(!automatic&&values.technicianId!=='auto'&&!workers.some(worker=>String(worker.account_id)===values.technicianId)){setError('请选择有效的维修人员。');return;}
  saving.current=true;setPending(true);setError('');
  try{const latest=await data.load('repairs/'+row.repair_id,true);if(Array.isArray(latest.data)||latest.data.repair_status!=='pending_dispatch')throw new Error('工单当前不能派工，请返回详情查看最新状态。');await api('repairs/'+row.repair_id+'/dispatch',{method:'POST',body:JSON.stringify({...(!automatic&&values.technicianId!=='auto'?{technicianId:values.technicianId}:{}),note:values.note})});data.invalidate();await Promise.allSettled([data.load('repairs/'+row.repair_id,true),data.load('repairs/'+row.repair_id+'/history',true)]);if(root.current)onSaved();}
  catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'派工失败，请重试。');}finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});useEffect(()=>{onDisabled(pending||Boolean(active)||!ready);},[onDisabled,pending,active,ready]);
 return <div ref={root} data-dorma-application-editor data-dorma-admin-dispatch-editor aria-busy={pending}>
  <div className="docs-info-content formatted-text"><RepairValues row={row} fields={[["repair_id","报修编号"],["full_name","报修人"],["room_id","报修房间"],["fault_description","故障描述"]]}/></div>
  <div className="docs-info-content formatted-text" data-dorma-repair-values><div className="notice info"><p>系统按未完工工单数量选择启用的维修人员；工作量相同时按账号编号排序，实际人员以提交时的分配结果为准。</p></div>{ready&&automatic&&<><h3>当前推荐维修人员</h3><pre><code className="hljs language-plaintext">{workers.length?String(workers[0].full_name)+' · 待完工 '+workers[0].open+' 单':'暂无启用的维修人员'}</code></pre></>}</div>
  <RepairEditorFields color={entry.color} fields={fields} values={values} active={active} pending={pending} onActive={key=>{setActive(key);setError('');}} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
