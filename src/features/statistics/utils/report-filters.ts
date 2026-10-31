export type ReportFilters={from:string;to:string;buildingId:string};
export function reportFilters(params:{get:(key:string)=>string|null}):ReportFilters{return {from:params.get('from')??'',to:params.get('to')??'',buildingId:params.get('buildingId')??''};}
export function reportDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&value.slice(0,4)!=='0000'&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;}
export function reportFilterError(filters:ReportFilters){
 if(filters.from&&!reportDate(filters.from)||filters.to&&!reportDate(filters.to))return '请选择有效的开始日期和结束日期。';
 if(filters.from&&filters.to&&filters.from>filters.to)return '开始日期不能晚于结束日期。';
 if(filters.buildingId.length>32||/[\u0000-\u001f\u007f]/.test(filters.buildingId))return '请选择有效的楼栋。';
 return '';
}
export function reportUrl(path:string,filters:ReportFilters,record?:string){const params=new URLSearchParams();for(const key of ['from','to','buildingId'] as const)if(filters[key])params.set(key,filters[key]);if(record!==undefined)params.set('record',record);return path+(params.size?'?'+params:'');}
export const adminReportPath=(filters:ReportFilters)=>reportUrl('statistics',filters);
