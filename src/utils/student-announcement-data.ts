import {StudentRecordData} from './student-record-data';
import type {StudentPage} from '@/data/student-pages';

export function announcementListPath(entry:Pick<StudentPage,'feature'|'action'>,page=1){
 const query=new URLSearchParams({page:String(page),limit:'20'});
 const reminder=entry.feature==='announcements'&&entry.action==='action-2';
 if(reminder)query.set('type','payment-reminder');
 return (entry.feature==='notifications'||reminder?'notifications':'announcements')+'?'+query;
}
export class StudentAnnouncementData extends StudentRecordData{
 constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{announcements:'announcement_id',notifications:'notification_id'});}
}
