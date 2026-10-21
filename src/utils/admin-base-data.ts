import type {RepairField} from '@/components/workspace/StudentRepairElements';
import type {StudentRow} from './student-record-data';

export const baseResources=['students','buildings','rooms','beds'] as const;
export type BaseResource=typeof baseResources[number];
export const baseNames:Record<BaseResource,string>={students:'学生',buildings:'楼栋',rooms:'房间',beds:'床位'};
export const baseIds:Record<BaseResource,string>={students:'student_number',buildings:'building_id',rooms:'room_id',beds:'bed_id'};
export const baseDetails:Record<BaseResource,ReadonlyArray<readonly [string,string]>>={
 students:[['student_number','学号'],['full_name','姓名'],['gender','性别'],['college','学院'],['grade','年级'],['phone','联系电话'],['email','邮箱'],['account_status','账号状态']],
 buildings:[['building_id','楼栋编号'],['building_name','楼栋名称'],['total_floors','总楼层数'],['building_attribute','楼栋属性'],['manager_account_id','宿管账号编号'],['location_description','位置说明'],['gender_restriction','入住性别']],
 rooms:[['room_id','房间编号'],['building_id','所属楼栋'],['floor_number','楼层'],['room_type','房型'],['bed_capacity','床位容量'],['room_status','房间状态']],
 beds:[['bed_id','床位编号'],['room_id','所属房间'],['bed_number','床位号'],['bed_status','床位状态']],
};
export function baseResource(value:string|null):BaseResource{return baseResources.includes(value as BaseResource)?value as BaseResource:'students';}
export const baseListPath=(resource:BaseResource,page=1)=>resource+'?'+new URLSearchParams({page:String(page),limit:'20'});
export function baseFields(resource:BaseResource,editing:boolean,options:Record<string,StudentRow[]>):RepairField[]{
 const text=(key:string,label:string,maxLength:number,required=true):RepairField=>({key,label,type:'text',maxLength,required});
 const select=(key:string,label:string,options:ReadonlyArray<readonly [string,string]>):RepairField=>({key,label,type:'select',options,required:true});
 const number=(key:string,label:string):RepairField=>({key,label,type:'number',required:true,validate:value=>!/^\d{1,10}$/.test(value)||Number(value)<1||Number(value)>2147483647?label+'须为有效的正整数。':undefined});
 const candidates=(kind:string,id:string,label:string)=>(options[kind]??[]).map(row=>[String(row[id]),String(row[id])+(row[label]?' / '+String(row[label]):'')] as const);
 return resource==='students'?[
  ...(!editing?[text('student_number','学号',32)]:[]),text('full_name','姓名',100),select('gender','性别',[['male','男'],['female','女']]),text('college','学院',150),text('grade','年级',40),text('phone','联系电话',32,false),
  {...text('email','邮箱',254,false),validate:value=>value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)?'邮箱格式不正确。':undefined},
  select('account_status','账号状态',[['active','启用'],['disabled','停用'],['locked','锁定']]),
  {key:'password',label:editing?'重置密码':'初始密码',type:'password',maxLength:128,required:!editing,validate:value=>value&&value.length<8?'密码至少需要8个字符。':undefined},
 ]:resource==='buildings'?[
  ...(!editing?[text('building_id','楼栋编号',32)]:[]),text('building_name','楼栋名称',100),number('total_floors','总楼层数'),text('building_attribute','楼栋属性',80),
  select('manager_account_id','负责宿管',(options.accounts??[]).filter(row=>row.role==='dorm_manager').map(row=>[String(row.account_id),String(row.full_name)+' / '+String(row.username)])),
  {...text('location_description','位置说明',2000,false),type:'textarea'},select('gender_restriction','入住性别',[['any','不限'],['male','男'],['female','女']]),
 ]:resource==='rooms'?[
  ...(!editing?[text('room_id','房间编号',32)]:[]),select('building_id','所属楼栋',candidates('buildings','building_id','building_name')),number('floor_number','楼层'),text('room_type','房型',80),number('bed_capacity','床位容量'),select('room_status','房间状态',[['available','可用'],['maintenance','维修停用'],['closed','关闭']]),
 ]:[...(!editing?[text('bed_id','床位编号',32)]:[]),select('room_id','所属房间',candidates('rooms','room_id','room_type')),text('bed_number','床位号',20),select('bed_status','床位状态',[['available','空闲'],['occupied','已入住'],['maintenance','维修停用'],['closed','关闭']])];
}
