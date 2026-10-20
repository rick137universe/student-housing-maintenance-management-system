import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';

export type ManagerPage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable','layout'];
const demos=studentPages.filter(page=>page.action!=='overview');
const personalDescriptions=['查看本人的账号、姓名、角色和联系方式。','修改姓名、联系电话及邮箱。','依次填写并确认三项密码，完成后重新登录。'];
const accommodationDescriptions=['查看入住申请，审核并分配床位。','查看调宿申请，审核并办理床位变更。','查看退宿申请，审核并办理退宿登记。'];
let preview=0;
export const managerPages:ManagerPage[]=[{
 feature:'overview',group:'宿管工作台',color:0,label:'宿管工作台',id:'docs',action:'overview',url:'/workspace/dormManager',description:'维护基础信息，办理住宿事务，跟进报修与账单。',
},...roleFeatures.dormManager.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/dormManager/'+feature.id,description:feature.description,
},...feature.actions.map((action,index)=>({feature:feature.id,group:feature.title,color,label:action.label,id:demos[preview++].id,action:action.id,url:'/workspace/dormManager/'+feature.id+'/'+action.id,description:feature.id==='personal'?personalDescriptions[index]:feature.id==='accommodation'?accommodationDescriptions[index]:feature.id==='notifications'?'查看业务消息并标记已读。':feature.description}))])];
