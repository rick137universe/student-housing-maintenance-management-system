import {StudentRecordData,type StudentRow} from './student-record-data';

export type FinanceRow=StudentRow;

export function financeListPath(action:string,page=1){
  const query=new URLSearchParams({page:String(page),limit:'20'});
  if(action==='action-2')query.set('unpaid','true');
  return (action==='action-3'?'payments':'bills')+'?'+query;
}

// One instance belongs to one mounted, authenticated student workspace. Nothing is persisted.
export class StudentFinanceData extends StudentRecordData{
  constructor(accountId:string,csrfToken?:string){super(accountId,csrfToken,{bills:'bill_id',payments:'payment_id'});}

  async prefetchLists(){
    await Promise.allSettled(['action-1','action-2','action-3'].map(action=>this.load(financeListPath(action))));
  }
}
