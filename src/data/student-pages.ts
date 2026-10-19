import actions from './student-docs.json';
import modules from './student-modules.json';
import records from './student-records.json';
import submissions from './student-submissions.json';
import repairs from './student-repair-pages.json';

export type StudentPage={feature:string;group:string;color:number;label:string;id:string;action:string;url:string;description:string;parent?:string;kind?:string};
export const studentChildren:StudentPage[]=[...submissions,...records,...repairs];

export const studentOverview = {
  feature: 'overview', group: '学生工作台', color: 0, label: '学生工作台',
  id: 'docs', action: 'overview', url: '/workspace/student',
  description: '查看个人信息，办理住宿、缴费与报修业务。',
};

export const studentPages:StudentPage[] = [studentOverview, ...modules.flatMap(group => [group, ...actions.filter(action => action.feature === group.feature).flatMap(action=>[action,...studentChildren.filter(child=>child.parent===action.id)])])];
