'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api} from '@/utils/auth-session';
import {valueLabels} from '@/data/workspace-actions';
import type {ManagerPage} from '@/data/manager-pages';
import type {StudentRow} from '@/utils/student-record-data';
import type {ManagerResourceData} from '@/utils/manager-resource-data';
import {StudentWarning} from './StudentWarning';
import {baseDataSpec,type BaseField} from '@/utils/manager-base-data';


export function ManagerBaseDataEditor({entry,row,data,detailUrl,navigate}:{entry:ManagerPage;row:StudentRow;data:ManagerResourceData;detailUrl:string;navigate:(url:string)=>void}){
 const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement|HTMLSelectElement>(null),saving=useRef(false),submitAction=useRef<()=>Promise<void>>(async()=>{}),footer=useRef<HTMLAnchorElement|null>(null);
 const spec=baseDataSpec(entry.action),fields:readonly BaseField[]=spec.fields;
 const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(fields.map(field=>[field.key,String(row[field.key]??'')]))),[active,setActive]=useState<string|null>(null),[draft,setDraft]=useState('');
 const [buildings,setBuildings]=useState<StudentRow[]>([]),[optionsReady,setOptionsReady]=useState(spec.resource!=='rooms');
 const [error,setError]=useState(''),[pending,setPending]=useState(false);
 useEffect(()=>{if(spec.resource!=='rooms')return;let current=true;void (async()=>{const rows:StudentRow[]=[];let page=1;while(true){const result=await data.load('buildings?'+new URLSearchParams({page:String(page),limit:'100'}));if(!Array.isArray(result.data))throw new Error('楼栋读取失败，请刷新后重试。');rows.push(...result.data);if(rows.length>=(result.meta?.total??rows.length))break;page++;}if(current){setBuildings(rows);setOptionsReady(true);}})().catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'楼栋读取失败，请刷新后重试。');});return()=>{current=false;};},[data,spec.resource]);
 useLayoutEffect(()=>{if(active)input.current?.focus();},[active]);
 function edit(key:string){if(active||saving.current)return;setDraft(values[key]);setActive(key);setError('');}
 function cancel(){if(saving.current)return;setActive(null);setDraft('');setError('');}
 function validate(field:BaseField,value:string){
  if(field.required&&!value)return field.label+'不能为空。';
  if(field.maxLength&&value.length>field.maxLength)return field.label+'不能超过'+field.maxLength+'个字符。';
  if(field.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return '邮箱格式不正确。';
  if(field.type==='number'&&(!Number.isSafeInteger(Number(value))||Number(value)<=0||Number(value)>2147483647))return field.label+'必须是有效的正整数。';
  if(field.type==='select'&&!(field.key==='building_id'?buildings.some(building=>building.building_id===value):field.options?.includes(value)))return '请选择有效的'+field.label+'。';
 }
 function confirm(key:string){
  if(active!==key||saving.current)return;const field=fields.find(field=>field.key===key)!,value=draft.trim(),message=validate(field,value);
  if(message){setError(message);return;}setValues(current=>({...current,[key]:value}));setActive(null);setDraft('');setError('');
 }
 async function submit(){
  if(saving.current||active||!optionsReady)return;
  for(const field of fields){const message=validate(field,values[field.key]);if(message){setError(message);return;}}
  saving.current=true;setPending(true);setError('');
  try{await api(spec.resource+'/'+encodeURIComponent(String(row[spec.identifier])),{method:'PATCH',body:JSON.stringify(Object.fromEntries(fields.map(field=>[field.key,field.type==='number'?Number(values[field.key]):values[field.key]||null])))});data.invalidate();if(root.current)navigate(detailUrl);}
  catch(reason){setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
  finally{saving.current=false;setPending(false);}
 }
 useLayoutEffect(()=>{submitAction.current=submit;});
 useEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,next=info.querySelector('.next-link')!,heading=info.querySelector('.prev-next-heading')!.children[1],savedHeading=heading.textContent;
  const button=doc.createElement('a');button.href=detailUrl+'&edit=1';button.title='提交更新';button.textContent='提交更新';button.className='text-ui color-'+(entry.color===0?'red':'orange');button.dataset.color=String(entry.color);button.setAttribute('role','button');
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),polygon=doc.createElementNS('http://www.w3.org/2000/svg','polygon');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','icon');polygon.setAttribute('fill','currentColor');polygon.setAttribute('points','17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75');svg.append(polygon);button.append(svg);
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();if(button.getAttribute('aria-disabled')!=='true')void submitAction.current();}};
  button.addEventListener('click',send);button.addEventListener('keydown',keyboard);next.append(button);heading.textContent='下一个';footer.current=button;
  return()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);button.remove();footer.current=null;if(next.isConnected)heading.textContent=savedHeading;};
 },[detailUrl,entry.color]);
 useEffect(()=>{footer.current?.setAttribute('aria-disabled',String(pending||Boolean(active)||!optionsReady));footer.current?.setAttribute('aria-busy',String(pending));},[pending,active,optionsReady]);
 return <div ref={root} data-dorma-application-editor data-dorma-base-editor aria-busy={pending}>
  <div className="docs-info-content formatted-text" data-dorma-base-values><h3>{spec.resource==='students'?'学号':'房间编号'}</h3><pre><code className="hljs language-plaintext">{String(row[spec.identifier])}</code></pre></div>
  {fields.map(field=>{const editing=active===field.key,value=field.key==='building_id'?buildings.find(building=>building.building_id===values[field.key])?.building_name??values[field.key]:field.type==='select'?valueLabels[values[field.key]]??values[field.key]:values[field.key];
   return <section key={field.key} className="code-preview" data-color={entry.color} data-profile-field={field.key} aria-labelledby={'resource-title-'+field.key}>
    <div className="code-preview-content"><header><div className="code-preview-title"><h2 id={'bed-title-'+field.key} className="text-ui">{field.label}</h2></div><nav aria-label={field.label+'编辑操作'}>
     <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();confirm(field.key);}}>确认</button>
     <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();cancel();}}>取消</button>
     <button type="button" className="ui-input code-edit-button text-ui" title={'编辑'+field.label} aria-pressed={editing} disabled={pending||Boolean(active)||(field.key==='building_id'&&!optionsReady)} onClick={event=>{event.stopPropagation();edit(field.key);}}><svg className="icon" width="24" height="24" viewBox="0 0 24 24"><g fill="none" strokeWidth="1.75"><polygon stroke="currentColor" points="13.5 8.5 7.5 14.5 7.5 17.5 10.5 17.5 16.5 11.5"/><path stroke="currentColor" d="M18.0857864,7.08578644 L17.9142136,6.91421356 C17.133165,6.13316498 15.866835,6.13316498 15.0857864,6.91421356 L13.5,8.5 L13.5,8.5 L16.5,11.5 L18.0857864,9.91421356 C18.866835,9.13316498 18.866835,7.86683502 18.0857864,7.08578644 Z"/></g></svg></button>
    </nav></header><div className="code-editor"><pre className="is-active" data-language="resource"><code className="hljs language-plaintext" onKeyDown={event=>{if(!editing||event.nativeEvent.isComposing)return;if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}if(event.key==='Enter'){event.preventDefault();event.stopPropagation();confirm(field.key);}}}>
     {editing?(field.type!=='select'?<input ref={node=>{input.current=node;}} aria-label={field.label} type={field.type??'text'} min={field.type==='number'?1:undefined} step={field.type==='number'?1:undefined} maxLength={field.maxLength} value={draft} onChange={event=>setDraft(event.target.value)}/>:<select ref={node=>{input.current=node;}} aria-label={field.label} value={draft} onChange={event=>setDraft(event.target.value)}>{field.key==='building_id'?buildings.map(building=><option key={String(building.building_id)} value={String(building.building_id)}>{String(building.building_id)} · {String(building.building_name)}</option>):field.options!.map(status=><option key={status} value={status}>{valueLabels[status]}</option>)}</select>):String(value||'—')}
    </code></pre></div></div>
   </section>;
  })}
  {error&&<StudentWarning>{error}</StudentWarning>}
 </div>;
}
