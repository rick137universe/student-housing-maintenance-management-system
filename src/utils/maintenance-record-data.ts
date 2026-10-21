import {StudentRecordData} from './student-record-data';

export function maintenanceRecordListPath(action:string,page=1){return 'maintenance?'+new URLSearchParams({status:action==='action-1'?'in_progress,waiting_parts':'completed,evaluated',page:String(page),limit:'20'});}
export function maintenanceOrderListPath(action:string,page=1){return 'repairs?'+new URLSearchParams({...(action==='action-2'?{status:'dispatched'}:{}),page:String(page),limit:'20'});}
export class MaintenanceRecordData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{maintenance:'maintenance_id',repairs:'repair_id'});}
}
