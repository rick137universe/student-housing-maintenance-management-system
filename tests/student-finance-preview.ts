import assert from 'node:assert/strict';
import {pool} from '../src/server/db';
import {studentFinancePreview} from '../src/server/student-finance-preview';
import type {Account} from '../src/types/auth';

// Transaction-local fixtures shadow the billing tables; no project data is changed.
const client=await pool.connect();
const account:Account={id:'1',role:'student',username:'preview-test',displayName:'预览测试',roleName:'学生',scope:'self',studentNumber:'preview-test'};
try{
 await client.query('BEGIN');
 await client.query(`SET LOCAL search_path=pg_temp,housing,pg_catalog;
  CREATE TEMP TABLE accommodation_bills(bill_id bigint,student_number text,billing_period text,generated_at timestamptz,utility_fee numeric,accommodation_fee numeric,total_amount numeric);
  CREATE TEMP TABLE bill_balances(bill_id bigint,paid_amount numeric,outstanding_amount numeric);`);
 const read=async()=>{const r=await studentFinancePreview(account,client);return Object.fromEntries(Object.entries(r).map(([key,value])=>[key,Number(value)]));};
 assert.deepEqual(await read(),{latestUtility:0,latestAccommodation:0,unpaidCount:0,paidUtility:0,paidAccommodation:0});
 await client.query(`INSERT INTO accommodation_bills VALUES
  (1,'preview-test','2026-01',now(),100,900,1000),
  (2,'preview-test','2026-02',now(),200,800,1000),
  (3,'preview-test','2026-03',now(),0,0,0),
  (4,'other-student','2099-12',now(),9999,9999,19998);
  INSERT INTO bill_balances VALUES(1,1000,0),(2,250,750),(3,0,0),(4,0,19998);`);
 assert.deepEqual(await read(),{latestUtility:150,latestAccommodation:600,unpaidCount:1,paidUtility:150,paidAccommodation:1100});
 await client.query(`INSERT INTO accommodation_bills SELECT n,'preview-test','2025-01',now(),1,9,10 FROM generate_series(10,130) n;
  INSERT INTO bill_balances SELECT n,10,0 FROM generate_series(10,130) n;`);
 assert.deepEqual(await read(),{latestUtility:150,latestAccommodation:600,unpaidCount:1,paidUtility:271,paidAccommodation:2189});
 await client.query(`UPDATE bill_balances SET paid_amount=1000,outstanding_amount=0 WHERE bill_id=2;`);
 assert.deepEqual(await read(),{latestUtility:0,latestAccommodation:0,unpaidCount:0,paidUtility:421,paidAccommodation:2789});
 await client.query(`INSERT INTO accommodation_bills VALUES(200,'preview-test','2027-01',now(),.01,.01,.02);
  INSERT INTO bill_balances VALUES(200,.01,.01);`);
 assert.deepEqual(await read(),{latestUtility:0,latestAccommodation:.01,unpaidCount:1,paidUtility:421.01,paidAccommodation:2789});
 for(const role of ['admin','dormManager','maintenance'] as const)await assert.rejects(()=>studentFinancePreview({...account,role},client),/仅学生/);
 console.log('缴费预览校验通过：无账单、零金额、部分缴费、跨学生隔离、超过100条汇总、全部缴清及角色权限。');
}finally{await client.query('ROLLBACK');client.release();await pool.end();}
