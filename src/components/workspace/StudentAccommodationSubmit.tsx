'use client';

import {StudentWarning} from './StudentWarning';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {api} from '@/utils/auth-session';
import {studentPages,type StudentPage} from '@/data/student-pages';
import type {StudentAccommodationData} from '@/utils/student-accommodation-data';

type Field='preferredBuildingId'|'expectedDate'|'note';
type Values=Record<Field,string>;
type Building={building_id:string;building_name:string};
const fields=[{key:'preferredBuildingId',label:'意向楼栋'},{key:'expectedDate',label:'期望办理日期'},{key:'note',label:'申请说明'}] as const;

export function StudentAccommodationSubmit({entry,data}:{entry:StudentPage;data:StudentAccommodationData}){
  const action=entry.action.split('/')[0],checkout=action==='action-3';
  const parent=studentPages.find(page=>page.id===entry.parent)!;
  const records=studentPages.find(page=>page.parent===entry.parent&&page.kind!=='submit')!;
  const root=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>(null),saving=useRef(false);
  const footer=useRef<HTMLAnchorElement|null>(null),submitAction=useRef<()=>Promise<void>>(async()=>{});
  const [values,setValues]=useState<Values>(()=>({preferredBuildingId:'',expectedDate:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date()),note:''}));
  const [active,setActive]=useState<Field|null>(null),[draft,setDraft]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false);
  const [buildings,setBuildings]=useState<Building[]>([]),[optionsReady,setOptionsReady]=useState(checkout);
  useEffect(()=>{
    if(checkout)return;
    let current=true;
    api<Building[]>('buildings?limit=100').then(result=>{if(current){setBuildings(result.data);setOptionsReady(true);}})
      .catch(reason=>{if(current)setError(reason instanceof Error?reason.message:'楼栋读取失败，请刷新后重试。');});
    return()=>{current=false;};
  },[checkout]);
  useLayoutEffect(()=>{if(active)input.current?.focus();},[active]);

  function edit(key:Field){if(active||saving.current)return;setDraft(values[key]);setError('');setActive(key);}
  function cancel(){if(saving.current)return;setActive(null);setDraft('');setError('');}
  function confirm(key:Field){
    if(active!==key||saving.current)return;
    if(key==='preferredBuildingId'&&!buildings.some(building=>building.building_id===draft)){setError('请选择意向楼栋。');return;}
    if(key==='expectedDate'&&(!/^\d{4}-\d{2}-\d{2}$/.test(draft)||input.current?.validity.valid===false)){setError('请选择有效的期望办理日期。');return;}
    if(key==='note'&&draft.length>4000){setError('申请说明不能超过4000个字符。');return;}
    setValues(current=>({...current,[key]:key==='note'?draft.trim():draft}));setActive(null);setDraft('');setError('');
  }
  async function submit(){
    if(saving.current||active)return;
    if(!checkout&&(!optionsReady||!buildings.some(building=>building.building_id===values.preferredBuildingId))){setError('请先选择并确认意向楼栋。');return;}
    if(!values.expectedDate){setError('请先选择并确认期望办理日期。');return;}
    saving.current=true;setPending(true);setError('');
    try{
      await api(action==='action-1'?'applications':'changes',{method:'POST',body:JSON.stringify({...(checkout?{}:{preferredBuildingId:values.preferredBuildingId}),expectedDate:values.expectedDate,note:values.note,...(action==='action-1'?{}:{type:checkout?'checkout':'transfer'})})});
      data.invalidate();
      root.current?.ownerDocument.querySelector<HTMLAnchorElement>(`#docs-sidebar a[data-id="${records.id}"]`)?.click();
    }catch(reason){setError(reason instanceof Error?reason.message:'提交失败，请重试。');}
    finally{saving.current=false;setPending(false);}
  }
  useLayoutEffect(()=>{submitAction.current=submit;});
  useLayoutEffect(()=>{
    const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
    const content=info.querySelector('.docs-info-content.formatted-text')!,originalParent=business.parentNode!,sibling=business.nextSibling;
    content.after(business);
    const previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!,next=info.querySelector<HTMLAnchorElement>('.next-link a')!;
    const back=previous.cloneNode(true) as HTMLAnchorElement,button=next.cloneNode(true) as HTMLAnchorElement;
    back.href=parent.url;back.title=parent.label;back.dataset.id=parent.id;
    for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(parent.label);
    button.href=entry.url;button.removeAttribute('data-id');button.title='提交申请';button.setAttribute('role','button');
    for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();button.prepend('提交申请');
    const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();void submitAction.current();};
    const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();void submitAction.current();}};
    button.addEventListener('click',send);button.addEventListener('keydown',keyboard);
    previous.replaceWith(back);next.replaceWith(button);footer.current=button;
    doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});
    doc.dispatchEvent(new CustomEvent('dorma-student-content-change',{detail:{key:'page'}}));
    return()=>{
      button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);footer.current=null;
      if(info.isConnected){back.replaceWith(previous);button.replaceWith(next);originalParent.insertBefore(business,sibling?.parentNode===originalParent?sibling:null);}
    };
  },[entry.id,entry.url,parent.id,parent.label,parent.url]);
  useLayoutEffect(()=>{footer.current?.setAttribute('aria-disabled',String(pending||Boolean(active)));footer.current?.setAttribute('aria-busy',String(pending));},[pending,active]);

  return <div ref={root} data-dorma-live-workspace data-dorma-application-editor aria-busy={pending}>
    {fields.filter(field=>!checkout||field.key!=='preferredBuildingId').map(field=>{
      const editing=active===field.key;
      const shown=field.key==='preferredBuildingId'?buildings.find(building=>building.building_id===values.preferredBuildingId):null;
      const value=field.key==='preferredBuildingId'?(shown?`${shown.building_id} · ${shown.building_name}`:'—'):values[field.key]||'—';
      return <section key={field.key} className="code-preview" data-color="1" data-profile-field={field.key} aria-labelledby={'application-title-'+field.key}>
        <div className="code-preview-content">
          <header>
            <div className="code-preview-title"><h2 id={'application-title-'+field.key} className="text-ui">{field.label}</h2></div>
            <nav aria-label={field.label+'编辑操作'}>
              <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();confirm(field.key);}}>确认</button>
              <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();cancel();}}>取消</button>
              <button type="button" className="ui-input code-edit-button text-ui" title={'编辑'+field.label} aria-pressed={editing} disabled={pending||Boolean(active)||(field.key==='preferredBuildingId'&&!optionsReady)} onClick={event=>{event.stopPropagation();edit(field.key);}}>
                <svg className="icon" width="24" height="24" viewBox="0 0 24 24"><g fill="none" strokeWidth="1.75"><polygon stroke="currentColor" points="13.5 8.5 7.5 14.5 7.5 17.5 10.5 17.5 16.5 11.5"/><path stroke="currentColor" d="M18.0857864,7.08578644 L17.9142136,6.91421356 C17.133165,6.13316498 15.866835,6.13316498 15.0857864,6.91421356 L13.5,8.5 L13.5,8.5 L16.5,11.5 L18.0857864,9.91421356 C18.866835,9.13316498 18.866835,7.86683502 18.0857864,7.08578644 Z"/></g></svg>
              </button>
            </nav>
          </header>
          <div className="code-editor"><pre className="is-active" data-language="application"><code className="hljs language-plaintext" onKeyDown={event=>{
            if(!editing||event.nativeEvent.isComposing)return;
            if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}
            if(event.key==='Enter'&&(field.key!=='note'||event.ctrlKey||event.metaKey)){event.preventDefault();event.stopPropagation();confirm(field.key);}
          }}>{editing?(field.key==='preferredBuildingId'?<select ref={node=>{input.current=node;}} aria-label={field.label} value={draft} disabled={pending} onChange={event=>setDraft(event.target.value)}><option value="">请选择意向楼栋</option>{buildings.map(building=><option key={building.building_id} value={building.building_id}>{building.building_id} · {building.building_name}</option>)}</select>:field.key==='expectedDate'?<input ref={node=>{input.current=node;}} aria-label={field.label} type="date" value={draft} disabled={pending} onChange={event=>setDraft(event.target.value)}/>:<textarea ref={node=>{input.current=node;}} aria-label={field.label} rows={3} maxLength={4000} value={draft} disabled={pending} onChange={event=>setDraft(event.target.value)}/>):value}</code></pre></div>
        </div>
      </section>;
    })}
    {error&&<StudentWarning>{error}</StudentWarning>}
  </div>;
}
