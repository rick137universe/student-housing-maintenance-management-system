'use client';

import {useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type RefObject} from 'react';
import {useSearchParams} from 'next/navigation';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import {reportFilters,reportFilterError,reportDate,reportUrl,adminReportPath,type ReportFilters} from '@/utils/admin-report-data';
import type {StudentRecordData,StudentRow} from '@/utils/student-record-data';
import {saveAuthSession} from '@/utils/auth-session';
import {RepairArrow,RepairValues,RepairEditorFields,type RepairField} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

const count=(value:unknown)=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const percent=(part:unknown,total:unknown)=>count(total)?(100*count(part)/count(total)).toFixed(2)+'%':'0.00%';
function statistic(result:ReturnType<StudentRecordData['peek']>){return result&&!Array.isArray(result.data)?result.data:undefined;}
const rows=(value:unknown):StudentRow[]=>Array.isArray(value)?value:[];

export function AdminReportPage({entry,data,navigate}:{entry:AdminPage;data:StudentRecordData;navigate:(url:string)=>void}){
 const params=useSearchParams(),filters=reportFilters(params),record=params.get('record');
 return <ReportContent key={JSON.stringify([entry.id,filters,record])} entry={entry} data={data} filters={filters} record={record} navigate={navigate}/>;
}
function ReportContent({entry,data,filters,record,navigate}:{entry:AdminPage;data:StudentRecordData;filters:ReportFilters;record:string|null;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),action=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const filterPage=entry.kind==='report-filter',exporting=entry.action==='action-3',form=filterPage||exporting,parent=entry.parent?adminPages.find(page=>page.id===entry.parent)!:entry,operations=parent.action==='action-1',detail=!form&&record!==null;
 const child=adminPages.find(page=>page.parent===parent.id),path=adminReportPath(filters),invalid=reportFilterError(filters),listUrl=reportUrl(parent.url,filters),filterUrl=child?reportUrl(child.url,filters):'',exportUrl=reportUrl('/workspace/admin/reports/export',filters);
 const [statistics,setStatistics]=useState(()=>invalid?undefined:statistic(data.peek(path))),[error,setError]=useState(''),[loading,setLoading]=useState(!form),[disabled,setDisabled]=useState(form),request=useRef({version:0});
 const load=useCallback(async(force=false)=>{const version=++request.current.version;setLoading(true);setError('');try{if(invalid)throw new Error(invalid);const next=statistic(await data.load(path,force));if(!next)throw new Error('统计信息读取失败，请重试。');if(version===request.current.version)setStatistics(next);}catch(reason){if(version===request.current.version){setStatistics(undefined);setError(reason instanceof Error?reason.message:'统计信息读取失败，请重试。');}}finally{if(version===request.current.version)setLoading(false);}},[data,path,invalid]);
 useEffect(()=>{if(form)return;const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load(true);};window.addEventListener('focus',refresh);return()=>{state.version++;window.removeEventListener('focus',refresh);};},[load,form]);
 const buildings=[...rows(statistics?.buildings)].sort((a,b)=>String(a.building_id).localeCompare(String(b.building_id))),months=[...rows(statistics?.workload)].sort((a,b)=>String(b.month).localeCompare(String(a.month))),selected=detail?(operations?buildings:months).find(row=>String(row[operations?'building_id':'month'])===record):undefined;
 const title=detail?(operations?'楼栋运营详情':'每月维修统计详情'):entry.label;
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  content.after(business);doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:record===null&&!filters.from&&!filters.to&&!filters.buildingId?'page':JSON.stringify([filters,record])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[filters,record]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector<HTMLElement>('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={text:heading.textContent,href:heading.getAttribute('href')!,title:heading.title,description:description.textContent,documentTitle:doc.title};heading.textContent=title;heading.href=reportUrl(entry.url,filters,detail?record!:undefined);heading.title=title;doc.title=title+' | 管理员工作台 | FLight';if(detail)description.textContent=operations?'查看楼栋当前床位及入住情况。':'按派工月份查看所选报修范围的工作量与完成情况。';
  const handlers:Array<()=>void>=[],route=(anchor:HTMLAnchorElement,target:string)=>{const click=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(target);};anchor.addEventListener('click',click);handlers.push(()=>anchor.removeEventListener('click',click));};
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement;
  if(detail){const arrow=doc.createElement('span'),crumb=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';crumb.textContent=entry.label;crumb.title=entry.label;crumb.href=listUrl;route(crumb,listUrl);crumbs.querySelector('p')!.append(' ',arrow,' ',crumb);}
  if(filterPage){const link=crumbs.querySelector<HTMLAnchorElement>('p a:last-child')!;link.href=listUrl;route(link,listUrl);}breadcrumb.replaceWith(crumbs);
  const oldPrevious=info.querySelector('.prev-link')!,oldNext=info.querySelector('.next-link')!,previous=oldPrevious.cloneNode(true) as HTMLElement,next=oldNext.cloneNode(true) as HTMLElement,nextHeading=info.querySelector('.prev-next-heading')!.children[1],savedNext=nextHeading.textContent;
  const previousEntry=detail||filterPage?parent:adminPages.find(page=>page.feature==='reports'&&page.action===(operations?'overview':exporting?'action-2':'action-1'))!,backUrl=reportUrl(previousEntry.url,filters),back=previous.querySelector<HTMLAnchorElement>('a')!;
  back.removeAttribute('data-id');back.className='text-ui color-yellow';back.dataset.color='3';back.href=backUrl;back.title=previousEntry.label;for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(previousEntry.label);route(back,backUrl);
  if(detail)next.replaceChildren();else{const button=next.querySelector<HTMLAnchorElement>('a')!,label=form?(exporting?'导出 CSV 报表':'查看统计'):child!.label;button.removeAttribute('data-id');button.className='text-ui color-yellow';button.dataset.color='3';button.href=form?entry.url:filterUrl;button.title=label;for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();button.prepend(label);
   if(form){button.setAttribute('role','button');footer.current=button;const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void action.current();};const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void action.current();}};button.addEventListener('click',send);button.addEventListener('keydown',keyboard);handlers.push(()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);});}else route(button,filterUrl);
  }
  nextHeading.textContent=next.children.length?'下一个':'';oldPrevious.replaceWith(previous);oldNext.replaceWith(next);
  return()=>{handlers.forEach(cleanup=>cleanup());footer.current=null;heading.removeEventListener('click',stay);if(info.isConnected){previous.replaceWith(oldPrevious);next.replaceWith(oldNext);nextHeading.textContent=savedNext;crumbs.replaceWith(breadcrumb);heading.textContent=saved.text;heading.href=saved.href;heading.title=saved.title;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[entry,filters,record,detail,title,operations,parent,form,filterPage,exporting,listUrl,filterUrl,navigate,child]);
 useLayoutEffect(()=>{footer.current?.setAttribute('aria-disabled',String(disabled));},[disabled]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 const scope=<div className="docs-info-content formatted-text" data-dorma-report-scope><p><code>{filters.buildingId||'全部楼栋'}</code>{' '}<code>{filters.from||'不限开始日期'}</code>{' '}<code>{filters.to||'不限结束日期'}</code></p></div>;
 return <div ref={root} data-dorma-live-workspace data-dorma-admin-report aria-busy={loading}>
  {form?<ReportEditor entry={entry} filters={filters} exporting={exporting} data={data} action={action} onDisabled={setDisabled} onApply={next=>navigate(reportUrl(parent.url,next))}/>:<>
   {scope}
   {error&&<><StudentWarning>{error}</StudentWarning>{!invalid&&<div className="docs-info-content ui-controls"><button onClick={()=>void load(true)} disabled={loading}>重试</button></div>}</>}
   {statistics&&(detail?selected?<div className="docs-info-content formatted-text" data-dorma-report-detail><RepairValues row={operations?{...selected,occupancy:percent(selected.occupied_beds,selected.total_beds)}:{...selected,unfinished:Math.max(0,count(selected.assigned)-count(selected.completed)),completion:percent(selected.completed,selected.assigned)}} fields={operations?[['building_id','楼栋编号'],['building_name','楼栋名称'],['total_beds','总床位'],['occupied_beds','已入住床位'],['available_beds','空闲床位'],['occupancy','入住率']]:[['month','派工月份'],['assigned','派工数量'],['completed','完成数量'],['unfinished','未完成数量'],['completion','完成率']]}/></div>:<StudentWarning>该统计记录不存在或不在当前筛选范围内。</StudentWarning>:<>
    <ReportSummary operations={operations} statistics={statistics}/>
    <div className="docs-info-content formatted-text"><div className="notice info"><p>{operations?'床位数据为当前状态；待缴金额按账单生成日期和当前入住楼栋筛选。':'日期范围按报修提交时间筛选；每月工作量按这些报修的派工月份归集，完成数包含已完工及已评价工单。'}</p></div></div>
    <div className="docs-info-content"><h6 className="links-list-heading">{operations?'楼栋统计':'每月维修工作量'}</h6><ul className="links-list links-list-boxed" data-dorma-report-list>{(operations?buildings:months).map(row=>{const key=String(row[operations?'building_id':'month']),target=reportUrl(entry.url,filters,key);return <li key={key}><a className="text-ui color-yellow" data-color="3" href={target} target="_top" onClick={event=>link(target,event)}>{operations?String(row.building_name)+' / '+key:key+' / 派工 '+row.assigned+' 单 / 完成 '+row.completed+' 单'}<RepairArrow/></a></li>;})}</ul>{!(operations?buildings:months).length&&<StudentEmptyState/>}</div>
   </>)}
   {!detail&&<div className="docs-info-content"><h6 className="links-list-heading">本页功能</h6><ul className="links-list links-list-boxed" data-dorma-report-navigation>{[[child!.label,filterUrl],['导出报表',exportUrl]].map(([label,url])=><li key={label}><a className="text-ui color-yellow" data-color="3" href={url} target="_top" onClick={event=>link(url,event)}>{label}<RepairArrow/></a></li>)}</ul></div>}
  </>}
 </div>;
}
function ReportSummary({operations,statistics}:{operations:boolean;statistics:StudentRow}){
 const buildings=rows(statistics.buildings),repairs=statistics.repairs as StudentRow,sum=(key:string)=>buildings.reduce((total,row)=>total+count(row[key]),0),total=sum('total_beds'),occupied=sum('occupied_beds');
 const row=operations?{buildings:buildings.length,total,occupied,available:sum('available_beds'),occupancy:percent(occupied,total),outstanding:count(statistics.outstandingAmount).toFixed(2)+' 元'}:{total:count(repairs.total_repairs),completed:count(repairs.completed_repairs),unfinished:Math.max(0,count(repairs.total_repairs)-count(repairs.completed_repairs)),completion:percent(repairs.completed_repairs,repairs.total_repairs),ratings:count(repairs.rating_count),average:count(repairs.rating_count)?count(repairs.average_rating).toFixed(2)+' 分':'—'};
 return <div className="docs-info-content formatted-text" data-dorma-report-summary><RepairValues row={row} fields={operations?[['buildings','楼栋数量'],['total','总床位'],['occupied','已入住床位'],['available','空闲床位'],['occupancy','总体入住率'],['outstanding','待缴金额']]:[['total','报修总数'],['completed','已完成工单'],['unfinished','未完成工单'],['completion','总体完成率'],['ratings','评价数量'],['average','平均评分']]}/></div>;
}
function ReportEditor({entry,filters,exporting,data,action,onDisabled,onApply}:{entry:AdminPage;filters:ReportFilters;exporting:boolean;data:StudentRecordData;action:RefObject<()=>Promise<void>>;onDisabled:(value:boolean)=>void;onApply:(filters:ReportFilters)=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),[buildings,setBuildings]=useState<StudentRow[]>([]),[ready,setReady]=useState(false),[values,setValues]=useState<Record<string,string>>({from:filters.from,to:filters.to,building:filters.buildingId?JSON.stringify(filters.buildingId):'all'}),[active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const load=useCallback(async()=>{try{const all:StudentRow[]=[];for(let page=1;;page++){const result=await data.load('buildings?'+new URLSearchParams({page:String(page),limit:'100'}));if(!Array.isArray(result.data))throw new Error('楼栋读取失败，请重试。');all.push(...result.data);if(all.length>=(result.meta?.total??all.length))break;}if(root.current){setBuildings(all);setReady(true);setError('');}}catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'楼栋读取失败，请重试。');}},[data]);
 useEffect(()=>{void load();},[load]);
 const fields:RepairField[]=[{key:'from',label:'开始日期',type:'date',validate:value=>value&&!reportDate(value)?'请选择有效的开始日期。':undefined},{key:'to',label:'结束日期',type:'date',validate:value=>value&&!reportDate(value)?'请选择有效的结束日期。':undefined},{key:'building',label:'楼栋范围',type:'select',required:true,options:[['all','全部楼栋'],...buildings.map(row=>[JSON.stringify(String(row.building_id)),String(row.building_name)+' / '+row.building_id] as const)]}];
 async function submit(){
  if(saving.current||active||!ready)return;setError('');setSuccess('');
  if(!fields[2].options!.some(([id])=>id===values.building)){setError('请选择有效的楼栋。');return;}
  const next:ReportFilters={from:values.from,to:values.to,buildingId:values.building==='all'?'':JSON.parse(values.building)},message=reportFilterError(next);if(message){setError(message);return;}
  if(!exporting){onApply(next);return;}
  saving.current=true;setPending(true);
  try{const response=await fetch('/api/v1/'+reportUrl('statistics/export',next),{cache:'no-store',credentials:'same-origin'});if(!response.ok){if(response.status===401)saveAuthSession(null);const body=await response.json();throw new Error(body.error?.message??'报表导出失败，请重试。');}const blob=await response.blob();if(!root.current)return;const doc=root.current.ownerDocument,objectUrl=URL.createObjectURL(blob),anchor=doc.createElement('a');anchor.href=objectUrl;anchor.download='statistics.csv';doc.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);setSuccess('统计报表已导出。');}catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'报表导出失败，请重试。');}finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{action.current=submit;});useLayoutEffect(()=>onDisabled(pending||Boolean(active)||!ready),[pending,active,ready,onDisabled]);
 return <div ref={root} data-dorma-application-editor data-dorma-report-editor aria-busy={pending||!ready}>
  <div className="docs-info-content formatted-text"><div className="notice info"><p>{exporting?'选择范围并确认各项条件后，通过下方按钮导出 CSV 报表。日期留空、楼栋选择全部时导出完整统计。':'日期留空表示不限；选择楼栋并确认条件后，使用下方按钮查看统计。'}</p><p>床位按当前状态统计；报修按提交日期、待缴金额按账单生成日期筛选，日期范围包含起止两天。</p></div></div>
  <RepairEditorFields color={entry.color} fields={fields} values={values} active={active} pending={pending||!ready} onActive={key=>{setActive(key);setError('');setSuccess('');}} onChange={(key,value)=>setValues(current=>({...current,[key]:value}))}/>
  {error&&<StudentWarning>{error}</StudentWarning>}{!ready&&error&&<div className="docs-info-content ui-controls"><button onClick={()=>void load()}>重试</button></div>}
  {success&&<div className="docs-info-content formatted-text"><div className="notice info" role="status"><p>{success}</p></div></div>}
 </div>;
}
