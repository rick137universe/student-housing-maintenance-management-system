'use client';

import {DocsPagination} from './DocsPagination';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type RefObject} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import type {StudentRow} from '@/utils/student-record-data';
import type {StudentRecordData} from '@/utils/student-record-data';
import {valueLabels} from '@/data/workspace-actions';
import {api} from '@/utils/auth-session';
import {RepairArrow,RepairEditorFields,type RepairField} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function date(value:unknown){const parsed=new Date(String(value??''));return Number.isNaN(parsed.getTime())?'—':dateTime.format(parsed);}
const theme='lime';
export const adminBackupListPath=(entry:AdminPage,page=1)=>(entry.action.startsWith('action-1')?'backup-policies':'backups')+'?'+new URLSearchParams({page:String(page),limit:'20'});
function display(key:string,value:unknown){if(value===null||value===undefined||value==='')return '—';if(typeof value==='object')return JSON.stringify(value,null,2);if(typeof value==='boolean')return value?'启用':'停用';return key.endsWith('_at')?date(value):valueLabels[String(value)]??String(value);}
const policyFields=[['policy_id','策略编号'],['policy_name','策略名称'],['schedule_expression','备份计划'],['retention_days','保留天数'],['enabled','启用状态'],['created_at','创建时间']] as const;
const runFields=[['backup_run_id','任务编号'],['operation_type','任务类型'],['run_status','任务状态'],['policy_id','策略编号'],['source_backup_id','来源备份'],['started_at','开始时间'],['finished_at','完成时间'],['result_description','执行结果'],['external_file_reference','备份文件'],['checksum','校验值'],['file_deleted_at','文件清理时间'],['restored_database','恢复副本'],['validation_result','校验结果']] as const;
function BackupValues({row,policies=false}:{row:StudentRow;policies?:boolean}){return <div data-dorma-backup-values>{(policies?policyFields:runFields).map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{key==='schedule_expression'?scheduleTime(row[key]):display(key,row[key])}</code></pre></Fragment>)}</div>;}
function scheduleTime(value:unknown){const parts=String(value??'').split(' ');return parts.length===5?'每日 '+parts[1].padStart(2,'0')+':'+parts[0].padStart(2,'0'):String(value??'—');}
function restorable(row:StudentRow){return row.operation_type==='backup'&&row.run_status==='succeeded'&&!row.file_deleted_at;}
function BackupInfo({children}:{children:React.ReactNode}){return <div className="docs-info-content formatted-text"><div className="notice info"><p>{children}</p></div></div>;}

export function AdminBackupPage({entry,data}:{entry:AdminPage;data:StudentRecordData}){
 const root=useRef<HTMLDivElement>(null),params=useSearchParams(),router=useRouter(),record=['policy-create','backup-create'].includes(entry.kind??'')?null:params.get('record'),mode=params.get('mode'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>{
  const target=adminPages.find(page=>page.url===url.split('?')[0]);
  if(target&&target.id!==entry.id){root.current?.ownerDocument.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${target.id}"]`)?.click();return;}
  router.push(url,{scroll:false});
 },[router,entry.id]);
 return <div ref={root}>{adminPages.some(page=>page.parent===entry.id)?<BackupNavigation entry={entry}/>:<BackupContent key={[entry.id,record,mode,page].join(':')} entry={entry} data={data} record={record} mode={mode} page={page} navigate={navigate}/>}</div>;
}

function BackupNavigation({entry}:{entry:AdminPage}){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
  const content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  // Keep navigation outside prose styling on both initial loads and Docs page switches.
  content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:'page'}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[]);
 return <div ref={root} className="docs-info-content" data-dorma-live-workspace><h6 className="links-list-heading">本页功能</h6><ul className="links-list links-list-boxed" data-dorma-admin-backup-navigation>{adminPages.filter(page=>page.parent===entry.id).map(page=><li key={page.id}><a className={'text-ui color-'+theme} data-color={page.color} data-id={page.id} href={page.url} title={page.label}>{page.label}<RepairArrow/></a></li>)}</ul></div>;
}

function BackupContent({entry,data,record,mode,page,navigate}:{entry:AdminPage;data:StudentRecordData;record:string|null;mode:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),submitAction=useRef<()=>Promise<void>>(async()=>{}),submitLink=useRef<HTMLAnchorElement|null>(null);
 const parent=entry.parent?adminPages.find(page=>page.id===entry.parent)!:entry,records=entry.kind==='records'?entry:adminPages.find(page=>page.parent===parent.id&&page.kind==='records')??entry,submission=adminPages.find(page=>page.parent===parent.id&&['policy-create','backup-create'].includes(page.kind??''));
 const policies=entry.action.startsWith('action-1'),restorePage=entry.action==='action-3',publish=['policy-create','backup-create'].includes(entry.kind??''),editing=mode==='edit'&&record!==null&&policies,restoring=mode==='restore'&&record!==null&&restorePage,form=publish||editing||restoring;
 const listUrl=records.url+(page>1?'?page='+page:''),publishUrl=submission?.url??entry.url;
 const detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),editUrl=detailUrl+'&mode='+(policies?'edit':'restore');
 const resource=policies?'backup-policies':'backups',identifier=policies?'policy_id':'backup_run_id',path=record===null?adminBackupListPath(entry,page):resource+'/'+record;
 const [result,setResult]=useState(()=>data.peek(path)),[loading,setLoading]=useState(!publish),[error,setError]=useState(''),[disabled,setDisabled]=useState(form);
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const canEdit=policies||Boolean(restorePage&&detail&&restorable(detail));
 const title=publish?(policies?'新增备份策略':'创建备份'):editing?'编辑备份策略':restoring?'恢复确认':record!==null?(policies?'备份策略详情':'备份任务详情'):entry.label;
 const [worker,setWorker]=useState<string|null>(null);
 useEffect(()=>{if(policies)return;let current=true;const health=()=>void data.load('health',true).then(result=>{if(current&&!Array.isArray(result.data))setWorker(String(result.data.worker));}).catch(()=>{if(current)setWorker('unknown');});health();const timer=setInterval(health,10000);return()=>{current=false;clearInterval(timer);};},[data,policies]);
 useEffect(()=>{
  if(publish)return;
  const state=request.current;
  const load=async(force=false)=>{
   const version=++state.version;setLoading(true);setError('');
   try{
    if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
    const next=await data.load(path,force);if(state.version===version)setResult(next);
   }catch(reason){if(state.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'备份记录读取失败，请重试。');}}
   finally{if(state.version===version)setLoading(false);}
  };
  void load();const timer=!policies&&!form?setInterval(()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load(true);},10000):undefined;const refresh=()=>{if(!form&&root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);
  return()=>{state.version++;clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[data,path,publish,record,policies,form]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!;
  const parent=business.parentNode!,sibling=business.nextSibling;
  if(record!==null&&!form)content.append(business);else content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:record===null&&!publish&&page===1?'page':JSON.stringify([record,mode,page])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[record,form,publish,mode,page]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector<HTMLElement>('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={text:heading.textContent,href:heading.getAttribute('href')!,title:heading.title,description:description.textContent,hidden:description.hidden,documentTitle:doc.title};
  const url=publish?publishUrl:editing||restoring?editUrl:record!==null?detailUrl:listUrl;
  heading.textContent=title;heading.href=url;heading.title=title;description.hidden=record!==null&&!editing;
  if(form)description.textContent=policies?'逐项确认策略名称、每日备份时间、保留天数及启用状态。':restoring?'确认来源备份后，提交独立副本恢复与校验任务。':'确认后将创建备份任务，可在记录中查看执行结果。';
  doc.querySelector('title')!.textContent=title+' · 管理员工作台';
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,handlers:Array<()=>void>=[];
  const route=(anchor:HTMLAnchorElement,target:string)=>{
   const click=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(target);};
   anchor.addEventListener('click',click);handlers.push(()=>anchor.removeEventListener('click',click));
  };
  function crumb(label:string,target:string){const arrow=doc.createElement('span'),back=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';back.textContent=label;back.title=label;back.href=target;route(back,target);crumbs.querySelector('p')!.append(' ',arrow,' ',back);}
  if(record!==null)crumb(entry.label,listUrl);
  if((editing||restoring)&&detail)crumb(policies?'备份策略详情':'备份任务详情',detailUrl);
  breadcrumb.replaceWith(crumbs);
  const oldPrevious=info.querySelector('.prev-link')!,oldNext=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],savedNext=nextHeading.textContent;
  const previous=oldPrevious.cloneNode(true) as HTMLElement,next=doc.createElement('li');next.className='next-link';
  if(form||record!==null){const back=previous.querySelector('a')!;back.removeAttribute('data-id');back.className='text-ui color-'+theme;back.dataset.color=String(entry.color);back.href=editing||restoring?detailUrl:publish?parent.url:listUrl;back.title=editing||restoring?(policies?'备份策略详情':'备份任务详情'):publish?parent.label:entry.label;for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(editing||restoring?(policies?'备份策略详情':'备份任务详情'):publish?parent.label:entry.label);route(back,back.getAttribute('href')!);}
  const label=form?(policies?(publish?'新增策略':'保存修改'):restoring?'提交恢复任务':'创建备份任务'):record!==null?(policies?'编辑策略':'恢复副本'):submission?.label??'';
  if(form||record!==null&&detail&&canEdit||record===null&&submission){
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
 },[entry.color,entry.label,title,listUrl,publishUrl,detailUrl,editUrl,publish,editing,form,record,detail,navigate,parent.label,parent.url,policies,restoring,canEdit,submission]);
 useLayoutEffect(()=>{submitLink.current?.setAttribute('aria-disabled',String(disabled));submitLink.current?.setAttribute('aria-busy',String(disabled));},[disabled,title,detail]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 return <div ref={root} className={record===null&&!publish?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-admin-backup aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {worker&&worker!=='running'&&<BackupInfo>{worker==='offline'?'备份服务暂未运行，任务会保留在队列中。':'暂时无法确认备份服务状态，请稍后查看任务执行结果。'}</BackupInfo>}
  {publish||(editing||restoring)&&detail?<BackupEditor entry={entry} row={editing||restoring?detail:null} data={data} submitAction={submitAction} onDisabled={setDisabled} onSaved={id=>navigate(publish?records.url:listUrl+(page>1?'&':'?')+'record='+id)}/>:result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-admin-backup-list>{rows.map(row=>{const url=listUrl+(page>1?'&':'?')+'record='+row[identifier];return <li key={String(row[identifier])}><a className={'text-ui color-'+theme} data-color={entry.color} href={url} target="_top" onClick={event=>link(url,event)}>{(policies?['policy_name','enabled']:['backup_run_id','operation_type','run_status','started_at']).map(key=>display(key,row[key])).join(' · ')}<RepairArrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}
   <DocsPagination page={page} total={total} pageUrl={next=>records.url+(next>1?'?page='+next:'')} navigate={navigate}/>
  </>:!form&&detail&&<BackupValues row={detail} policies={policies}/>)}
 </div>;

}

function BackupEditor({entry,row,data,submitAction,onDisabled,onSaved}:{entry:AdminPage;row:StudentRow|null;data:StudentRecordData;submitAction:RefObject<()=>Promise<void>>;onDisabled:(disabled:boolean)=>void;onSaved:(id:string)=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),policies=entry.action.startsWith('action-1'),restoring=entry.action==='action-3';
 const [values,setValues]=useState<Record<string,string>>(()=>({name:String(row?.policy_name??''),backupTime:row?scheduleTime(row.schedule_expression).replace('每日 ',''):'02:00',retentionDays:String(row?.retention_days??7),enabled:String(row?.enabled??true)}));
 const [active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState('');
 const fields:RepairField[]=[
  {key:'name',label:'策略名称',type:'text',required:true,maxLength:100},
  {key:'backupTime',label:'每日备份时间',type:'time',required:true,validate:value=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)?'请选择有效的每日备份时间。':undefined},
  {key:'retentionDays',label:'保留天数',type:'number',required:true,validate:value=>!/^\d{1,3}$/.test(value)||Number(value)<1||Number(value)>365?'保留天数须为1至365之间的整数。':undefined},
  {key:'enabled',label:'启用状态',type:'select',required:true,options:[['true','启用'],['false','停用']]},
 ];
 async function submit(){
  if(saving.current||active)return;
  if(policies)for(const field of fields){const value=values[field.key]??'',message=field.required&&!value.trim()?'请填写并确认'+field.label+'。':field.maxLength&&value.length>field.maxLength?field.label+'不能超过'+field.maxLength+'个字符。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择有效的'+field.label+'。':field.validate?.(value);if(message){setError(message);return;}}
  saving.current=true;setPending(true);setError('');
  try{
   if(restoring){if(!row)throw new Error('请选择有效备份。');const latest=await data.load('backups/'+row.backup_run_id,true);if(Array.isArray(latest.data)||!restorable(latest.data))throw new Error('此备份尚未成功或文件已被清理，无法恢复。');}
   const [hour,minute]=values.backupTime.split(':');
   const body=policies?{name:values.name.trim(),schedule:Number(minute)+' '+Number(hour)+' * * *',retentionDays:Number(values.retentionDays),enabled:values.enabled==='true'}:restoring?{sourceBackupId:String(row!.backup_run_id)}:{};
   const result=await api<StudentRow>(policies?(row?'backup-policies/'+row.policy_id:'backup-policies'):restoring?'backups/restore':'backups',{method:policies&&row?'PATCH':'POST',body:JSON.stringify(body)});
   data.invalidate();if(root.current)onSaved(String(result.data[policies?'policy_id':'backup_run_id']));
  }catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 useEffect(()=>{onDisabled(pending||Boolean(active));},[onDisabled,pending,active]);
 return <div ref={root} data-dorma-application-editor data-dorma-admin-backup-editor aria-busy={pending}>
  {policies?<RepairEditorFields color={entry.color} fields={fields} values={values} active={active} pending={pending} onActive={key=>{setActive(key);setError('');}} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>:<>
   <BackupInfo>{restoring?'恢复任务将使用下方备份创建独立数据库副本，并执行完整性校验。':'提交后将创建数据库备份任务，完成后可在备份记录中查看执行结果。'}</BackupInfo>
   {row&&<div className="docs-info-content formatted-text"><BackupValues row={row}/></div>}
  </>}
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
