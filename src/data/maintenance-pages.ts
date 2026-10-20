import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';

export type MaintenancePage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable'];
const demos=studentPages.filter(page=>page.action!=='overview');
const personalDescriptions=['查看本人的账号、姓名、角色和联系方式。','修改姓名、联系电话及邮箱。','依次填写并确认三项密码，完成后重新登录。'];
const recordDescriptions=['填写本人处理中工单的维修说明。','查看已完工或已评价的维修归档。'];
let preview=0;
export const maintenancePages:MaintenancePage[]=[{
 feature:'overview',group:'维修工作台',color:0,label:'维修工作台',id:'docs',action:'overview',url:'/workspace/maintenance',description:'接收维修工单，记录处理进展，查看维修记录与个人统计。',
},...roleFeatures.maintenance.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/maintenance/'+feature.id,description:feature.description,
},...feature.actions.map((action,index)=>({feature:feature.id,group:feature.title,color,label:action.label,id:demos[preview++].id,action:action.id,url:'/workspace/maintenance/'+feature.id+'/'+action.id,description:feature.id==='personal'?personalDescriptions[index]:feature.id==='records'?recordDescriptions[index]:feature.id==='notifications'?'查看业务消息并标记已读。':feature.description}))])];
