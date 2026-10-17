import actions from './student-docs.json';
import modules from './student-modules.json';

export const studentOverview = {
  feature: 'overview', group: '学生工作台', color: 0, label: '学生工作台',
  id: 'docs', action: 'overview', url: '/workspace/student',
  description: '查看个人信息，办理住宿、缴费与报修业务。',
};

export const studentPages = [studentOverview, ...modules.flatMap(group => [group, ...actions.filter(action => action.feature === group.feature)])];
