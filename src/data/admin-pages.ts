import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';

export type AdminPage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string;parent?:string;kind?:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable','layout','scope','events','svg'];
const demos=studentPages.filter(page=>page.action!=='overview'&&!groups.includes(page.id));
const personalDescriptions=['查看本人的账号、姓名、角色和联系方式。','修改姓名、联系电话及邮箱。','依次填写并确认三项密码，完成后重新登录。'];
const billingDescriptions=['按账期为当前在住学生生成月账单。','新增账单，维护费用及缴费截止日期。','查看缴费流水及每笔缴费详情。'];
let preview=0;
const pages:AdminPage[]=[{
 feature:'overview',group:'管理员工作台',color:0,label:'管理员工作台',id:'docs',action:'overview',url:'/workspace/admin',description:'维护基础数据，管控业务流程，统筹派工、账单与系统管理。',
},...roleFeatures.admin.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/admin/'+feature.id,description:feature.description,
},...feature.actions.map((action,index)=>({feature:feature.id,group:feature.title,color,label:action.label,id:demos[preview++].id,action:action.id,url:'/workspace/admin/'+feature.id+'/'+action.id,description:feature.id==='personal'?personalDescriptions[index]:feature.id==='billing'?billingDescriptions[index]:feature.id==='announcements'?'发布公寓公告与服务信息，查看和维护已有公告。':feature.id==='notifications'?'查看业务消息并标记已读。':feature.description}))])];

const announcement=pages.find(page=>page.feature==='announcements'&&page.action==='action-1')!;
const withAnnouncements:AdminPage[]=pages.flatMap(page=>page!==announcement?[page]:[page,
 { ...page,parent:page.id,kind:'submit',id:'getting-started-installation',action:page.action+'/submit',url:page.url+'/submit',label:'发布公告',description:'填写公告正文、发布范围和状态，确认后发布。' },
 { ...page,parent:page.id,kind:'records',id:'getting-started-module-imports',action:page.action+'/records',url:page.url+'/records',label:'公告记录',description:'查看公告正文，维护发布范围、到期时间与启用状态。' },
]);

export const adminPages:AdminPage[]=withAnnouncements.flatMap(page=>page.feature!=='billing'||!['action-1','action-2'].includes(page.action)?[page]:[page,
 {...page,parent:page.id,kind:page.action==='action-1'?'generate':'create',id:page.action==='action-1'?'getting-started-using-with-vanilla-js':'timer-timer-playback-settings-delay',action:page.action+'/submit',url:page.url+'/submit',label:page.action==='action-1'?'生成月账单':'新增账单',description:page.action==='action-1'?'确认账期后，按已配置的费用生成当前在住学生账单。':'填写学生、账期、费用及截止日期，确认后新增账单。'},
 {...page,parent:page.id,kind:'records',id:page.action==='action-1'?'getting-started-using-with-react':'timer-timer-playback-settings-loop',action:page.action+'/records',url:page.url+'/records',label:'账单记录',description:'查看账单费用、缴费状态及核对信息。'},
]);
