import {StudentRecordData} from './student-record-data';

export function bedListPath(action:string,page=1){return (action==='action-3'?'anomalies':'beds')+'?'+new URLSearchParams({page:String(page),limit:'20'});}
export class ManagerBedData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{beds:'bed_id',anomalies:'bedId'});}
}
