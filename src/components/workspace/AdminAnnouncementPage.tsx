'use client';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type RefObject} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import type {StudentRow} from '@/utils/student-record-data';
import {announcementListPath,type StudentAnnouncementData} from '@/utils/student-announcement-data';
import {api} from '@/utils/auth-session';
import {RepairArrow,RepairEditorFields,type RepairField} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function date(value:unknown){const parsed=new Date(String(value??''));return Number.isNaN(parsed.getTime())?'—':dateTime.format(parsed);}
function localDate(value:unknown){return value?date(value).slice(0,16).replace(' ','T'):'';}
const theme='turquoise';

export function AdminAnnouncementPage({entry,data}:{entry:AdminPage;data:StudentAnnouncementData}){
 const root=useRef<HTMLDivElement>(null),params=useSearchParams(),router=useRouter(),record=entry.kind==='submit'?null:params.get('record'),mode=params.get('mode'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>{
  const target=adminPages.find(page=>page.url===url.split('?')[0]);
  if(target&&target.id!==entry.id){root.current?.ownerDocument.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${target.id}"]`)?.click();return;}
  router.push(url,{scroll:false});
 },[router,entry.id]);
 return <div ref={root}>{entry.action==='action-1'?<AnnouncementNavigation entry={entry}/>:<AnnouncementContent key={[entry.id,record,mode,page].join(':')} entry={entry} data={data} record={record} mode={mode} page={page} navigate={navigate}/>}</div>;
}

function AnnouncementNavigation({entry}:{entry:AdminPage}){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
  const content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  // Keep navigation outside prose styling on both initial loads and Docs page switches.
  content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:'page'}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[]);
 return <div ref={root} className="docs-info-content" data-dorma-live-workspace><h6 className="links-list-heading">本页功能</h6><ul className="links-list links-list-boxed" data-dorma-admin-announcement-navigation>{adminPages.filter(page=>page.parent===entry.id).map(page=><li key={page.id}><a className={'text-ui color-'+theme} data-color={page.color} data-id={page.id} href={page.url} title={page.label}>{page.label}<RepairArrow/></a></li>)}</ul></div>;
}

function AnnouncementContent({entry,data,record,mode,page,navigate}:{entry:AdminPage;data:StudentAnnouncementData;record:string|null;mode:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),submitAction=useRef<()=>Promise<void>>(async()=>{}),submitLink=useRef<HTMLAnchorElement|null>(null);
 const parent=adminPages.find(page=>page.id===entry.parent)!,records=adminPages.find(page=>page.parent===parent.id&&page.kind==='records')!,submission=adminPages.find(page=>page.parent===parent.id&&page.kind==='submit')!;
 const publish=entry.kind==='submit',editing=mode==='edit'&&record!==null,form=publish||editing;
 const listUrl=records.url+(page>1?'?page='+page:''),publishUrl=submission.url;
 const detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),editUrl=detailUrl+'&mode=edit';
 const path=record===null?announcementListPath(entry,page):'announcements/'+record;
 const [result,setResult]=useState(()=>data.peek(path)),[loading,setLoading]=useState(!publish),[error,setError]=useState(''),[disabled,setDisabled]=useState(form);
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const title=publish?'发布公告':editing?'编辑公告':record!==null?String(detail?.title??'公告详情'):entry.label;
 useEffect(()=>{
  if(publish)return;
  const state=request.current;
  const load=async()=>{
   const version=++state.version;setLoading(true);setError('');
   try{
    if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
    const next=await data.load(path);if(state.version===version)setResult(next);
   }catch(reason){if(state.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'公告读取失败，请重试。');}}
   finally{if(state.version===version)setLoading(false);}
  };
  void load();const refresh=()=>{if(!editing&&root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);
  return()=>{state.version++;window.removeEventListener('focus',refresh);};
 },[data,path,publish,record,editing]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!;
  const parent=business.parentNode!,sibling=business.nextSibling;
  if(record!==null&&!editing)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:record===null&&!publish&&page===1?'page':JSON.stringify([record,mode,page])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,editing,publish,mode,page]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector<HTMLElement>('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={text:heading.textContent,href:heading.getAttribute('href')!,title:heading.title,description:description.textContent,hidden:description.hidden,documentTitle:doc.title};
  const url=publish?publishUrl:editing?editUrl:record!==null?detailUrl:listUrl;
  heading.textContent=title;heading.href=url;heading.title=title;description.hidden=record!==null&&!editing;
  if(form)description.textContent='逐项填写并确认公告内容、发布范围和状态，完成后提交。';
  doc.querySelector('title')!.textContent=title+' · 管理员工作台';
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,handlers:Array<()=>void>=[];
  const route=(anchor:HTMLAnchorElement,target:string)=>{
   const click=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(target);};
   anchor.addEventListener('click',click);handlers.push(()=>anchor.removeEventListener('click',click));
  };
  function crumb(label:string,target:string){const arrow=doc.createElement('span'),back=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';back.textContent=label;back.title=label;back.href=target;route(back,target);crumbs.querySelector('p')!.append(' ',arrow,' ',back);}
  if(record!==null)crumb(entry.label,listUrl);
  if(editing&&detail)crumb(String(detail.title),detailUrl);
  breadcrumb.replaceWith(crumbs);
  const oldPrevious=info.querySelector('.prev-link')!,oldNext=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],savedNext=nextHeading.textContent;
  const previous=oldPrevious.cloneNode(true) as HTMLElement,next=doc.createElement('li');next.className='next-link';
  if(form||record!==null){const back=previous.querySelector('a')!;back.removeAttribute('data-id');back.className='text-ui color-'+theme;back.dataset.color=String(entry.color);back.href=editing?detailUrl:publish?parent.url:listUrl;back.title=editing?'公告详情':publish?parent.label:entry.label;for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(editing?'公告详情':publish?parent.label:entry.label);route(back,back.getAttribute('href')!);}
  const label=form?(publish?'发布公告':'保存修改'):record!==null?'编辑公告':'发布公告';
  if(record===null||detail){
   const button=doc.createElement('a');button.className='text-ui color-'+theme;button.dataset.color=String(entry.color);button.title=label;button.textContent=label;button.href=form?url:record!==null?editUrl:publishUrl;
   const icon=doc.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=doc.createElementNS('http://www.w3.org/2000/svg','polygon');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('class','icon');polygon.setAttribute('fill','currentColor');polygon.setAttribute('points','17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75');icon.append(polygon);button.append(icon);
   if(form){
    button.setAttribute('role','button');submitLink.current=button;
    const submit=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();};
    const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();}};
    button.addEventListener('click',submit);button.addEventListener('keydown',keyboard);handlers.push(()=>{button.removeEventListener('click',submit);button.removeEventListener('keydown',keyboard);});
   }else route(button,button.getAttribute('href')!);
   next.append(button);
  }
  nextHeading.textContent=next.children.length?'下一个':'';oldPrevious.replaceWith(previous);oldNext.replaceWith(next);
  return()=>{handlers.forEach(cleanup=>cleanup());heading.removeEventListener('click',stay);submitLink.current=null;if(info.isConnected){previous.replaceWith(oldPrevious);next.replaceWith(oldNext);nextHeading.textContent=savedNext;crumbs.replaceWith(breadcrumb);heading.textContent=saved.text;heading.href=saved.href;heading.title=saved.title;description.textContent=saved.description;description.hidden=saved.hidden;doc.querySelector('title')!.textContent=saved.documentTitle;}};
 },[entry.color,entry.label,title,listUrl,publishUrl,detailUrl,editUrl,publish,editing,form,record,detail,navigate,parent.label,parent.url]);
 useLayoutEffect(()=>{submitLink.current?.setAttribute('aria-disabled',String(disabled));submitLink.current?.setAttribute('aria-busy',String(disabled));},[disabled,title,detail]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 const paragraphs=detail?String(detail.content??'').replace(/\r\n?/g,'\n').split(/\n\s*\n/).filter(paragraph=>paragraph.trim()):[];
 return <div ref={root} className={record===null&&!publish?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-admin-announcements aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {publish||editing&&detail?<AnnouncementEditor entry={entry} row={editing?detail:null} data={data} submitAction={submitAction} onDisabled={setDisabled} onSaved={id=>navigate(publish?records.url:listUrl+(page>1?'&':'?')+'record='+id)}/>:result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-admin-announcement-list>{rows.map(row=>{const url=listUrl+(page>1?'&':'?')+'record='+row.announcement_id;return <li key={String(row.announcement_id)}><a className={'text-ui color-'+theme} data-color={entry.color} href={url} target="_top" onClick={event=>link(url,event)}>{String(row.title)}<RepairArrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}
   {total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(records.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(records.url+'?page='+(page+1))}>下一页</button></div></>}
  </>:!editing&&detail&&<div data-dorma-admin-announcement-body>
   <p><code>{date(detail.published_at)}</code>{' '}<code>{String(detail.announcement_type)}</code>{' '}<code>{detail.enabled?'已启用':'已停用'}</code></p>
   <p>发布范围：<code>{detail.building_id?String(detail.building_id):'全部楼栋'}</code>{Boolean(detail.expires_at)&&<> 到期时间：<code>{date(detail.expires_at)}</code></>}</p>
   {paragraphs.map((paragraph,index)=><p key={index}>{paragraph.split('\n').map((line,lineIndex)=><Fragment key={lineIndex}>{lineIndex>0&&<br/>}{line}</Fragment>)}</p>)}
  </div>)}
 </div>;
}

function AnnouncementEditor({entry,row,data,submitAction,onDisabled,onSaved}:{entry:AdminPage;row:StudentRow|null;data:StudentAnnouncementData;submitAction:RefObject<()=>Promise<void>>;onDisabled:(disabled:boolean)=>void;onSaved:(id:string)=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false);
 const [values,setValues]=useState<Record<string,string>>(()=>({title:String(row?.title??''),content:String(row?.content??''),type:String(row?.announcement_type??'公寓通知'),buildingId:String(row?.building_id??'all'),expiresAt:localDate(row?.expires_at),enabled:String(row?.enabled??true)}));
 const [active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[buildings,setBuildings]=useState<StudentRow[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{let current=true;void(async()=>{const rows:StudentRow[]=[];let page=1;while(true){const next=await data.load('buildings?'+new URLSearchParams({page:String(page),limit:'100'}));if(!Array.isArray(next.data))throw new Error('楼栋读取失败，请重试。');rows.push(...next.data);if(rows.length>=(next.meta?.total??rows.length))break;page++;}if(current){setBuildings(rows);setReady(true);}})().catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'楼栋读取失败，请重试。');});return()=>{current=false;};},[data]);
 const fields:RepairField[]=[
  {key:'title',label:'公告标题',type:'text',required:true,maxLength:200},
  {key:'content',label:'公告正文',type:'textarea',required:true,maxLength:10000},
  {key:'type',label:'公告类型',type:'text',required:true,maxLength:40},
  {key:'buildingId',label:'发布范围',type:'select',required:true,options:[['all','全部楼栋'],...buildings.map(building=>[String(building.building_id),String(building.building_id)+' · '+String(building.building_name)] as const)]},
  {key:'expiresAt',label:'到期时间',type:'datetime-local',validate:value=>value&&Number.isNaN(new Date(value).getTime())?'请选择有效的到期时间。':undefined},
  {key:'enabled',label:'启用状态',type:'select',required:true,options:[['true','启用'],['false','停用']]},
 ];
 async function submit(){
  if(saving.current||active||!ready)return;
  for(const field of fields){const value=values[field.key]??'',message=field.required&&!value?'请填写并确认'+field.label+'。':field.maxLength&&value.length>field.maxLength?field.label+'不能超过'+field.maxLength+'个字符。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择有效的'+field.label+'。':field.validate?.(value);if(message){setError(message);return;}}
  saving.current=true;setPending(true);setError('');
  try{
   const result=await api<{announcementId:string}>(row?'announcements/'+row.announcement_id:'announcements',{method:row?'PATCH':'POST',body:JSON.stringify({...values,buildingId:values.buildingId==='all'?null:values.buildingId,expiresAt:values.expiresAt?new Date(values.expiresAt).toISOString():null,enabled:values.enabled==='true'})});
   data.invalidate();if(root.current)onSaved(String(result.data.announcementId));
  }catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 useEffect(()=>{onDisabled(pending||Boolean(active)||!ready);},[onDisabled,pending,active,ready]);
 return <div ref={root} data-dorma-application-editor data-dorma-admin-announcement-editor aria-busy={pending}>
  <RepairEditorFields color={entry.color} fields={fields} values={values} active={active} pending={pending} onActive={key=>{setActive(key);setError('');}} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
