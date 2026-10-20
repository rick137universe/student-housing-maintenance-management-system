import {StudentRecordData} from './student-record-data';

// Basic information and bed status share one session cache so updates stay in sync.
export class ManagerResourceData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{students:'student_number',rooms:'room_id',beds:'bed_id',anomalies:'bedId',buildings:'building_id'});}
}
