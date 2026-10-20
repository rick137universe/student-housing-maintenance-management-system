'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api} from '@/utils/auth-session';
import type {MaintenancePage} from '@/data/maintenance-pages';
import type {StudentRow} from '@/utils/student-record-data';
import type {MaintenanceRecordData} from '@/utils/maintenance-record-data';
import {StudentWarning} from './StudentWarning';
import {RepairValues} from './StudentRepairElements';

export function MaintenanceRecordEditor({entry,row,detailUrl,data,navigate}:{entry:MaintenancePage;row:StudentRow;detailUrl:string;data:MaintenanceRecordData;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),saving=useRef(false),submitAction=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const [note,setNote]=useState(String(row.processing_description??'')),[active,setActive]=useState(false),[draft,setDraft]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
 useLayoutEffect(()=>{if(active)input.current?.focus();},[active]);
 function cancel(){if(saving.current)return;setActive(false);setDraft('');setError('');}
 function confirm(){if(!active||saving.current)return;if(!draft.trim()){setError('请填写维修说明。');return;}setNote(draft.trim());cancel();}
 async function submit(){
  if(saving.current||active)return;
  if(!note.trim()){setError('请填写并确认维修说明。');return;}
  saving.current=true;setPending(true);setError('');
  try{
   const current=await data.load('maintenance/'+row.maintenance_id,true);
   if(Array.isArray(current.data)||!['in_progress','waiting_parts'].includes(String(current.data.repair_status)))throw new Error('该记录已归档或当前不能填写，请返回详情查看。');
   await api(`repairs/${row.repair_id}/record`,{method:'POST',body:JSON.stringify({note})});
   data.invalidate();if(root.current)navigate(detailUrl);
  }catch(reason){setError(reason instanceof Error?reason.message:'保存失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 // The parent installs the native detail footer before this effect runs.
 useEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,next=info.querySelector('.next-link')!,heading=info.querySelector('.prev-next-heading')!.children[1];
  const button=doc.createElement('a'),savedHeading=heading.textContent;
  button.href=detailUrl+'&edit=1';button.title='保存记录';button.textContent='保存记录';button.className='text-ui color-orange';button.dataset.color=String(entry.color);button.setAttribute('role','button');
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=doc.createElementNS('http://www.w3.org/2000/svg','polygon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');polygon.setAttribute('fill','currentColor');polygon.setAttribute('points','17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75');svg.append(polygon);button.append(svg);
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();}};
  button.addEventListener('click',send);button.addEventListener('keydown',keyboard);next.append(button);heading.textContent='下一个';footer.current=button;
  return()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);button.remove();footer.current=null;if(next.isConnected)heading.textContent=savedHeading;};
 },[detailUrl,entry.color]);
 useEffect(()=>{footer.current?.setAttribute('aria-disabled',String(pending||active));footer.current?.setAttribute('aria-busy',String(pending));},[pending,active]);
 return <div ref={root} data-dorma-application-editor data-dorma-maintenance-record-editor aria-busy={pending}>
  <div className="docs-info-content formatted-text"><RepairValues row={row} fields={[["repair_id","报修编号"],["room_id","报修房间"],["fault_description","故障描述"]]}/></div>
  <section className="code-preview" data-color={entry.color} data-profile-field="note" aria-labelledby="maintenance-note-title">
   <div className="code-preview-content"><header><div className="code-preview-title"><h2 id="maintenance-note-title" className="text-ui">维修说明</h2></div><nav aria-label="维修说明编辑操作">
    <button type="button" className="code-preview-button text-ui" disabled={!active||pending} onClick={event=>{event.stopPropagation();confirm();}}>确认</button>
    <button type="button" className="code-preview-button text-ui" disabled={!active||pending} onClick={event=>{event.stopPropagation();cancel();}}>取消</button>
    <button type="button" className="ui-input code-edit-button text-ui" title="编辑维修说明" aria-pressed={active} disabled={pending||active} onClick={event=>{event.stopPropagation();setDraft(note);setActive(true);setError('');}}><svg className="icon" width="24" height="24" viewBox="0 0 24 24"><g fill="none" strokeWidth="1.75"><polygon stroke="currentColor" points="13.5 8.5 7.5 14.5 7.5 17.5 10.5 17.5 16.5 11.5"/><path stroke="currentColor" d="M18.0857864,7.08578644 L17.9142136,6.91421356 C17.133165,6.13316498 15.866835,6.13316498 15.0857864,6.91421356 L13.5,8.5 L13.5,8.5 L16.5,11.5 L18.0857864,9.91421356 C18.866835,9.13316498 18.866835,7.86683502 18.0857864,7.08578644 Z"/></g></svg></button>
   </nav></header><div className="code-editor"><pre className="is-active" data-language="maintenance"><code className="hljs language-plaintext" onKeyDown={event=>{if(!active||event.nativeEvent.isComposing)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.stopPropagation();confirm();}}}>
    {active?<textarea ref={input} aria-label="维修说明" rows={4} maxLength={4000} value={draft} onChange={event=>setDraft(event.target.value)}/>:note||'—'}
   </code></pre></div></div>
  </section>
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
