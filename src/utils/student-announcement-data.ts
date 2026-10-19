import {StudentRecordData} from './student-record-data';

export function announcementListPath(action:string,page=1){
 const query=new URLSearchParams({page:String(page),limit:'20'});
 if(action==='action-2')query.set('type','payment-reminder');
 return (action==='action-1'?'announcements':'notifications')+'?'+query;
}
export class StudentAnnouncementData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{announcements:'announcement_id',notifications:'notification_id'});}
}
