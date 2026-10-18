import {api,readAuthSession} from '@/utils/auth-session';

export type FinanceRow=Record<string,unknown>;
type Result={data:FinanceRow|FinanceRow[];meta?:{page:number;limit:number;total:number}};

export function financeListPath(action:string,page=1){
  const query=new URLSearchParams({page:String(page),limit:'20'});
  if(action==='action-2')query.set('unpaid','true');
  return (action==='action-3'?'payments':'bills')+'?'+query;
}

// One instance belongs to one mounted, authenticated student workspace. Nothing is persisted.
export class StudentFinanceData{
  private cache=new Map<string,{result:Result;time:number}>();
  private pending=new Map<string,Promise<Result>>();
  private generation=0;
  constructor(private readonly accountId:string,private readonly csrfToken?:string){}

  private isCurrent(){const account=readAuthSession();return account?.id===this.accountId&&account.csrfToken===this.csrfToken;}
  peek(path:string){return this.isCurrent()?this.cache.get(path)?.result:undefined;}
  invalidate(){this.generation++;this.cache.clear();this.pending.clear();}

  private remember(path:string,result:Result){
    this.cache.delete(path);this.cache.set(path,{result,time:Date.now()});
    while(this.cache.size>100)this.cache.delete(this.cache.keys().next().value!);
  }

  load(path:string,force=false):Promise<Result>{
    if(!this.isCurrent())return Promise.reject(new Error('登录状态已变更，请重新进入工作台。'));
    const pending=this.pending.get(path);if(pending)return pending;
    const cached=this.cache.get(path);
    if(!force&&cached&&Date.now()-cached.time<5000)return Promise.resolve(cached.result);
    const generation=this.generation;
    const request=api<FinanceRow|FinanceRow[]>(path).then(result=>{
      if(!this.isCurrent())throw new Error('登录状态已变更，请重新进入工作台。');
      if(generation===this.generation){
        this.remember(path,result);
        // These scoped list endpoints already return the complete detail fields.
        if(Array.isArray(result.data))for(const row of result.data){
          const resource=path.startsWith('payments?')?'payments':'bills',id=row[resource==='payments'?'payment_id':'bill_id'];
          this.remember(`${resource}/${id}`,{data:row});
        }
      }
      return result;
    }).catch(reason=>{
      if(generation===this.generation)this.invalidate();
      throw reason;
    }).finally(()=>{if(this.pending.get(path)===request)this.pending.delete(path);});
    this.pending.set(path,request);return request;
  }

  async prefetchLists(){
    await Promise.allSettled(['action-1','action-2','action-3'].map(action=>this.load(financeListPath(action))));
  }
}
