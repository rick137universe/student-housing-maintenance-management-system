import {studentOverview, studentPages} from '@/data/student-pages';
import {managerPages} from '@/data/manager-pages';
import {maintenancePages} from '@/data/maintenance-pages';
import {adminPages} from '@/data/admin-pages';

export const siteTitle = '学生公寓住宿与报修管理系统 | FLight';

export function workspaceTitle(pathname: string) {
  const roles = {
    student: {label: '学生工作台', pages: [studentOverview, ...studentPages]},
    dormManager: {label: '宿管工作台', pages: managerPages},
    maintenance: {label: '维修工作台', pages: maintenancePages},
    admin: {label: '管理员工作台', pages: adminPages},
  };
  const role = roles[pathname.split('/')[2] as keyof typeof roles];
  if (!role) return siteTitle;
  const page = role.pages.find(page => page.url === pathname);
  return [...new Set([page?.label, role.label].filter(Boolean)), 'FLight'].join(' | ');
}
