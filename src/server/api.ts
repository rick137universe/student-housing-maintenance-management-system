import 'server-only';
import { z, ZodError } from 'zod';
import { query, transaction } from './db';
import { AppError, requireValue } from './errors';
import { accountSql, currentAccount, digest, mapAccount, sameOrigin, token, verifyPassword, audit, authorize } from './security';
import { isResourceKind, listResource, resourceWrite, resourceDefinitions, type Row } from './resources';
import { submitAccommodation, reviewAccommodation, accommodationBedOptions, submitRepair, repairAction, repairHistory, payBill, generateBills } from './workflows';
import { profile, changeProfile, changePassword, verifyCurrentPassword, accountWrite, permissionWrite, authorizationWrite, adminSetting, announcementWrite, billWrite, billReview, statistics, importCsv, encodeCsv } from './system';
import { backupPolicy, enqueueBackup, health } from './tasks';

const cookie=(value:string,request:Request,clear=false)=>`dorma_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${clear?0:28800}${new URL(process.env.APP_ORIGIN??request.url).protocol==='https:'?'; Secure':''}`;
function response(data:unknown,extra:HeadersInit={},status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...extra}});}
async function readBody(request:Request){
 if(Number(request.headers.get('content-length')??0)>5*1024*1024)throw new AppError(413,'TOO_LARGE','请求超过5MB');
 const reader=request.body?.getReader();if(!reader)return '';let size=0;const chunks:Uint8Array[]=[];
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>5*1024*1024){await reader.cancel();throw new AppError(413,'TOO_LARGE','请求超过5MB');}chunks.push(part.value);}
 return Buffer.concat(chunks).toString('utf8');
}
async function login(request:Request,input:unknown){
 const data=z.object({username:z.string().trim().min(1).max(64),password:z.string().min(1).max(128)}).strict().parse(input);
 const source=process.env.TRUST_PROXY==='true'?(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0,128)??'local'):'local';
 const failures=Number((await query(`SELECT count(*) FROM login_attempts WHERE NOT succeeded AND attempted_at>now()-interval '15 minutes' AND (username=$1 OR source=$2)`,[data.username,source])).rows[0].count);
 if(failures>=10)throw new AppError(429,'RATE_LIMITED','登录失败次数过多，请15分钟后重试');
 const row=(await query(`${accountSql} WHERE a.username=$1`,[data.username])).rows[0];
 const valid=row&&row.account_status==='active'&&await verifyPassword(data.password,row.password_hash);
 await query('INSERT INTO login_attempts(username,source,succeeded) VALUES($1,$2,$3)',[data.username,source,Boolean(valid)]);
 if(!valid)throw new AppError(401,'BAD_CREDENTIALS','账号或密码不正确，或账号已停用');
 const sessionToken=token();const csrfToken=token();const account=mapAccount(row);
 await transaction(async c=>{await query('INSERT INTO auth_sessions(token_hash,account_id,csrf_token,expires_at) VALUES($1,$2,$3,now()+interval \'8 hours\')',[digest(sessionToken),account.id,csrfToken],c);await audit(c,account,'login','accounts',account.id);});
 return response({data:{...account,csrfToken}},{'Set-Cookie':cookie(sessionToken,request)});
}
export async function handle(request:Request,path:string[]) {
 try{
  const [resource,id,action]=path;const method=request.method;const params=new URL(request.url).searchParams;
  if(path.length>3)throw new AppError(404,'NOT_FOUND','接口不存在');
  if(resource==='health'&&method==='GET')return response({data:await health()});
  if(method!=='GET')sameOrigin(request);
  const raw=method==='GET'?'':await readBody(request);
  let body:unknown={};if(raw&&!((resource==='import')&&request.headers.get('content-type')?.includes('text/csv'))){
   if(!request.headers.get('content-type')?.includes('application/json'))throw new AppError(415,'CONTENT_TYPE','请使用 application/json');
   try{body=JSON.parse(raw);}catch{throw new AppError(400,'INVALID_JSON','JSON 格式无效');}
  }
  if(resource==='auth'&&id==='login'&&method==='POST')return await login(request,body);
  const account=await currentAccount(request);
  if(method!=='GET'&&request.headers.get('x-csrf-token')!==account.csrfToken)throw new AppError(403,'CSRF_REJECTED','会话校验失败，请刷新后重试');
  if(resource==='auth'){
   if(id==='me'&&method==='GET')return response({data:account});
   if(id==='logout'&&method==='POST'){
    const sessionCookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('dorma_session='))?.slice(14);
    if(sessionCookie)await query('DELETE FROM auth_sessions WHERE token_hash=$1',[digest(sessionCookie)]);
    return response({data:{loggedOut:true}},{'Set-Cookie':cookie('',request,true)});
   }
  }
  if(resource==='profile'){
   if(id==='password'&&action==='verify'&&method==='POST')return response({data:await verifyCurrentPassword(account,body)});
   if(method==='GET'){await authorize(account,'profile','read');return response({data:await profile(account)});}
   if(id==='password'&&!action&&method==='POST')return response({data:await changePassword(account,body)},{'Set-Cookie':cookie('',request,true)});
   if(method==='PATCH')return response({data:await changeProfile(account,body)});
  }
  if(resource==='statistics'&&method==='GET'){const stats=await statistics(account,params);if(id==='export'){
   const rows:Row[]=[...Object.entries(stats.repairs).map(([metric,value])=>({category:'报修统计',object:'汇总',metric,value})),{category:'欠费统计',object:'汇总',metric:'outstandingAmount',value:stats.outstandingAmount}];
   for(const building of stats.buildings)for(const [metric,value] of Object.entries(building))rows.push({category:'楼栋统计',object:building.building_id,metric,value});
   for(const month of stats.workload)for(const [metric,value] of Object.entries(month))rows.push({category:'维修工作量',object:month.month,metric,value});
   return new Response(encodeCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="statistics.csv"','Cache-Control':'no-store'}});
  }return response({data:stats});}
  if(resource==='import'&&method==='POST')return response({data:await importCsv(account,id??'',raw)});
  if(resource==='export'&&method==='GET'){
   if(action==='template'){requireValue(isResourceKind(id??''),'不存在此模板',404);await authorize(account,'resources','write');const def=resourceDefinitions[id as keyof typeof resourceDefinitions];return new Response(Object.keys(def.schema.shape).join(',')+'\r\n',{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${id}-template.csv"`}});}
   const rows:Row[]=[];let page=1;while(true){const result=await listResource(account,id??'',new URLSearchParams({...Object.fromEntries(params),page:String(page),limit:'100'}));rows.push(...result.data as Row[]);if(rows.length>100000)throw new AppError(400,'TOO_LARGE','导出超过10万条，请缩小筛选范围');if(rows.length>=result.meta!.total)break;page++;}
   return new Response(encodeCsv(rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="${id}.csv"`,'Cache-Control':'no-store'}});
  }
  if(method==='GET'){
   if((resource==='applications'||resource==='changes')&&id&&action==='beds')return response(await accommodationBedOptions(account,resource,id,params));
   if(resource==='repairs'&&id&&action==='history')return response({data:await repairHistory(account,id)});
   return response(await listResource(account,resource,params,id));
  }
  let data:unknown;
  if(isResourceKind(resource))data=await resourceWrite(account,resource,method,id,body);
  else if((resource==='applications'||resource==='changes')&&method==='POST')data=id&&action==='review'?await reviewAccommodation(account,resource,id,body):!id?await submitAccommodation(account,resource,body):undefined;
  else if(resource==='repairs'&&method==='POST')data=id&&action?await repairAction(account,id,action,body):!id?await submitRepair(account,body):undefined;
  else if(resource==='bills'){
   if(id==='generate'&&method==='POST')data=await generateBills(account,z.object({period:z.string()}).strict().parse(body).period);
   else if(id&&action==='pay'&&method==='POST')data=await payBill(account,id,body);
   else if(id&&['check','remind'].includes(action)&&method==='POST')data=await billReview(account,id,action);
   else if(!action&&['POST','PATCH'].includes(method))data=await billWrite(account,method,id,body);
  }else if(resource==='accounts'&&['POST','PATCH'].includes(method))data=await accountWrite(account,method,id,body);
  else if(resource==='permissions'&&method==='POST')data=await permissionWrite(account,body);
  else if(resource==='authorizations'&&['POST','DELETE'].includes(method))data=await authorizationWrite(account,method,body);
  else if(resource==='settings'&&id&&method==='PATCH')data=await adminSetting(account,id,body);
  else if(resource==='announcements'&&['POST','PATCH'].includes(method))data=await announcementWrite(account,method,id,body);
  else if(resource==='notifications'&&id&&action==='read'&&method==='POST'){
   await authorize(account,'notifications','write');const result=await query('UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE notification_id=$1 AND recipient_account_id=$2 RETURNING notification_id',[id,account.id]);requireValue(result.rowCount,'通知不存在',404);data=result.rows[0];
  }else if(resource==='backup-policies'&&['POST','PATCH'].includes(method))data=await backupPolicy(account,id,body);
  else if(resource==='backups'&&method==='POST'&&!id)data=await enqueueBackup(account,'backup',body);
  else if(resource==='backups'&&method==='POST'&&id==='restore')data=await enqueueBackup(account,'restore',body);
  requireValue(data!==undefined,'接口或操作不存在',404);return response({data});
 }catch(error){
  if(error instanceof AppError)return response({error:{code:error.code,message:error.message}},{},error.status);
  if(error instanceof ZodError)return response({error:{code:'VALIDATION_ERROR',message:'请检查输入内容',fieldErrors:error.flatten().fieldErrors}},{},400);
  const code=(error as {code?:string}).code;
  if(code==='23505')return response({error:{code:'CONFLICT',message:'记录或唯一业务标识已存在，请刷新后重试'}},{},409);
  if(code==='23503')return response({error:{code:'REFERENCE_CONFLICT',message:'关联对象不存在、角色不符或记录仍被业务引用'}},{},409);
  if(code==='23514'||code==='P0001'||code==='22003')return response({error:{code:'BUSINESS_CONSTRAINT',message:code==='P0001'?(error as Error).message:'输入不符合数据库业务约束'}},{},409);
  if(code==='40001'||code==='40P01')return response({error:{code:'RETRY_TRANSACTION',message:'并发操作冲突，请重试'}},{},409);
  console.error('API failed',error);return response({error:{code:'INTERNAL_ERROR',message:'服务暂时不可用，请稍后重试'}},{},500);
 }
}
