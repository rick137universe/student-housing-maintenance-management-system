'use client';
export {useRepairDocument} from '@/hooks/useDocsDocument';
export {useRepairSubmitFooter} from '@/hooks/useDocsSubmitFooter';
import {formatDateTime,formatBusinessValue} from '@/utils/display-format';
import {NavigationReceipt} from './NavigationReceipt';

import {StudentWarning} from '@/components/ui/Warning';
import {StudentEmptyState} from '@/components/ui/EmptyState';
import {Fragment,useLayoutEffect,useRef,useState} from 'react';
import {valueLabels} from '@/constants/workspace-actions';
import type {StudentRow} from '@/services/record-data';


const dateTime={format:formatDateTime};
export function repairValue(key:string,value:unknown):string{
 const formatted=formatBusinessValue(key,value);if(formatted!==undefined)return formatted;
 if(value===null||value===undefined||value==='')return '—';
 if(key.endsWith('_at')){const date=new Date(String(value));return Number.isNaN(date.getTime())?String(value):dateTime.format(date);}
 if(key==='service_rating')return String(Number(value));
 return valueLabels[String(value)]??String(value);
}
export function RepairArrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><g fill="none" fillRule="evenodd"><polygon fill="currentColor" fillRule="nonzero" points="17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75"/></g></svg>;}
export function RepairValues({row,fields}:{row:StudentRow;fields:ReadonlyArray<readonly [string,string]>}){return <div data-dorma-repair-values><NavigationReceipt row={row}/>{fields.map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{repairValue(key,row[key])}</code></pre></Fragment>)}</div>;}

const historyFields=[['created_at','处理时间'],['status','状态'],['actor_name','处理人员'],['description','处理说明']] as const;
export function RepairHistory({history,title='处理过程'}:{history:StudentRow[];title?:string}){
 return <><h2>{title}</h2><div className="scroll-container scroll-x" data-dorma-repair-history>
  {history.length?<table className="responsive-table" aria-label={title} style={{minWidth:'40rem'}}><thead><tr>{historyFields.map(([key,label])=><th key={key} scope="col" style={key==='description'?undefined:{paddingRight:'var(--margin-l)'}}>{label}</th>)}</tr></thead><tbody>
   {history.map((update,index)=><tr key={String(update.update_id??index)}>{historyFields.map(([key,label])=><td key={key} data-label={label} style={key==='description'?{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}:{paddingRight:'var(--margin-l)'}}>{repairValue(key,update[key])}</td>)}</tr>)}
  </tbody></table>:<StudentEmptyState/>}
 </div></>;
}

// Work only with the copied Docs elements. Native CSS controls typography, spacing and color.




export type RepairField={key:string;label:string;type?:'select'|'textarea'|'text'|'tel'|'number'|'date'|'month'|'time'|'password'|'datetime-local';options?:ReadonlyArray<readonly [string,string]>;required?:boolean;maxLength?:number;validate?:(value:string)=>string|undefined};
export function RepairEditorFields({fields,values,onChange,active,onActive,pending,color=3}:{color?:number;fields:RepairField[];values:Record<string,string>;onChange:(key:string,value:string)=>void;active:string|null;onActive:(key:string|null)=>void;pending:boolean}){
 const [draft,setDraft]=useState(''),[error,setError]=useState('');const input=useRef<HTMLSelectElement|HTMLInputElement|HTMLTextAreaElement>(null);
 useLayoutEffect(()=>{if(active)input.current?.focus();},[active]);
 function cancel(){if(pending)return;onActive(null);setError('');setDraft('');}
 function confirm(field:RepairField){
  const value=draft.trim();if(active!==field.key||pending)return;
  const message=field.required&&!value?'请填写'+field.label+'。':field.type==='select'&&!field.options?.some(([id])=>id===value)?'请选择'+field.label+'。':field.validate?.(value);
  if(message){setError(message);return;}onChange(field.key,value);cancel();
 }
 return <>{fields.map(field=>{
  const editing=active===field.key,value=field.options?.find(([id])=>id===values[field.key])?.[1]??values[field.key]??'';
  return <Fragment key={field.key}><section className="code-preview" data-color={color} data-profile-field={field.key}>
   <div className="code-preview-content"><header><div className="code-preview-title"><h2 className="text-ui">{field.label}</h2></div><nav aria-label={field.label+'编辑操作'}>
    <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();confirm(field);}}>确认</button>
    <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();cancel();}}>取消</button>
    <button type="button" className="ui-input code-edit-button text-ui" title={'编辑'+field.label} aria-pressed={editing} disabled={pending||Boolean(active)||(field.type==='select'&&!field.options?.length)} onClick={event=>{event.stopPropagation();setDraft(values[field.key]??'');setError('');onActive(field.key);}}><svg className="icon" width="24" height="24" viewBox="0 0 24 24"><g fill="none" strokeWidth="1.75"><polygon stroke="currentColor" points="13.5 8.5 7.5 14.5 7.5 17.5 10.5 17.5 16.5 11.5"/><path stroke="currentColor" d="M18.0857864,7.08578644 L17.9142136,6.91421356 C17.133165,6.13316498 15.866835,6.13316498 15.0857864,6.91421356 L13.5,8.5 L13.5,8.5 L16.5,11.5 L18.0857864,9.91421356 C18.866835,9.13316498 18.866835,7.86683502 18.0857864,7.08578644 Z"/></g></svg></button>
   </nav></header><div className="code-editor"><pre className="is-active"><code className="hljs language-plaintext" onKeyDown={event=>{if(event.nativeEvent.isComposing)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}if(event.key==='Enter'&&(field.type!=='textarea'||event.ctrlKey||event.metaKey)){event.preventDefault();event.stopPropagation();confirm(field);}}}>
    {editing?(field.type==='select'?<select ref={node=>{input.current=node;}} aria-label={field.label} value={draft} disabled={pending} onChange={event=>setDraft(event.target.value)}><option value="">请选择{field.label}</option>{field.options!.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>:field.type==='textarea'?<textarea ref={node=>{input.current=node;}} aria-label={field.label} rows={3} maxLength={field.maxLength??4000} value={draft} disabled={pending} onChange={event=>setDraft(event.target.value)}/>:<input ref={node=>{input.current=node;}} type={field.type??"tel"} step={field.type==='number'?'any':undefined} aria-label={field.label} maxLength={field.maxLength??32} value={draft} disabled={pending} onChange={event=>setDraft(event.target.value)}/>):field.type==='password'&&value?'••••••••':(formatBusinessValue(field.key,value)??value)||'—'}
   </code></pre></div></div>
  </section>{editing&&error&&<StudentWarning>{error}</StudentWarning>}</Fragment>;
 })}</>;
}
