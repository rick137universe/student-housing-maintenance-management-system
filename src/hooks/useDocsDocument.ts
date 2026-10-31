'use client';
import {useLayoutEffect,type RefObject} from 'react';
import type {WorkspacePage} from '@/types/workspace';
const palette=['red','corail','orange','yellow','citrus','lime'];

export function useRepairDocument(root:RefObject<HTMLDivElement|null>,entry:WorkspacePage,options:{key:string;editor?:boolean;title?:string;url?:string;listUrl:string;navigate:(url:string)=>void}){
 const {key,editor,title,url,listUrl,navigate}=options;
 useLayoutEffect(()=>{
  const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!,business=root.current!.closest('[data-dorma-business]')!;
  const content=info.querySelector('.docs-info-content.formatted-text')!,parent=business.parentNode!,sibling=business.nextSibling;
  if(title&&!editor)content.append(business);else content.after(business);
  const heading=info.querySelector<HTMLAnchorElement>('h1 a')!,breadcrumb=info.querySelector('.docs-breadcrumb')!,description=info.querySelector('[data-dorma-description]')!;
  const saved={text:heading.textContent,href:heading.getAttribute('href')!,title:heading.title,description:description.textContent,documentTitle:doc.title};
  let clonedBreadcrumb:HTMLElement|undefined,previous:HTMLAnchorElement|undefined,back:HTMLAnchorElement|undefined,next:Element|undefined,nextHeading:Element|undefined,empty:HTMLElement|undefined,emptyHeading:Element|undefined;
  const returnToList=(event:globalThis.MouseEvent)=>{event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(listUrl);};
  const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};
  if(title){
   heading.textContent=title;heading.title=title;heading.href=url!;description.textContent=editor?'填写并确认评分和评价内容，完成后提交服务评价。':'查看本次报修的详细信息及处理结果。';doc.querySelector('title')!.textContent=title+' | 学生工作台 | FLight';heading.addEventListener('click',stay);
   clonedBreadcrumb=breadcrumb.cloneNode(true) as HTMLElement;
   const arrow=doc.createElement('span'),link=doc.createElement('a');arrow.className='docs-breadcrumb-arrow';arrow.textContent='\uE0B1';link.textContent=entry.label;link.href=listUrl;link.title=entry.label;
   link.addEventListener('click',returnToList);clonedBreadcrumb.querySelector('p')!.append(' ',arrow,' ',link);breadcrumb.replaceWith(clonedBreadcrumb);
   previous=info.querySelector<HTMLAnchorElement>('.prev-link a')!;back=previous.cloneNode(true) as HTMLAnchorElement;back.href=listUrl;back.title=entry.label;back.removeAttribute('data-id');back.className='text-ui color-'+palette[entry.color];back.dataset.color=String(entry.color);
   for(const node of [...back.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();back.append(entry.label);back.addEventListener('click',returnToList);previous.replaceWith(back);
   if(!editor){
    next=info.querySelector('.next-link')!;nextHeading=info.querySelector('.prev-next-heading')!.children[1];empty=doc.createElement('li');emptyHeading=nextHeading.cloneNode(false) as Element;next.replaceWith(empty);nextHeading.replaceWith(emptyHeading);
   }
  }
  doc.scrollingElement?.scrollTo({top:0,behavior:'instant'});doc.dispatchEvent(new CustomEvent('dorma-student-content-change',{detail:{key}}));
  return()=>{
   heading.removeEventListener('click',stay);back?.removeEventListener('click',returnToList);
   if(info.isConnected){
    if(clonedBreadcrumb){clonedBreadcrumb.replaceWith(breadcrumb);back!.replaceWith(previous!);heading.textContent=saved.text;heading.href=saved.href;heading.title=saved.title;description.textContent=saved.description;doc.querySelector('title')!.textContent=saved.documentTitle;}
    if(empty){empty.replaceWith(next!);emptyHeading!.replaceWith(nextHeading!);}
    parent.insertBefore(business,sibling?.parentNode===parent?sibling:null);
   }
  };
 },[root,entry.color,entry.label,key,editor,title,url,listUrl,navigate]);
}
