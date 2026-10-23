import {roleFeatures} from './role-features';
import {studentPages} from './student-pages';
import {canonicalWorkspaceUrl} from './workspace-paths';

export type AdminPage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string;parent?:string;kind?:string};
const groups=['getting-started','timer','animation','timeline','animatable','draggable','layout','scope','events','svg'];
const demos=studentPages.filter(page=>page.action!=='overview'&&!groups.includes(page.id));
const personalDescriptions=['查看本人的账号、姓名、角色和联系方式。','修改姓名、联系电话及邮箱。','依次填写并确认三项密码，完成后重新登录。'];
const reportDescriptions=['查看楼栋床位、当前入住率和待缴金额，按楼栋查看统计详情。','查看报修总量、完成率、服务评分及每月维修工作量。','选择日期和楼栋范围，导出运营与维修统计 CSV 报表。'];
const baseDescriptions=['维护学生、楼栋、房间与床位资料，查看记录并办理新增和修改。','按数据类型下载模板并批量导入基础资料。','导出学生、楼栋、房间与床位基础资料。'];
const processDescriptions=['查看和配置自动分床规则。','查看住宿审核要求与办理时限，配置住宿业务流程。','查看固定月费及缴费期限，配置后续账单生成规则。','配置报修初审方式，决定新报修是否由系统自动通过初审。'];
const dispatchDescriptions=['查看通过初审的报修工单，选择维修人员并派工。','按未完工工单数量分配维修人员，确认后提交派工。','查看报修、派工与维修进度及完整处理过程。'];
const permissionDescriptions=['新增员工账号，查看和维护账号资料、角色及状态。','配置角色权限，维护宿管人员的额外楼栋授权。','查看操作审计记录及每次操作的详细信息。'];
const backupDescriptions=['配置每日备份时间、保留天数及启用状态。','创建备份任务，查看执行状态与备份结果。','查看备份与恢复记录，将有效备份恢复到独立副本。'];
const billingDescriptions=['按账期为当前在住学生生成月账单。','新增账单，维护费用及缴费截止日期。','查看缴费流水及每笔缴费详情。'];
let preview=0;
const pages:AdminPage[]=[{
 feature:'overview',group:'管理员工作台',color:0,label:'管理员工作台',id:'docs',action:'overview',url:'/workspace/admin',description:'维护基础数据，管控业务流程，统筹派工、账单与系统管理。',
},...roleFeatures.admin.flatMap((feature,color)=>[{
 feature:feature.id,group:feature.title,color,label:feature.title,id:groups[color],action:'overview',url:'/workspace/admin/'+feature.id,description:feature.description,
},...feature.actions.map((action,index)=>({feature:feature.id,group:feature.title,color,label:action.label,id:feature.id==='process'&&action.id==='action-4'?'admin-process-repair':demos[preview++].id,action:action.id,url:canonicalWorkspaceUrl('/workspace/admin/'+feature.id+'/'+action.id),description:feature.id==='reports'?reportDescriptions[index]:feature.id==='base-data'?baseDescriptions[index]:feature.id==='personal'?personalDescriptions[index]:feature.id==='process'?processDescriptions[index]:feature.id==='dispatch'?dispatchDescriptions[index]:feature.id==='permissions'?permissionDescriptions[index]:feature.id==='backup'?backupDescriptions[index]:feature.id==='billing'?billingDescriptions[index]:feature.id==='announcements'?'发布公寓公告与服务信息，查看和维护已有公告。':feature.id==='notifications'?'查看业务消息并标记已读。':feature.description}))])];

const announcement=pages.find(page=>page.feature==='announcements'&&page.action==='action-1')!;
const withAnnouncements:AdminPage[]=pages.flatMap(page=>page!==announcement?[page]:[page,
 { ...page,parent:page.id,kind:'submit',id:'getting-started-installation',action:page.action+'/submit',url:page.url+'/submit',label:'发布公告',description:'填写公告正文、发布范围和状态，确认后发布。' },
 { ...page,parent:page.id,kind:'records',id:'getting-started-module-imports',action:page.action+'/records',url:page.url+'/records',label:'公告记录',description:'查看公告正文，维护发布范围、到期时间与启用状态。' },
]);

const withBilling:AdminPage[]=withAnnouncements.flatMap(page=>page.feature!=='billing'||!['action-1','action-2'].includes(page.action)?[page]:[page,
 {...page,parent:page.id,kind:page.action==='action-1'?'generate':'create',id:page.action==='action-1'?'getting-started-using-with-vanilla-js':'timer-timer-playback-settings-delay',action:page.action+'/submit',url:page.url+'/submit',label:page.action==='action-1'?'生成月账单':'新增账单',description:page.action==='action-1'?'确认账期后，按已配置的费用生成当前在住学生账单。':'填写学生、账期、费用及截止日期，确认后新增账单。'},
 {...page,parent:page.id,kind:'records',id:page.action==='action-1'?'getting-started-using-with-react':'timer-timer-playback-settings-loop',action:page.action+'/records',url:page.url+'/records',label:'账单记录',description:'查看账单费用、缴费状态及核对信息。'},
]);

const withBackup:AdminPage[]=withBilling.flatMap(page=>page.feature!=='backup'||!['action-1','action-2'].includes(page.action)?[page]:[page,
 {...page,parent:page.id,kind:page.action==='action-1'?'policy-create':'backup-create',id:page.action==='action-1'?'timer-timer-playback-settings':'timer-timer-playback-settings-alternate',action:page.action+'/submit',url:page.url+'/submit',label:page.action==='action-1'?'新增备份策略':'创建备份',description:page.action==='action-1'?'设置策略名称、每日时间、保留天数和启用状态。':'确认后创建备份任务，执行结果可在备份记录中查看。'},
 {...page,parent:page.id,kind:'records',id:page.action==='action-1'?'timer-timer-playback-settings-playback-loopdelay':'timer-timer-playback-settings-reversed',action:page.action+'/records',url:page.url+'/records',label:page.action==='action-1'?'策略记录':'备份记录',description:page.action==='action-1'?'查看并维护已配置的备份策略。':'查看备份与恢复任务的执行状态和结果。'},
]);

const permissionChildren=[
 ['action-1','submit','account-create','新增员工账号','填写员工账号、姓名、角色、状态与初始密码。','timer-timer-playback-settings-autoplay'],
 ['action-1','records','records','账号记录','查看和维护学生及员工账号。','timer-timer-playback-settings-framerate'],
 ['action-2','submit','permission-create','配置角色权限','选择角色、资源、操作和权限状态。','timer-timer-playback-settings-playbackrate'],
 ['action-2','records','records','权限记录','查看各角色的资源权限与数据范围。','timer-timer-callbacks'],
 ['action-2','authorize','authorization-create','楼栋授权','为宿管人员授予或撤销额外楼栋授权。','timer-timer-callbacks-onloop'],
 ['action-2','authorizations','authorization-records','授权记录','查看宿管人员的额外楼栋授权。','timer-timer-callbacks-onpause'],
] as const;
const withPermissions:AdminPage[]=withBackup.flatMap(page=>[page,...(page.feature==='permissions'?permissionChildren.filter(([action])=>action===page.action).map(([,path,kind,label,description,id])=>({...page,parent:page.id,kind,id,action:page.action+'/'+path,url:page.url+'/'+path,label,description})):[])]);

const processEditors=[['action-1','配置分床规则','确认自动分床状态，完成后保存。','timer-timer-callbacks-then'],['action-2','配置住宿流程','确认审核要求和办理时限，完成后保存。','timer-timer-methods'],['action-3','配置缴费流程','确认固定月费和缴费期限，完成后保存。','timer-timer-methods-play'],['action-4','配置报修流程','设置新报修的初审方式，完成后保存。','admin-process-repair-edit']] as const;
const withProcess:AdminPage[]=withPermissions.flatMap(page=>[page,...(page.feature==='process'?processEditors.filter(([action])=>action===page.action).map(([,label,description,id])=>({...page,parent:page.id,kind:'process-edit',id,action:page.action+'/edit',url:page.url+'/edit',label,description})):[])]);

const withBase:AdminPage[]=withProcess.flatMap(page=>page.feature==='base-data'&&page.action==='action-1'?[page,
 {...page,parent:page.id,kind:'base-create',id:'timer-timer-methods-reverse',action:page.action+'/submit',url:page.url+'/submit',label:'新增数据',description:'选择数据类型，逐项填写并确认基础资料。'},
 {...page,parent:page.id,kind:'base-records',id:'timer-timer-methods-pause',action:page.action+'/records',url:page.url+'/records',label:'数据记录',description:'选择数据类型，查看和维护完整基础资料。'},
]:[page]);

const reportEditors=[['action-1','筛选运营统计','timer-timer-methods-restart'],['action-2','筛选维修统计','timer-timer-methods-alternate']] as const;
export const adminPages:AdminPage[]=withBase.flatMap(page=>[page,...(page.feature==='reports'?reportEditors.filter(([action])=>action===page.action).map(([,label,id])=>({...page,parent:page.id,kind:'report-filter',id,action:page.action+'/filter',url:page.url+'/filter',label,description:'选择日期与楼栋范围，确认后查看统计。'})):[])]);
