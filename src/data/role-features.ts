import type { RoleId } from './accounts';
import type { ModuleId } from './module-content';

export type MotionKind = 'campus' | 'identity' | 'rooms' | 'battery' | 'workflow' | 'broadcast' | 'data' | 'beds' | 'ledger' | 'record' | 'analytics' | 'rules' | 'dispatch' | 'orderRoute' | 'service' | 'permissions' | 'backup';

export interface FeatureAction {
  id: string;
  label: string;
}

export interface RoleFeature {
  id: string;
  index: string;
  title: string;
  eyebrow: string;
  description: string;
  color: string;
  motion: MotionKind;
  module: ModuleId;
  actions: FeatureAction[];
}

export const roleFeatures: Record<RoleId, RoleFeature[]> = {
  student: [
    feature('personal', '01', '个人信息', 'IDENTITY', '资料、密码与身份信息，只属于你。', '#ff4f64', 'identity', 'personal', ['查看个人信息', '修改个人信息', '修改登录密码']),
    feature('accommodation', '02', '住宿业务', 'RESIDENCE', '入住、调宿、退宿，一条连续的住宿轨道。', '#ffad24', 'rooms', 'accommodation', ['入住申请', '调宿申请', '退宿申请']),
    feature('payment', '03', '缴费管理', 'PAYMENT', '查看账单、了解缴费事项，记录每一次缴费。', '#34c759', 'battery', 'payment', ['查看账单', '在线缴费', '缴费记录']),
    feature('repair', '04', '报修服务', 'REPAIR', '一次报修从提交到评价，每一步都有回声。', '#00e7c4', 'workflow', 'repair', ['提交报修', '查看进度', '服务评价']),
    feature('announcements', '05', '公告查看', 'BROADCAST', '公寓通知与缴费提醒，沿同一频率抵达。', '#50a8ff', 'broadcast', 'personal', ['公寓通知', '缴费提醒']),
  ],
  dormManager: [
    feature('base-data', '01', '基础信息', 'BASE DATA', '学生、房间与床位数据保持在同一坐标系。', '#ff4f64', 'campus', 'base', ['学生信息', '房间信息', '床位信息']),
    feature('accommodation', '02', '住宿事务', 'RESIDENCE FLOW', '登记、调宿与退宿驱动床位实时变化。', '#ffad24', 'rooms', 'accommodation', ['入住登记与分配', '调宿审核', '退宿登记']),
    feature('beds', '03', '床位状态', 'BED MATRIX', '状态矩阵直接显示空闲、入住与异常。', '#b8ff42', 'beds', 'bed', ['床位总览', '状态更新', '异常校验']),
    feature('repair-review', '04', '报修初审', 'REPAIR REVIEW', '有效工单继续前进，无效信息原路退回。', '#00e7c4', 'workflow', 'repair', ['待初审工单', '上报维修', '驳回报修']),
    feature('billing', '05', '账单核对', 'BILLING', '账期、金额与欠费记录逐行对齐。', '#50a8ff', 'ledger', 'payment', ['账单核对', '欠费名单', '催缴记录']),
  ],
  maintenance: [
    feature('orders', '01', '工单接收', 'ORDER INTAKE', '派发工单沿轨道进入你的处理队列。', '#ff4f64', 'orderRoute', 'repair', ['查看工单', '确认接单']),
    feature('repair', '02', '维修处理', 'SERVICE', '记录维修处理进展，跟进任务直到完成。', '#ffad24', 'service', 'repair', ['开始维修', '更新状态', '完成工单']),
    feature('records', '03', '维修记录', 'RECORDS', '处理说明逐行写入并完成归档。', '#b8ff42', 'record', 'repair', ['填写记录', '维修归档']),
    feature('analytics', '04', '个人统计', 'PERSONAL DATA', '工作量、完成率与评价形成同一组刻度。', '#00e7c4', 'analytics', 'analytics', ['工作量统计', '完成率', '服务评价']),
  ],
  admin: [
    feature('base-data', '01', '基础数据', 'BASE DATA', '全校基础信息分层展开并保持同步。', '#ff4f64', 'data', 'base', ['数据维护', '批量导入', '数据导出']),
    feature('process', '02', '流程管控', 'PROCESS', '规则闸门决定业务如何继续流转。', '#ffad24', 'rules', 'accommodation', ['分床规则', '住宿流程', '缴费流程']),
    feature('dispatch', '03', '报修派工', 'DISPATCH', '工单从中心分流到匹配的维修节点。', '#b8ff42', 'dispatch', 'repair', ['待派工', '智能派工', '进度监控']),
    feature('reports', '04', '统计报表', 'REPORTS', '运营指标被压缩为清晰的线与弧。', '#00e7c4', 'analytics', 'analytics', ['运营统计', '维修统计', '导出报表']),
    feature('permissions', '05', '权限管理', 'ACCESS', '四种身份只连接各自被授权的功能。', '#50a8ff', 'permissions', 'system', ['用户账号', '角色权限', '权限审计']),
    feature('backup', '06', '备份恢复', 'BACKUP', '数据环完成复制，也能沿时间轴返回。', '#a889ff', 'backup', 'system', ['备份策略', '立即备份', '数据恢复']),
  ],
};

function feature(id: string, index: string, title: string, eyebrow: string, description: string, color: string, motion: MotionKind, module: ModuleId, labels: string[]): RoleFeature {
  return { id, index, title, eyebrow, description, color, motion, module, actions: labels.map((label, actionIndex) => ({ id: 'action-' + (actionIndex + 1), label })) };
}

export function featureFor(role: RoleId, featureId: string) {
  return roleFeatures[role].find(item => item.id === featureId);
}
