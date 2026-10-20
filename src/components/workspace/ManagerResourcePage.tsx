'use client';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {ManagerPage} from '@/data/manager-pages';
import {valueLabels} from '@/data/workspace-actions';
import {bedListPath} from '@/utils/manager-bed-data';
import type {ManagerResourceData} from '@/utils/manager-resource-data';
import {baseDataSpec,baseDataListPath} from '@/utils/manager-base-data';
import {ManagerBaseDataEditor} from './ManagerBaseDataEditor';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';
import {ManagerBedEditor} from './ManagerBedEditor';

function display(key:string,value:unknown){if(value===null||value===undefined||value==='')return '—';if(key==='actual_occupied')return value?'有人入住':'无有效入住';return valueLabels[String(value)]??String(value);}
const arrowPoints='17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75';
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><polygon fill="currentColor" points={arrowPoints}/></svg>;}

export function ManagerResourcePage({entry,data}:{entry:ManagerPage;data:ManagerResourceData}){
 const router=useRouter(),params=useSearchParams(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1,edit=(entry.feature==='base-data'||entry.action==='action-2')&&record!==null&&params.get('edit')==='1';
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <ResourceContent key={[entry.id,record,page,edit].join(':')} entry={entry} data={data} record={record} page={page} edit={edit} navigate={navigate}/>;
}
function ResourceContent({entry,data,record,page,edit,navigate}:{entry:ManagerPage;data:ManagerResourceData;record:string|null;page:number;edit:boolean;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),router=useRouter();
 const base=entry.feature==='base-data',spec=baseDataSpec(entry.action),anomaly=!base&&entry.action==='action-3',editable=base||entry.action==='action-2',resource=base?spec.resource:anomaly?'anomalies':'beds',color=base?'red':'orange';
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),editUrl=detailUrl+'&edit=1';
 const path=record===null?(base?baseDataListPath(entry.action,page):bedListPath(entry.action,page)):resource+'/'+encodeURIComponent(record);
 const [result,setResult]=useState(()=>data.peek(path)),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const hasDetail=detail!==null;
 const detailTitle=base?spec.entity+'详情':anomaly?'异常校验详情':'床位详情',title=edit?(base?'修改'+spec.entity:'更新床位状态'):detailTitle;
 const load=useCallback(async()=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!record.trim()||record.length>150||/[\u0000-\u001f\u007f]/.test(record)))throw new Error('记录不存在或不可访问。');
   const next=await data.load(path);if(request.current.version===version)setResult(next);
  }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[record,data,path]);
 useEffect(()=>{const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);return()=>{state.version++;window.removeEventListener('focus',refresh);};},[load]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(record!==null&&!edit)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-manager-content-change',{detail:{key:record===null&&page===1?'page':JSON.stringify([record,page,edit])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,page,edit]);
 useLayoutEffect(()=>{
  if(record===null)return;
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={title:heading.textContent,href:heading.href,tooltip:heading.title,description:description.textContent,documentTitle:doc.title};
  heading.textContent=title;heading.href=edit?editUrl:detailUrl;heading.title=title;description.textContent=edit?(base?'编辑并确认各项资料，完成后提交更新。':'确认床位号和床位状态后提交更新。'):base?'查看完整资料及当前状态。':anomaly?'查看床位异常及实际入住状态。':'查看床位、房间、楼栋及入住状态。';doc.title=title+' · 宿管工作台';
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,back=previous.cloneNode(true) as HTMLAnchorElement,links:{element:HTMLAnchorElement;url:string}[]=[];
  for(const [label,url] of [[entry.label,listUrl],...(edit?[[detailTitle,detailUrl]]:[])]){const arrow=doc.createElement('span'),link=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';link.textContent=label;link.title=label;link.href=url;link.target='_top';crumbs.querySelector('p')!.append(' ',arrow,' ',link);links.push({element:link,url});}
  breadcrumb.replaceWith(crumbs);back.href=edit?detailUrl:listUrl;back.title=edit?detailTitle:entry.label;back.removeAttribute('data-id');back.dataset.color=String(entry.color);back.className='text-ui color-'+color;
  for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(back.title);previous.replaceWith(back);links.push({element:back,url:edit?detailUrl:listUrl});
  const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],replacement=doc.createElement('li'),replacementHeading=nextHeading.cloneNode(false) as HTMLElement;replacement.className='next-link';
  if(!edit&&editable&&hasDetail){const action=doc.createElement('a');action.href=editUrl;action.title=base?'修改信息':'更新状态';action.textContent=action.title;action.className='text-ui color-'+color;action.dataset.color=String(entry.color);action.innerHTML+=`<svg viewBox="0 0 24 24" class="icon"><polygon fill="currentColor" points="${arrowPoints}"/></svg>`;replacement.append(action);replacementHeading.textContent='下一个';links.push({element:action,url:editUrl});}
  next.replaceWith(replacement);nextHeading.replaceWith(replacementHeading);
  const handlers=links.map(({element,url})=>{const handler=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);};element.addEventListener('click',handler);return()=>element.removeEventListener('click',handler);});
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  return()=>{handlers.forEach(detach=>detach());heading.removeEventListener('click',stay);if(info.isConnected){crumbs.replaceWith(breadcrumb);back.replaceWith(previous);replacement.replaceWith(next);replacementHeading.replaceWith(nextHeading);heading.textContent=saved.title;heading.href=saved.href;heading.title=saved.tooltip;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[record,edit,editable,hasDetail,title,detailTitle,detailUrl,editUrl,listUrl,entry.label,entry.color,navigate,anomaly,base,color]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 const fields=base?spec.details:[['bed_id','床位编号'],['building_name','楼栋'],['building_id','楼栋编号'],['room_id','所属房间'],['floor_number','楼层'],['room_type','房型'],['bed_number','床位号'],['bed_status','床位状态'],['room_status','房间状态'],['gender_restriction','入住性别'],['actual_occupied','实际入住状态']];
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-manager-beds={base?undefined:''} data-dorma-manager-base={base?'':undefined} aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(record===null?<><ul className="links-list links-list-boxed" data-dorma-bed-list={base?undefined:''} data-dorma-base-list={base?'':undefined}>{rows.map(row=>{const id=String(row[base?spec.identifier:'bed_id']),url=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(id);return <li key={id}><a className={'text-ui color-'+color} data-color={entry.color} href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{anomaly?id+' · '+String(row.issue):(base?spec.summary:['bed_id','building_name','bed_status']).map(key=>display(key,row[key])).join(' · ')}<Arrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}{total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(entry.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(entry.url+'?page='+(page+1))}>下一页</button></div></>}
  </>:detail&&(edit?(base&&resource!=='beds'?<ManagerBaseDataEditor entry={entry} row={detail} data={data} detailUrl={detailUrl} navigate={navigate}/>:<ManagerBedEditor entry={entry} row={detail} data={data} detailUrl={detailUrl} navigate={navigate}/>):<>{anomaly&&<StudentWarning>{String(detail.issue)}</StudentWarning>}<div data-dorma-bed-values={base?undefined:''} data-dorma-base-values={base?'':undefined}>{fields.map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(key,detail[key])}</code></pre></Fragment>)}</div></>))}
 </div>;
}
