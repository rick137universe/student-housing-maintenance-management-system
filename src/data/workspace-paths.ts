// Public URL segments are independent of the stable action IDs used by business logic.
const personal=['profile','edit-profile','change-password'];
const notifications=['messages'];
export const workspaceActionPaths:Record<string,Record<string,readonly string[]>>={
 student:{
  personal,notifications,
  accommodation:['check-in','room-change','check-out'],
  payment:['bills','online-payment','payment-history'],
  repair:['requests','progress','reviews'],
  announcements:['notices','payment-reminders'],
 },
 dormManager:{
  personal,notifications,
  'base-data':['students','rooms','beds'],
  accommodation:['check-in','room-change','check-out'],
  beds:['inventory','update-status','anomalies'],
  'repair-review':['pending','reported','rejected'],
  billing:['verification','arrears','reminders'],
 },
 maintenance:{
  personal,notifications,
  orders:['assigned','accept'],
  repair:['start','update-status','complete'],
  records:['write','archive'],
  analytics:['workload','completion-rate','reviews'],
 },
 admin:{
  personal,notifications,
  'base-data':['manage','import','export'],
  process:['bed-assignment','accommodation','payment','repair'],
  dispatch:['pending','automatic','progress'],
  reports:['operations','maintenance','export'],
  permissions:['accounts','roles','audit'],
  backup:['policies','tasks','restore'],
  billing:['generate','manage','payments'],
  announcements:['publish'],
 },
};

export function canonicalWorkspaceUrl(path:string):string{
 return path.replace(/^(\/workspace\/([^/?#]+)\/([^/?#]+)\/)action-(\d+)(?=[/?#]|$)/,(original,prefix:string,role:string,feature:string,index:string)=>{
  const segment=workspaceActionPaths[role]?.[feature]?.[Number(index)-1];
  return segment?prefix+segment:original;
 });
}

export function workspaceActionId(role:string,feature:string,path:string):string{
 const [segment,...children]=path.split('/'),index=workspaceActionPaths[role]?.[feature]?.indexOf(segment)??-1;
 return [index<0?segment:'action-'+(index+1),...children].join('/');
}

export const legacyWorkspaceRedirects=Object.entries(workspaceActionPaths).flatMap(([role,features])=>Object.entries(features).flatMap(([feature,segments])=>segments.map((segment,index)=>({
 source:`/workspace/${role}/${feature}/action-${index+1}/:path*`,
 destination:`/workspace/${role}/${feature}/${segment}/:path*`,
 permanent:true as const,
}))));
