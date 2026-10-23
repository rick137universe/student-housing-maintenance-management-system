'use client';
import {formatDateTime,formatBusinessValue} from '@/utils/display-format';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {adminPages,type AdminPage} from '@/data/admin-pages';
import type {StudentRecordData,StudentRow} from '@/utils/student-record-data';
import {api} from '@/utils/auth-session';
import {RepairArrow,RepairEditorFields,type RepairField} from './StudentRepairElements';
import {StudentWarning} from './StudentWarning';

export const adminProcessPath='settings?limit=100';
const settingKeys:Record<string,string>={'action-1':'allocation','action-2':'accommodation','action-3':'billing','action-4':'repair'};
const labels:Record<string,string>={automatic:'自动分床',reviewRequired:'住宿申请审核',processingDays:'办理时限（天）',accommodationFee:'每生每月住宿费',utilityFee:'每生每月水电费',dueDays:'缴费期限（天）',autoReview:'自动通过报修初审'};
const defaults:Record<string,StudentRow>={allocation:{automatic:true},accommodation:{reviewRequired:true,processingDays:7},billing:{accommodationFee:'800.00',utilityFee:'128.60',dueDays:14},repair:{autoReview:false}};
function settingValues(key:string,row:StudentRow|undefined){return {...defaults[key],...(row?.setting_value as StudentRow??{})};}
const dateTime={format:formatDateTime};
function date(value:unknown){const parsed=new Date(String(value??''));return Number.isNaN(parsed.getTime())?'—':dateTime.format(parsed);}
function valueText(key:string,value:unknown){
 const formatted=formatBusinessValue(key,value);if(formatted!==undefined)return formatted;return key==='autoReview'?value?'开启（系统自动通过初审，直接进入待派工）':'关闭（由宿管人工初审）':key==='automatic'?value?'启用':'关闭（需手工选床）':key==='reviewRequired'?'必须由授权人员审核':String(value??'—');}

export function AdminProcessPage({entry,data}:{entry:AdminPage;data:StudentRecordData}){
 const router=useRouter(),root=useRef<HTMLDivElement>(null),editing=entry.kind==='process-edit',parent=entry.parent?adminPages.find(page=>page.id===entry.parent)!:entry,child=adminPages.find(page=>page.parent===parent.id)!,key=settingKeys[parent.action];
 const [result,setResult]=useState(()=>data.peek(adminProcessPath)),[error,setError]=useState('');
 const rows=Array.isArray(result?.data)?result.data:[],row=rows.find(row=>row.setting_key===key);
 const navigate=useCallback((url:string)=>{const target=adminPages.find(page=>page.url===url);if(target&&target.id!==entry.id){root.current?.ownerDocument.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${target.id}"]`)?.click();return;}router.push(url,{scroll:false});},[router,entry.id]);
 useEffect(()=>{let current=true;const load=async()=>{try{const next=await data.load(adminProcessPath);if(!Array.isArray(next.data))throw new Error('规则读取失败，请重试。');if(current){setResult(next);setError('');}}catch(reason){if(current){setResult(undefined);setError(reason instanceof Error?reason.message:'规则读取失败，请重试。');}}};void load();const refresh=()=>{if(!editing&&root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);return()=>{current=false;window.removeEventListener('focus',refresh);};},[data,editing]);
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  content.after(business);doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-admin-content-change',{detail:{key:'page'}}));
  return()=>{if(info.isConnected)parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);};
 },[]);
 const values=settingValues(key,row);
 return <div ref={root} data-dorma-live-workspace data-dorma-admin-process aria-busy={!result&&!error}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(editing?<ProcessEditor entry={entry} settingKey={key} row={row} data={data} onSaved={()=>navigate(parent.url)}/>:<>
   <div className="docs-info-content formatted-text">
    {!row?<div className="notice info"><p>尚未配置此流程，请进入配置页面设置。</p></div>:<div data-dorma-process-values>{Object.keys(defaults[key]).map(field=><Fragment key={field}><h3>{labels[field]}</h3><pre><code className="hljs language-plaintext">{valueText(field,values[field])}</code></pre></Fragment>)}<h3>更新人员编号</h3><pre><code className="hljs language-plaintext">{String(row.updated_by??'—')}</code></pre><h3>更新时间</h3><pre><code className="hljs language-plaintext">{date(row.updated_at)}</code></pre></div>}
   </div>
   <div className="docs-info-content"><h6 className="links-list-heading">本页功能</h6><ul className="links-list links-list-boxed" data-dorma-admin-process-navigation><li><a className="text-ui color-corail" data-color={entry.color} data-id={child.id} href={child.url} title={child.label}>{child.label}<RepairArrow/></a></li></ul></div>
  </>)}
 </div>;
}
function ProcessEditor({entry,settingKey,row,data,onSaved}:{entry:AdminPage;settingKey:string;row:StudentRow|undefined;data:StudentRecordData;onSaved:()=>void}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),action=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(settingValues(settingKey,row)).filter(([key])=>key in defaults[settingKey]).map(([key,value])=>[key,String(value)]))),[active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState('');
 const positiveDays=(max:number)=>(value:string)=>!/^\d{1,3}$/.test(value)||Number(value)<1||Number(value)>max?'请输入1至'+max+'之间的整数天数。':undefined;
 const money=(value:string)=>!/^\d{1,10}(\.\d{1,2})?$/.test(value)?'金额须为非负数，最多10位整数和2位小数。':undefined;
 const fields:RepairField[]=settingKey==='allocation'?[
  {key:'automatic',label:labels.automatic,type:'select',required:true,options:[['true','启用'],['false','关闭（需手工选床）']]},
 ]:settingKey==='accommodation'?[
  {key:'reviewRequired',label:labels.reviewRequired,type:'select',required:true,options:[['true','必须由授权人员审核']]},
  {key:'processingDays',label:labels.processingDays,type:'number',required:true,validate:positiveDays(90)},
 ]:settingKey==='repair'?[
  {key:'autoReview',label:labels.autoReview,type:'select',required:true,options:[['false','关闭（由宿管人工初审）'],['true','开启（系统自动通过初审，直接进入待派工）']]},
 ]:[
  {key:'accommodationFee',label:labels.accommodationFee,type:'text',required:true,maxLength:13,validate:money},
  {key:'utilityFee',label:labels.utilityFee,type:'text',required:true,maxLength:13,validate:money},
  {key:'dueDays',label:labels.dueDays,type:'number',required:true,validate:positiveDays(365)},
 ];
 async function submit(){
  if(saving.current||active)return;
  for(const field of fields){const value=values[field.key]??'',message=field.required&&!value?'请填写并确认'+field.label+'。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择有效的'+field.label+'。':field.validate?.(value);if(message){setError(message);return;}}
  saving.current=true;setPending(true);setError('');
  const body=settingKey==='allocation'?{automatic:values.automatic==='true'}:settingKey==='accommodation'?{reviewRequired:true,processingDays:Number(values.processingDays)}:settingKey==='repair'?{autoReview:values.autoReview==='true'}:{accommodationFee:values.accommodationFee,utilityFee:values.utilityFee,dueDays:Number(values.dueDays)};
  try{await api('settings/'+settingKey,{method:'PATCH',body:JSON.stringify(body)});data.invalidate();await data.load(adminProcessPath,true).catch(()=>{});if(root.current)onSaved();}catch(reason){if(root.current)setError(reason instanceof Error?reason.message:'规则保存失败，请重试。');}finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{action.current=submit;});
 useLayoutEffect(()=>{
  const info=root.current!.closest('.docs-info')!,original=info.querySelector<HTMLAnchorElement>('.next-link a')!,button=original.cloneNode(true) as HTMLAnchorElement;
  button.removeAttribute('data-id');button.setAttribute('role','button');button.href=entry.url;button.title='保存规则';button.className='text-ui color-corail';button.dataset.color=String(entry.color);for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();button.prepend('保存规则');
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void action.current();};const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void action.current();}};
  button.addEventListener('click',send);button.addEventListener('keydown',keyboard);original.replaceWith(button);footer.current=button;
  return()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);footer.current=null;if(info.isConnected)button.replaceWith(original);};
 },[entry.url,entry.color]);
 useLayoutEffect(()=>{footer.current?.setAttribute('aria-disabled',String(pending||Boolean(active)));footer.current?.setAttribute('aria-busy',String(pending));},[pending,active]);
 const description=settingKey==='allocation'?'关闭自动分床后，审核办理时需要手工指定可用床位。':settingKey==='accommodation'?'住宿申请须经授权人员审核，办理时限为1至90天。':settingKey==='repair'?'开启后，学生新提交的报修由系统自动通过初审，直接进入待派工队列，无需宿管人工审核。关闭后恢复宿管初审。设置仅影响保存后新提交的报修，现有工单保持原状态。':'月费和缴费期限用于后续生成的账单，已生成的账单保留原有金额和截止日期。';
 return <div ref={root} data-dorma-application-editor data-dorma-admin-process-editor aria-busy={pending}>
  <div className="docs-info-content formatted-text"><div className="notice info"><p>{description}</p>{!row&&<p>此流程尚未配置，请确认下方建议值后保存。</p>}</div></div>
  <RepairEditorFields color={entry.color} fields={fields} values={values} active={active} pending={pending} onActive={key=>{setActive(key);setError('');}} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
