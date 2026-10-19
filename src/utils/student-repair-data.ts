import type {StudentPage} from '@/data/student-pages';
import {StudentRecordData} from './student-record-data';

export function repairListPath(entry:StudentPage,page=1){
 const query=new URLSearchParams({page:String(page),limit:'20'});
 if(entry.kind==='repair-current')query.set('status','pending_review,pending_dispatch,dispatched,accepted,in_progress,waiting_parts');
 else if(entry.action==='action-2/records')query.set('status','rejected,completed,evaluated');
 else if(entry.kind==='repair-evaluate')query.set('status','completed');
 else if(entry.action==='action-3/records')query.set('status','evaluated');
 return 'repairs?'+query;
}
export class StudentRepairData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{repairs:'repair_id'});}
}
