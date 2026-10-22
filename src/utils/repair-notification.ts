import {valueLabels} from '../data/workspace-actions';
const statuses=['pending_review','rejected','pending_dispatch','dispatched','accepted','in_progress','waiting_parts','completed','evaluated'] as const;
export function repairStatusLabel(status:string){return statuses.some(value=>value===status)?valueLabels[status]:status;}
export function repairNotificationContent(row:{title?:unknown;content?:unknown;repair_id?:unknown}){
 if(row.title!=='报修进度更新'||!row.repair_id||typeof row.content!=='string')return row.content;
 // Translate only the generated status prefix, preserving the original note.
 return row.content.replace(/^工单状态([：:]\s*)([a-z_]+)(?=\s*(?:[；;]|$))/,(_,separator:string,status:string)=>'工单状态'+separator+repairStatusLabel(status));
}
