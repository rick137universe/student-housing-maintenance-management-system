'use client';

import {StudentWarning} from './StudentWarning';
import {Fragment,useLayoutEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {api,saveAuthSession} from '@/utils/auth-session';

const fields=[
  {key:'currentPassword',label:'原密码',autocomplete:'current-password'},
  {key:'newPassword',label:'新密码',autocomplete:'new-password'},
  {key:'confirmation',label:'确认新密码',autocomplete:'new-password'},
] as const;
type FieldKey=typeof fields[number]['key'];

export function StudentPasswordEditor({color=0}:{color?:number}={}){
  const router=useRouter();
  const [values,setValues]=useState({currentPassword:'',newPassword:''});
  const [active,setActive]=useState<FieldKey|null>(null);
  const [draft,setDraft]=useState('');
  const [pending,setPending]=useState(false);
  const [error,setError]=useState<{field:FieldKey;message:string}|null>(null);
  const saving=useRef(false);
  const input=useRef<HTMLInputElement>(null);
  useLayoutEffect(()=>{if(active){input.current?.focus();input.current?.select();}},[active]);

  function edit(key:FieldKey){
    if(active||saving.current)return;
    setDraft(key==='confirmation'?'':values[key]);setError(null);setActive(key);
  }
  function cancel(){if(saving.current)return;setDraft('');setError(null);setActive(null);}
  function warn(field:FieldKey,message:string){
    setError({field,message});
    if(active!==field){setDraft(field==='confirmation'?'':values[field]);setActive(field);}
  }
  async function confirm(key:FieldKey){
    if(active!==key||saving.current)return;
    if(!draft){warn(key,'请输入'+fields.find(field=>field.key===key)!.label+'。');return;}
    if(key==='newPassword'&&draft.length<8){warn(key,'新密码至少需要8个字符。');return;}
    if(key==='currentPassword'){
      saving.current=true;setPending(true);setError(null);
      try{
        await api('profile/password/verify',{method:'POST',body:JSON.stringify({currentPassword:draft})});
        setValues(current=>({...current,currentPassword:draft}));setDraft('');setActive(null);
      }catch(reason){warn(key,reason instanceof Error?reason.message:'密码校验失败，请重试。');}
      finally{saving.current=false;setPending(false);}
      return;
    }
    if(key==='newPassword'){
      setValues(current=>({...current,[key]:draft}));setDraft('');setError(null);setActive(null);return;
    }
    if(!values.currentPassword){warn('currentPassword','请先填写并确认原密码。');return;}
    if(!values.newPassword){warn('newPassword','请先填写并确认新密码。');return;}
    if(draft!==values.newPassword){warn('confirmation','两次输入的新密码不一致。');return;}
    saving.current=true;setPending(true);setError(null);
    try{
      await api('profile/password',{method:'POST',body:JSON.stringify(values)});
      setValues({currentPassword:'',newPassword:''});setDraft('');setActive(null);
      saveAuthSession(null);router.replace('/login');
    }catch(reason){
      const message=reason instanceof Error?reason.message:'修改失败，请重试。';
      warn(message==='当前密码不正确'?'currentPassword':'confirmation',message);
    }
    finally{saving.current=false;setPending(false);}
  }

  return <div data-dorma-password-editor>
    {fields.map(field=>{
      const editing=active===field.key;
      const entered=field.key!=='confirmation'&&Boolean(values[field.key]);
      const fieldError=error?.field===field.key?error.message:null;
      return <Fragment key={field.key}><section className="code-preview" data-color={color} data-password-field={field.key} aria-labelledby={'password-title-'+field.key}>
        <div className="code-preview-content">
          <header>
            <div className="code-preview-title"><h2 id={'password-title-'+field.key} className="text-ui">{field.label}</h2></div>
            <nav aria-label={field.label+'编辑操作'}>
              <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();void confirm(field.key);}}>确认</button>
              <button type="button" className="code-preview-button text-ui" disabled={!editing||pending} onClick={event=>{event.stopPropagation();cancel();}}>取消</button>
              <button type="button" className="ui-input code-edit-button text-ui" title={'编辑'+field.label} aria-pressed={editing} disabled={pending||Boolean(active)||(field.key!=='currentPassword'&&!values.currentPassword)} onClick={event=>{event.stopPropagation();edit(field.key);}}>
                <svg className="icon" width="24" height="24" viewBox="0 0 24 24"><g fill="none" strokeWidth="1.75"><polygon stroke="currentColor" points="13.5 8.5 7.5 14.5 7.5 17.5 10.5 17.5 16.5 11.5"/><path stroke="currentColor" d="M18.0857864,7.08578644 L17.9142136,6.91421356 C17.133165,6.13316498 15.866835,6.13316498 15.0857864,6.91421356 L13.5,8.5 L13.5,8.5 L16.5,11.5 L18.0857864,9.91421356 C18.866835,9.13316498 18.866835,7.86683502 18.0857864,7.08578644 Z"/></g></svg>
              </button>
            </nav>
          </header>
          <div className="code-editor"><pre className="is-active" data-language="password"><code className="hljs language-plaintext">{editing?<input
            ref={input}
            type="password"
            name={field.key}
            aria-label={field.label}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError?'password-error-'+field.key:undefined}
            autoComplete={field.autocomplete}
            maxLength={128}
            spellCheck={false}
            disabled={pending}
            value={draft}
            onChange={event=>setDraft(event.target.value)}
            onBlur={event=>{
              if(field.key!=='currentPassword'||!draft)return;
              const next=event.relatedTarget as HTMLElement|null;
              if(next&&event.currentTarget.closest('section')?.querySelector('nav')?.contains(next))return;
              void confirm(field.key);
            }}
            onKeyDown={event=>{
              if(event.nativeEvent.isComposing)return;
              if(event.key==='Enter'){event.preventDefault();event.stopPropagation();void confirm(field.key);}
              if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}
            }}
          />:entered?'••••••••':'—'}</code></pre></div>
        </div>
      </section>{fieldError&&<StudentWarning id={'password-error-'+field.key}>{fieldError}</StudentWarning>}</Fragment>;
    })}
  </div>;
}
