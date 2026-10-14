import type { Account } from '@/types/auth';
export type { RoleId } from '@/types/auth';
export type DemoAccount = Account;
export const demoAccounts: Account[] = [
 {id:'',role:'student',username:'stu202602341',displayName:'林晓屿',roleName:'学生',scope:'本人业务',studentNumber:'202602341'},
 {id:'',role:'dormManager',username:'dm0301',displayName:'周老师',roleName:'宿管人员',scope:'授权楼栋',studentNumber:null},
 {id:'',role:'maintenance',username:'mt008',displayName:'陈师傅',roleName:'维修人员',scope:'获派工单',studentNumber:null},
 {id:'',role:'admin',username:'admin',displayName:'系统管理员',roleName:'系统管理员',scope:'全系统',studentNumber:null},
];
