'use client';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import type {StudentPage} from '@/data/student-pages';
import {valueLabels} from '@/data/workspace-actions';
import {accommodationListPath,type StudentAccommodationData} from '@/utils/student-accommodation-data';
import type {StudentRow} from '@/utils/student-record-data';

const fields=[['business_type','业务类型'],['student_number','学号'],['full_name','姓名'],['original_bed_id','原床位'],['new_bed_id','新床位'],['preferred_building_id','意向楼栋'],['application_note','申请说明'],['review_status','审核状态'],['applied_at','申请时间'],['processing_due_at','办理期限'],['reviewer_account_id','审核人员编号'],['reviewed_at','审核时间'],['review_note','审核意见']] as const;
const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function display(key:string,value:unknown){
  if(value===null||value===undefined||value==='')return '—';
  if(['applied_at','processing_due_at','reviewed_at','completed_at'].includes(key)){
    const date=new Date(String(value));return Number.isNaN(date.getTime())?String(value):dateTime.format(date);
  }
  return value==='checkin'?'入住':valueLabels[String(value)]??String(value);
}
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><g fill="none" fillRule="evenodd"><polygon fill="currentColor" fillRule="nonzero" points="17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75"/></g></svg>;}

export function StudentAccommodationRecords({entry,data}:{entry:StudentPage;data:StudentAccommodationData}){
  const router=useRouter(),params=useSearchParams();
  const record=params.get('record'),requestedPage=Number(params.get('page')??1);
  const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
  const listUrl=entry.url+(page>1?'?page='+page:'');
  const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
  return <RecordsContent key={[entry.id,record,page].join(':')} entry={entry} data={data} record={record} page={page} listUrl={listUrl} navigate={navigate}/>;
}

function RecordsContent({entry,data,record,page,listUrl,navigate}:{entry:StudentPage;data:StudentAccommodationData;record:string|null;page:number;listUrl:string;navigate:(url:string)=>void}){
  const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),router=useRouter();
  const action=entry.action.split('/')[0],checkin=action==='action-1',resource=checkin?'applications':'changes',identifier=checkin?'application_id':'change_id';
  const path=record===null?accommodationListPath(action,page):resource+'/'+record;
  const [result,setResult]=useState(()=>{
    const cached=data.peek(path);
    return cached&&!Array.isArray(cached.data)&&!checkin&&cached.data.business_type!==(action==='action-2'?'transfer':'checkout')?undefined:cached;
  }),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
  const title=entry.label.replace(/记录$/,'详情'),detailUrl=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(record??'');
  const load=useCallback(async()=>{
    const version=++request.current.version;setLoading(true);setError('');
    try{
      if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
      const next=await data.load(path);
      if(!Array.isArray(next.data)&&!checkin&&next.data.business_type!==(action==='action-2'?'transfer':'checkout'))throw new Error('记录不存在或不可访问。');
      if(request.current.version===version)setResult(next);
    }catch(reason){if(request.current.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
    finally{if(request.current.version===version)setLoading(false);}
  },[record,data,path,checkin,action]);
  useEffect(()=>{
    const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};
    window.addEventListener('focus',refresh);
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

  // Use the copied breadcrumb and previous/next elements, including native typography and hover colors.
  useLayoutEffect(()=>{
    if(record===null)return;
    const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!;
    const description=info.querySelector('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
    const saved={title:heading.textContent,href:heading.getAttribute('href')!,tooltip:heading.title,description:description.textContent,documentTitle:doc.title};
    heading.textContent=title;heading.href=detailUrl;heading.title=title;description.textContent='查看本次申请的床位安排、审核状态及办理信息。';doc.title=title+' · 学生工作台';
    const replacementBreadcrumb=breadcrumb.cloneNode(true) as HTMLElement,arrow=doc.createElement('span'),back=doc.createElement('a');
    arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';back.textContent=entry.label;back.href=listUrl;back.title=entry.label;back.target='_top';
    replacementBreadcrumb.querySelector('p')!.append(arrow,back);breadcrumb.replaceWith(replacementBreadcrumb);
    const previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,replacement=previous.cloneNode(true) as HTMLAnchorElement;
    replacement.href=listUrl;replacement.title=entry.label;replacement.dataset.id=entry.id;replacement.dataset.color=String(entry.color);replacement.className='text-ui color-corail';
    for(const node of [...replacement.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
    replacement.append(entry.label);previous.replaceWith(replacement);
    const next=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1];
    const empty=doc.createElement('li'),emptyHeading=nextHeading.cloneNode(false) as HTMLElement;next.replaceWith(empty);nextHeading.replaceWith(emptyHeading);
    const returnToList=(event:globalThis.MouseEvent)=>{
      event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();navigate(listUrl);
    };
    const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};
    back.addEventListener('click',returnToList);replacement.addEventListener('click',returnToList);heading.addEventListener('click',stay);
    return()=>{
      back.removeEventListener('click',returnToList);replacement.removeEventListener('click',returnToList);heading.removeEventListener('click',stay);
      if(info.isConnected){
        replacementBreadcrumb.replaceWith(breadcrumb);replacement.replaceWith(previous);empty.replaceWith(next);emptyHeading.replaceWith(nextHeading);
        heading.textContent=saved.title;heading.href=saved.href;heading.title=saved.tooltip;description.textContent=saved.description;doc.title=saved.documentTitle;
      }
    };
  },[record,title,detailUrl,entry.id,entry.color,entry.label,listUrl,navigate]);

  function link(url:string,event:MouseEvent<HTMLAnchorElement>){
    event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigate(url);
  }
  const detailFields:ReadonlyArray<readonly [string,string]>=[[identifier,'申请编号'],...fields.slice(0,3),...(checkin?[['gender','性别'] as const]:[]),...fields.slice(3,6),[checkin?'expected_check_in_date':'expected_date',checkin?'期望入住日期':'期望办理日期'],...fields.slice(6),...(!checkin?[['completed_at','完成时间'] as const]:[])];
  return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-accommodation aria-busy={loading}>
    {error&&<p role="alert">{error}</p>}
    {result&&(record===null?<>
      <ul className="links-list links-list-boxed" data-dorma-accommodation-list>{rows.map(row=>{
        const id=String(row[identifier]),url=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(id);
        const summary=['business_type','original_bed_id','new_bed_id','review_status'].map(key=>display(key,row[key])).join(' · ');
        return <li key={id}><a className="text-ui color-corail" data-color="1" href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{summary}<Arrow/></a></li>;
      })}</ul>
      {!rows.length&&<p>暂无记录。</p>}
      {total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(entry.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(entry.url+'?page='+(page+1))}>下一页</button></div></>}
    </>:detail&&<RecordValues row={detail} fields={detailFields}/>)}
  </div>;
}
function RecordValues({row,fields}:{row:StudentRow;fields:ReadonlyArray<readonly [string,string]>}){return <div data-dorma-accommodation-values>{fields.map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(key,row[key])}</code></pre></Fragment>)}</div>;}
