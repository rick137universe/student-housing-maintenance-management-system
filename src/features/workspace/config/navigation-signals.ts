import type {RoleId} from '@/types/auth';
export type NavigationSignal={feature:string;actions:string[];resource:string;query:Record<string,string>};
const signal=(feature:string,actions:string[],resource:string,query:Record<string,string>={}):NavigationSignal=>({feature,actions,resource,query});
export const navigationSignals:Record<RoleId,NavigationSignal[]>={
 student:[
  signal('payment',['action-1','action-2'],'bills',{unpaid:'true'}),
  signal('announcements',['action-2'],'notifications',{unread:'true',type:'payment-reminder'}),
  signal('announcements',['action-1'],'announcements',{fresh:'true'}),
  signal('repair',['action-2','action-2/current'],'notifications',{unread:'true',related:'repair',repairStatus:'pending_review,pending_dispatch,dispatched,accepted,in_progress,waiting_parts'}),
  signal('repair',['action-2','action-2/records'],'notifications',{unread:'true',related:'repair',repairStatus:'rejected,completed,evaluated'}),
  signal('repair',['action-3','action-3/submit'],'repairs',{status:'completed'}),
  ...['application','transfer','checkout'].map((related,index)=>signal('accommodation',[`action-${index+1}`,`action-${index+1}/records`],'notifications',{unread:'true',related})),
 ],
 dormManager:[
  signal('accommodation',['action-1'],'applications',{status:'pending'}),
  signal('accommodation',['action-2'],'changes',{status:'pending',type:'transfer'}),
  signal('accommodation',['action-3'],'changes',{status:'pending',type:'checkout'}),
  signal('repair-review',['action-1'],'repairs',{status:'pending_review'}),
  signal('beds',['action-3'],'anomalies'),
  signal('billing',['action-1'],'bills',{unchecked:'true'}),
  signal('billing',['action-2'],'bills',{unpaid:'true'}),
 ],
 maintenance:[
  signal('orders',['action-1','action-2'],'repairs',{status:'dispatched'}),
  signal('repair',['action-1'],'repairs',{status:'accepted'}),
  signal('analytics',['action-3'],'maintenance',{status:'evaluated',fresh:'true'}),
 ],
 admin:[
  signal('dispatch',['action-1','action-2'],'repairs',{status:'pending_dispatch'}),
  signal('backup',['action-2','action-2/records','action-3'],'backups',{status:'succeeded,failed',fresh:'true'}),
 ],
};
for(const role of Object.keys(navigationSignals) as RoleId[])navigationSignals[role].push(signal('notifications',['action-1'],'notifications',{unread:'true'}));
