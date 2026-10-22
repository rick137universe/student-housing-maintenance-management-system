// Display only: API values, form values and database types stay unchanged.
const timeFormatter=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
/** @param {unknown} value */
export function formatDateTimeInput(value){
 const date=new Date(String(value??''));
 return Number.isNaN(date.getTime())?'':timeFormatter.format(date).slice(0,16).replace(' ','T');
}
/** @param {unknown} value */
export function formatDateTime(value){
 const date=value instanceof Date?value:new Date(String(value??''));
 if(Number.isNaN(date.getTime()))return '—';
 return timeFormatter.format(date).replace(/^(\d{4})-(\d{2})-(\d{2})/,(_,year,month,day)=>`${year}年${Number(month)}月${Number(day)}日`);
}
/** @param {unknown} value */
export function formatDate(value){
 const text=String(value??''),match=text.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
 if(!match)return text||'—';
 const [,year,month,day]=match;
 const date=new Date(`${year}-${month}-${day??'01'}T00:00:00Z`);
 if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==`${year}-${month}-${day??'01'}`)return text;
 return `${year}年${Number(month)}月${day?Number(day)+'日':''}`;
}
/** @param {unknown} value */
export function formatCurrency(value){
 if(value===null||value===undefined||value==='')return '—';
 const text=typeof value==='number'&&Number.isFinite(value)?value.toFixed(2):String(value);
 const match=text.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
 if(!match)return text;
 const [,sign,whole,fraction='']=match,integer=whole.replace(/^0+(?=\d)/,''),cents=fraction.padEnd(2,'0');
 return '￥'+(sign&&(integer!=='0'||cents!=='00')?'-':'')+integer+(cents==='00'?'':'.'+cents);
}
const moneyKeys=new Set(['amount','total_amount','paid_amount','outstanding_amount','accommodation_fee','utility_fee','accommodationFee','utilityFee','outstandingAmount','totalAmount','outstanding']);
/** @param {string} key @param {unknown} value @returns {string|undefined} */
export function formatBusinessValue(key,value){
 if(value===null||value===undefined||value==='')return undefined;
 if(moneyKeys.has(key))return formatCurrency(value);
 if(/_at$|At$/.test(key))return formatDateTime(value);
 if(/_date$|Date$/.test(key)||['billing_period','billingPeriod','period','month','expectedDate'].includes(key))return formatDate(value);
 return undefined;
}
