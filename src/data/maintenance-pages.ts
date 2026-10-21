import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';

export type MaintenancePage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable'];
const demos=studentPages.filter(page=>page.action!=='overview');
const personalDescriptions=['查看本人的账号、姓名、角色和联系方式。','修改姓名、联系电话及邮箱。','依次填写并确认三项密码，完成后重新登录。'];
const orderDescriptions=['查看本人获派工单的报修资料和处理进度。','核对待接单工单的报修信息并确认接单。'];
const processingDescriptions=['查看已接单工单，确认开始维修。','记录处理进展、维修状态与预计完成时间。','填写维修结果、使用材料及实际工时，确认完工。'];
const analyticsDescriptions=['按派工月份查看本人的工作量与完成数量。','查看本人获派工单的总体完成率与每月完成情况。','查看本人收到的服务评分与评价内容。'];
const recordDescriptions=['填写本人处理中工单的维修说明。','查看已完工或已评价的维修归档。'];
let preview=0;
export const maintenancePages:MaintenancePage[]=[{
 feature:'overview',group:'维修工作台',color:0,label:'维修工作台',id:'docs',action:'overview',url:'/workspace/maintenance',description:'接收维修工单，记录处理进展，查看维修记录与个人统计。',
},...roleFeatures.maintenance.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/maintenance/'+feature.id,description:feature.description,
},...feature.actions.map((action,index)=>({feature:feature.id,group:feature.title,color,label:action.label,id:demos[preview++].id,action:action.id,url:'/workspace/maintenance/'+feature.id+'/'+action.id,description:feature.id==='personal'?personalDescriptions[index]:feature.id==='orders'?orderDescriptions[index]:feature.id==='repair'?processingDescriptions[index]:feature.id==='analytics'?analyticsDescriptions[index]:feature.id==='records'?recordDescriptions[index]:feature.id==='notifications'?'查看业务消息并标记已读。':feature.description}))])];
