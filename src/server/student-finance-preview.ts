import {query} from './db';
import {authorize} from './security';
import {requireValue} from './errors';
import type {Account} from '../types/auth';
import type {PoolClient} from 'pg';

export async function studentFinancePreview(account:Account,client?:PoolClient){
 requireValue(account.role==='student','仅学生可查看本人缴费概览',403);
 await authorize(account,'statistics','read',client);
 await authorize(account,'bills','read',client);
 await authorize(account,'payments','read',client);
 // Fee components are allocated proportionally for partial payments. Round utility
 // to cents and assign the remainder to accommodation so the two always add up.
 const result=await query(`WITH allocated AS (
  SELECT b.*,v.paid_amount,v.outstanding_amount,
   COALESCE(round(b.utility_fee*v.paid_amount/NULLIF(b.total_amount,0),2),0) paid_utility
  FROM accommodation_bills b JOIN bill_balances v USING(bill_id)
  WHERE b.student_number=$1
 ), bills AS (
  SELECT *,utility_fee-paid_utility unpaid_utility FROM allocated
 ), latest AS (
  SELECT * FROM bills WHERE outstanding_amount>0
  ORDER BY billing_period DESC,generated_at DESC,bill_id DESC LIMIT 1
 ) SELECT
  COALESCE((SELECT unpaid_utility FROM latest),0)::text AS "latestUtility",
  COALESCE((SELECT outstanding_amount-unpaid_utility FROM latest),0)::text AS "latestAccommodation",
  (SELECT count(*) FROM bills WHERE outstanding_amount>0)::integer AS "unpaidCount",
  COALESCE((SELECT sum(paid_utility) FROM bills),0)::text AS "paidUtility",
  COALESCE((SELECT sum(paid_amount-paid_utility) FROM bills),0)::text AS "paidAccommodation"`,[account.studentNumber],client);
 return result.rows[0];
}
