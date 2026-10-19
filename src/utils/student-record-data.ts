import {api,readAuthSession} from '@/utils/auth-session';

export type StudentRow=Record<string,unknown>;
type Result={data:StudentRow|StudentRow[];meta?:{page:number;limit:number;total:number}};

// A cache belongs to one mounted student session. It is never persisted or shared between accounts.
export class StudentRecordData{
  private cache=new Map<string,{result:Result;time:number}>();
  private pending=new Map<string,Promise<Result>>();
  private generation=0;
  constructor(private readonly accountId:string,private readonly csrfToken:string|undefined,private readonly identifiers:Record<string,string>){}
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
    const request=api<StudentRow|StudentRow[]>(path).then(result=>{
      if(!this.isCurrent())throw new Error('登录状态已变更，请重新进入工作台。');
      if(generation===this.generation){
        this.remember(path,result);
        const resource=path.split('?')[0],identifier=this.identifiers[resource];
        if(identifier&&Array.isArray(result.data))for(const row of result.data)this.remember(`${resource}/${row[identifier]}`,{data:row});
      }
      return result;
    }).catch(reason=>{if(generation===this.generation)this.invalidate();throw reason;})
      .finally(()=>{if(this.pending.get(path)===request)this.pending.delete(path);});
    this.pending.set(path,request);return request;
  }
}
