'use client';
import {formatDateTime,formatBusinessValue,formatDateTimeInput} from '@/utils/display-format';

import {DocsPagination} from './DocsPagination';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type MouseEvent,type RefObject} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import type {StudentRow} from '@/utils/student-record-data';
import type {StudentFinanceData} from '@/utils/student-finance-data';
import {valueLabels} from '@/data/workspace-actions';
import {api} from '@/utils/auth-session';
import {RepairArrow,RepairEditorFields,type RepairField} from './StudentRepairElements';
import {StudentEmptyState} from './StudentEmptyState';
import {StudentWarning} from './StudentWarning';

const dateTime={format:formatDateTime};
function date(value:unknown){const parsed=new Date(String(value??''));return Number.isNaN(parsed.getTime())?'—':dateTime.format(parsed);}
const theme='green';
export const adminBillingListPath=(entry:AdminPage,page=1)=>(entry.action==='action-3'?'payments':'bills')+'?'+new URLSearchParams({page:String(page),limit:'20'});
function display(key:string,value:unknown){
 const formatted=formatBusinessValue(key,value);if(formatted!==undefined)return formatted;if(value===null||value===undefined||value==='')return '—';return key.endsWith('_at')?date(value):valueLabels[String(value)]??String(value);}
const billFields=[['bill_id','账单编号'],['student_number','学号'],['full_name','姓名'],['billing_period','账期'],['accommodation_fee','住宿费'],['utility_fee','水电费'],['total_amount','总金额'],['paid_amount','已缴金额'],['outstanding_amount','待缴金额'],['bill_status','账单状态'],['due_date','缴费截止日期'],['generated_at','生成时间'],['checked_at','核对时间']] as const;
const paymentFields=[['payment_id','缴费编号'],['bill_id','账单编号'],['student_number','学号'],['full_name','姓名'],['amount','金额'],['paid_at','缴费时间'],['payment_method','缴费方式']] as const;
function FinanceValues({row,payments=false,editing=false}:{row:StudentRow;payments?:boolean;editing?:boolean}){const fields=payments?paymentFields:editing?billFields.filter(([key])=>['student_number','full_name','billing_period','paid_amount','bill_status',...(Number(row.paid_amount)>0?['accommodation_fee','utility_fee']:[])].includes(key)):billFields;return <div data-dorma-finance-values>{fields.map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(key,row[key])}</code></pre></Fragment>)}</div>;}

export function AdminBillingPage({entry,data}:{entry:AdminPage;data:StudentFinanceData}){
 const root=useRef<HTMLDivElement>(null),params=useSearchParams(),router=useRouter(),record=['generate','create'].includes(entry.kind??'')?null:params.get('record'),mode=params.get('mode'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>{
  const target=adminPages.find(page=>page.url===url.split('?')[0]);
  if(target&&target.id!==entry.id){root.current?.ownerDocument.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${target.id}"]`)?.click();return;}
  router.push(url,{scroll:false});
 },[router,entry.id]);
 return <div ref={root}>{adminPages.some(page=>page.parent===entry.id)?<BillingNavigation entry={entry}/>:<BillingContent key={[entry.id,record,mode,page].join(':')} entry={entry} data={data} record={record} mode={mode} page={page} navigate={navigate}/>}</div>;
}

function BillingNavigation({entry}:{entry:AdminPage}){
 const root=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
  const content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  // Keep navigation outside prose styling on both initial loads and Docs page switches.
  content.after(business);
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:'page'}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[]);
 return <div ref={root} className="docs-info-content" data-dorma-live-workspace><h6 className="links-list-heading">本页功能</h6><ul className="links-list links-list-boxed" data-dorma-admin-billing-navigation>{adminPages.filter(page=>page.parent===entry.id).map(page=><li key={page.id}><a className={'text-ui color-'+theme} data-color={page.color} data-id={page.id} href={page.url} title={page.label}>{page.label}<RepairArrow/></a></li>)}</ul></div>;
}

function BillingContent({entry,data,record,mode,page,navigate}:{entry:AdminPage;data:StudentFinanceData;record:string|null;mode:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),submitAction=useRef<()=>Promise<void>>(async()=>{}),submitLink=useRef<HTMLAnchorElement|null>(null);
 const parent=entry.parent?adminPages.find(page=>page.id===entry.parent)!:entry,records=entry.kind==='records'?entry:adminPages.find(page=>page.parent===parent.id&&page.kind==='records')??entry,submission=adminPages.find(page=>page.parent===parent.id&&['generate','create'].includes(page.kind??''));
 const payments=entry.action==='action-3',generating=entry.kind==='generate',publish=['generate','create'].includes(entry.kind??''),editing=mode==='edit'&&record!==null&&!payments&&parent.action==='action-2',form=publish||editing;
 const listUrl=records.url+(page>1?'?page='+page:''),publishUrl=submission?.url??entry.url;
 const detailUrl=listUrl+(page>1?'&':'?')+'record='+encodeURIComponent(record??''),editUrl=detailUrl+'&mode=edit';
 const resource=payments?'payments':'bills',identifier=payments?'payment_id':'bill_id',path=record===null?adminBillingListPath(entry,page):resource+'/'+record;
 const [result,setResult]=useState(()=>data.peek(path)),[loading,setLoading]=useState(!publish),[error,setError]=useState(''),[disabled,setDisabled]=useState(form);
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const canEdit=!payments&&parent.action==='action-2';
 const title=publish?(generating?'生成月账单':'新增账单'):editing?'维护账单':record!==null?(payments?'缴费流水详情':'账单详情'):entry.label;
 useEffect(()=>{
  if(publish)return;
  const state=request.current;
  const load=async()=>{
   const version=++state.version;setLoading(true);setError('');
   try{
    if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
    const next=await data.load(path);if(state.version===version)setResult(next);
   }catch(reason){if(state.version===version){setResult(undefined);setError(reason instanceof Error?reason.message:'账单读取失败，请重试。');}}
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
  if(form)description.textContent=generating?'确认账期后，为当前在住学生生成月账单。':'逐项确认费用及截止日期，完成后提交。';
  doc.querySelector('title')!.textContent=title+' | 管理员工作台 | FLight';
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};heading.addEventListener('click',stay);
  const crumbs=breadcrumb.cloneNode(true) as HTMLElement,handlers:Array<()=>void>=[];
  const route=(anchor:HTMLAnchorElement,target:string)=>{
   const click=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(target);};
   anchor.addEventListener('click',click);handlers.push(()=>anchor.removeEventListener('click',click));
  };
  function crumb(label:string,target:string){const arrow=doc.createElement('span'),back=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';back.textContent=label;back.title=label;back.href=target;route(back,target);crumbs.querySelector('p')!.append(' ',arrow,' ',back);}
  if(record!==null)crumb(entry.label,listUrl);
  if(editing&&detail)crumb('账单详情',detailUrl);
  breadcrumb.replaceWith(crumbs);
  const oldPrevious=info.querySelector('.prev-link')!,oldNext=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1],savedNext=nextHeading.textContent;
  const previous=oldPrevious.cloneNode(true) as HTMLElement,next=doc.createElement('li');next.className='next-link';
  if(form||record!==null){const back=previous.querySelector('a')!;back.removeAttribute('data-id');back.className='text-ui color-'+theme;back.dataset.color=String(entry.color);back.href=editing?detailUrl:publish?parent.url:listUrl;back.title=editing?'账单详情':publish?parent.label:entry.label;for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(editing?'账单详情':publish?parent.label:entry.label);route(back,back.getAttribute('href')!);}
  const label=form?(generating?'生成账单':publish?'新增账单':'保存修改'):record!==null?'维护账单':submission?.label??'';
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
 },[entry.color,entry.label,title,listUrl,publishUrl,detailUrl,editUrl,publish,editing,form,record,detail,navigate,parent.label,parent.url,generating,canEdit,submission]);
 useLayoutEffect(()=>{submitLink.current?.setAttribute('aria-disabled',String(disabled));submitLink.current?.setAttribute('aria-busy',String(disabled));},[disabled,title,detail]);
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 return <div ref={root} className={record===null&&!publish?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-admin-billing aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {publish||editing&&detail?<BillingEditor entry={entry} row={editing?detail:null} data={data} submitAction={submitAction} onDisabled={setDisabled} onSaved={id=>navigate(publish?records.url:listUrl+(page>1?'&':'?')+'record='+id)}/>:result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-admin-billing-list>{rows.map(row=>{const url=listUrl+(page>1?'&':'?')+'record='+row[identifier];return <li key={String(row[identifier])}><a className={'text-ui color-'+theme} data-color={entry.color} href={url} target="_top" onClick={event=>link(url,event)}>{(payments?['full_name','amount','paid_at']:['full_name','billing_period','total_amount','bill_status']).map(key=>display(key,row[key])).join(' · ')}<RepairArrow/></a></li>;})}</ul>
   {!rows.length&&<StudentEmptyState/>}
   <DocsPagination page={page} total={total} pageUrl={next=>records.url+(next>1?'?page='+next:'')} navigate={navigate}/>
  </>:!editing&&detail&&<FinanceValues row={detail} payments={payments}/>)}
 </div>;

}

function BillingEditor({entry,row,data,submitAction,onDisabled,onSaved}:{entry:AdminPage;row:StudentRow|null;data:StudentFinanceData;submitAction:RefObject<()=>Promise<void>>;onDisabled:(disabled:boolean)=>void;onSaved:(id:string)=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),generating=entry.kind==='generate',creating=entry.kind==='create',paid=Boolean(row&&Number(row.paid_amount)>0);
 const today=new Date(),due=new Date(today.getTime()+14*86400000);
 const [values,setValues]=useState<Record<string,string>>(()=>({studentNumber:String(row?.student_number??''),period:String(row?.billing_period??formatDateTimeInput(today).slice(0,7)),accommodationFee:String(row?.accommodation_fee??'800.00'),utilityFee:String(row?.utility_fee??'128.60'),dueDate:String(row?.due_date??formatDateTimeInput(due).slice(0,10))}));
 const [active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[students,setStudents]=useState<StudentRow[]>([]),[ready,setReady]=useState(!creating);
 useEffect(()=>{if(!creating)return;let current=true;void(async()=>{const rows:StudentRow[]=[];let page=1;while(true){const next=await data.load('students?'+new URLSearchParams({page:String(page),limit:'100'}));if(!Array.isArray(next.data))throw new Error('学生资料读取失败，请重试。');rows.push(...next.data);if(rows.length>=(next.meta?.total??rows.length))break;page++;}if(current){setStudents(rows);setReady(true);}})().catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'学生资料读取失败，请重试。');});return()=>{current=false;};},[data,creating]);
 const money=(value:string)=>!/^\d{1,10}(\.\d{1,2})?$/.test(value)?'金额须为非负数，最多10位整数和2位小数。':undefined;
 const period:RepairField={key:'period',label:'账期',type:'month',required:true,validate:value=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)?'请选择有效的账期。':undefined};
 const fields:RepairField[]=generating?[period]:[
  ...(creating?[{key:'studentNumber',label:'学生',type:'select' as const,required:true,options:students.map(student=>[String(student.student_number),String(student.student_number)+' · '+String(student.full_name)] as const)},period]:[]),
  ...(!paid?[{key:'accommodationFee',label:'住宿费',type:'text' as const,required:true,maxLength:13,validate:money},{key:'utilityFee',label:'水电费',type:'text' as const,required:true,maxLength:13,validate:money}]:[]),
  {key:'dueDate',label:'缴费截止日期',type:'date',required:true,validate:value=>!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(new Date(value).getTime())||new Date(value).toISOString().slice(0,10)!==value?'请选择有效的缴费截止日期。':undefined},
 ];
 async function submit(){
  if(saving.current||active||!ready)return;
  for(const field of fields){const value=values[field.key]??'',message=field.required&&!value?'请填写并确认'+field.label+'。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择有效的'+field.label+'。':field.validate?.(value);if(message){setError(message);return;}}
  saving.current=true;setPending(true);setError('');
  try{
   if(row){const latest=await data.load('bills/'+row.bill_id,true);if(Array.isArray(latest.data))throw new Error('账单不存在或不可访问。');if(Number(latest.data.paid_amount)>0&&(Number(latest.data.accommodation_fee)!==Number(values.accommodationFee)||Number(latest.data.utility_fee)!==Number(values.utilityFee)))throw new Error('账单已发生缴费，不能修改费用，请返回详情后重新编辑。');}
   const body=generating?{period:values.period}:{...(creating?{studentNumber:values.studentNumber,period:values.period}:{}),accommodationFee:values.accommodationFee,utilityFee:values.utilityFee,dueDate:values.dueDate};
   const result=await api<{billId?:string}>(generating?'bills/generate':row?'bills/'+row.bill_id:'bills',{method:row?'PATCH':'POST',body:JSON.stringify(body)});
   data.invalidate();if(root.current)onSaved(String(result.data.billId??''));
  }catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 useEffect(()=>{onDisabled(pending||Boolean(active)||!ready);},[onDisabled,pending,active,ready]);
 return <div ref={root} data-dorma-application-editor data-dorma-admin-billing-editor aria-busy={pending}>
  {row&&<div className="docs-info-content formatted-text"><FinanceValues row={row} editing/></div>}
  <RepairEditorFields color={entry.color} fields={fields} values={values} active={active} pending={pending} onActive={key=>{setActive(key);setError('');}} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
