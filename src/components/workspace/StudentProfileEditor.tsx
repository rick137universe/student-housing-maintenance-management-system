'use client';

import {StudentWarning} from './StudentWarning';
import {useLayoutEffect,useRef,useState} from 'react';
import {api} from '@/utils/auth-session';

const fields=[
  {key:'fullName',column:'full_name',label:'姓名'},
  {key:'phone',column:'phone',label:'联系电话'},
  {key:'email',column:'email',label:'邮箱'},
] as const;
type FieldKey=typeof fields[number]['key'];

export function StudentProfileEditor({profile,loading,onSaved,color=0}:{profile:Record<string,unknown>;loading:boolean;onSaved:()=>Promise<void>;color?:number}){
  const [active,setActive]=useState<FieldKey|null>(null);
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const draft=useRef('');
  const saving=useRef(false);
  const root=useRef<HTMLDivElement>(null);
  const codes=useRef<Partial<Record<FieldKey,HTMLElement|null>>>({});

  useLayoutEffect(()=>{
    for(const field of fields){
      const code=codes.current[field.key];
      if(code&&field.key!==active)code.textContent=String(profile[field.column]??'—');
    }
  },[profile,active]);
  useLayoutEffect(()=>{
    if(!active)return;
    const code=codes.current[active];
    if(!code)return;
    code.textContent=draft.current;
    code.focus();
    const selection=code.ownerDocument.getSelection(),range=code.ownerDocument.createRange();
    range.selectNodeContents(code);selection?.removeAllRanges();selection?.addRange(range);
  },[active]);

  function edit(key:FieldKey,column:string){
    if(saving.current||loading||active)return;
    draft.current=String(profile[column]??'');
    setError('');setActive(key);
  }
  function cancel(){if(saving.current)return;setActive(null);setError('');}
  async function confirm(key:FieldKey){
    if(active!==key||saving.current||loading)return;
    const value=draft.current.replace(/[\r\n]+/g,' ').trim();
    if(key==='fullName'&&!value){setError('姓名不能为空。');return;}
    saving.current=true;setPending(true);setError('');
    try{
      await api('profile',{method:'PATCH',body:JSON.stringify({fullName:String(profile.full_name??''),phone:profile.phone??null,email:profile.email??null,[key]:value||null})});
      await onSaved();
      setActive(null);
      root.current?.ownerDocument.dispatchEvent(new Event('dorma-profile-saved'));
    }catch(reason){setError(reason instanceof Error?reason.message:'保存失败，请重试。');}
    finally{saving.current=false;setPending(false);}
  }

  return <div ref={root} data-dorma-profile-editor>
    {fields.map(field=>{
      const editing=active===field.key;
      return <section key={field.key} className="code-preview" data-color={color} data-profile-field={field.key} aria-labelledby={'profile-title-'+field.key}>
        <div className="code-preview-content">
          <header>
            <div className="code-preview-title"><h2 id={'profile-title-'+field.key} className="text-ui">{field.label}</h2></div>
            <nav aria-label={field.label+'编辑操作'}>
              <button type="button" className="code-preview-button text-ui" disabled={!editing||pending||loading} onClick={event=>{event.stopPropagation();void confirm(field.key);}}>确认</button>
              <button type="button" className="code-preview-button text-ui" disabled={!editing||pending||loading} onClick={event=>{event.stopPropagation();cancel();}}>取消</button>
              <button type="button" className="ui-input code-edit-button text-ui" title={'编辑'+field.label} aria-pressed={editing} disabled={pending||loading||Boolean(active)} onClick={event=>{event.stopPropagation();edit(field.key,field.column);}}>
                <svg className="icon" width="24" height="24" viewBox="0 0 24 24"><g fill="none" strokeWidth="1.75"><polygon stroke="currentColor" points="13.5 8.5 7.5 14.5 7.5 17.5 10.5 17.5 16.5 11.5"/><path stroke="currentColor" d="M18.0857864,7.08578644 L17.9142136,6.91421356 C17.133165,6.13316498 15.866835,6.13316498 15.0857864,6.91421356 L13.5,8.5 L13.5,8.5 L16.5,11.5 L18.0857864,9.91421356 C18.866835,9.13316498 18.866835,7.86683502 18.0857864,7.08578644 Z"/></g></svg>
              </button>
            </nav>
          </header>
          <div className="code-editor"><pre className="is-active" data-language="profile"><code
            ref={node=>{codes.current[field.key]=node;}}
            className="hljs language-plaintext"
            style={{outline:'none'}}
            contentEditable={editing&&!pending&&!loading?'plaintext-only':false}
            suppressContentEditableWarning
            role={editing?'textbox':undefined}
            aria-label={editing?field.label:undefined}
            aria-multiline={editing?false:undefined}
            aria-busy={editing?pending:undefined}
            spellCheck={false}
            onInput={event=>{draft.current=event.currentTarget.textContent??'';}}
            onKeyDown={event=>{
              if(!editing||event.nativeEvent.isComposing)return;
              if(event.key==='Enter'){event.preventDefault();event.stopPropagation();void confirm(field.key);}
              if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}
            }}
          >{String(profile[field.column]??'—')}</code></pre></div>
          {editing&&error&&<StudentWarning>{error}</StudentWarning>}
        </div>
      </section>;
    })}
  </div>;
}
