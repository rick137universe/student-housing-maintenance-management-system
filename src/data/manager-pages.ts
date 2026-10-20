import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';

export type ManagerPage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable','layout'];
const demos=studentPages.filter(page=>page.action!=='overview');
let preview=0;
export const managerPages:ManagerPage[]=[{
 feature:'overview',group:'宿管工作台',color:0,label:'宿管工作台',id:'docs',action:'overview',url:'/workspace/dormManager',description:'维护基础信息，办理住宿事务，跟进报修与账单。',
},...roleFeatures.dormManager.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/dormManager/'+feature.id,description:feature.description,
},...feature.actions.map(action=>({feature:feature.id,group:feature.title,color,label:action.label,id:demos[preview++].id,action:action.id,url:'/workspace/dormManager/'+feature.id+'/'+action.id,description:feature.description}))])];
