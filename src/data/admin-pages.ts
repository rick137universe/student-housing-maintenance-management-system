import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';

export type AdminPage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable','layout','scope','events','svg'];
const demos=studentPages.filter(page=>page.action!=='overview'&&!groups.includes(page.id));
const personalDescriptions=['查看本人的账号、姓名、角色和联系方式。','修改姓名、联系电话及邮箱。','依次填写并确认三项密码，完成后重新登录。'];
let preview=0;
export const adminPages:AdminPage[]=[{
 feature:'overview',group:'管理员工作台',color:0,label:'管理员工作台',id:'docs',action:'overview',url:'/workspace/admin',description:'维护基础数据，管控业务流程，统筹派工、账单与系统管理。',
},...roleFeatures.admin.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/admin/'+feature.id,description:feature.description,
},...feature.actions.map((action,index)=>({feature:feature.id,group:feature.title,color,label:action.label,id:demos[preview++].id,action:action.id,url:'/workspace/admin/'+feature.id+'/'+action.id,description:feature.id==='personal'?personalDescriptions[index]:feature.description}))])];
