import type {ReportFilters} from './admin-report-data';
export type BuildingStatistic={building_id:string;building_name:string;total_beds:string|number;occupied_beds:string|number;available_beds:string|number};
export type StatisticsData={buildings:BuildingStatistic[];repairs:{total_repairs:string|number;completed_repairs:string|number;average_rating:string|number;rating_count:string|number;bill_count?:number};workload:{month:string;assigned:string|number;completed:string|number}[];outstandingAmount:string};
export type ChartDatum={label:string;values:number[]};
export type ChartMetric={id:string;label:string;color:number;value:number;unit:string;kind:'bars'|'ring'|'trend';legend:string[];rows:ChartDatum[];maximum?:number;hint:string};
export const safeCount=(value:unknown)=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
export function statisticsMetrics(data:StatisticsData):ChartMetric[]{
 const buildings=[...data.buildings].sort((a,b)=>a.building_id.localeCompare(b.building_id)),repairs=data.repairs,sum=(key:'total_beds'|'occupied_beds'|'available_beds')=>buildings.reduce((n,b)=>n+safeCount(b[key]),0),total=sum('total_beds'),occupied=sum('occupied_beds'),available=sum('available_beds'),completed=safeCount(repairs.completed_repairs),requests=safeCount(repairs.total_repairs),ratings=safeCount(repairs.rating_count),months=[...data.workload].sort((a,b)=>a.month.localeCompare(b.month));
 const buildingHint='床位与入住数据为当前状态；日期筛选不改变床位统计。',repairHint='按报修提交日期筛选；完工数包含已完成和已评价工单。',workHint='按报修提交日期筛选后，按派工月份归集；不代表该月提交的报修数量。';
 const building=(id:string,label:string,color:number,key:'total_beds'|'occupied_beds'|'available_beds',value:number):ChartMetric=>({id,label,color,value,unit:'床',kind:'bars',legend:[label],rows:buildings.map(b=>({label:b.building_name,values:[safeCount(b[key])]})),hint:buildingHint});
 return [
  {id:'occupancy',label:'楼栋入住率',color:2,value:total?occupied/total*100:0,unit:'%',kind:'bars',legend:['入住率'],maximum:100,rows:buildings.map(b=>({label:b.building_name,values:[safeCount(b.total_beds)?safeCount(b.occupied_beds)/safeCount(b.total_beds)*100:0]})),hint:buildingHint},
  building('capacity','总床位',3,'total_beds',total),building('occupied','已入住床位',4,'occupied_beds',occupied),building('available','空闲床位',5,'available_beds',available),
  {id:'repairs',label:'报修总量',color:6,value:requests,unit:'单',kind:'bars',legend:['报修数量'],rows:[{label:'已完成',values:[completed]},{label:'未完成',values:[Math.max(0,requests-completed)]}],hint:repairHint},
  {id:'completion',label:'报修完成率',color:7,value:requests?completed/requests*100:0,unit:'%',kind:'ring',maximum:requests,legend:['已完成','未完成'],rows:[{label:'已完成',values:[completed]},{label:'未完成',values:[Math.max(0,requests-completed)]}],hint:repairHint},
  {id:'assigned',label:'每月派工',color:8,value:months.reduce((n,m)=>n+safeCount(m.assigned),0),unit:'单',kind:'trend',legend:['派工','完成'],rows:months.map(m=>({label:m.month,values:[safeCount(m.assigned),safeCount(m.completed)]})),hint:workHint},
  {id:'completed',label:'每月完工',color:9,value:months.reduce((n,m)=>n+safeCount(m.completed),0),unit:'单',kind:'trend',legend:['完成'],rows:months.map(m=>({label:m.month,values:[safeCount(m.completed)]})),hint:workHint},
  {id:'rating',label:'平均评分',color:0,value:ratings?safeCount(repairs.average_rating):0,unit:'分',kind:'ring',maximum:5,legend:['平均评分'],rows:[{label:'平均评分',values:[ratings?safeCount(repairs.average_rating):0]}],hint:ratings?'仅统计已有评分，满分 5 分。':'当前范围暂无服务评价。'},
  {id:'ratings',label:'评价数量',color:1,value:ratings,unit:'条',kind:'bars',legend:['评价数量'],rows:ratings?[{label:'服务评价',values:[ratings]}]:[],hint:'仅统计筛选范围内已有评分的报修。'},
  {id:'bills',label:'账单数量',color:2,value:safeCount(repairs.bill_count),unit:'张',kind:'bars',legend:['账单数量'],rows:[{label:'账单',values:[safeCount(repairs.bill_count)]}],hint:'按账单生成日期和学生当前入住楼栋筛选，包含已缴清账单。'},
  {id:'outstanding',label:'待缴金额',color:3,value:safeCount(data.outstandingAmount),unit:'元',kind:'bars',legend:['待缴金额'],rows:[{label:'待缴金额',values:[safeCount(data.outstandingAmount)]}],hint:'按账单生成日期和学生当前入住楼栋筛选；为当前尚未缴清的余额。'},
 ];
}
export function chartMaximum(metric:ChartMetric){const largest=Math.max(0,...metric.rows.flatMap(row=>row.values));if(metric.maximum&&metric.kind!=='ring')return metric.maximum;if(!largest)return 1;const base=10**Math.floor(Math.log10(largest));return Math.ceil(largest/base)*base;}
export function statisticsQuery(filters:ReportFilters){const params=new URLSearchParams();for(const key of ['from','to','buildingId'] as const)if(filters[key])params.set(key,filters[key]);return params.toString();}
