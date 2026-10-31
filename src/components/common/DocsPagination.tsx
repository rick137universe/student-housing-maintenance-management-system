'use client';

import type {MouseEvent} from 'react';

// The surrounding record list and Docs section supply the mother's native spacing.
// Keep links directly inside a prose paragraph to inherit its inline-code link rules.
export function DocsPagination({page,total,pageSize=20,pageUrl,navigate,disabled=false}:{page:number;total:number;pageSize?:number;pageUrl:(page:number)=>string;navigate:(url:string)=>void;disabled?:boolean}){
 const pages=Math.ceil(total/pageSize);
 if(pages<=1)return null;
 function link(label:string,target:number,available:boolean){
  if(disabled||!available)return <span role="link" aria-disabled="true"><code>{label}</code></span>;
  const url=pageUrl(target);
  function click(event:MouseEvent<HTMLAnchorElement>){event.stopPropagation();if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(url);}
  return <a className="color-fg" href={url} target="_top" rel={target<page?'prev':'next'} onClick={click}><code>{label}</code></a>;
 }
 return <nav className="formatted-text" aria-label="记录分页" data-dorma-pagination><p>{link('上一页',page-1,page>1)}{' '}{link('下一页',page+1,page<pages)}{' '}<code aria-current="page">第{page}/{pages}页</code></p></nav>;
}
