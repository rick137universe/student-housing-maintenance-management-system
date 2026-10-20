import {StudentRecordData} from './student-record-data';

export function managerRepairListPath(action:string,page=1){return 'repairs?'+new URLSearchParams({status:({'action-1':'pending_review','action-2':'pending_dispatch','action-3':'rejected'} as Record<string,string>)[action],page:String(page),limit:'20'});}
export class ManagerRepairData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{repairs:'repair_id'});}
}
