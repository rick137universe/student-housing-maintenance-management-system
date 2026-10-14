import type {RoleId} from '@/types/auth';
export interface PageSpec {resource:string;query?:Record<string,string>;mode?:'profile'|'profile-edit'|'password'|'statistics'|'settings'|'import'|'export'|'permissions';create?:string;rowAction?:string;}
export function workspaceSpec(role:RoleId,feature:string,action:string):PageSpec {
 const n=Number(action.replace('action-',''));
 if(feature==='personal')return {resource:'profile',mode:n===1?'profile':n===2?'profile-edit':'password'};
 if(feature==='notifications')return {resource:'notifications',rowAction:'read'};
 if(role==='student'){
  if(feature==='accommodation')return {resource:n===1?'applications':'changes',query:n===1?{}:{type:n===2?'transfer':'checkout'},create:n===1?'application':n===2?'transfer':'checkout'};
  if(feature==='payment')return {resource:n===3?'payments':'bills',query:n===2?{unpaid:'true'}:{},rowAction:n===2?'pay':undefined};
  if(feature==='repair')return {resource:'repairs',query:n===3?{status:'completed,evaluated'}:{},create:n===1?'repair':undefined,rowAction:n===3?'evaluate':'history'};
  if(feature==='announcements')return {resource:n===1?'announcements':'notifications',rowAction:n===2?'read':undefined};
 }
 if(role==='dormManager'){
  if(feature==='base-data')return {resource:['students','rooms','beds'][n-1],rowAction:'resource-edit'};
  if(feature==='accommodation')return {resource:n===1?'applications':'changes',query:n===1?{}:{type:n===2?'transfer':'checkout'},rowAction:'accommodation-review'};
  if(feature==='beds')return {resource:n===3?'anomalies':'beds',rowAction:n===2?'resource-edit':undefined};
  if(feature==='repair-review')return {resource:'repairs',query:{status:['pending_review','pending_dispatch','rejected'][n-1]},rowAction:n===1?'repair-review':'history'};
  if(feature==='billing')return {resource:n===3?'reminders':'bills',query:n===2?{unpaid:'true'}:{},rowAction:n===1?'check':n===2?'remind':undefined};
 }
 if(role==='maintenance'){
  if(feature==='orders')return {resource:'repairs',query:n===2?{status:'dispatched'}:{},rowAction:n===2?'accept':'history'};
  if(feature==='repair')return {resource:'repairs',query:{status:n===1?'accepted':'in_progress,waiting_parts'},rowAction:n===1?'start':n===2?'progress':'complete'};
  if(feature==='records')return {resource:'maintenance',query:{status:n===1?'in_progress,waiting_parts':'completed,evaluated'},rowAction:n===1?'record':'history'};
  if(feature==='analytics')return {resource:'statistics',mode:'statistics'};
 }
 if(role==='admin'){
  if(feature==='base-data')return {resource:'students',mode:n===2?'import':n===3?'export':undefined,create:n===1?'resource':undefined,rowAction:n===1?'resource-edit':undefined};
  if(feature==='process')return {resource:'settings',mode:'settings',query:{key:['allocation','accommodation','billing'][n-1]}};
  if(feature==='dispatch')return {resource:'repairs',query:n<3?{status:'pending_dispatch'}:{},rowAction:n===1?'dispatch':n===2?'auto-dispatch':'history'};
  if(feature==='reports')return {resource:'statistics',mode:n===3?'export':'statistics'};
  if(feature==='permissions')return {resource:n===1?'accounts':n===2?'permissions':'audit',mode:n===2?'permissions':undefined,create:n===1?'account':undefined,rowAction:n===1?'account-edit':undefined};
  if(feature==='backup')return {resource:n===1?'backup-policies':'backups',create:n===1?'backup-policy':n===2?'backup':undefined,rowAction:n===1?'backup-policy-edit':n===3?'restore':undefined};
  if(feature==='announcements')return {resource:'announcements',create:'announcement',rowAction:'announcement-edit'};
  if(feature==='billing')return {resource:n===3?'payments':'bills',create:n===1?'generate-bills':n===2?'bill':undefined,rowAction:n===2?'bill-edit':undefined};
 }
 return {resource:'notifications',rowAction:'read'};
}
export const columnLabels:Record<string,string>={
 processing_due_at:'办理期限',completion_rate:'完成率（%）',occupancy_rate:'入住率（%）',total_beds:'总床位',occupied_beds:'已入住',available_beds:'可用床位',month:'月份',assigned:'派工数量',completed:'完成数量',
 student_number:'学号',full_name:'姓名',gender:'性别',college:'学院',grade:'年级',phone:'电话',email:'邮箱',account_status:'账号状态',
 building_id:'楼栋编号',building_name:'楼栋',total_floors:'楼层数',building_attribute:'楼栋属性',manager_account_id:'负责宿管',location_description:'位置说明',gender_restriction:'入住性别',
 room_id:'房间编号',floor_number:'楼层',room_type:'房型',bed_capacity:'容量',room_status:'房间状态',bed_id:'床位编号',bed_number:'床位号',bed_status:'床位状态',
 application_id:'申请编号',preferred_building_id:'意向楼栋',expected_check_in_date:'期望入住日期',review_status:'审核状态',application_note:'申请说明',review_note:'审核意见',applied_at:'申请时间',
 change_id:'变更编号',business_type:'业务类型',original_bed_id:'原床位',new_bed_id:'新床位',completed_at:'完成时间',
 bill_id:'账单编号',billing_period:'账期',accommodation_fee:'住宿费',utility_fee:'水电费',total_amount:'总金额',outstanding_amount:'待缴金额',paid_amount:'已缴金额',bill_status:'账单状态',due_date:'截止日期',checked_at:'核对时间',
 payment_id:'缴费编号',amount:'金额',paid_at:'缴费时间',payment_method:'缴费方式',repair_id:'报修编号',fault_type:'故障类型',fault_description:'故障描述',repair_status:'工单状态',contact_phone:'联系电话',submitted_at:'提交时间',
 maintenance_id:'处理编号',processing_description:'处理说明',technician_account_id:'维修人员',dispatched_at:'派工时间',accepted_at:'接单时间',maintenance_at:'维修时间',expected_completion_at:'预计完成',materials:'材料',hours:'工时',service_rating:'评分',evaluation_content:'评价',
 title:'标题',content:'内容',created_at:'创建时间',read_at:'已读时间',announcement_id:'公告编号',announcement_type:'类型',published_at:'发布时间',expires_at:'到期时间',enabled:'启用',
 account_id:'账号编号',username:'账号',role:'角色',resource:'资源',operation:'操作',data_scope:'数据范围',policy_id:'策略编号',policy_name:'策略名称',schedule_expression:'每日调度',retention_days:'保留天数',
 backup_run_id:'任务编号',operation_type:'任务类型',run_status:'任务状态',started_at:'开始时间',finished_at:'结束时间',restored_database:'恢复副本',result_description:'执行结果',validation_result:'校验结果',
 audit_id:'审计编号',actor_account_id:'操作账号',occurred_at:'操作时间',entity_type:'业务对象',entity_id:'记录编号',result:'结果',details:'操作详情',notification_id:'通知编号',recipient_account_id:'接收账号',
};
export const valueLabels:Record<string,string>={male:'男',female:'女',any:'不限',active:'启用',disabled:'停用',locked:'锁定',available:'可用',occupied:'已入住',maintenance:'维修停用',closed:'关闭',pending:'待审核',approved:'已通过',rejected:'已驳回',cancelled:'已取消',completed:'已完成',transfer:'调宿',checkout:'退宿',unpaid:'未缴',partial:'部分缴费',paid:'已缴清',pending_review:'待初审',pending_dispatch:'待派工',dispatched:'已派工',accepted:'已接单',in_progress:'处理中',waiting_parts:'等待配件',evaluated:'已评价',student:'学生',dorm_manager:'宿管人员',dormManager:'宿管人员',admin:'系统管理员',queued:'排队中',running:'执行中',succeeded:'成功',failed:'失败',backup:'备份',restore:'隔离恢复',self:'本人',all:'全局',authorized_buildings:'授权楼栋',assigned_orders:'获派工单'};
