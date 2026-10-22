import assert from 'node:assert/strict';
import {formatDate,formatDateTime,formatDateTimeInput,formatCurrency,formatBusinessValue} from '../src/utils/display-format';
export function verifyDisplayFormat(){
 assert.equal(formatDate('2026-10-23'),'2026年10月23日');assert.equal(formatDate('2026-01-02'),'2026年1月2日');
 assert.equal(formatDate('2024-02-29'),'2024年2月29日');assert.equal(formatDate('2026-02-29'),'2026-02-29');
 assert.equal(formatDate('2026-10'),'2026年10月');
 assert.equal(formatDateTime('2026-10-22T16:03:04Z'),'2026年10月23日 00:03:04');
 assert.equal(formatDateTimeInput('2026-10-22T16:03:04Z'),'2026-10-23T00:03');
 assert.equal(formatCurrency('200.00'),'￥200');assert.equal(formatCurrency('200.5'),'￥200.50');
 assert.equal(formatCurrency('999999999999.99'),'￥999999999999.99');assert.equal(formatCurrency('0.01'),'￥0.01');
 assert.equal(formatCurrency('0.00'),'￥0');assert.equal(formatCurrency(null),'—');
 assert.equal(formatBusinessValue('bill_id','200'),undefined);assert.equal(formatBusinessValue('phone','13800000000'),undefined);
 assert.equal(formatBusinessValue('hours','2.50'),undefined);assert.equal(formatBusinessValue('outstanding_amount','200'),'￥200');
 assert.equal(formatBusinessValue('due_date','2026-10-23'),'2026年10月23日');
 assert.equal(formatBusinessValue('content','2026-10-23 / 200.00'),undefined);
 console.log('显示格式：中文日期、时区跨日、日期输入、金额精度、空值与非金额字段通过。');
}
