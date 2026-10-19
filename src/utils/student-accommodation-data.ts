import {StudentRecordData} from './student-record-data';

export function accommodationListPath(action:string,page=1){
  const query=new URLSearchParams({page:String(page),limit:'20'});
  if(action!=='action-1')query.set('type',action==='action-2'?'transfer':'checkout');
  return (action==='action-1'?'applications':'changes')+'?'+query;
}
export class StudentAccommodationData extends StudentRecordData{
  constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{applications:'application_id',changes:'change_id'});}
}
