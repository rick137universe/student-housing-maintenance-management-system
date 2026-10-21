import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';

export type AdminPage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string;parent?:string;kind?:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable','layout','scope','events','svg'];
const demos=studentPages.filter(page=>page.action!=='overview'&&!groups.includes(page.id));
const personalDescriptions=['查看本人的账号、姓名、角色和联系方式。','修改姓名、联系电话及邮箱。','依次填写并确认三项密码，完成后重新登录。'];
let preview=0;
const pages:AdminPage[]=[{
 feature:'overview',group:'管理员工作台',color:0,label:'管理员工作台',id:'docs',action:'overview',url:'/workspace/admin',description:'维护基础数据，管控业务流程，统筹派工、账单与系统管理。',
},...roleFeatures.admin.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/admin/'+feature.id,description:feature.description,
},...feature.actions.map((action,index)=>({feature:feature.id,group:feature.title,color,label:action.label,id:demos[preview++].id,action:action.id,url:'/workspace/admin/'+feature.id+'/'+action.id,description:feature.id==='personal'?personalDescriptions[index]:feature.id==='announcements'?'发布公寓公告与服务信息，查看和维护已有公告。':feature.id==='notifications'?'查看业务消息并标记已读。':feature.description}))])];

const announcement=pages.find(page=>page.feature==='announcements'&&page.action==='action-1')!;
export const adminPages:AdminPage[]=pages.flatMap(page=>page!==announcement?[page]:[page,
 { ...page,parent:page.id,kind:'submit',id:'getting-started-installation',action:page.action+'/submit',url:page.url+'/submit',label:'发布公告',description:'填写公告正文、发布范围和状态，确认后发布。' },
 { ...page,parent:page.id,kind:'records',id:'getting-started-module-imports',action:page.action+'/records',url:page.url+'/records',label:'公告记录',description:'查看公告正文，维护发布范围、到期时间与启用状态。' },
]);
