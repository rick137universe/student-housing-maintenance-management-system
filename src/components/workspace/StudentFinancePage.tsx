'use client';

import {Fragment,useCallback,useEffect,useLayoutEffect,useRef,useState,type FormEvent,type MouseEvent,type ReactNode} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {api} from '@/utils/auth-session';
import {studentPages} from '@/data/student-pages';
import {valueLabels} from '@/data/workspace-actions';
import {financeListPath,type StudentFinanceData} from '@/utils/student-finance-data';

type Row=Record<string,unknown>;
type Entry=typeof studentPages[number];
const billFields=[['bill_id','账单编号'],['billing_period','账期'],['student_number','学号'],['full_name','姓名'],['accommodation_fee','住宿费'],['utility_fee','水电费'],['total_amount','总金额'],['paid_amount','已缴金额'],['outstanding_amount','待缴金额'],['bill_status','账单状态'],['due_date','缴费截止日期'],['generated_at','生成时间'],['checked_at','核对时间']] as const;
const paymentFields=[['payment_id','缴费编号'],['bill_id','账单编号'],['student_number','学号'],['full_name','姓名'],['amount','金额'],['paid_at','缴费时间'],['payment_method','缴费方式']] as const;
const dateTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function display(key:string,value:unknown){
  if(value===null||value===undefined||value==='')return '—';
  if(['paid_at','generated_at','checked_at'].includes(key)){
    const date=new Date(String(value));
    return Number.isNaN(date.getTime())?String(value):dateTime.format(date);
  }
  return valueLabels[String(value)]??String(value);
}
function Arrow(){return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="icon"><g fill="none" fillRule="evenodd"><polygon fill="currentColor" fillRule="nonzero" points="17.737 11.987 12.5 17.225 11.263 15.987 14.388 12.862 6.5 12.862 6.5 11.112 14.388 11.112 11.263 7.987 12.5 6.75"/></g></svg>;}

export function StudentFinancePage({actionId,data}:{actionId:string;data:StudentFinanceData}){
  const router=useRouter(),params=useSearchParams();
  const entry=studentPages.find(entry=>entry.feature==='payment'&&entry.action===actionId)!;
  const record=params.get('record');
  const requestedPage=Number(params.get('page')??1);
  const page=Number.isSafeInteger(requestedPage)&&requestedPage>0&&requestedPage<=100000?requestedPage:1;
  const query=new URLSearchParams();
  if(page>1)query.set('page',String(page));
  const listUrl=entry.url+(query.size?'?'+query:'');
  const navigate=useCallback((url:string)=>{router.push(url,{scroll:false});},[router]);
  return <FinanceContent key={[actionId,record,page].join(':')} data={data} entry={entry} record={record} page={page} listUrl={listUrl} navigate={navigate}/>;
}

function FinanceContent({data,entry,record,page,listUrl,navigate}:{data:StudentFinanceData;entry:Entry;record:string|null;page:number;listUrl:string;navigate:(url:string)=>void}){
  const root=useRef<HTMLDivElement>(null);
  const router=useRouter(),request=useRef({version:0});
  const payments=entry.action==='action-3',resource=payments?'payments':'bills';
  const path=record!==null?`${resource}/${record}`:financeListPath(entry.action,page);
  const [result,setResult]=useState(()=>data.peek(path));
  const rows=Array.isArray(result?.data)?result.data:[],detail=result&&!Array.isArray(result.data)?result.data:null,total=result?.meta?.total??rows.length;
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[paying,setPaying]=useState(false);
  const detailTitle=payments?'缴费记录详情':'账单详情';
  const load=useCallback(async(force=false)=>{
    const state=request.current,current=++state.version;
    setLoading(true);setError('');
    try{
      if(record!==null&&(!/^[1-9]\d{0,18}$/.test(record)||(record.length===19&&record>'9223372036854775807')))throw new Error('记录不存在或不可访问。');
      const result=await data.load(path,force);
      if(current===state.version)setResult(result);
    }catch(reason){if(current===state.version){setResult(undefined);setError(reason instanceof Error?reason.message:'读取失败，请重试。');}}
    finally{if(current===state.version)setLoading(false);}
  },[data,path,record]);
  useEffect(()=>{
    const state=request.current;
    void load();
    const refresh=()=>{if(root.current?.ownerDocument.visibilityState==='visible')void load();};
    window.addEventListener('focus',refresh);
    return()=>{state.version++;window.removeEventListener('focus',refresh);};
  },[load]);

  // Keep the copied Docs shell, preview and typography; only replace this page's heading and parent link.
  useLayoutEffect(()=>{
    if(record===null)return;
    const doc=root.current!.ownerDocument,info=root.current!.closest('.docs-info')!;
    const business=root.current!.closest('[data-dorma-business]')!,content=info.querySelector('.docs-info-content.formatted-text')!;
    content.append(business);
    const title=info.querySelector<HTMLAnchorElement>('h1 a')!,description=info.querySelector<HTMLElement>('[data-dorma-description]')!,breadcrumb=info.querySelector<HTMLAnchorElement>('.docs-breadcrumb a')!;
    const previous={title:title.textContent,href:title.getAttribute('href')!,tooltip:title.title,description:description.textContent,breadcrumb:breadcrumb.textContent,parent:breadcrumb.getAttribute('href')!,parentTitle:breadcrumb.title,documentTitle:doc.title};
    title.textContent=detailTitle;title.title=detailTitle;title.href=listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(record);
    description.textContent=payments?'查看本次缴费的详细信息。':'查看账单费用、缴费状态和剩余金额。';
    breadcrumb.textContent=entry.label;breadcrumb.title=entry.label;breadcrumb.href=listUrl;
    doc.title=detailTitle+' · 学生工作台';
    const returnToList=(event:globalThis.MouseEvent)=>{
      if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      event.preventDefault();event.stopPropagation();navigate(listUrl);
    };
    const stay=(event:globalThis.MouseEvent)=>{event.preventDefault();event.stopPropagation();};
    const previousLink=info.querySelector<HTMLAnchorElement>('.prev-link a')!,backLink=previousLink.cloneNode(true) as HTMLAnchorElement;
    backLink.href=listUrl;backLink.title=entry.label;backLink.dataset.id=entry.id;backLink.dataset.color=String(entry.color);backLink.className='text-ui color-orange';
    for(const node of [...backLink.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();
    backLink.append(entry.label);previousLink.replaceWith(backLink);
    const nextItem=info.querySelector('.next-link')!,nextHeading=info.querySelector('.prev-next-heading')!.children[1];
    const emptyItem=doc.createElement('li'),emptyHeading=nextHeading.cloneNode(false) as HTMLElement;
    emptyItem.setAttribute('aria-hidden','true');emptyHeading.setAttribute('aria-hidden','true');
    nextItem.replaceWith(emptyItem);nextHeading.replaceWith(emptyHeading);backLink.addEventListener('click',returnToList);
    breadcrumb.addEventListener('click',returnToList);title.addEventListener('click',stay);
    return()=>{
      breadcrumb.removeEventListener('click',returnToList);title.removeEventListener('click',stay);
      backLink.removeEventListener('click',returnToList);
      if(info.isConnected){
        backLink.replaceWith(previousLink);emptyItem.replaceWith(nextItem);emptyHeading.replaceWith(nextHeading);
        content.after(business);
        title.textContent=previous.title;title.href=previous.href;title.title=previous.tooltip;description.textContent=previous.description;
        breadcrumb.textContent=previous.breadcrumb;breadcrumb.href=previous.parent;breadcrumb.title=previous.parentTitle;doc.title=previous.documentTitle;
      }
    };
  },[record,detailTitle,payments,entry.label,entry.id,entry.color,listUrl,navigate]);

  useLayoutEffect(()=>{
    // The Docs content starts below its header. Aligning that element scrolls past the page's own top spacing.
    root.current?.ownerDocument.scrollingElement?.scrollTo({top:0,behavior:'instant'});
  },[]);

  function link(url:string,event:MouseEvent<HTMLAnchorElement>){
    event.stopPropagation();
    if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();navigate(url);
  }
  function navigation(label:ReactNode,url:string,key:string){return <li key={key}><a className="text-ui color-orange" data-color="2" href={url} target="_top" onPointerEnter={()=>router.prefetch(url)} onFocus={()=>router.prefetch(url)} onClick={event=>link(url,event)}>{label}<Arrow/></a></li>;}
  function pageUrl(next:number){return entry.url+(next>1?'?page='+next:'');}

  return <div ref={root} className={record===null?'docs-info-content':undefined} data-dorma-live-workspace data-dorma-finance aria-busy={loading}>
    {error&&<p role="alert">{error}</p>}
    {result&&(record===null?<>
      <ul className="links-list links-list-boxed" data-dorma-finance-list>{rows.map(row=>{
        const id=String(row[payments?'payment_id':'bill_id']);
        const summary=payments?`${display('amount',row.amount)} · ${display('paid_at',row.paid_at)}`:`${display('billing_period',row.billing_period)} · ${display('total_amount',row.total_amount)} · ${display('bill_status',row.bill_status)}`;
        return navigation(summary,listUrl+(listUrl.includes('?')?'&':'?')+'record='+encodeURIComponent(id),id);
      })}</ul>
      {!rows.length&&<p>暂无记录。</p>}
      {total>20&&<><p>共 {total} 条 · 第 {page} 页</p><div className="ui-controls"><button disabled={page===1} onClick={()=>navigate(pageUrl(page-1))}>上一页</button><button disabled={page*20>=total} onClick={()=>navigate(pageUrl(page+1))}>下一页</button></div></>}
    </>:detail&&<>
      <div data-dorma-finance-values>{(payments?paymentFields:billFields).map(([key,label])=><Fragment key={key}><h3>{label}</h3><pre><code className="hljs language-plaintext">{display(key,detail[key])}</code></pre></Fragment>)}</div>
      {entry.action==='action-2'&&detail.bill_status!=='paid'&&(paying?<PaymentForm bill={detail} onCancel={()=>setPaying(false)} onSaved={async()=>{data.invalidate();await Promise.all([load(true),data.prefetchLists()]);setPaying(false);}}/>:<div className="ui-controls"><button onClick={()=>setPaying(true)}>测试支付</button></div>)}
    </>)}
  </div>;
}

function PaymentForm({bill,onCancel,onSaved}:{bill:Row;onCancel:()=>void;onSaved:()=>Promise<void>}){
  const [amount,setAmount]=useState(String(bill.outstanding_amount)),[result,setResult]=useState('succeeded'),[pending,setPending]=useState(false),[error,setError]=useState('');
  const request=useRef<{amount:string;result:string;idempotencyKey:string}|null>(null),saving=useRef(false),root=useRef<HTMLFormElement>(null);
  useEffect(()=>{root.current?.scrollIntoView({block:'start'});},[]);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving.current)return;
    saving.current=true;setPending(true);setError('');
    if(!request.current||request.current.amount!==amount||request.current.result!==result)request.current={amount,result,idempotencyKey:crypto.randomUUID()};
    try{
      await api(`bills/${bill.bill_id}/pay`,{method:'POST',body:JSON.stringify(request.current)});
      await onSaved();
    }catch(reason){setError(reason instanceof Error?reason.message:'支付失败，请重试。');}
    finally{saving.current=false;setPending(false);}
  }
  return <form ref={root} className="formatted-text" onSubmit={event=>void submit(event)} aria-label="测试支付">
    <h3>测试支付</h3><p>仅记录测试账务，不产生真实扣款。</p>
    <h3><label htmlFor="student-payment-amount">支付金额</label></h3>
    <pre><code className="hljs language-plaintext"><input id="student-payment-amount" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" value={amount} disabled={pending} onChange={event=>setAmount(event.target.value)} style={{display:'block',width:'100%',font:'inherit',color:'inherit',background:'transparent',border:0,padding:0,outline:'none',borderRadius:0}}/></code></pre>
    <h3><label htmlFor="student-payment-result">测试支付结果</label></h3>
    <select id="student-payment-result" className="ui-input" value={result} disabled={pending} onChange={event=>setResult(event.target.value)}><option value="succeeded">成功并入账</option><option value="failed">失败，不记账</option><option value="cancelled">取消，不记账</option></select>
    {error&&<p role="alert">{error}</p>}
    <div className="ui-controls"><button type="button" disabled={pending} onClick={onCancel}>取消</button><button disabled={pending}>{pending?'正在提交…':'确认支付'}</button></div>
  </form>;
}
