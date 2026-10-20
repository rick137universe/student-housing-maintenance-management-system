import {StudentRecordData} from './student-record-data';

export function managerBillingListPath(action:string,page=1){const query=new URLSearchParams({page:String(page),limit:'20'});if(action==='action-2')query.set('unpaid','true');return (action==='action-3'?'reminders':'bills')+'?'+query;}
export class ManagerBillingData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{bills:'bill_id',reminders:'notification_id'});}
}
