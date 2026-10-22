import {expect,type Browser} from '@playwright/test';
import {studentPages} from '../src/data/student-pages';
import {managerPages} from '../src/data/manager-pages';
import {adminPages} from '../src/data/admin-pages';
import {maintenancePages} from '../src/data/maintenance-pages';
import {formatDate,formatDateTime,formatCurrency} from '../src/utils/display-format';
import {verifyDisplayFormat} from './display-format';
export async function displayFormatBrowserRegression(browser:Browser,origin:string,password:string){
 verifyDisplayFormat();
 for(const [role,username,entries] of [['student','stu202602341',studentPages],['dormManager','dm0301',managerPages],['admin','admin',adminPages],['maintenance','mt008',maintenancePages]] as const){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  try{
   await context.request.post(origin+'/api/v1/auth/login',{headers:{Origin:origin},data:{username,password}});
   const maintenance=role==='maintenance',resource=maintenance?'maintenance':'bills';
   const row=(await (await context.request.get(origin+'/api/v1/'+resource+'?limit=1')).json()).data[0];
   const entry=entries.find(e=>e.feature===(maintenance?'records':role==='student'?'payment':'billing')&&e.action===(role==='admin'?'action-2/records':maintenance?'action-2':'action-1'))!;
   const page=await context.newPage();await page.goto(origin+entry.url+'?record='+(maintenance?row.maintenance_id:row.bill_id));
   const frame=page.frameLocator('iframe[data-dorma-'+(role==='dormManager'?'manager':role)+'-frame]');
   const values=frame.locator(maintenance?'[data-dorma-repair-values]':'[data-dorma-finance-values],[data-dorma-billing-values]');
   const field=(label:string)=>values.getByRole('heading',{name:label,exact:true}).locator('+ pre > code');
   if(maintenance)await expect(field('派工时间')).toHaveText(formatDateTime(row.dispatched_at));
   else{await expect(field('账期')).toHaveText(formatDate(row.billing_period));await expect(field('住宿费')).toHaveText(formatCurrency(row.accommodation_fee));await expect(field('缴费截止日期')).toHaveText(formatDate(row.due_date));}
   await page.setViewportSize({width:390,height:844});await expect(values).toBeVisible();
   if(role==='student')await page.screenshot({path:'temp/chinese-date-currency-mobile.png'});
  }finally{await context.close();}
 }
 console.log('四端日期金额详情、时间时区与移动页面显示通过。');
}
