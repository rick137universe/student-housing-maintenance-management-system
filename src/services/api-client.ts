import type { Account } from '@/types/auth';
let account:Account|null=null;
export function readAuthSession(){return account;}
export function saveAuthSession(value:Account|null){account=value;if(typeof window!=='undefined')window.dispatchEvent(new Event('dorma-auth-changed'));}
export async function api<T = unknown>(path:string,options:RequestInit={}):Promise<{data:T;meta?:{page:number;limit:number;total:number}}> {
 const headers=new Headers(options.headers);
 if(options.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 if(options.method&&options.method!=='GET'&&account?.csrfToken)headers.set('X-CSRF-Token',account.csrfToken);
 const response=await fetch('/api/v1/'+path,{...options,headers,credentials:'same-origin',cache:'no-store'});
 const result=await response.json();
 if(!response.ok){if(response.status===401)saveAuthSession(null);throw new Error(result.error?.message+(result.error?.fieldErrors?'：'+Object.entries(result.error.fieldErrors).map(([field,errors])=>`${field} ${Array.isArray(errors)?errors.join('、'):errors}`).join('；'):'')||'请求失败');}
 if(options.method&&options.method!=='GET'&&!path.startsWith('navigation/')&&typeof window!=='undefined')window.dispatchEvent(new Event('dorma-business-saved'));
 return result;
}
