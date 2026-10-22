'use client';
import {formatDate} from '@/utils/display-format';

import {useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {MaintenancePage} from '@/data/maintenance-pages';
import type {MaintenanceRecordData} from '@/utils/maintenance-record-data';
import type {StudentRow} from '@/utils/student-record-data';
import {MaintenanceRecordPage} from './MaintenanceRecordPage';
import {RepairArrow,RepairValues} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

function statisticData(result:ReturnType<MaintenanceRecordData['peek']>){return result&&!Array.isArray(result.data)?result.data:undefined;}
const count=(value:unknown)=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const rate=(completed:unknown,total:unknown)=>count(total)?(100*count(completed)/count(total)).toFixed(2)+'%':'0.00%';

export function MaintenanceAnalyticsPage({entry,data}:{entry:MaintenancePage;data:MaintenanceRecordData}){
 const [statistics,setStatistics]=useState(()=>statisticData(data.peek('statistics'))),[loading,setLoading]=useState(true),[error,setError]=useState(''),request=useRef({version:0});
 const load=useCallback(async(force=false)=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{const next=statisticData(await data.load('statistics',force));if(!next)throw new Error('统计信息读取失败，请重试。');if(version===request.current.version)setStatistics(next);}
  catch(reason){if(version===request.current.version){setStatistics(undefined);setError(reason instanceof Error?reason.message:'统计信息读取失败，请重试。');}}
  finally{if(version===request.current.version)setLoading(false);}
 },[data]);
 useEffect(()=>{const state=request.current;void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);return()=>{state.version++;window.removeEventListener('focus',refresh);};},[load]);
 const summary=<><StatisticsSummary entry={entry} statistics={statistics}/>{error&&<><StudentWarning>{error}</StudentWarning><div className="ui-controls"><button onClick={()=>void load(true)}>重试</button></div></>}</>;
 return entry.action==='action-3'?<MaintenanceRecordPage entry={entry} data={data} summary={summary}/>:<MonthlyStatistics entry={entry} statistics={statistics} loading={loading} error={error} retry={()=>void load(true)}/>;
}

function StatisticsSummary({entry,statistics}:{entry:MaintenancePage;statistics:StudentRow|undefined}){
 if(!statistics)return null;
 const repairs=statistics.repairs as StudentRow,total=count(repairs.total_repairs),completed=count(repairs.completed_repairs),ratings=count(repairs.rating_count);
 const row={total,completed,unfinished:Math.max(0,total-completed),completionRate:rate(completed,total),average:ratings?count(repairs.average_rating).toFixed(2)+' 分':'—',ratings};
 const fields:ReadonlyArray<readonly[string,string]>=entry.action==='action-1'?[['total','获派工单总数'],['completed','已完成工单']]:entry.action==='action-2'?[['total','获派工单总数'],['completed','已完成工单'],['unfinished','未完成工单'],['completionRate','总体完成率']]:[['average','平均评分'],['ratings','评价数量']];
 return <div className="docs-info-content formatted-text" data-dorma-statistics-summary><RepairValues row={row} fields={fields}/></div>;
}

function MonthlyStatistics({entry,statistics,loading,error,retry}:{entry:MaintenancePage;statistics:StudentRow|undefined;loading:boolean;error:string;retry:()=>void}){
 const params=useSearchParams(),month=params.get('month'),router=useRouter();
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <MonthlyContent key={month??'list'} entry={entry} month={month} statistics={statistics} loading={loading} error={error} retry={retry} navigate={navigate}/>;
}

function MonthlyContent({entry,month,statistics,loading,error,retry,navigate}:{entry:MaintenancePage;month:string|null;statistics:StudentRow|undefined;loading:boolean;error:string;retry:()=>void;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),completion=entry.action==='action-2',router=useRouter();
 const months=Array.isArray(statistics?.workload)?[...statistics.workload as StudentRow[]].sort((a,b)=>String(b.month).localeCompare(String(a.month))):[];
 const selected=month!==null&&/^\d{4}-(0[1-9]|1[0-2])$/.test(month)?months.find(row=>row.month===month):undefined;
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(month!==null)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-maintenance-content-change',{detail:{key:month===null?'page':JSON.stringify([month])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[month]);
 useLayoutEffect(()=>{
  if(month===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={title:heading.textContent,href:heading.href,tooltip:heading.title,description:description.textContent,documentTitle:doc.title},title=completion?'每月完成率详情':'每月工作量详情';
  heading.textContent=title;heading.title=title;heading.href=entry.url+'?month='+encodeURIComponent(month);description.textContent='按派工月份统计，完成数量包含已完工及已评价的工单。';doc.title=title+' | 维修工作台 | FLight';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,arrow=doc.createElement('span'),crumb=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';crumb.textContent=entry.label;crumb.title=entry.label;crumb.href=entry.url;crumb.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',crumb);breadcrumb.replaceWith(crumbs);
  const previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,back=previous.cloneNode(true) as HTMLAnchorElement;back.href=entry.url;back.title=entry.label;back.removeAttribute('data-id');back.dataset.color=String(entry.color);back.className='text-ui color-yellow';for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(entry.label);previous.replaceWith(back);
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],replacement=doc.createElement('li'),replacementHeading=nextHeading.cloneNode(false) as HTMLElement;replacement.className='next-link';next.replaceWith(replacement);nextHeading.replaceWith(replacementHeading);
  const returnToList=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(entry.url);};
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};crumb.addEventListener('click',returnToList);back.addEventListener('click',returnToList);heading.addEventListener('click',stay);
  return()=>{crumb.removeEventListener('click',returnToList);back.removeEventListener('click',returnToList);heading.removeEventListener('click',stay);if(info.isConnected){crumbs.replaceWith(breadcrumb);back.replaceWith(previous);replacement.replaceWith(next);replacementHeading.replaceWith(nextHeading);heading.textContent=saved.title;heading.title=saved.tooltip;heading.href=saved.href;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[month,completion,entry.url,entry.label,entry.color,navigate]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 const monthly=selected?{...selected,unfinished:Math.max(0,count(selected.assigned)-count(selected.completed)),completionRate:rate(selected.completed,selected.assigned)}:null;
 return <div ref={root} className={month===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-maintenance-analytics aria-busy={loading}>
  {error&&<><StudentWarning>{error}</StudentWarning><div className="ui-controls"><button onClick={retry}>重试</button></div></>}
  {statistics&&(month===null?<><StatisticsSummary entry={entry} statistics={statistics}/>{months.length?<><h6 className="links-list-heading">每月统计</h6><ul className="links-list links-list-boxed" data-dorma-statistics-months>{months.map(row=>{const url=entry.url+'?month='+encodeURIComponent(String(row.month));return <li key={String(row.month)}><a className="text-ui color-yellow" data-color={entry.color} href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{completion?`${formatDate(row.month)} · ${rate(row.completed,row.assigned)} · 已完成 ${row.completed} / ${row.assigned} 单`:`${formatDate(row.month)} · 派工 ${row.assigned} 单 · 完成 ${row.completed} 单`}<RepairArrow/></a></li>;})}</ul></>:<StudentEmptyState/>}</>:monthly?<RepairValues row={monthly} fields={[["month","派工月份"],["assigned","派工数量"],["completed","完成数量"],["unfinished","未完成数量"],["completionRate","完成率"]]}/>:<StudentWarning>该月份暂无统计记录或不可访问。</StudentWarning>)}
 </div>;
}
