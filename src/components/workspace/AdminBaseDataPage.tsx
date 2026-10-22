'use client';

import {DocsPagination} from './DocsPagination';

import {Fragment,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type RefObject} from 'react';
import {useSearchParams} from 'next/navigation';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import {baseResource,isBaseResource,baseResources,baseNames,baseIds,baseDetails,baseFields,baseListPath,type BaseResource} from '@/utils/admin-base-data';
import type {StudentRecordData,StudentRow} from '@/utils/student-record-data';
import {api,saveAuthSession} from '@/utils/auth-session';
import {valueLabels} from '@/data/workspace-actions';
import {RepairArrow,RepairEditorFields} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

const rootUrl='/workspace/admin/base-data/manage',recordsUrl=rootUrl+'/records';
function url(path:string,resource:BaseResource,page=1,record?:string,mode?:string){const params=new URLSearchParams({type:resource});if(page>1)params.set('page',String(page));if(record!==undefined)params.set('record',record);if(mode)params.set('mode',mode);return path+'?'+params;}
function display(value:unknown){return value===null||value===undefined||value===''?'—':valueLabels[String(value)]??String(value);}
function Values({row,resource}:{row:StudentRow;resource:BaseResource}){return <div data-dorma-base-values>{baseDetails[resource].map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(row[key])}</code></pre></Fragment>)}</div>;}

export function AdminBaseDataPage({entry,data,navigate}:{entry:AdminPage;data:StudentRecordData;navigate:(url:string)=>void}){
 const params=useSearchParams(),selected=isBaseResource(params.get('type')),resource=baseResource(params.get('type')),record=params.get('record'),mode=params.get('mode'),number=Number(params.get('page')??1),page=Number.isSafeInteger(number)&&number>0&&number<=100000?number:1;
 return <BaseContent key={JSON.stringify([entry.id,selected,resource,record,mode,page])} entry={entry} selected={selected} resource={resource} record={record} mode={mode} page={page} data={data} navigate={navigate}/>;
}
function BaseContent({entry,selected,resource,record,mode,page,data,navigate}:{entry:AdminPage;selected:boolean;resource:BaseResource;record:string|null;mode:string|null;page:number;data:StudentRecordData;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),action=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const navigation=entry.action==='action-1',selectionPage=!navigation&&!selected,create=selected&&entry.kind==='base-create',listing=selected&&entry.kind==='base-records',editing=listing&&record!==null&&mode==='edit',deleting=listing&&record!==null&&mode==='delete'&&resource!=='students',form=create||editing,transfer=selected&&(entry.action==='action-2'||entry.action==='action-3');
 const listUrl=url(recordsUrl,resource,page),detailUrl=url(recordsUrl,resource,page,record??''),editUrl=url(recordsUrl,resource,page,record??'','edit'),deleteUrl=url(recordsUrl,resource,page,record??'','delete');
 const path=record===null?baseListPath(resource,page):resource+'/'+encodeURIComponent(record);
 const invalid=record!==null&&(!record.trim()||record.length>32||/[\u0000-\u001f\u007f]/.test(record));
 const [result,setResult]=useState(()=>invalid?undefined:data.peek(path)),[error,setError]=useState(''),[disabled,setDisabled]=useState(form||transfer||deleting);
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const detailTitle=baseNames[resource]+'详情',title=editing?'修改'+baseNames[resource]:deleting?'删除'+baseNames[resource]:listing?(record!==null?detailTitle:baseNames[resource]+'记录'):create?'新增'+baseNames[resource]:transfer?(entry.action==='action-2'?'导入':'导出')+baseNames[resource]:entry.label;
 useEffect(()=>{if(!listing)return;let current=true;void (async()=>{if(invalid)throw new Error('记录不存在或不可访问。');const next=await data.load(path);if(current)setResult(next);})().catch(reason=>{if(current){setResult(undefined);setError(reason instanceof Error?reason.message:'基础数据读取失败，请重试。');}});return()=>{current=false;};},[data,path,listing,invalid]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  content.after(business);doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:!selected?'page':JSON.stringify([resource,record,mode,page])}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[selected,resource,record,mode,page]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,heading=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector<HTMLElement>('[data-dorma-description]')!,breadcrumb=info.querySelector('.docs-breadcrumb')!;
  const saved={text:heading.textContent,href:heading.getAttribute('href')!,title:heading.title,description:description.textContent,documentTitle:doc.title};
  heading.textContent=title;heading.title=title;heading.href=listing&&record!==null?detailUrl:selected?url(entry.url,resource):entry.url;doc.title=title+' | 管理员工作台 | FLight';
  if(editing)description.textContent='逐项编辑并确认资料，完成后提交更新。';else if(deleting)description.textContent='核对以下资料，确认后删除。已被业务记录引用的数据无法删除。';else if(listing&&record!==null)description.textContent='查看完整基础资料及当前状态。';else if(listing)description.textContent='查看和维护'+baseNames[resource]+'基础资料。';else if(create)description.textContent='逐项填写并确认'+baseNames[resource]+'资料，完成后提交。';else if(transfer)description.textContent=(entry.action==='action-2'?'下载对应模板并批量导入':'导出')+baseNames[resource]+'基础资料。';
  const handlers:Array<()=>void>=[],route=(anchor:HTMLAnchorElement,target:string)=>{const click=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(target);};anchor.addEventListener('click',click);handlers.push(()=>anchor.removeEventListener('click',click));};
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement;
  function crumb(label:string,target:string){const arrow=doc.createElement('span'),link=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';link.textContent=label;link.title=label;link.href=target;route(link,target);crumbs.querySelector('p')!.append(' ',arrow,' ',link);}
  if(selected&&!navigation)crumb(entry.label,entry.url);if(listing&&record!==null)crumb(baseNames[resource]+'记录',listUrl);if(editing||deleting)crumb(detailTitle,detailUrl);breadcrumb.replaceWith(crumbs);
  const oldPrevious=info.querySelector('.prev-link')!,oldNext=info.querySelector('.next-link')!,previous=oldPrevious.cloneNode(true) as HTMLElement,next=oldNext.cloneNode(true) as HTMLElement,nextHeading=info.querySelector('.prev-next-heading')!.children[1],savedNext=nextHeading.textContent;
  const back=previous.querySelector<HTMLAnchorElement>('a')!;back.removeAttribute('data-id');back.dataset.color='0';back.className='text-ui color-red';
  const backUrl=editing||deleting?detailUrl:listing&&record!==null?listUrl:selected&&!navigation?entry.url:entry.kind?rootUrl:'/workspace/admin/base-data',backLabel=editing||deleting?detailTitle:listing&&record!==null?baseNames[resource]+'记录':selected&&!navigation?entry.label:entry.kind?'数据维护':'基础数据';
  back.href=backUrl;back.title=backLabel;for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(backLabel);route(back,backUrl);
  const submit=form||transfer||deleting,label=form?(create?'新增'+baseNames[resource]:'保存修改'):deleting?'确认删除':entry.action==='action-2'?'导入数据':entry.action==='action-3'?'导出 CSV':listing&&record!==null?'修改资料':listing?'新增'+baseNames[resource]:'新增数据',target=navigation?rootUrl+'/submit':listing&&record===null?url(rootUrl+'/submit',resource):listing&&record!==null?editUrl:entry.url;
  const button=next.querySelector<HTMLAnchorElement>('a')!;button.removeAttribute('data-id');button.className='text-ui color-red';button.dataset.color='0';button.href=target;button.title=label;for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();button.prepend(label);
  if(submit){button.setAttribute('role','button');footer.current=button;const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void action.current();};const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void action.current();}};button.addEventListener('click',send);button.addEventListener('keydown',keyboard);handlers.push(()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);});}else route(button,target);
  if(selectionPage||listing&&record!==null&&!detail)next.replaceChildren();nextHeading.textContent=next.children.length?'下一个':'';oldPrevious.replaceWith(previous);oldNext.replaceWith(next);
  return()=>{handlers.forEach(cleanup=>cleanup());footer.current=null;heading.removeEventListener('click',stay);if(info.isConnected){previous.replaceWith(oldPrevious);next.replaceWith(oldNext);nextHeading.textContent=savedNext;crumbs.replaceWith(breadcrumb);heading.textContent=saved.text;heading.href=saved.href;heading.title=saved.title;description.textContent=saved.description;doc.title=saved.documentTitle;}};
 },[entry.url,entry.action,entry.label,entry.kind,selected,selectionPage,resource,record,navigation,create,listing,editing,deleting,form,transfer,title,listUrl,detailUrl,editUrl,detailTitle,detail,navigate]);
 useLayoutEffect(()=>{footer.current?.setAttribute('aria-disabled',String(disabled));},[disabled,detail]);
 function link(target:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(target);}
 const resourceLinks=<div className="docs-info-content"><h6 className="links-list-heading">数据类型</h6><ul className="links-list links-list-boxed" data-dorma-base-types>{baseResources.map(kind=><li key={kind}><a className="text-ui color-red" data-color="0" href={url(entry.url,kind)} target="_top" onClick={event=>link(url(entry.url,kind),event)}>{baseNames[kind]}<RepairArrow/></a></li>)}</ul></div>;
 return <div ref={root} data-dorma-live-workspace data-dorma-admin-base data-dorma-base-resource={selected?resource:undefined} aria-busy={listing&&!result&&!error}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {navigation?<div className="docs-info-content"><h6 className="links-list-heading">本页功能</h6><ul className="links-list links-list-boxed" data-dorma-base-navigation>{adminPages.filter(page=>page.parent===entry.id).map(page=><li key={page.id}><a className="text-ui color-red" data-color="0" href={page.url} target="_top" onClick={event=>link(page.url,event)}>{page.label}<RepairArrow/></a></li>)}</ul></div>:selectionPage?resourceLinks:<>
   {form&&(create||detail)?<BaseEditor resource={resource} row={editing?detail:null} data={data} action={action} onDisabled={setDisabled} onSaved={id=>navigate(url(recordsUrl,resource,editing?page:1,id))}/>:transfer?<BaseTransfer resource={resource} importing={entry.action==='action-2'} data={data} action={action} onDisabled={setDisabled}/>:listing&&result&&(record===null?<div className="docs-info-content"><h6 className="links-list-heading">{baseNames[resource]}记录</h6><ul className="links-list links-list-boxed" data-dorma-base-list>{rows.map(row=>{const id=String(row[baseIds[resource]]),target=url(recordsUrl,resource,page,id),summary=resource==='students'?['student_number','full_name','account_status']:resource==='buildings'?['building_id','building_name']:resource==='rooms'?['room_id','building_id','room_status']:['bed_id','room_id','bed_status'];return <li key={id}><a className="text-ui color-red" data-color="0" href={target} target="_top" onClick={event=>link(target,event)}>{summary.map(key=>display(row[key])).join(' / ')}<RepairArrow/></a></li>;})}</ul>{!rows.length&&<StudentEmptyState/>}<DocsPagination page={page} total={total} pageUrl={next=>url(recordsUrl,resource,next)} navigate={navigate}/></div>:detail&&<>
    <div className="docs-info-content formatted-text"><Values row={detail} resource={resource}/></div>
    {deleting?<BaseDelete resource={resource} row={detail} data={data} action={action} onDisabled={setDisabled} onSaved={()=>navigate(listUrl)}/>:resource!=='students'&&<div className="docs-info-content"><ul className="links-list links-list-boxed"><li><a className="text-ui color-red" data-color="0" href={deleteUrl} target="_top" onClick={event=>link(deleteUrl,event)}>删除{baseNames[resource]}<RepairArrow/></a></li></ul></div>}
   </>)}
  </>}
 </div>;
}

type MutationProps={resource:BaseResource;data:StudentRecordData;action:RefObject<()=>Promise<void>>;onDisabled:(disabled:boolean)=>void};
function BaseEditor({resource,row,data,action,onDisabled,onSaved}:MutationProps&{row:StudentRow|null;onSaved:(id:string)=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),[values,setValues]=useState<Record<string,string>>(()=>({...Object.fromEntries(Object.entries(row??{}).map(([key,value])=>[key,String(value??'')])),account_status:String(row?.account_status??'active'),gender_restriction:String(row?.gender_restriction??'any'),room_status:String(row?.room_status??'available'),bed_status:String(row?.bed_status??'available'),password:''})),[active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[options,setOptions]=useState<Record<string,StudentRow[]>>({}),[ready,setReady]=useState(resource==='students'),[error,setError]=useState('');
 useEffect(()=>{if(resource==='students')return;let current=true;const kind=resource==='buildings'?'accounts':resource==='rooms'?'buildings':'rooms';void (async()=>{const rows:StudentRow[]=[];for(let page=1;;page++){const result=await data.load(kind+'?'+new URLSearchParams({page:String(page),limit:'100'}));if(!Array.isArray(result.data))throw new Error('候选资料读取失败，请重试。');rows.push(...result.data);if(rows.length>=(result.meta?.total??rows.length))break;}if(current){setOptions({[kind]:rows});setReady(true);}})().catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'候选资料读取失败，请重试。');});return()=>{current=false;};},[data,resource]);
 const fields=baseFields(resource,Boolean(row),options);
 async function submit(){
  if(saving.current||active||!ready)return;
  for(const field of fields){const value=values[field.key]??'',message=field.required&&!value?'请填写并确认'+field.label+'。':field.maxLength&&value.length>field.maxLength?field.label+'不能超过'+field.maxLength+'个字符。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择有效的'+field.label+'。':field.validate?.(value);if(message){setError(message);return;}}
  saving.current=true;setPending(true);setError('');
  const body=Object.fromEntries(fields.filter(field=>field.key!=='password'||values.password).map(field=>[field.key,field.type==='number'?Number(values[field.key]):values[field.key]||null]));
  try{const result=await api<StudentRow>(resource+(row?'/'+encodeURIComponent(String(row[baseIds[resource]])):''),{method:row?'PATCH':'POST',body:JSON.stringify(body)});data.invalidate();if(root.current)onSaved(String(result.data[baseIds[resource]]));}catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'数据保存失败，请重试。');}finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{action.current=submit;});useLayoutEffect(()=>onDisabled(pending||Boolean(active)||!ready),[pending,active,ready,onDisabled]);
 return <div ref={root} data-dorma-application-editor data-dorma-base-editor aria-busy={pending}>
  {row&&<div className="docs-info-content formatted-text"><h3>{baseDetails[resource][0][1]}</h3><pre data-dorma-base-values><code className="hljs language-plaintext">{String(row[baseIds[resource]])}</code></pre></div>}
  {resource==='students'&&<div className="docs-info-content formatted-text"><div className="notice info"><p>{row?'学生身份通过停用账号保留历史；重置密码留空时保留原密码。':'新增学生将同时建立登录账号，初始密码至少需要8个字符。'}</p></div></div>}
  <RepairEditorFields color={0} fields={fields} values={values} active={active} pending={pending||!ready} onActive={key=>{setActive(key);setError('');}} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
function BaseDelete({resource,row,data,action,onDisabled,onSaved}:MutationProps&{row:StudentRow;onSaved:()=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),[error,setError]=useState('');
 useLayoutEffect(()=>onDisabled(false),[onDisabled]);
 useLayoutEffect(()=>{action.current=async()=>{if(saving.current)return;saving.current=true;onDisabled(true);setError('');try{await api(resource+'/'+encodeURIComponent(String(row[baseIds[resource]])),{method:'DELETE'});data.invalidate();if(root.current)onSaved();}catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'删除失败，请重试。');}finally{saving.current=false;if(root.current)onDisabled(false);}};},[resource,row,data,action,onDisabled,onSaved]);
 return <div ref={root}>{error&&<StudentWarning>{error}</StudentWarning>}<StudentWarning>删除后无法撤销。请核对{baseNames[resource]}编号，已被业务引用的数据请通过状态停用。</StudentWarning></div>;
}
function BaseTransfer({resource,importing,data,action,onDisabled}:MutationProps&{importing:boolean}){
 const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),saving=useRef(false),[file,setFile]=useState<File|null>(null),[error,setError]=useState(''),[success,setSuccess]=useState(''),[pending,setPending]=useState(false);
 async function download(template=false){
  if(saving.current)return;saving.current=true;setPending(true);setError('');setSuccess('');
  try{const response=await fetch('/api/v1/export/'+resource+(template?'/template':''),{credentials:'same-origin',cache:'no-store'});if(!response.ok){if(response.status===401)saveAuthSession(null);const result=await response.json();throw new Error(result.error?.message??'下载失败，请重试。');}const blob=await response.blob(),doc=root.current!.ownerDocument,object=URL.createObjectURL(blob),anchor=doc.createElement('a');anchor.href=object;anchor.download=resource+(template?'-template':'')+'.csv';doc.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(object),1000);setSuccess(template?'模板已下载，请按列名填写后选择 CSV 文件。':'CSV 已导出。');}catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'下载失败，请重试。');}finally{saving.current=false;setPending(false);}
 }
 async function submit(){
  if(!importing){await download();return;}if(saving.current)return;
  if(!file){setError('请选择 CSV 文件。');return;}if(file.size===0||file.size>5*1024*1024){setError('请选择不超过5 MB的非空 CSV 文件。');return;}
  saving.current=true;setPending(true);setError('');setSuccess('');
  try{const text=await file.text();if(new TextEncoder().encode(text).length>5*1024*1024)throw new Error('CSV 文件不能超过5 MB。');const result=await api<{imported:number}>('import/'+resource,{method:'POST',headers:{'Content-Type':'text/csv; charset=utf-8'},body:text});data.invalidate();setSuccess('已成功导入 '+result.data.imported+' 条'+baseNames[resource]+'数据。');setFile(null);if(input.current)input.current.value='';}catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'导入失败，请重试。');}finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{action.current=submit;});useLayoutEffect(()=>onDisabled(pending),[pending,onDisabled]);
 return <div ref={root} data-dorma-base-transfer aria-busy={pending}>
  <div className="docs-info-content formatted-text"><div className="notice info"><p>{importing?'请先下载对应数据模板，保留列名并保存为 UTF-8 CSV。单次支持1至10000条记录，文件不超过5 MB；任一记录无效时整批撤销。':'导出所选类型的全部可访问记录，文件使用 UTF-8 CSV 格式，不包含密码。'}</p></div></div>
  {importing&&<><div className="docs-info-content"><ul className="links-list links-list-boxed"><li><a href={'/api/v1/export/'+resource+'/template'} className="text-ui color-red" data-color="0" role="button" aria-disabled={pending} onClick={event=>{event.preventDefault();event.stopPropagation();void download(true);}}>下载{baseNames[resource]}导入模板<RepairArrow/></a></li></ul></div>
   <section className="code-preview" data-color="0"><div className="code-preview-content"><header><div className="code-preview-title"><h2 className="text-ui">CSV 文件</h2></div><nav><button type="button" className="code-preview-button text-ui" disabled={pending} onClick={()=>input.current?.click()}>选择文件</button></nav></header><div className="code-editor"><pre className="is-active"><code className="hljs language-plaintext">{file?file.name+' / '+file.size+' 字节':'尚未选择文件'}</code></pre></div></div></section><input ref={input} type="file" hidden accept=".csv,text/csv" aria-label="CSV 文件" disabled={pending} onChange={event=>{setFile(event.target.files?.[0]??null);setError('');setSuccess('');}}/>
  </>}
  {error&&<StudentWarning>{error}</StudentWarning>}
  {success&&<div className="docs-info-content formatted-text"><div className="notice info" role="status"><p>{success}</p></div></div>}
 </div>;
}
