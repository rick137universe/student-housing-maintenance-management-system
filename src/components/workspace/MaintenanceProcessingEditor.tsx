'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api} from '@/utils/auth-session';
import type {MaintenancePage} from '@/data/maintenance-pages';
import type {StudentRow} from '@/utils/student-record-data';
import type {MaintenanceRecordData} from '@/utils/maintenance-record-data';
import {StudentWarning} from './StudentWarning';
import {RepairEditorFields,RepairValues,type RepairField} from './StudentRepairElements';

export function MaintenanceProcessingEditor({entry,row,detailUrl,data,navigate,onSaved}:{entry:MaintenancePage;row:StudentRow;detailUrl:string;data:MaintenanceRecordData;navigate:(url:string)=>void;onSaved?:()=>Promise<void>}){
 const root=useRef<HTMLDivElement>(null),saving=useRef(false),submitAction=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const start=entry.action==='action-1',complete=entry.action==='action-3',label=start?'开始维修':complete?'确认完工':'保存进展';
 const [values,setValues]=useState<Record<string,string>>(()=>({status:String(row.repair_status),note:String(row.processing_description??''),materials:String(row.materials??''),hours:row.hours===null||row.hours===undefined?'':String(row.hours),expectedCompletionAt:row.expected_completion_at?new Date(String(row.expected_completion_at)).toLocaleString('sv-SE').slice(0,16).replace(' ','T'):''}));
 const [active,setActive]=useState<string|null>(null),[pending,setPending]=useState(false),[error,setError]=useState('');
 const fields:RepairField[]=start?[]:[
  ...(!complete?[
   {key:'status',label:'维修状态',type:'select' as const,required:true,options:[['in_progress','处理中'],['waiting_parts','等待配件']] as const},
   {key:'expectedCompletionAt',label:'预计完成时间',type:'datetime-local' as const,validate:(value:string)=>value&&Number.isNaN(new Date(value).getTime())?'请选择有效的预计完成时间。':undefined},
  ]:[]),
  {key:'note',label:complete?'维修结果':'维修说明',type:'textarea',required:true,maxLength:4000},
  ...(complete?[
   {key:'materials',label:'使用材料',type:'textarea' as const,maxLength:4000},
   {key:'hours',label:'实际工时（小时）',type:'number' as const,required:true,validate:(value:string)=>!Number.isFinite(Number(value))||Number(value)<=0||Number(value)>999999?'实际工时必须大于0且不超过999999小时。':undefined},
  ]:[]),
 ];
 async function submit(){
  if(saving.current||active)return;
  for(const field of fields){
   const value=values[field.key]??'',message=field.required&&!value?'请填写并确认'+field.label+'。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择并确认'+field.label+'。':field.validate?.(value);
   if(message){setError(message);return;}
  }
  saving.current=true;setPending(true);setError('');
  try{
   const current=await data.load('maintenance/'+row.maintenance_id,true);
   if(Array.isArray(current.data)||(start?current.data.repair_status!=='accepted':!['in_progress','waiting_parts'].includes(String(current.data.repair_status)))){
    data.invalidate();throw new Error('工单状态已变化，当前不能执行此操作，请返回详情查看。');
   }
   const body=start?{}:complete?{note:values.note,materials:values.materials,hours:Number(values.hours)}:{status:values.status,note:values.note,...(values.expectedCompletionAt?{expectedCompletionAt:new Date(values.expectedCompletionAt).toISOString()}:{})};
   await api(`repairs/${row.repair_id}/${start?'start':complete?'complete':'progress'}`,{method:'POST',body:JSON.stringify(body)});
   data.invalidate();if(root.current){if(onSaved)await onSaved();else navigate(detailUrl);}
  }catch(reason){setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 // Install after the parent replaces the mother document's detail footer.
 useEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,next=info.querySelector('.next-link')!,heading=info.querySelector('.prev-next-heading')!.children[1];
  const button=doc.createElement('a'),savedHeading=heading.textContent;
  button.href=detailUrl+(start?'':'&edit=1');button.title=label;button.textContent=label;button.className='text-ui color-corail';button.dataset.color=String(entry.color);button.setAttribute('role','button');
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=doc.createElementNS('http://www.w3.org/2000/svg','polygon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');polygon.setAttribute('fill','currentColor');polygon.setAttribute('points','17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75');svg.append(polygon);button.append(svg);
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();}};
  button.addEventListener('click',send);button.addEventListener('keydown',keyboard);next.append(button);heading.textContent='下一个';footer.current=button;
  return()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);button.remove();footer.current=null;if(next.isConnected)heading.textContent=savedHeading;};
 },[detailUrl,entry.color,label,start]);
 useEffect(()=>{footer.current?.setAttribute('aria-disabled',String(pending||Boolean(active)));footer.current?.setAttribute('aria-busy',String(pending));},[pending,active]);
 return <div ref={root} data-dorma-application-editor data-dorma-maintenance-processing-editor aria-busy={pending}>
  {!start&&<><div className="docs-info-content formatted-text"><RepairValues row={row} fields={[["repair_id","报修编号"],["room_id","报修房间"],["fault_description","故障描述"]]}/></div>
   <RepairEditorFields color={entry.color} fields={fields} values={values} active={active} onActive={key=>{setActive(key);setError('');}} pending={pending} onChange={(key,value)=>{setValues(current=>({...current,[key]:value}));setError('');}}/>
  </>}
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
