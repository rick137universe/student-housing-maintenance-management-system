-- 在已完成 001 的新数据库中执行；所有样例数据和测试函数最终回滚。
BEGIN;
SET LOCAL search_path = housing, pg_catalog;
CREATE FUNCTION pg_temp.expect_failure(statement text, expected_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE statement;
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = expected_state THEN RETURN; END IF;
        RAISE;
    END;
    RAISE EXCEPTION '预期 SQLSTATE %，但语句执行成功：%', expected_state, statement;
END $$;

INSERT INTO students VALUES
('TEST-S1','测试学生一','未指定','测试学院','测试年级',NULL,'test-only-salted-hash','active'),
('TEST-S2','测试学生二','未指定','测试学院','测试年级',NULL,'test-only-salted-hash','active'),
('TEST-S3','测试学生三','未指定','测试学院','测试年级',NULL,'test-only-salted-hash','active');
INSERT INTO user_accounts(username,full_name,role,password_hash,account_status) VALUES
('test-manager','测试宿管','dorm_manager','test-only-salted-hash','active'),
('test-technician','测试维修','maintenance','test-only-salted-hash','active'),
('test-admin','测试管理员','admin','test-only-salted-hash','active');
INSERT INTO user_accounts(username,full_name,role,student_number) VALUES ('test-student','测试学生一','student','TEST-S1');
INSERT INTO apartment_buildings(building_id,building_name,total_floors,building_attribute,manager_account_id)
SELECT 'TEST-A','测试楼',3,'不限',account_id FROM user_accounts WHERE username='test-manager';
INSERT INTO rooms VALUES ('TEST-R1','TEST-A',1,'双人间',2,'available'),('TEST-R2','TEST-A',2,'单人间',1,'available');
SELECT pg_temp.expect_failure($q$INSERT INTO rooms VALUES ('TEST-R3','TEST-A',4,'单人间',1,'available')$q$,'P0001');
INSERT INTO beds VALUES ('TEST-B1','TEST-R1','01','available');
SELECT pg_temp.expect_failure($q$INSERT INTO beds VALUES ('TEST-BX','TEST-R1','01','available')$q$,'23505');
INSERT INTO beds VALUES ('TEST-B2','TEST-R1','02','available'),('TEST-B3','TEST-R2','01','available');
SELECT pg_temp.expect_failure($q$INSERT INTO beds VALUES ('TEST-B4','TEST-R1','03','available')$q$,'P0001');
SELECT pg_temp.expect_failure($q$UPDATE rooms SET bed_capacity=1 WHERE room_id='TEST-R1'$q$,'P0001');
SELECT pg_temp.expect_failure($q$UPDATE apartment_buildings SET total_floors=1 WHERE building_id='TEST-A'$q$,'P0001');

INSERT INTO occupancy_records(student_number,bed_id,check_in_date,allocation_method,operator_account_id)
SELECT 'TEST-S1','TEST-B1',CURRENT_DATE,'manual',account_id FROM user_accounts WHERE username='test-manager';
DO $$ BEGIN
    IF (SELECT bed_status FROM beds WHERE bed_id='TEST-B1') <> 'occupied' THEN RAISE EXCEPTION '入住未同步占用床位'; END IF;
END $$;
SELECT pg_temp.expect_failure($q$INSERT INTO occupancy_records(student_number,bed_id,check_in_date,allocation_method,operator_account_id) SELECT 'TEST-S1','TEST-B2',CURRENT_DATE,'manual',account_id FROM user_accounts WHERE username='test-manager'$q$,'23505');
SELECT pg_temp.expect_failure($q$INSERT INTO occupancy_records(student_number,bed_id,check_in_date,allocation_method,operator_account_id) SELECT 'TEST-S2','TEST-B1',CURRENT_DATE,'manual',account_id FROM user_accounts WHERE username='test-manager'$q$,'P0001');
SELECT pg_temp.expect_failure($q$UPDATE beds SET bed_status='available' WHERE bed_id='TEST-B1'$q$,'P0001');
SELECT pg_temp.expect_failure($q$UPDATE rooms SET room_status='closed' WHERE room_id='TEST-R1'$q$,'P0001');

-- 调宿：结束旧入住、创建新入住、记录业务完成应在同一事务内。
UPDATE occupancy_records SET check_out_date=CURRENT_DATE WHERE student_number='TEST-S1';
INSERT INTO occupancy_records(student_number,bed_id,check_in_date,allocation_method,operator_account_id)
SELECT 'TEST-S1','TEST-B3',CURRENT_DATE,'manual',account_id FROM user_accounts WHERE username='test-manager';
INSERT INTO accommodation_changes(student_number,business_type,original_bed_id,new_bed_id,review_status,reviewer_account_id,reviewed_at,completed_at)
SELECT 'TEST-S1','transfer','TEST-B1','TEST-B3','completed',account_id,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP FROM user_accounts WHERE username='test-manager';
DO $$ BEGIN
    IF (SELECT bed_status FROM beds WHERE bed_id='TEST-B1') <> 'available' OR
       (SELECT bed_status FROM beds WHERE bed_id='TEST-B3') <> 'occupied' THEN RAISE EXCEPTION '调宿床位状态错误'; END IF;
END $$;
UPDATE occupancy_records SET check_out_date=CURRENT_DATE WHERE student_number='TEST-S1' AND check_out_date IS NULL;
-- 保留历史后允许同一学生再次使用同一床位。
INSERT INTO occupancy_records(student_number,bed_id,check_in_date,allocation_method,operator_account_id)
SELECT 'TEST-S1','TEST-B1',CURRENT_DATE,'manual',account_id FROM user_accounts WHERE username='test-manager';

INSERT INTO accommodation_bills(student_number,billing_period,accommodation_fee,utility_fee) VALUES
('TEST-S1','2026-10',100,20),('TEST-S1','2026-10',10,0);
SELECT pg_temp.expect_failure($q$INSERT INTO payment_records(bill_id,student_number,amount,payment_method,idempotency_key) SELECT min(bill_id),'TEST-S2',20,'测试','test-wrong-owner' FROM accommodation_bills$q$,'23503');
INSERT INTO payment_records(bill_id,student_number,amount,payment_method,idempotency_key)
SELECT min(bill_id),'TEST-S1',20,'测试','test-payment-1' FROM accommodation_bills;
DO $$ BEGIN
    IF (SELECT bill_status FROM accommodation_bills ORDER BY bill_id LIMIT 1) <> 'partial' THEN RAISE EXCEPTION '部分缴费状态错误'; END IF;
END $$;
SELECT pg_temp.expect_failure($q$INSERT INTO payment_records(bill_id,student_number,amount,payment_method,idempotency_key) SELECT min(bill_id),'TEST-S1',20,'测试','test-payment-1' FROM accommodation_bills$q$,'23505');
-- 文档未规定超额缴费禁止，确认没有擅自增加该限制。
INSERT INTO payment_records(bill_id,student_number,amount,payment_method,idempotency_key)
SELECT min(bill_id),'TEST-S1',110,'测试','test-payment-2' FROM accommodation_bills;
DO $$ BEGIN
    IF (SELECT bill_status FROM accommodation_bills ORDER BY bill_id LIMIT 1) <> 'paid' THEN RAISE EXCEPTION '缴费结清状态错误'; END IF;
    IF (SELECT outstanding_amount FROM bill_balances ORDER BY bill_id LIMIT 1) <> -10 THEN RAISE EXCEPTION '账单余额错误'; END IF;
END $$;

INSERT INTO repair_requests(student_number,room_id,fault_type,fault_description) VALUES ('TEST-S1','TEST-R1','水电','测试故障');
INSERT INTO maintenance_records(repair_id,technician_account_id,dispatcher_account_id,maintenance_at,completed_at,service_rating)
SELECT r.repair_id,t.account_id,a.account_id,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,99
FROM repair_requests r CROSS JOIN user_accounts t CROSS JOIN user_accounts a WHERE t.username='test-technician' AND a.username='test-admin';
INSERT INTO maintenance_records(repair_id,technician_account_id,dispatcher_account_id)
SELECT r.repair_id,t.account_id,a.account_id FROM repair_requests r CROSS JOIN user_accounts t CROSS JOIN user_accounts a WHERE t.username='test-technician' AND a.username='test-admin';
DO $$ BEGIN
    IF (SELECT count(*) FROM maintenance_records) <> 2 THEN RAISE EXCEPTION '报修多次处理关系错误'; END IF;
END $$;
SELECT pg_temp.expect_failure($q$INSERT INTO maintenance_records(repair_id,technician_account_id,dispatcher_account_id) SELECT r.repair_id,t.account_id,a.account_id FROM repair_requests r CROSS JOIN user_accounts t CROSS JOIN user_accounts a WHERE t.username='test-manager' AND a.username='test-admin'$q$,'23503');
SELECT '核心约束及入住、调宿、缴费回归通过，样例将回滚' AS verification_result;
ROLLBACK;
