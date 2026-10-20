'use client';

import {StudentWarning} from './StudentWarning';
import {useCallback,useEffect,useRef,useState,type MouseEvent} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {api} from '@/utils/auth-session';
import {studentPages,type StudentPage} from '@/data/student-pages';
import {repairListPath,type StudentRepairData} from '@/utils/student-repair-data';
import type {StudentRow} from '@/utils/student-record-data';
import {StudentEmptyState} from './StudentEmptyState';
import {RepairArrow,RepairEditorFields,RepairValues,repairValue,useRepairDocument,useRepairSubmitFooter,type RepairField} from './StudentRepairElements';

const requestFields=[['repair_id','报修编号'],['room_id','报修房间'],['fault_type','故障类型'],['fault_description','故障描述'],['contact_phone','联系电话'],['repair_status','工单状态'],['submitted_at','提交时间'],['reviewed_at','审核时间'],['review_note','审核意见']] as const;
const maintenanceFields=[['technician_name','维修人员'],['dispatched_at','派工时间'],['accepted_at','接单时间'],['maintenance_at','开始维修时间'],['processing_description','处理说明'],['expected_completion_at','预计完成时间'],['completed_at','完工时间'],['materials','使用材料'],['hours','实际工时']] as const;
const evaluationFields=[['service_rating','服务评分'],['evaluation_content','评价内容'],['evaluated_at','评价时间']] as const;

export function StudentRepairPage({entry,data}:{entry:StudentPage;data:StudentRepairData}){
 if(entry.kind==='repair-submit')return <RepairSubmission entry={entry} data={data}/>;
 return <RepairRecords entry={entry} data={data}/>;
}
function RepairSubmission({entry,data}:{entry:StudentPage;data:StudentRepairData}){
 const root=useRef<HTMLDivElement>(null),router=useRouter();
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 useRepairDocument(root,entry,{key:'page',editor:true,listUrl:entry.url,navigate});
 return <div ref={root} data-dorma-live-workspace data-dorma-repair><RepairForm entry={entry} data={data}/></div>;
}
function RepairRecords({entry,data}:{entry:StudentPage;data:StudentRepairData}){
 const params=useSearchParams(),router=useRouter(),record=params.get('record'),requestedPage=Number(params.get('page')??1);
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
 const navigate=useCallback((url:string)=>router.push(url,{scroll:false}),[router]);
 return <RepairRecordsContent key={[entry.id,record,page].join(':')} entry={entry} data={data} record={record} page={page} navigate={navigate}/>;
}
function RepairRecordsContent({entry,data,record,page,navigate}:{entry:StudentPage;data:StudentRepairData;record:string|null;page:number;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),request=useRef({version:0}),router=useRouter();
 const path=record===null?repairListPath(entry,page):'repairs/'+record;
 const [result,setResult]=useState(()=>data.peek(path)),[history,setHistory]=useState<StudentRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const evaluate=entry.kind==='repair-evaluate',evaluations=entry.action==='action-3/records';
 const listUrl=entry.url+(page>1?'?page='+page:''),detailUrl=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(record??'');
 const title=record===null?undefined:evaluate?'提交服务评价':evaluations?'服务评价详情':entry.action.startsWith('action-2')?'报修进度详情':'报修申请详情';
 const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
 const eligible=detail?.repair_status==='completed'&&detail.service_rating===null;
 const allowed=!detail||(!evaluations&&(!evaluate||eligible))||(evaluations&&detail.repair_status==='evaluated');
 const load=useCallback(async()=>{
  const version=++request.current.version;setLoading(true);setError('');
  try{
   if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
   const [next,updates]=await Promise.all([data.load(path,evaluate&&record!==null),record!==null?data.load('repairs/'+record+'/history'):Promise.resolve(null)]);
   if(request.current.version===version){setResult(next);setHistory(Array.isArray(updates?.data)?updates.data:[]);}
  }catch(reason){if(request.current.version===version){setResult(undefined);setHistory([]);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
  finally{if(request.current.version===version)setLoading(false);}
 },[data,path,record,evaluate]);
 useEffect(()=>{
  const state=request.current;void load();const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};window.addEventListener('focus',refresh);
  return()=>{state.version++;window.removeEventListener('focus',refresh);};
 },[load]);
 useRepairDocument(root,entry,{key:record===null&&page===1?'page':JSON.stringify([record,page]),editor:evaluate,title,url:detailUrl,listUrl,navigate});
 function link(url:string,event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
 return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-repair aria-busy={loading}>
  {error&&<StudentWarning>{error}</StudentWarning>}
  {result&&(record===null?<>
   <ul className="links-list links-list-boxed" data-dorma-repair-list>{rows.map(row=>{
    const url=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(String(row.repair_id));
    const keys=evaluations?['room_id','service_rating','evaluated_at']:evaluate?['room_id','fault_type','completed_at']:['room_id','fault_type','repair_status','submitted_at'];
    const summary=keys.map(key=>repairValue(key,row[key])+(key==='service_rating'?' 分':'')).join(' · ');
    return <li key={String(row.repair_id)}><a className="text-ui color-yellow" data-color="3" href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{summary}<RepairArrow/></a></li>;
   })}</ul>
   {!rows.length&&<StudentEmptyState/>}
   {total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(entry.url+(page>2?'?page='+(page-1):''))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(entry.url+'?page='+(page+1))}>下一页</button></div></>}
  </>:detail&&(!allowed?<StudentWarning>{evaluate?'此工单尚未完工或已经评价，不能重复提交。':'记录不存在或不可访问。'}</StudentWarning>:evaluate?<RepairForm entry={entry} data={data} repair={detail} locked={loading}/>:<>
   <RepairValues row={detail} fields={[...requestFields,...(detail.maintenance_id?maintenanceFields:[]),...(evaluations||detail.repair_status==='evaluated'?evaluationFields:[])]}/>
   {entry.action.startsWith('action-2')&&<div data-dorma-repair-history><h2>处理过程</h2>{history.map(update=><RepairValues key={String(update.update_id)} row={{description:[repairValue('status',update.status),repairValue('created_at',update.created_at),String(update.actor_name??''),String(update.description??'')].filter(Boolean).join(' · ')}} fields={[["description",repairValue('status',update.status)]]}/>)}</div>}
  </>))}
 </div>;
}

function RepairForm({entry,data,repair,locked=false}:{entry:StudentPage;data:StudentRepairData;repair?:StudentRow;locked?:boolean}){
 const evaluation=Boolean(repair),root=useRef<HTMLDivElement>(null),saving=useRef(false);
 const [rooms,setRooms]=useState<ReadonlyArray<readonly [string,string]>>([]),[values,setValues]=useState<Record<string,string>>({}),[active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(evaluation)return;let current=true;
  api<StudentRow[]>('occupancies?limit=100').then(result=>{if(current){const stays=result.data.filter(row=>row.check_out_date===null);setRooms([...new Set(stays.map(row=>String(row.room_id)))].map(room=>[room,room]));if(!stays.length)setError('尚未入住，暂无可报修房间。');}})
   .catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'住宿信息读取失败，请刷新后重试。');});
  return()=>{current=false;};
 },[evaluation]);
 const fields:RepairField[]=evaluation?[
  {key:'rating',label:'服务评分',type:'select',required:true,options:[1,2,3,4,5].map(rating=>[String(rating),rating+' 分'])},
  {key:'note',label:'评价内容',type:'textarea',maxLength:4000},
 ]:[
  {key:'roomId',label:'报修房间',type:'select',required:true,options:rooms},
  {key:'faultType',label:'故障类型',type:'select',required:true,options:['水电设施','家具门窗','空调设备','其他设施'].map(value=>[value,value])},
  {key:'description',label:'故障描述',type:'textarea',required:true,maxLength:4000},
  {key:'phone',label:'联系电话',type:'tel',required:true,maxLength:32,validate:value=>value.length<3?'联系电话至少需要3个字符。':undefined},
 ];
 async function submit(){
  if(saving.current||active||locked)return;
  for(const field of fields){
   const value=values[field.key]??'';const message=field.required&&!value?'请填写并确认'+field.label+'。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择并确认'+field.label+'。':field.validate?.(value);
   if(message){setError(message);return;}
  }
  saving.current=true;setPending(true);setError('');
  try{
   await api(evaluation?`repairs/${repair!.repair_id}/evaluate`:'repairs',{method:'POST',body:JSON.stringify(evaluation?{rating:Number(values.rating),note:values.note??''}:{roomId:values.roomId,faultType:values.faultType,description:values.description,phone:values.phone})});
   data.invalidate();const records=studentPages.find(page=>page.parent===entry.parent&&page.kind==='repair-records')!;
   root.current?.ownerDocument.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${records.id}"]`)?.click();
  }catch(reason){setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useRepairSubmitFooter(root,evaluation?'提交评价':'提交申请',pending||Boolean(active)||locked,submit);
 return <div ref={root} data-dorma-application-editor data-dorma-repair-form aria-busy={pending}>
  {repair&&<div className="docs-info-content formatted-text"><RepairValues row={repair} fields={[...requestFields.slice(0,4),['completed_at','完工时间']]}/></div>}
  <RepairEditorFields fields={fields} values={values} active={active} onActive={setActive} pending={pending||locked} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
