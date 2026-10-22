'use client';

import {DocsPagination} from './DocsPagination';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type RefObject} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import type {StudentRow} from '@/utils/student-record-data';
import type {StudentRecordData} from '@/utils/student-record-data';
import {valueLabels} from '@/data/workspace-actions';
import {useAuth} from '@/components/auth/AuthProvider';
import {api} from '@/utils/auth-session';
import {RepairArrow,RepairEditorFields,type RepairField} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function date(value:unknown){const parsed=new Date(String(value??''));return Number.isNaN(parsed.getTime())?'—':dateTime.format(parsed);}
const theme='citrus';
function permissionResource(entry:AdminPage){return entry.action.startsWith('action-1')?'accounts':entry.kind?.startsWith('authorization')?'authorizations':entry.action.startsWith('action-2')?'permissions':'audit';}
export const adminPermissionListPath=(entry:AdminPage,page=1)=>permissionResource(entry)+'?'+new URLSearchParams({page:String(page),limit:'20'});
const resourceLabels:Record<string,string>={profile:'个人资料',resources:'基础数据',applications:'入住申请',changes:'住宿变更',occupancies:'住宿记录',bills:'账单',payments:'缴费流水',repairs:'报修',maintenance:'维修记录',announcements:'公告',notifications:'消息通知',statistics:'统计',accounts:'用户账号',permissions:'角色权限',settings:'业务规则',audit:'审计记录',backups:'备份恢复'};
const operationLabels:Record<string,string>={read:'查询',write:'写入',review:'审核',dispatch:'派工'};
function display(key:string,value:unknown){if(value===null||value===undefined||value==='')return '—';if(typeof value==='object')return JSON.stringify(value,null,2);if(key==='role')return ({student:'学生',dorm_manager:'宿管人员',dormManager:'宿管人员',maintenance:'维修人员',admin:'系统管理员'} as Record<string,string>)[String(value)]??String(value);if(key==='resource'||key==='entity_type')return resourceLabels[String(value)]??String(value);if(key==='operation')return operationLabels[String(value)]??String(value);return key.endsWith('_at')?date(value):valueLabels[String(value)]??String(value);}
const accountFields=[['account_id','账号编号'],['username','用户名'],['full_name','姓名'],['role','角色'],['student_number','学号'],['account_status','账号状态'],['email','邮箱']] as const;
const permissionFields=[['role','角色'],['resource','资源'],['operation','操作'],['data_scope','数据范围']] as const;
const authorizationFields=[['account_id','宿管账号编号'],['building_id','楼栋编号']] as const;
const auditFields=[['audit_id','审计编号'],['actor_account_id','操作账号'],['operation','操作'],['entity_type','业务对象'],['entity_id','记录编号'],['result','结果'],['occurred_at','操作时间'],['details','详细信息']] as const;
function recordKey(resource:string,row:StudentRow){return resource==='permissions'?JSON.stringify([row.role,row.resource,row.operation]):resource==='authorizations'?JSON.stringify([row.account_id,row.building_id]):String(row[resource==='accounts'?'account_id':'audit_id']);}
function recordPath(resource:string,record:string){
 if(['accounts','audit'].includes(resource)){if(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807'))throw new Error('记录不存在或不可访问。');return resource+'/'+record;}
 let keys:unknown;try{keys=JSON.parse(record);}catch{throw new Error('记录不存在或不可访问。');}
 const names=resource==='permissions'?['role','resource','operation']:['account_id','building_id'];
 if(!Array.isArray(keys)||keys.length!==names.length||!keys.every(value=>typeof value==='string'&&value.length>0&&value.length<=100))throw new Error('记录不存在或不可访问。');
 if(resource==='authorizations')recordPath('accounts',String(keys[0]));
 return resource+'?'+new URLSearchParams({...Object.fromEntries(names.map((name,index)=>[name,(keys as string[])[index]])),limit:'1'});
}
function PermissionValues({row,resource}:{row:StudentRow;resource:string}){return <div data-dorma-permission-values>{(resource==='accounts'?accountFields:resource==='permissions'?permissionFields:resource==='authorizations'?authorizationFields:auditFields).map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(key,row[key])}</code></pre></Fragment>)}</div>;}

export function AdminPermissionPage({entry,data}:{entry:AdminPage;data:StudentRecordData}){
 const root=useRef<HTMLDivElement>(null),params=useSearchParams(),router=useRouter(),record=entry.kind?.endsWith('create')?null:params.get('record'),mode=params.get('mode'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>{
  const target=adminPages.find(page=>page.url===url.split('?')[0]);
  if(target&&target.id!==entry.id){root.current?.ownerDocument.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${target.id}"]`)?.click();return;}
  router.push(url,{scroll:false});
 },[router,entry.id]);
 return <div ref={root}>{adminPages.some(page=>page.parent===entry.id)?<PermissionNavigation entry={entry}/>:<PermissionContent key={[entry.id,record,mode,page].join(':')} entry={entry} data={data} record={record} mode={mode} page={page} navigate={navigate}/>}</div>;
}

function PermissionNavigation({entry}:{entry:AdminPage}){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
  const content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  // Keep navigation outside prose styling on both initial loads and Docs page switches.
  content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:'page'}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[]);
 return <div ref={root} className="docs-info-content" data-dorma-live-workspace><h6 className="links-list-heading">本页功能</h6><ul className="links-list links-list-boxed" data-dorma-admin-permission-navigation>{adminPages.filter(page=>page.parent===entry.id).map(page=><li key={page.id}><a className={'text-ui color-'+theme} data-color={page.color} data-id={page.id} href={page.url} title={page.label}>{page.label}<RepairArrow/></a></li>)}</ul></div>;
}

function PermissionContent({entry,data,record,mode,page,navigate}:{entry:AdminPage;data:StudentRecordData;record:string|null;mode:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),submitAction=useRef<()=>Promise<void>>(async()=>{}),submitLink=useRef<HTMLAnchorElement|null>(null);
 const parent=entry.parent?adminPages.find(page=>page.id===entry.parent)!:entry,records=entry.kind?.endsWith('records')?entry:adminPages.find(page=>page.parent===parent.id&&page.kind===(permissionResource(entry)==='authorizations'?'authorization-records':'records'))??entry,submission=adminPages.find(page=>page.parent===parent.id&&(permissionResource(entry)==='authorizations'?page.kind==='authorization-create':page.kind==='account-create'||page.kind==='permission-create'));
 const publish=Boolean(entry.kind?.endsWith('create')),editing=mode==='edit'&&record!==null&&entry.action!=='action-3',form=publish||editing;
 const listUrl=records.url+(page>1?'?page='+page:''),publishUrl=submission?.url??entry.url;
 const detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),editUrl=detailUrl+'&mode=edit';
 const resource=permissionResource(entry);let path=adminPermissionListPath(entry,page),invalid='';if(record!==null)try{path=recordPath(resource,record);}catch(reason){invalid=(reason as Error).message;}
 const [result,setResult]=useState(()=>invalid?undefined:data.peek(path)),[loading,setLoading]=useState(!publish),[error,setError]=useState(''),[disabled,setDisabled]=useState(form);
 const rows=Array.isArray(result?.data)?result.data:[],detail=record!==null&&rows.length?rows[0]:result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const canEdit=resource!=='audit';
 const detailTitle=resource==='accounts'?'账号详情':resource==='permissions'?'权限详情':resource==='authorizations'?'授权详情':'审计详情';
 const title=publish?entry.label:editing?(resource==='accounts'?'维护账号':resource==='permissions'?'配置角色权限':'维护楼栋授权'):record!==null?detailTitle:entry.label;
 useEffect(()=>{
  if(publish)return;
  const state=request.current;
  const load=async()=>{
   const version=++state.version;setLoading(true);setError('');
   try{
    if(invalid)throw new Error(invalid);
    const next=await data.load(path);if(record!==null&&Array.isArray(next.data)&&!next.data.length)throw new Error('记录不存在或不可访问。');if(state.version===version)setResult(next);
   }catch(reason){if(state.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'权限管理记录读取失败，请重试。');}}
   finally{if(state.version===version)setLoading(false);}
  };
  void load();const refresh=()=>{if(!editing&&root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);
  return()=>{state.version++;window.removeEventListener('focus',refresh);};
 },[data,path,publish,record,editing,invalid]);
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
  if(form)description.textContent='逐项填写并确认信息，完成后使用下方按钮提交。';
  doc.querySelector('title')!.textContent=title+' | 管理员工作台 | FLight';
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,handlers:Array<()=>void>=[];
  const route=(anchor:HTMLAnchorElement,target:string)=>{
   const click=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(target);};
   anchor.addEventListener('click',click);handlers.push(()=>anchor.removeEventListener('click',click));
  };
  function crumb(label:string,target:string){const arrow=doc.createElement('span'),back=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';back.textContent=label;back.title=label;back.href=target;route(back,target);crumbs.querySelector('p')!.append(' ',arrow,' ',back);}
  if(record!==null)crumb(entry.label,listUrl);
  if(editing&&detail)crumb(detailTitle,detailUrl);
  breadcrumb.replaceWith(crumbs);
  const oldPrevious=info.querySelector('.prev-link')!,oldNext=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],savedNext=nextHeading.textContent;
  const previous=oldPrevious.cloneNode(true) as HTMLElement,next=doc.createElement('li');next.className='next-link';
  if(form||record!==null){const back=previous.querySelector('a')!;back.removeAttribute('data-id');back.className='text-ui color-'+theme;back.dataset.color=String(entry.color);back.href=editing?detailUrl:publish?parent.url:listUrl;back.title=editing?detailTitle:publish?parent.label:entry.label;for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(editing?detailTitle:publish?parent.label:entry.label);route(back,back.getAttribute('href')!);}
  const label=form?(resource==='accounts'?(publish?'新增账号':'保存修改'):resource==='permissions'?'提交权限设置':'提交授权设置'):record!==null?(resource==='accounts'?'维护账号':resource==='permissions'?'配置权限':'维护授权'):submission?.label??'';
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
 },[entry.color,entry.label,title,listUrl,publishUrl,detailUrl,editUrl,publish,editing,form,record,detail,navigate,parent.label,parent.url,resource,detailTitle,canEdit,submission]);
 useLayoutEffect(()=>{submitLink.current?.setAttribute('aria-disabled',String(disabled));submitLink.current?.setAttribute('aria-busy',String(disabled));},[disabled,title,detail]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 return <div ref={root} className={record===null&&!publish?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-admin-permission aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {publish||editing&&detail?<PermissionEditor entry={entry} row={editing?detail:null} data={data} resource={resource} submitAction={submitAction} onDisabled={setDisabled} onSaved={id=>navigate(publish?(resource==='authorizations'?adminPages.find(page=>page.parent===parent.id&&page.kind==='authorization-records')!.url:records.url):id===null?listUrl:listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(id))}/>:result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-admin-permission-list>{rows.map(row=>{const key=recordKey(resource,row),url=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(key);return <li key={key}><a className={'text-ui color-'+theme} data-color={entry.color} href={url} target="_top" onClick={event=>link(url,event)}>{(resource==='accounts'?['username','full_name','role','account_status']:resource==='permissions'?['role','resource','operation','data_scope']:resource==='authorizations'?['account_id','building_id']:['operation','entity_type','result','occurred_at']).map(key=>display(key,row[key])).join(' · ')}<RepairArrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}
   <DocsPagination page={page} total={total} pageUrl={next=>records.url+(next>1?'?page='+next:'')} navigate={navigate}/>
  </>:!editing&&detail&&<PermissionValues row={detail} resource={resource}/>)}
 </div>;

}

const allowedResources:Record<string,string[]>={student:['profile','resources','applications','changes','occupancies','bills','payments','repairs','announcements','notifications','statistics'],dorm_manager:['profile','resources','applications','changes','occupancies','bills','repairs','announcements','notifications','statistics'],maintenance:['profile','repairs','maintenance','announcements','notifications','statistics'],admin:['profile','resources','applications','changes','occupancies','bills','payments','repairs','maintenance','announcements','notifications','statistics','accounts','permissions','settings','audit','backups']};
function PermissionEditor({entry,row,data,resource,submitAction,onDisabled,onSaved}:{entry:AdminPage;row:StudentRow|null;data:StudentRecordData;resource:string;submitAction:RefObject<()=>Promise<void>>;onDisabled:(disabled:boolean)=>void;onSaved:(id:string|null)=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),{account,refresh}=useAuth(),accounts=resource==='accounts',permissions=resource==='permissions';
 const [values,setValues]=useState<Record<string,string>>(()=>({username:String(row?.username??''),fullName:String(row?.full_name??''),role:String(row?.role??(accounts?'maintenance':'student')).replace('dorm_manager',accounts?'dormManager':'dorm_manager'),accountStatus:String(row?.account_status??'active'),password:'',resource:String(row?.resource??'profile'),operation:String(row?.operation??'read'),enabled:'true',accountId:String(row?.account_id??''),buildingId:String(row?.building_id??''),authorizationOperation:row?'revoke':'grant'}));
 const [active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[managers,setManagers]=useState<StudentRow[]>([]),[buildings,setBuildings]=useState<StudentRow[]>([]),[ready,setReady]=useState(accounts||permissions||Boolean(row));
 useEffect(()=>{if(accounts||permissions||row)return;let current=true;async function all(resource:string){const rows:StudentRow[]=[];let page=1;while(true){const next=await data.load(resource+'?'+new URLSearchParams({page:String(page),limit:'100'}));if(!Array.isArray(next.data))throw new Error('授权候选资料读取失败，请重试。');rows.push(...next.data);if(rows.length>=(next.meta?.total??rows.length))return rows;page++;}}
  void Promise.all([all('accounts'),all('buildings')]).then(([accounts,buildings])=>{if(current){setManagers(accounts.filter(row=>row.role==='dorm_manager'));setBuildings(buildings);setReady(true);}}).catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'候选资料读取失败，请重试。');});return()=>{current=false;};
 },[accounts,permissions,row,data]);
 const fields:RepairField[]=accounts?[
  ...(!row?[{key:'username',label:'用户名',type:'text' as const,required:true,maxLength:64}]:[]),
  {key:'fullName',label:'姓名',type:'text',required:true,maxLength:100},
  ...(row?.role==='student'?[]:[{key:'role',label:'角色',type:'select' as const,required:true,options:[['dormManager','宿管人员'],['maintenance','维修人员'],['admin','系统管理员']] as const}]),
  {key:'accountStatus',label:'账号状态',type:'select',required:true,options:[['active','启用'],['disabled','停用'],...(row?[['locked','锁定'] as const]:[])]},
  {key:'password',label:row?'重置密码':'初始密码',type:'password',required:!row,maxLength:128,validate:value=>value&&value.length<8?'密码至少需要8个字符。':undefined},
 ]:permissions?[
  ...(!row?[
   {key:'role',label:'角色',type:'select' as const,required:true,options:[['student','学生'],['dorm_manager','宿管人员'],['maintenance','维修人员'],['admin','系统管理员']] as const},
   {key:'resource',label:'资源',type:'select' as const,required:true,options:(allowedResources[values.role]??[]).map(id=>[id,resourceLabels[id]] as const)},
   {key:'operation',label:'操作',type:'select' as const,required:true,options:Object.entries(operationLabels)},
  ]:[]),
  {key:'enabled',label:'权限状态',type:'select',required:true,options:[['true','授予'],['false','移除']]},
 ]:[
  ...(!row?[
   {key:'accountId',label:'宿管账号',type:'select' as const,required:true,options:managers.map(manager=>[String(manager.account_id),String(manager.username)+' · '+String(manager.full_name)] as const)},
   {key:'buildingId',label:'楼栋',type:'select' as const,required:true,options:buildings.map(building=>[String(building.building_id),String(building.building_name)] as const)},
  ]:[]),
  {key:'authorizationOperation',label:'授权操作',type:'select',required:true,options:[['grant','授予'],['revoke','撤销']]},
 ];
 async function submit(){
  if(saving.current||active||!ready)return;
  for(const field of fields){const value=values[field.key]??'',message=field.required&&!value?'请填写并确认'+field.label+'。':field.maxLength&&value.length>field.maxLength?field.label+'不能超过'+field.maxLength+'个字符。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择有效的'+field.label+'。':field.validate?.(value);if(message){setError(message);return;}}
  saving.current=true;setPending(true);setError('');
  try{
   const body=accounts?{...(!row?{username:values.username}:{}),fullName:values.fullName,...(row?.role==='student'?{}:{role:values.role}),accountStatus:values.accountStatus,...(values.password?{password:values.password}:{})}:permissions?{role:values.role,resource:values.resource,operation:values.operation,enabled:values.enabled==='true'}:{accountId:values.accountId,buildingId:values.buildingId};
   const result=await api<StudentRow>(accounts?(row?'accounts/'+row.account_id:'accounts'):permissions?'permissions':'authorizations',{method:accounts&&row?'PATCH':!accounts&&!permissions&&values.authorizationOperation==='revoke'?'DELETE':'POST',body:JSON.stringify(body)});
   data.invalidate();if(accounts&&row?.account_id===account?.id)await refresh();
   if(root.current)onSaved(accounts?String(result.data.accountId):permissions&&values.enabled==='false'||!permissions&&!accounts&&values.authorizationOperation==='revoke'?null:recordKey(resource,permissions?{role:values.role,resource:values.resource,operation:values.operation}:{account_id:values.accountId,building_id:values.buildingId}));
  }catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 useEffect(()=>{onDisabled(pending||Boolean(active)||!ready);},[onDisabled,pending,active,ready]);
 return <div ref={root} data-dorma-application-editor data-dorma-admin-permission-editor aria-busy={pending}>
  {row&&<div className="docs-info-content formatted-text">{accounts?<><h3>用户名</h3><pre><code className="hljs language-plaintext">{String(row.username)}</code></pre>{row.role==='student'&&<><h3>学号</h3><pre><code className="hljs language-plaintext">{String(row.student_number)}</code></pre></>}</>:<PermissionValues row={row} resource={resource}/>}</div>}
  {accounts&&!row&&values.role==='maintenance'&&<div className="docs-info-content formatted-text"><div className="notice info"><p>维修人员登录用户名以 <code>mt</code> 开头。</p></div></div>}
  {accounts&&row&&<div className="docs-info-content formatted-text"><div className="notice info"><p>重置密码留空时保留原密码。</p></div></div>}
  <RepairEditorFields color={entry.color} fields={fields} values={values} active={active} pending={pending} onActive={key=>{setActive(key);setError('');}} onChange={(key,value)=>{setValues(current=>({...current,[key]:value,...(permissions&&key==='role'&&!allowedResources[value]?.includes(current.resource)?{resource:allowedResources[value]?.[0]??''}:{})}));setError('');}}/>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
