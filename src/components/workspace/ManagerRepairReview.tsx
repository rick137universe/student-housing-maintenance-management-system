'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api} from '@/utils/auth-session';
import type {ManagerPage} from '@/data/manager-pages';
import type {StudentRow} from '@/utils/student-record-data';
import type {ManagerRepairData} from '@/utils/manager-repair-data';
import {StudentWarning} from './StudentWarning';
import {RepairValues} from './StudentRepairElements';

type Field='decision'|'note';
export function ManagerRepairReview({entry,row,detailUrl,data,navigate}:{entry:ManagerPage;row:StudentRow;detailUrl:string;data:ManagerRepairData;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),input=useRef<HTMLSelectElement|HTMLTextAreaElement>(null),saving=useRef(false),submitAction=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const id=String(row.repair_id);
 const [values,setValues]=useState<Record<Field,string>>({decision:'',note:''}),[active,setActive]=useState<Field|null>(null),[draft,setDraft]=useState('');
 const [error,setError]=useState(''),[pending,setPending]=useState(false);
 useLayoutEffect(()=>{if(active)input.current?.focus();},[active]);
 function edit(key:Field){if(active||saving.current)return;setDraft(values[key]);setActive(key);setError('');}
 function cancel(){if(saving.current)return;setActive(null);setDraft('');setError('');}
 function confirm(key:Field){
  if(active!==key||saving.current)return;
  if(key==='decision'&&!['approve','reject'].includes(draft)){setError('请选择审核结果。');return;}
  if(key==='note'&&draft.trim().length>4000){setError('审核意见不能超过4000个字符。');return;}
  setValues(current=>({...current,[key]:draft.trim()}));setActive(null);setDraft('');setError('');
 }
 async function submit(){
  if(saving.current||active)return;
  if(!['approve','reject'].includes(values.decision)){setError('请先选择并确认审核结果。');return;}
  if(values.decision==='reject'&&!values.note){setError('驳回报修时，请填写并确认审核意见。');return;}
  saving.current=true;setPending(true);setError('');
  try{
   await api(`repairs/${id}/review`,{method:'POST',body:JSON.stringify({decision:values.decision,note:values.note})});
   data.invalidate();if(root.current)navigate(detailUrl);
  }catch(reason){setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 // Attach after the parent has installed the native detail-page footer.
 useEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,next=info.querySelector('.next-link')!,heading=info.querySelector('.prev-next-heading')!.children[1];
  const button=doc.createElement('a'),savedHeading=heading.textContent;
  button.href=detailUrl+'&review=1';button.title='提交审核';button.textContent='提交审核';button.className='text-ui color-yellow';button.dataset.color=String(entry.color);button.setAttribute('role','button');
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=doc.createElementNS('http://www.w3.org/2000/svg','polygon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');polygon.setAttribute('fill','currentColor');polygon.setAttribute('points','17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75');svg.append(polygon);button.append(svg);
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();}};
  button.addEventListener('click',send);button.addEventListener('keydown',keyboard);next.append(button);heading.textContent='下一个';footer.current=button;
  return()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);button.remove();footer.current=null;if(next.isConnected)heading.textContent=savedHeading;};
 },[detailUrl,entry.color]);
 useEffect(()=>{footer.current?.setAttribute('aria-disabled',String(pending||Boolean(active)));footer.current?.setAttribute('aria-busy',String(pending));},[pending,active]);
 const fields:ReadonlyArray<{key:Field;label:string}>=[{key:'decision',label:'审核结果'},{key:'note',label:'审核意见'}];
 return <div ref={root} data-dorma-application-editor data-dorma-repair-review-editor aria-busy={pending}>
  <div className="docs-info-content formatted-text"><RepairValues row={row} fields={[["full_name","报修人"],["room_id","报修房间"],["fault_type","故障类型"],["fault_description","故障描述"]]}/></div>
  {fields.map(field=>{const editing=active===field.key,value=field.key==='decision'?(values.decision==='approve'?'通过并上报':values.decision==='reject'?'驳回':'—'):values.note||'—';
   return <section key={field.key} className="code-preview" data-color={entry.color} data-profile-field={field.key} aria-labelledby={'review-title-'+field.key}>
    <div className="code-preview-content"><header><div className="code-preview-title"><h2 id={'review-title-'+field.key} className="text-ui">{field.label}</h2></div><nav aria-label={field.label+'编辑操作'}>
     <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();confirm(field.key);}}>确认</button>
     <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();cancel();}}>取消</button>
     <button type="button" className="ui-input code-edit-button text-ui" title={'编辑'+field.label} aria-pressed={editing} disabled={pending||Boolean(active)} onClick={event=>{event.stopPropagation();edit(field.key);}}><svg className="icon" width="24" height="24" viewBox="0 0 24 24"><g fill="none" strokeWidth="1.75"><polygon stroke="currentColor" points="13.5 8.5 7.5 14.5 7.5 17.5 10.5 17.5 16.5 11.5"/><path stroke="currentColor" d="M18.0857864,7.08578644 L17.9142136,6.91421356 C17.133165,6.13316498 15.866835,6.13316498 15.0857864,6.91421356 L13.5,8.5 L13.5,8.5 L16.5,11.5 L18.0857864,9.91421356 C18.866835,9.13316498 18.866835,7.86683502 18.0857864,7.08578644 Z"/></g></svg></button>
    </nav></header><div className="code-editor"><pre className="is-active" data-language="review"><code className="hljs language-plaintext" onKeyDown={event=>{if(!editing||event.nativeEvent.isComposing)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}if(event.key==='Enter'&&(field.key!=='note'||event.ctrlKey||event.metaKey)){event.preventDefault();event.stopPropagation();confirm(field.key);}}}>
     {editing?(field.key==='note'?<textarea ref={node=>{input.current=node;}} aria-label={field.label} rows={3} maxLength={4000} value={draft} onChange={event=>setDraft(event.target.value)}/>:<select ref={node=>{input.current=node;}} aria-label={field.label} value={draft} onChange={event=>setDraft(event.target.value)}><><option value="">请选择审核结果</option><option value="approve">通过并上报</option><option value="reject">驳回</option></></select>):value}
    </code></pre></div></div>
   </section>;
  })}
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
