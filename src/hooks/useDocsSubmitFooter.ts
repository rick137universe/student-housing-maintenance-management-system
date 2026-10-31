'use client';
import {useLayoutEffect,useRef,type RefObject} from 'react';

export function useRepairSubmitFooter(root:RefObject<HTMLDivElement|null>,label:string,disabled:boolean,submit:()=>Promise<void>){
 const action=useRef(submit),link=useRef<HTMLAnchorElement|null>(null);
 useLayoutEffect(()=>{action.current=submit;});
 useLayoutEffect(()=>{
  const info=root.current!.closest('.docs-info')!,original=info.querySelector<HTMLAnchorElement>('.next-link a')!,button=original.cloneNode(true) as HTMLAnchorElement;
  button.removeAttribute('data-id');button.setAttribute('role','button');button.href=info.querySelector<HTMLAnchorElement>('h1 a')!.href;button.title=label;
  for(const node of [...button.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();button.prepend(label);
  const send=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();void action.current();};
  const keyboard=(event:KeyboardEvent)=>{if(event.key===' '){event.preventDefault();event.stopPropagation();void action.current();}};
  button.addEventListener('click',send);button.addEventListener('keydown',keyboard);original.replaceWith(button);link.current=button;
  return()=>{button.removeEventListener('click',send);button.removeEventListener('keydown',keyboard);link.current=null;if(info.isConnected)button.replaceWith(original);};
 },[root,label]);
 useLayoutEffect(()=>{link.current?.setAttribute('aria-disabled',String(disabled));link.current?.setAttribute('aria-busy',String(disabled));},[disabled]);
}
